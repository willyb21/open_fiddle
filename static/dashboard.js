( function( $ ){
	
	$( function(){
		var form=$('#deleteForm' );
		$( 'a.delete' ).bind( 'click', function( e ){
			e.preventDefault();
			var li=$( this ).closest( 'li' ),
			base=li.index() === 0,
			target=( base ? li.closest( '.fiddleDisplay' ) : li).addClass( 'deleting' )
			if ( confirm( "Do you want to delete this fiddle?"+( base ? " \n\n*This is a base fiddle, all related fiddles will also be deleted" : ""))){
				form.ajaxSubmit({
					url: $( this ).attr( 'href' ),
					type: 'post',
					success: function( data ){
						if ( data.success ){
							target.fadeOut( 200, function(){ $( this ).remove(); });
						}
					}
				});
			}
			else{
				target.removeClass( 'deleting' );
			}
		});
	});
})( jQuery );
