
( function( $ ){
	var tabs,
	contentHeight=0,
	ids='';
	function init(){
		tabs=$('a.tab');
		var els=[];
		tabs.each( function( i, a ){
			var href=$( a ).attr( 'href' );
			els.push( href );
			$( this ).click( handle );
		});
		ids=els.join(',');
		$( ids ).each( function( i, n ){
			var ta=$( this ).find( 'textarea:first' );
			if ( ta.length ){
				var mode=$( this ).data( 'name' ).toLowerCase();
				mode=( mode === 'html' ? 'htmlmixed' : mode );
				var editor=CodeMirror.fromTextArea( ta[ 0 ],{
					mode: mode,
					theme: 'eclipse',
					readOnly: true
				} );
				$( n ).data( 'editor', editor );
			}
		});
		$( window ).resize();
		tabs.filter(':first').click();
	}
	function handle( e ){
		e.preventDefault();
		$( ids ).hide();
		var target=$( $( this ).attr( 'href' ) ).show(),
			editor=target.data( 'editor' );
		$( this ).closest( 'ul' ).find( '.selected' ).removeClass( 'selected' );
		$( this ).addClass( 'selected' );
		if ( editor ){
			$( editor.getScrollerElement() ).height( contentHeight );
			editor.refresh();
		}
		else if ( target.find( 'iframe' ).length ){
			target.find( 'iframe' ).width( $( window ).width() ).height( contentHeight );
		}
	}
	$( init );
	
	$( window ).bind( 'resize', function( e ){
		var el=$('#contentWrap'),
		off=el.offset(),
		h=$( window ).height() - off.top;
		contentHeight=h;
		el.height( h );
	});
	
	var EmbeddedFiddle=$.EmbeddedFiddle=Backbone.View.extend({ // outer application for embedded fiddles
		initialize: function( opt ){
			opt || ( opt = {} );
			this.fiddle=new Fiddle( opt.fiddle );
		}
	});
	
})( jQuery );
