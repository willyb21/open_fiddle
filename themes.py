from django.conf import settings
import os

def getSiteThemes( user=None ):
	p=os.path.join( os.path.dirname( __file__), 'static','themes' )
	themes=[]
	for folder in os.listdir( p ):
		if os.path.isdir( os.path.join( p, folder ) ):
			themes.append( folder )
	
	return themes
