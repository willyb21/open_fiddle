from django.conf.urls.defaults import patterns, include, url
from open_fiddle import views


urlpatterns = patterns('',
    url(r'^$', views.FiddleEditorView.as_view(), name="new_fiddle"),
	url(r'^dashboard/$', views.DashboardView.as_view(), name="dashboard"),
	#~ url(r'^settings/$', views.UserSettingsView.as_view(), name="settings"),
	url(r'^upload/$', views.UploadView.as_view(), name="upload"),
   
    url(r'^iframe/(?P<pk>\d+)/$', views.FiddleIframeView.as_view(), name="fiddleframe"),
    url(r'^iframe/(?P<pk>\d+)/(?P<revision>\d+)/$', views.FiddleIframeView.as_view(), name="fiddleframe_revision"),
    
   
    url(r'^(?P<slug>[\w-]+)/$', views.FiddleEditorView.as_view(), name="edit_fiddle"),
    url(r'^(?P<slug>[\w-]+)/(?P<revision>\d+)/delete/$', views.FiddleDeleteView.as_view(), name="delete_fiddle"),
    url(r'^(?P<slug>[\w-]+)/(?P<revision>\d+)/$', views.FiddleEditorView.as_view(), name="edit_fiddle_revision"),
 
     url(r'^(?P<slug>[\w-]+)/embed/(?P<tabs>[a-zA-Z,]+)/$', views.FiddleEmbeddedView.as_view(), name="embed_fiddle"),
     url(r'^(?P<slug>[\w-]+)/(?P<revision>\d+)/embed/(?P<tabs>[a-zA-Z,]+)/$', views.FiddleEmbeddedView.as_view(), name="embed_fiddle_revision"),
   
    
    url(r'^ajax/(?P<mimetype>[\w-]+)/$', views.AjaxEchoView.as_view(), name="ajax_echo"),
    
)

