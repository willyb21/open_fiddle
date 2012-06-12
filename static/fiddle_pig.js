( function( $ ){

	var proxy=function( fn, ctx ){
		return function( e ){
			( e && e.preventDefault() );
			return fn.call( ctx || this, e, $( this ) );
		};
	};

	$.Plugin({
		name: 'codeeditor',
		ns: 'Fiddle.CodeEditor',
		options:{
			S: undefined,
			mode: 'html'
		},
		initialize: function(){
			var self=this,
			el=$( this.el ).bind( 'change', proxy( this._onChange, this )),
			S=this.S=this.options.S,
			helper=this.helper=$('<div />', { 'class': 'editorLabel' }).css({ position: 'absolute', top: 0, right: 0 }).appendTo( el ),
			label=this.label=$('<span />', { 'class': 'labelText' }).html( this.options.label ).appendTo( helper ),
			//~ trigger=this.dropTrigger=$('<a />', { 'class': 'trigger', href: '#' }).prependTo( helper ).hide(),
			editor=this.editor=CodeMirror.fromTextArea( this.$('textarea')[ 0 ], {
				mode: this.options.mode,
				onFocus: $.proxy( this._onFocus, this ),
				onBlur: $.proxy( this._onBlur, this ),
				onGutterClick: $.proxy( this._onGutterClick, this )
			}),
			dd=this.dropdown=S.editor_modal.clone().removeAttr( 'id' ).appendTo( 'body' ).modalMe();
				.bind( 'mousedown', function( e ){ e.stopPropagation(); });
				var form=dd.find( 'form' ),
				cbx=form.find( 'input[ type="checkbox" ]' ).each( function(){
					var name=$( this ).data( 'key' ) || this.name;
					if ( self.getOption( name ) ){
						$( this ).attr({ checked: 'checked' });
					}
					else{
						$( this ).removeAttr( 'checked' );
					}
					$( this ).bind( 'change', function(){
						var checked=$( this ).is(':checked' );
						self.setOption( name, checked);
						if( name === 'lineNumbers' ){
							var input=form.find( 'input[ name="firstLineNumber" ]');
							( checked && input.removeAttr( 'disabled' )) ||  input.attr({ disabled: 'disabled' });
						}
					}).change();
				}),
				sel=form.find( 'select, input[ type="text"]').each( function(){
					var name=$( this ).data( 'key' ) || $( this ).attr( 'name' );
					$( this ).val( self.getOption( name ) )
						.bind( 'change', function(){
							var value=$( this ).val();
							if ( !isNaN( value ) ){
								value=parseInt( value, 10 );
							}
						self.setOption( name, value );
					}).change();
				});
			label.click( proxy( this.toggleDropdown, this ) );
		},
		getOption: function( key ){
			return this.editor.getOption( key );
		},
		getTheme: function(){
			return this.editor.getOption( 'theme' );
		},
		getValue: function(){
			return this.editor.getValue();
		},
		setMode: function( mode ){
			this.setOption( 'mode', mode.toLowerCase() );
			this.setLabel( mode );
		},
		setOption: function( key, value ){
			this.editor.setOption( key, value );
		},
		setTheme: function( theme ){
			this.setOption( 'theme', theme );
		},
		setValue: function( value ){
			this.editor.setValue( value );
			return this;
		},
		setLabel: function( html ){
			this.label.html( html );
		},
		toggleDropdown: function( e, el ){
			( this.dropdown && this.dropdown.is(':visible') ? this.hideDropdown() : this.showDropdown( e, el ) );
		},
		hideDropdown: function(){
			this.dropdown.hide();
			$( window ).unbind( 'mousedown.dd' );
		},
		showDropdown: function( e, a ){
			var self=this, 
			off=a.offset(),
			dd=this.dropdown;
			dd.show().css({ top:off.top + a.outerHeight(), left: off.left + a.outerWidth() - dd.outerWidth() });
			$( window ).bind( 'mousedown.dd', proxy( this.hideDropdown, this ));
			
				
		},
		_onChange: function(){
			var el=$( this.el );
			$( this.editor.getScrollerElement() ).height( el.height() ).width( el.width() );
		},
		_onBlur: function(){
			$( this.el ).removeClass( 'focus' );
			this.trigger( 'blur', { editor: this });
		},
		_onFocus: function(){
			$( this.el ).addClass( 'focus' ); 
			this.trigger( 'focus', { editor: this });
		},
		_onGutterClick: function( ed, index, e ){
			var line=ed.getLine( index );
			ed.setSelection({ line: index, ch: 0}, { line: index, ch: line.length } );
			console.log( 'line', line, 'index', index );
		},
		_onMouseEnter: function(){
			//this.dropTrigger.show();
		},
		_onMouseLeave: function(){
			if ( !$( this.el ).hasClass( 'focus' )){
				//this.dropTrigger.hide();
			}
		},
		_toggleLabel: function( ){
			var focus=$( this.el ).hasClass( 'focus' );
			this.label.show();
			this.dropTrigger.hide();
			
		}
	});
	
	$.Plugin({
		name: 'resultpanel',
		ns: 'Fiddle.ResultPanel',
		options:{
		},
		initialize: function(){
		}
	});
	
	$.Plugin({
		name: 'fiddle',
		ns: 'Fiddle',
		options:{
		},
		initialize: function(){
			
		}
	});
	
	$.Plugin({
		name: 'modalMe',
		ns: 'Fiddle.Modal',
		
	});
})( jQuery );
