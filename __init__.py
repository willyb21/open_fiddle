from open_fiddle.managers import manager, FiddlePlugin
from open_fiddle import exports
import os

exportManager=exports.ExportManager()

exportManager.register( 'tar', exports.TarExport )
exportManager.register( 'zip', exports.ZipExport )

wrapChoices=[
	( 'head', 'No Wrapping ( head tag )' ),
	( 'body', 'No Wrapping( body tag )' ),
	( 'domready', 'onDomReady', ),
	( 'load', 'onLoad', ),
]

javascriptChoices=[
	( 'javascript', 'JavaScript', ),
	( 'coffeescript', 'CoffeeScript', ),
]

cssChoices=[
	( 'css', 'CSS', ),
]

try:
	import clevercss
	cssChoices.append( ( 'pcss', 'PCSS', ) )
except:
	pass

try:
	from scss import Scss
	cssChoices.append( ( 'scss', 'SCSS', ) )
except:
	pass

themeChoices=[
	( None, 'Default', )
]
for sheet in os.listdir( '/home/lenny/python/static/javascript/codemirror/theme/' ):
	name=os.path.splitext( sheet )[0]
	themeChoices.append( ( name, name.capitalize(), ))

