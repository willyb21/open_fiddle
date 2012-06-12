from django.contrib import admin
from django.conf import settings
from open_fiddle.models import FrameworkGroup, Framework, FrameworkDependent, Fiddle, Resource
from open_fiddle.forms import FrameworkDependentForm, UploadForm
from open_fiddle import utils
import os

class FrameworkAdmin( admin.ModelAdmin ):
	list_display=( 'group', 'name', 'url', 'version', )
	list_editable=( 'name', 'url','version', )
	list_display_links=('group',)
	
class FrameworkDependentAdmin( admin.ModelAdmin ):
	form=FrameworkDependentForm
	
class FiddleAdmin( admin.ModelAdmin ):
	pass
	
	
class ResourceAdmin( admin.ModelAdmin ):
	form=UploadForm
	def save_model( self, request, obj, form, change ):
		p=utils.get_user_path( request.user )
		if p:
			fileObj=form.cleaned_data.get( 'file' )
			if fileObj:
				write=os.path.join( p, fileObj.name )
				f=open( write, 'wb' )
				f.write( fileObj.read() )
				f.close()
				obj.url=write.replace( settings.MEDIA_ROOT, settings.MEDIA_URL)
			obj.creator=request.user
			obj.save()
			
admin.site.register( Framework, FrameworkAdmin )
admin.site.register( FrameworkDependent, FrameworkDependentAdmin )
admin.site.register( Fiddle, FiddleAdmin )
admin.site.register( FrameworkGroup )
admin.site.register( Resource, ResourceAdmin )
