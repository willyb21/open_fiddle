from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from django.core.urlresolvers import reverse
from django.conf import settings
from open_fiddle import wrapChoices, javascriptChoices, cssChoices
import json
import datetime
import os
import string
import random


		
	
class ActiveManager(models.Manager):
	def get_query_set(self):
		return super( ActiveManager, self ).get_query_set().filter( active=True )
		
class ActiveClass( models.Model ):
	active=models.BooleanField( default=True )
	objects=ActiveManager()
	allobjects=models.Manager()
	def activate(self):
		setattr( self, 'active', True )
		self.save()
	def deactivate(self):
		setattr( self, 'active', False )
		self.save()

	class Meta:
		abstract=True



class ResourceMixin( object ):
	def get_resources( self ):
		if not ( self.resources and self.resources.startswith( '[' ) ):
			return []
		return json.loads( self.resources )
		
class FrameworkGroup( models.Model ):
	name=models.CharField( max_length=100 )
	
	def __unicode__( self ):
		return self.name
		
class Framework( models.Model ):
	group=models.ForeignKey( FrameworkGroup )
	name=models.CharField( max_length=100 )
	version=models.CharField( max_length=20, null=True, blank=True )
	url=models.URLField()

	def __unicode__( self ):
		return self.name
		
class FrameworkDependent( ResourceMixin, models.Model ):
	''' available dependency for frameworks '''
	
	name=models.CharField( max_length=100 )
	version=models.CharField( max_length=20, null=True, blank=True )
	resources=models.TextField( blank=True )
	frameworks=models.ManyToManyField( Framework, help_text="Which frameworks support this dependency?", related_name="deps" )
	
	def __unicode__( self ):
		return self.name
		
class Resource( models.Model ):
	''' file either uploaded or added to be used inside a fiddle '''
	creator=models.ForeignKey( User )
	name=models.CharField( max_length=100, editable=False )
	url=models.URLField( blank=True )
	
	def save( self, *args, **kwargs ):
		self.name=os.path.basename( self.url )
		super( Resource, self ).save( *args, **kwargs )
		
	def __unicode__( self ):
		return self.name
		
class Fiddle( ResourceMixin, ActiveClass, models.Model ):
	framework=models.ForeignKey( Framework, blank=True, null=True  )
	wrap=models.CharField( choices=wrapChoices, max_length=20, default='domready' )
	slug=models.SlugField( editable=False )
	title=models.CharField( max_length=100, null=True, blank=True )
	revision=models.IntegerField( default=0, editable=False )
	temp=models.BooleanField( default=True, editable=False )
	base=models.BooleanField( default=False, editable=False )
	cssreset=models.BooleanField( default=True, blank=True )
	creator=models.ForeignKey( User, related_name="fiddles", editable=False, null=True )
	description=models.TextField( blank=True )
	created=models.DateTimeField( editable=False )
	revised=models.DateTimeField( editable=False )
	csspanel=models.CharField( choices=cssChoices, default='css', max_length=4 )
	jspanel=models.CharField( choices=javascriptChoices, default="javascript", max_length=15 )
	html=models.TextField( blank=True )
	css=models.TextField( blank=True )
	javascript=models.TextField( blank=True )
	resources=models.TextField( blank=True )
	framework_attrs=models.TextField( blank=True )
	bodytag=models.CharField( default='<body>', blank=True, max_length=150 )
	destroydate=models.DateTimeField( null=True )
	deps=models.ManyToManyField( FrameworkDependent )
	
	def save( self, *args, **kwargs ):
		self.revised=datetime.datetime.now()
		if not self.pk:
			self.created=datetime.datetime.now()
			if not self.slug:
				self.slug=generateSlug()
		super( Fiddle, self ).save( *args, **kwargs )
		

	def __unicode__( self ):
		return 'Fiddle #%d ~ %s ~ revision #%d %s' %( self.pk, self.slug, self.revision, 'TEMP' if self.temp else '' )

	def get_absolute_url( self ):
		''' absolute url for a fiddle is the editor '''
		if self.base:
			return reverse( 'edit_fiddle', kwargs={'slug': self.slug })
		return reverse( 'edit_fiddle_revision', kwargs={'slug': self.slug, 'revision': self.revision })

	def get_src_url( self ):
		if self.base:
			return reverse( 'fiddleframe', kwargs={'pk': self.pk })
		return reverse( 'fiddleframe_revision', kwargs={'pk': self.pk, 'revision': self.revision })

	def get_embedded_url( self, panels=[ 'html', 'results'] ):
		print 'get embedded url'
		panels=','.join( panels )
		if self.base:
			return reverse( 'embed_fiddle', kwargs={ 'slug': self.slug, 'tabs': panels })
		return reverse( 'embed_fiddle_revision', kwargs={ 'slug': self.slug, 'revision': self.revision, 'tabs': panels })
		
	def get_revisions( self ):
		''' get all revisions higher than and including this one '''
		return Fiddle.objects.filter( slug=self.slug, revision__gte=self.revision, temp=False ).order_by( 'revision' )
		
	#~ def getLatestRevision( self ):
		#~ queryset=Fiddle.objects.filter( creator=self.creator, slug=self.slug, temp=False ).order_by('-revision')
		#~ if queryset.count():
			#~ return queryset[ 0 ]
		#~ return self
		
		
	def get_js_resources( self ):
		resources=self.get_resources()
		return [ resource for resource in resources if resource.endswith('.js') ]
		
	def get_css_resources( self ):
		resources=self.get_resources()
		return [ resource for resource in resources if resource.endswith('.css') ]
		
		
def generateSlug( length=6, model=Fiddle ):
	slug=''.join( random.choice( string.letters ) for i in xrange( length ) )
	if ( model.objects.filter( slug=slug ).count() ):
		return generateSlug( length=length, model=model )
	return slug


	
