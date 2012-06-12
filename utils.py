from django.conf import settings
import os

def get_user_path( user ):
	if not user.is_authenticated():
		return None
	p=os.path.join( settings.MEDIA_ROOT, 'users', user.username )
	if not os.path.exists( p ):
		os.makedirs( p )
	return p
