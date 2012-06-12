from django import forms
import json
from open_fiddle import themeChoices, exportManager
from open_fiddle.models import Fiddle, FrameworkDependent, Resource

class JSONWidget( forms.Textarea ):
    def render(self, name, value, attrs=None):
		if value:
			value=json.loads( value )
			value= '\n'.join( value )
		return super( JSONWidget, self ).render( name, value, attrs=attrs )
		
class FiddleForm( forms.ModelForm ):
	framework_attrs=forms.CharField( widget=forms.TextInput(), required=False )
	resources=forms.CharField( widget=forms.HiddenInput(), required=False )
	class Meta:
		model=Fiddle
		exclude=( 'created', 'revised', 'slug', 'creator', 'revision', 'destroydate','active', 'temp',)

	def __init__( self, *args, **kwargs ):
		super( FiddleForm, self ).__init__( *args, **kwargs )
		self.fields[ 'deps' ]=forms.ModelMultipleChoiceField(
			widget=forms.CheckboxSelectMultiple( ),
			queryset=FrameworkDependent.objects.all(),
			required=False
		)
		
	#~ def clean_deps( self ):
		#~ return FrameworkDependent.objects.filter( pk__in=self.cleaned_data.get( 'deps' ) )
		
class FrameworkDependentForm( forms.ModelForm ):
	resources=forms.CharField( widget=JSONWidget(), help_text="Line separated urls to resources to load with this dependency" )
	class Meta:
		model=FrameworkDependent
		
			
	def clean_resources( self ):
		resources=self.cleaned_data.get( 'resources' ).split('\n')
		if resources:
			return json.dumps( resources )
		return '[]'
		
		
class UploadForm( forms.ModelForm ):
	file=forms.FileField()
	class Meta:
		model=Resource
		fields=('url',)
		
#~ class SettingsForm( forms.ModelForm ):
	#~ frameworks=forms.CharField( widget=forms.HiddenInput(), required=False )
	#~ resources=forms.CharField( widget=forms.HiddenInput(), required=False )
	#~ themes=forms.CharField( widget=forms.HiddenInput(), required=False )
	#~ panels=forms.CharField( widget=forms.HiddenInput(), required=False )
	#~ keybindings=forms.CharField( widget=forms.HiddenInput, required=False )
	#~ class Meta:
		#~ model=FiddleUserProfile
		#~ exclude=('user', )
		#~ 
	#~ def __init__( self, *args, **kwargs ):
		#~ super( SettingsForm, self ).__init__( *args, **kwargs )
		#~ manifest=self.instance.getManifest()
		#~ self.fields[ 'framework' ] =forms.CharField( widget=forms.Select( choices=manifest.get( 'frameworks' ) ) )
		#~ self.fields[ 'frameworks'].initial=manifest.get( 'frameworks' )
		#~ self.fields[ 'resources'].initial=manifest.get( 'resources' )
		#~ self.fields[ 'keybindings'].initial=manifest.get( 'keybindings', json.dumps( keyBindings ) )
		#~ self.fields[ 'htmlTheme'].widget=widget=forms.Select( choices=themeResources )
		#~ self.fields[ 'javascriptTheme'].widget=widget=forms.Select( choices=themeResources )
		#~ self.fields[ 'cssTheme'].widget=widget=forms.Select( choices=themeResources )
		#~ 
	#~ def save( self, *args, **kwargs ):
		#~ super( SettingsForm, self ).save( *args, **kwargs )
		#~ fw=self.cleaned_data.get( 'frameworks' )
		#~ rs=self.cleaned_data.get( 'resources' )
		#~ kb=self.cleaned_data.get( 'keybindings' )
		#~ 
		#~ m=self.instance.getManifest()
		#~ try:
			#~ m.update({
				#~ 'frameworks': json.loads( fw ),
				#~ 'resources': json.loads( rs ),
				#~ 'keybindings': json.loads( kb ),
			#~ })
			#~ self.instance.saveManifest( m )
		#~ except Exception, e:
			#~ print "FUCK %s" % e
			#~ 
		#~ return self.instance
#~ 
class UserUploadForm( forms.Form ):
	resource=forms.FileField()


	
class EditorPrefForm( forms.Form ):
	theme=forms.CharField( widget=forms.Select( choices=themeChoices ) )
	tabSize=forms.IntegerField( initial=4, widget=forms.TextInput( attrs={ 'data-key': 'tabSize', 'class': 'number', 'maxlength': 1 }))
	lineWrapping=forms.BooleanField( label="Line Wrapping", initial=False, widget=forms.CheckboxInput( attrs={ 'data-key': 'lineWrapping' }))
	lineNumbers=forms.BooleanField( label="Show line numbers", initial=False, widget=forms.CheckboxInput( attrs={ 'data-key': 'lineNumbers' }))
	firstLineNumber=forms.IntegerField( initial=1, label="FIrst Line #", widget=forms.TextInput( attrs={ 'data-key': 'firstLineNumber', 'class': 'number' }))
	
	
class FiddleExportForm( forms.Form ):
	download_choices=exportManager.choices()
	name=forms.CharField( help_text="Files will be placed inside a folder with this name")
	index_name=forms.CharField( initial="index.html", help_text="Name of the main index file" )
	format=forms.CharField( widget=forms.Select( choices=download_choices ), label="Download format", help_text="Choose how to receive your download" )
	def __init__( self, *args, **kwargs ):
		self.fiddle=kwargs.pop( 'fiddle' )
		super( FiddleExportForm, self ).__init__( *args, **kwargs )
		self.fields[ 'name' ].initial=( self.fiddle.title or self.fiddle.slug ).lower().replace( ' ', '-' )
		
		
