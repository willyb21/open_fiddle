
class FiddleManager( object ):
	def __init__( self ):
		self.plugins={}
	
	def register(  self, name, cls ):
		#print 'Registering plugin %s' % name
		self.plugins[ name ] = cls()
		
	

class FiddlePlugin( object ):
	pages=[] # which pages does this plugin need to be loaded on
	resources=[] #scripts / css to include in the page ( RELATIVE STATIC URL )
	hooks=[]
	
	def get_resources( self ):
		return self.resources
		
	
class JSLintPlugin( FiddlePlugin ):
	pages=[ 'form', ]
	resources=[ 'javascript/jslint.js', 'javascript/fiddle_lint.js' ]
	
	
manager=FiddleManager()
manager.register( 'JSLint', JSLintPlugin )
