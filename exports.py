from django.conf import settings
from django import template
from django.template import loader
import os
import tarfile
import zipfile

class ExportManager( object ):
	def __init__( self, **kwargs ):
		self.exports={}
		
	def register( self, name, fn ):
		self.exports[ name ] = fn
		
	def get( self, name ):
		if name in self.exports:
			return self.exports[ name ]
		return None
		
	def choices( self ):
		return [ ( k, k ) for k in self.exports.keys() ]
	
class ExportBase( object ):
	def __init__( self, fiddle, user ):
		self.fiddle, self.user=fiddle, user
		
	def export( self, **kwargs ):
		raise NotImplementedError
		
	
class TarExport( ExportBase ):
	def export( self, d ):
		fiddle=self.fiddle
		user=self.user
		name=d.get( 'name' )
		index_name=d.get( 'index_name' )
		temp=os.path.join( settings.MEDIA_ROOT, 'ztemp')
		target=os.path.join( temp,  name )
		if not os.path.exists( target ):
			os.makedirs( target )
			
		tpl=loader.get_template( 'open_fiddle/fiddleframe.html' )
		ctx=template.Context({ 'object': fiddle })
		index=os.path.join( target, index_name )
		f=open( index, 'wb' )
		f.write( tpl.render( ctx ) )
		f.close()
		os.chdir( temp )
		
		tarname='%s.tar' % name
		tarurl=os.path.join( temp, tarname  )
		tar=tarfile.open( tarname , 'w' )
		tar.add( name )
		tar.close()
		return tarurl.replace( settings.MEDIA_ROOT, settings.MEDIA_URL )
		
class ZipExport( ExportBase ):
	def export( self, d ):
		fiddle=self.fiddle
		temp=os.path.join( settings.MEDIA_ROOT, 'ztemp')
		target=os.path.join( temp,  d.get( 'name' ) )
		if not os.path.exists( target ):
			os.makedirs( target )
		return 'haha/'
