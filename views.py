# coding: utf-8

from django.views.generic import TemplateView, DetailView, CreateView, UpdateView, ListView, DeleteView
from django.views.generic.edit import FormView
from django.core import serializers
from django.conf import settings
from django.db import connection
from django.template import RequestContext
from django.shortcuts import render_to_response
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.contrib.auth import login, authenticate
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm
from django import http
from django.core.urlresolvers import reverse
from auth_views.views import LoginView

from . import utils, javascriptChoices, cssChoices, exportManager
from .models import Fiddle, Framework, Resource
from .forms import FiddleForm, UserUploadForm, EditorPrefForm, FiddleExportForm
from ajax_tools.views import dump, dumpError, dumpOK, dumpFormErrors

import json
import datetime
import time
import os
import sys


def fiddleRecord( f ):
	return {
		'id': f.pk,
		'title': f.title,
		'slug': f.slug or '',
		'description': f.description,
		'framework': None if not f.framework else f.framework.name,
		#'html': unicode( f.html ),
		#'javascript': unicode( f.javascript ),
		'css': f.css,
		'resources': f.get_resources(),
		'url': f.get_absolute_url(),
		'src': f.get_src_url(),
	}
	
	
recordMap={
	Fiddle: fiddleRecord,
	#~ FiddleUserProfile: profileRecord,
}

class LoginRequiredMixin( object ):
	@method_decorator( login_required )
	def dispatch( self, request, *args, **kwargs ):
		return super( LoginRequiredMixin, self ).dispatch( request, *args, **kwargs )

		
class FiddleMixin( object ):
	model=Fiddle
	form_class=FiddleForm
	template_name="open_fiddle/fiddleform.html"	
	
	def get_object( self ):
		slug=self.kwargs.get( 'slug' )
		revision=int( self.kwargs.get( 'revision', 0 ))
		if revision:
			return Fiddle.objects.get( slug=slug, revision=revision )
		fiddles=Fiddle.objects.filter( slug=slug, base=True )
		return fiddles[ 0 ] if fiddles.count() else None
	
class FiddleIframeView( DetailView ):
	''' render the iframe for a fiddle '''
	model=Fiddle
	template_name="open_fiddle/fiddleframe.html"
	
class FiddleEditorView( FiddleMixin, UpdateView ):
		
	def dispatch( self, request, *args, **kwargs ):
		self.user=request.user if request.user.is_authenticated() else None
		return super( FiddleEditorView, self ).dispatch( request, *args, **kwargs )
		
	def get( self, request, *args, **kwargs ):
		if request.is_ajax():
			pk=request.GET.get( 'pk' )
			action=request.GET.get( 'action', 'deps' )
			if hasattr( self, 'get_%s' % action ):
				return getattr( self, 'get_%s' % action )( request, pk=pk, *args, **kwargs )
				
		return super( FiddleEditorView, self ).get( request, *args, **kwargs )
		
	def get_deps( self, request, *args, **kwargs ):
		try:
			framework=Framework.objects.get( pk=kwargs.get( 'pk' ) )
			return dump( [ { 'name': dep.name, 'pk': dep.pk, } for dep in framework.deps.all() ] )
		except Exception, e:
			print 'EROR IN DEPS %s' % e
			
	def get_resource( self, request, *args, **kwargs ):
		q=request.GET.get( 'term' )
		ret=[]
		if request.user.is_authenticated():
			ret=[ { 'value': r.url, 'label': os.path.basename( r.url ) } for r in request.user.resource_set.filter( name__istartswith=q ) ]
		return dump( ret )
	def post( self, request, *args, **kwargs ):
		self.object=self.get_object()
		action=request.POST.get( 'action', 'run' )
		method='%s_fiddle' % action
		form=FiddleForm( data=request.POST )
		if hasattr( self, method ):
			if action in ( 'export', ):
				return getattr( self, method )()
			if form.is_valid():
					fiddle=form.save( commit=False )
					return getattr( self, method )( fiddle, form )
			else:
				print 'invalid form %s' % str( form.errors )
				return dump({ 'success': False, 'errors':[ e for e in form.errors ] })
		else:
			return dump({ 'success': False, 'errors': [ 'invalid action', ] })
				
	def get_context_data( self, **kwargs ):
		ctx=super( FiddleEditorView, self ).get_context_data( **kwargs )
		ctx.update({
			'pform': EditorPrefForm( auto_id=False),
			'frameworks': Framework.objects.order_by( 'group__name').all(),
		})
		if self.object:
			ctx.update({
				'exportform': FiddleExportForm( fiddle=self.object ),
			})
		return ctx
	
	def run_fiddle( self, fiddle, form, **kwargs ):
		if self.object:
			''' this request was sent to the url corresponding to a saved / temp fiddle '''
			print 'self object found! %s ' % self.object
			fiddle.creator=self.object.creator
			fiddle.slug=self.object.slug
			if self.object.temp:
				fiddle.pk=self.object.pk
				print 'deleting old object %s' % self.object.pk
				self.object.delete()
		else:
			''' THIS IS THE FIRST TIME THIS FIDDLE HAS EVER RUN - save a temporary fiddle '''
			print 'No self object in run'
			if self.user:
				fiddle.creator=self.user
			
		return self.respond( fiddle, form )	
		
	def save_fiddle( self, fiddle, form, **kwargs ):
		fiddle.temp=False
		if self.user:
			fiddle.creator=self.user
			for resource in fiddle.get_resources():
				Resource.objects.get_or_create( creator=self.user, url=resource )

		if self.object:
			''' an update to a saved fiddle OR creating a new fiddle from a temp '''
			
			if self.object.creator is None or self.object.creator != self.user:
				return self.fork_fiddle( fiddle, form )
				
			fiddle.base=self.object.temp
			
			if self.object.temp:
				fiddle.pk=self.object.pk
				self.object.delete()
			else:
				revision=Fiddle.objects.filter( slug=self.object.slug ).order_by( '-revision' )[ 0 ].revision + 1
				fiddle.revision=revision
				fiddle.slug=self.object.slug
				fiddle.creator=self.object.creator
		else:
			fiddle.base=True
			
		return self.respond( fiddle, form )
		
	def fork_fiddle( self, fiddle, form, **kwargs ):
		''' clone fiddle, the clone must be saved after being forked ( ohduzit? ) '''
		fiddle.base=True
		fiddle.temp=False
		if self.user:
			fiddle.creator=self.user
		fiddle.save()
		return dump({ 'url': fiddle.get_absolute_url() })
		
	def base_fiddle( self, fiddle, form, **kwargs ):
		''' make this fiddle the base '''
		if self.object and self.object.creator==self.user and self.object.revision > 0 and not self.object.temp:
			fiddle.temp=False
			fiddle.creator=self.object.creator
			fiddle.slug=self.object.slug
			fiddle.base=True
			
			#overwrite the old base
			Fiddle.objects.filter( slug=fiddle.slug, base=True ).delete()
			fiddle.save()
			form.save_m2m()
			return dump({ 'url': fiddle.get_absolute_url() })
		else:
			return dump({ 'success': False, 'errors': [ 'Fiddle is not eligible for basing', ] })
		
	def delete_fiddle( self, fiddle, form,  **kwargs ):
		if self.object and self.object.creator == self.user:
			if self.object.base:
				for f in Fiddle.objects.filter( slug=self.object.slug ):
					f.deactivate()
			else:
				self.object.deactivate()
			
	def export_fiddle( self, **kwargs ):
		if self.object:
			exportform=FiddleExportForm( data=self.request.POST, fiddle=self.object )
			if exportform.is_valid():
				d=exportform.cleaned_data
				Exporter=exportManager.get( d.get( 'format' ) )
				exporter=Exporter( fiddle=self.object, user=self.user )
				url=exporter.export( d )
				return dump({ 'url': url })
			else:
				return dump({ 'success': False, 'errors': [ e for e in form.errors ]})
		else:
			return dump({ 'success': False, 'errors': [ 'Something is fucked up, no object should not be able to export',]})
	def respond( self, fiddle, form ):
		fiddle.save()
		form.save_m2m()
		return dump( fiddleRecord( fiddle ) )
		
	def get_form_kwargs(self):
		"""
		Returns the keyword arguments for instanciating the form.
		"""
		kwargs = super( FiddleEditorView, self ).get_form_kwargs()
		kwargs.update({
		'auto_id': False,
		})
		return kwargs
        
class FiddleDeleteView( FiddleMixin, DeleteView ):
	def delete(self, request, *args, **kwargs):
		self.object = self.get_object()
		if self.object.base:
			Fiddle.objects.filter( slug=self.object.slug ).delete()
		else:
			self.object.deactivate()
		return dump({ 'success': True })

class FiddleEmbeddedView( FiddleMixin, DetailView ):
	template_name="open_fiddle/embedded.html"
	def get_context_data( self, **kwargs ):
		ctx=super( FiddleEmbeddedView, self ).get_context_data( **kwargs )
		tabs=[ t.strip() for t in self.kwargs.get( 'tabs' ).split(',') ]
		retTabs=[]
		availableTabs=('html','javascript','css', 'results', )
		for tab in tabs:
			if tab in availableTabs:
				name=tab
				if tab == 'javascript':
					for k,v in javascriptChoices:
						if self.object.jspanel == k:
							name=v
							break
				elif tab == 'css':
					for k,v in cssChoices:
						if self.object.csspanel == k:
							name=v
							break
				elif tab == 'html':
					name='HTML'
				elif tab == 'results':
					name='Results'
				retTabs.append({ 'name': name, 'tab': tab })
		ctx.update({
			'tabs': retTabs,
		})
		return ctx
		
		
class DashboardView( LoginRequiredMixin, ListView ):
	template_name="open_fiddle/dashboard.html"
	model=Fiddle
	
	def get_queryset( self ):
		queryset=super( DashboardView, self ).get_queryset()
		return queryset.filter( creator=self.request.user, base=True, temp=False ).order_by('-created' )
	

class UploadView( LoginRequiredMixin, FormView ):
	form_class=UserUploadForm
	
	def form_valid( self, form ):
		print 'valid upload'
		resource=form.cleaned_data.get( 'resource' )
		name=resource.name
		user=self.request.user
		uPath=utils.get_user_path( user )
		savePath=os.path.join( uPath, name )
		f=open( savePath, 'wb' )
		for chunk in resource.chunks():
			f.write( chunk )
		f.close()
		
		url=savePath.replace( settings.MEDIA_ROOT, '' )
		resource=Resource.objects.create( creator=user, url=url )
		return http.HttpResponse( str( os.path.join( settings.MEDIA_URL, resource.url ) ) )
			
	def form_invalid( self, form ):
		print 'INVALID upload'
		return dump( [ e for e in form.errors ] )
			
		
class AjaxEchoView( TemplateView ):
	''' take a request and echo it back in the format desired '''
	
	@method_decorator( csrf_exempt )
	def dispatch( self, request, *args, **kwargs ):
		if request.is_ajax():
			return super( AjaxEchoView, self ).dispatch( request, *args, **kwargs )
		return http.HttpResponseForbidden()
		
	def post( self, request, *args, **kwargs ):
		d=self.request.POST.copy() or {}
		mime=kwargs.get( 'mimetype' ).lower()
		delay=int( d.get( 'delay', 0 ) )
		if delay > 0:
			time.sleep( delay )
		if mime == 'html':
			print 'returning HTML '
			return dump( d.get( 'html' ), mimetype="text/html", dumps=False )
		elif mime == 'json':
			return dump( json.loads( d.get( 'json', d ) ))
		return dump( d )
		
			
			
			
