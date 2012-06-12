from django import template
from django.conf import settings
from django.utils.safestring import mark_safe
from django.db.models.query import QuerySet
from django.db.models import Model
import clevercss
from scss import Scss
from fiddler.views import fiddleRecord
from fiddler.models import Fiddle
import os
import inspect
import json

register=template.Library()

@register.filter
def unslug( text ):
	return text.lower().replace( '-', '_' )

@register.filter( name="json" )
def jsonfilter( fiddle ):
	if isinstance( fiddle, Fiddle ):
		return mark_safe( json.dumps( fiddleRecord( fiddle ) ) )
	try:
		return mark_safe( json.dumps( fiddle ) )
	except:
		return []

@register.filter
def filename( name ):
	return os.path.basename( name )

@register.filter
def firstline( text ):
	return text.split('\n').pop(0)

@register.filter
def pcss( text ):
	return clevercss.convert( text )

@register.filter( name="scss" )
def compilescss( text ):
	css=Scss()
	try:
		return css.compile( text )
	except:
		return text

@register.filter
def embedded_url( fiddle, panels='html,results' ):
	panels=[ p.strip() for p in panels.split(',')]
	return fiddle.get_embedded_url( panels=panels )

@register.filter
def attrib( fiddle, key ):
	return getattr( fiddle, key )
	
@register.filter
def renderHTML( html ):
	pass
	
