( function( $ ){
	
	
	var proxy=function( fn, ctx ){
		return function( e ){
			( e && e.preventDefault() );
			return fn.call( ctx || this, e, $( this ) );
		};
	},
	
	Fiddle=Backbone.Model.extend({
		defaults: {
			framework: 'jQuery-1.7',
			framework_attrs: '',
			slug: '',
			resources: [],
			title: '',
			description: '',
			html: '',
			javascript: '',
			css: '',
			src: '', // the url to set the iframe to
			url: '' // the url to send ajax requests
		}
	}),
	
	CodeEditor=Backbone.View.extend({ // codemirror
		initialize: function(){
			var self=this,
				el=$( this.el ).bind( 'change', proxy( this._onChange, this )),
				id=el.attr('id'),
				opt=this.options,
				S=this.S=opt.S,
				helper=this.helper=$('<div />', { 'class': 'editorLabel' }).css({ position: 'absolute', top: 0, right: 0}).appendTo( el ),
				label=this.label=$('<span />', { 'class': 'labelText' }).html( this.options.label ).appendTo( helper ),
				editor=this.editor=CodeMirror.fromTextArea( this.$('textarea')[ 0 ], {
					mode: this.options.mode,
					onFocus: $.proxy( this._onFocus, this ),
					onBlur: $.proxy( this._onBlur, this ),
					onGutterClick: $.proxy( this._onGutterClick, this )
				}),
				dd=this.dropdown=S.editor_modal.clone().removeAttr( 'id' ).appendTo( 'body' ).bind( 'mousedown', function( e ){ e.stopPropagation(); }),
				form=dd.find( 'form' ),
				modecell=dd.find( 'td.mode' ),
				modeselect=S.form.find( 'select[ name="'+opt.select+'"]'),
				cbx=form.find( 'input[ type="checkbox" ]' ).each( function(){
					var name=$( this ).data( 'key' ) || this.name;
					if ( $.cookie( id+'_'+name )!='false' ||  self.getOption( name )){
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
					var name=this.name;
					$( this ).val( $.cookie( id+'_'+name) || self.getOption( name ) )
						.bind( 'change', function(){
							var value=$( this ).val();
							if ( !isNaN( value ) ){
								value=parseInt( value, 10 );
							}
						self.setOption( name, value );
					}).change();
				});
				
				// clone the mode select into our dropdown
				var localselect=modeselect.clone();
				modeselect.bind( 'change.local', function(){
					localselect.val( $( this ).val() );
				});
				localselect.bind( 'change.local', function(){
					modeselect.val( $( this ).val() ).change();
				}).appendTo( modecell );
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
		hideDropdown: function(){
			this.dropdown.hide();
			$( window ).unbind( 'mousedown.dd' );
			return this;
		},
		selectLine: function( lineNo ){
			this.editor.setSelection({ line: lineNo, ch: 0 }, { line: lineNo + 1, ch: 0 });
			return this;
		},
		setLabel: function( html ){
			this.label.html( html );
			return this;
		},
		setMode: function( mode ){
			this.setOption( 'mode', mode.toLowerCase() );
			this.setLabel( mode );
			return this;
		},
		setOption: function( key, value ){
			var id=this.el.id+'_'+key;
			$.cookie( id, null );
			$.cookie( id, value, { expires: 365, path: '/' } );
			this.editor.setOption( key, value );
		},
		setTheme: function( theme ){
			this.setOption( 'theme', theme );
		},
		setValue: function( value ){
			this.editor.setValue( value );
			return this;
		},
		showDropdown: function( e, a ){
			var self=this, 
			off=a.offset(),
			dd=this.dropdown;
			dd.show().css({ top:off.top + a.outerHeight(), left: off.left + a.outerWidth() - dd.outerWidth() });
			$( window ).bind( 'mousedown.dd', proxy( this.hideDropdown, this ));
			return this;
				
		},
		toggleDropdown: function( e, el ){
			return ( this.dropdown && this.dropdown.is(':visible') ? this.hideDropdown() : this.showDropdown( e, el ) );
		},
		_onChange: function(){
			var el=$( this.el );
			$( this.editor.getScrollerElement() ).height( el.height() ).width( el.width() );
			this.editor.refresh();
		},
		_onBlur: function(){
			$( this.el ).removeClass( 'focus' );
			this.trigger( 'blur', { editor: this });
			this.helper.removeClass( 'hiding' ).unbind( 'mouseenter mouseleave' );
		},
		_onFocus: function(){
			var dd=this.dropdown;
			$( this.el ).addClass( 'focus' ); 
			this.trigger( 'focus', { editor: this });
			this.helper.addClass( 'hiding' ).bind( 'mouseenter', function(){
				$( this ).removeClass( 'hiding' );
			}).bind( 'mouseleave', function(){
				if( dd.is(':hidden') ){
					$( this ).addClass( 'hiding' );
				}
			});
		},
		_onGutterClick: function( ed, index, e ){
			this.selectLine( index );
			//~ var line=ed.getLine( index );
			//~ ed.setSelection({ line: index, ch: 0}, { line: index, ch: line.length } );
			//~ console.log( 'line', line, 'index', index );
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
	}),
	
	ResultPanel=Backbone.View.extend({ // iframe
		initialize: function(){
			$( this.el ).on( 'change', $.proxy( this._refresh, this ));
			this.model.bind( 'change:src', this.render, this );
		},
		render: function(){ 
			var el=$( this.el ),
			src=this.model.get( 'src' );
			if ( src ){
				if ( el.find( 'iframe' ).length ){
					el.find( 'iframe' )[ 0 ].src=src;
				}
				else {
					el.html( '<iframe name="results" src="'+src+'" frameborder="1"></iframe>' );
				}
				el.change();
			}
			return this;
		},
		_refresh: function(){
			var el=$( this.el );
			this.$('iframe').width( el.width() ).height( el.height() );
		}
	});
	
	$.Fiddle=Backbone.View.extend({
		initialize: function(){
			//if ( $.Fiddle.instance ){ throw "A fiddle instance is already started"; }
			
			var self=this,
				opt=this.options=$.extend( true, {}, $.Fiddle.defaults, this.options ),
				sel=opt.selectors,
				S=this.S={};
				$.each( sel, function( k, v ){
					S[ k ]=$( v );
				});
				
			this.deps={}; // framework dependents
			this.form=S.form.submit( function(){ return false; });
			this.fiddle=new opt.models.Fiddle( opt.fiddle );
			this.sidebar=S.sidebar.on( 'click', 'ul>li>a', proxy( this._toggleSidebarItem, this ));
			this.content=S.content.bind( 'change', function(){
				S.sidebar.height( $( this ).height() );
			}).trigger( 'change' );
			
			var panels=this.panels={
				html: new CodeEditor({ model: this.fiddle, el: S.html_editor[0], label: 'HTML', mode: 'htmlmixed', 'S': S, select: "htmlpanel"}), 
				javascript: new CodeEditor({ model: this.fiddle, el: S.js_editor[0], label: 'Javascript', mode: 'javascript', 'S': S, select: "jspanel" }),
				css: new CodeEditor({ model: this.fiddle, el: S.css_editor[0], label: 'CSS', mode: 'css', 'S': S, select: "csspanel"  }),
				result: new ResultPanel({ model: this.fiddle, el: S.result_panel[0]}).render()
			}
			
			
			//S.resize_wrap.resizeMe();
			this._bindResizable( sel.resize_wrap );
			
			// bind our buttons
			this.buttonList=S.buttons.on( 'click', 'a', proxy( this._handleButton, this ) );
			S.options_modal.on( 'click', 'a', proxy( this._handleButton, this ) );
			
			S.toggle.click( proxy( this.toggleSidebar, this ) );
			S.resource_button.click( proxy( function(){ this.addResource()}, this ) );
			S.upload.click( proxy( function( e, a ){
				var off=a.offset();
				S.upload_modal.show().css({ left: off.left + a.outerWidth() + 10, top: off.top - S.upload_modal.height()});
			}, this ) );
			
			// simple dirty dialog
			$('.modal').modalMe();
			S.upload_modal.on( 'change', 'input[ type="file" ]', proxy( this._uploadResource, this ) );
			S.export_modal.find( 'form' ).bind( 'submit', proxy( this._exportFiddle, this ) );
			
			this.form.find( 'select[ name="framework"]' )
				.bind( 'change.deps', proxy( this._loadDependencies, this ) )
				.bind( 'change.current', function(){
					S.current_fw.text(( $( this ).find( ':selected').text() || 'None' ) );
				}).trigger( 'change.current' );
				
			// simple dirty stinky autocomplete ( so I dont have to style ui.widget named lists )	
			this.form.find( 'input[ name="resource"]' )
				.ac({
					source: location.href+'?action=resource',
					select: function( e, ui ){
						self.addResource( ui.item.value );
						return false;
					}
				});
				
			// auto update mode
			this.form.find( 'select[ name="csspanel" ], select[ name="jspanel" ]' ).each( function(){
				var name=this.name,
				cookie=$.cookie( name );
				if ( cookie && self.fiddle.isNew() ){
					$( this ).val( cookie );
				}
				$( this ).bind(  'change', function(){
					panels[ name == 'csspanel' ? 'css' : 'javascript' ].setMode( $( this ).find( ':selected' ).text() );
					$.cookie( name, $( this ).val(), { expires: 365, path: '/'} );
				});
			}).change();
						
			this.refreshResources();
			this._bindKeys();
			
			// open the first toggled box ( framework )
			setTimeout( function(){
				S.sidebar.find( 'ul>li>a:first').click();
			}, 500 );
			
			// overwrite the $.Fiddle view
			$.Fiddle=this;
		},
		addResource: function( resourceName ){
			var input=this.form.find('input[ name="resource"]'),
				resourceName=resourceName || input.val(),
				resources=this.fiddle.get( 'resources' );
			if ( resourceName ){
				resources.push( resourceName );
				this.fiddle.set( { resources: resources });
				input.val('');
				this.refreshResources();
			}
			
		},
		baseFiddle: function( e ){
			this._submitForm({ action: 'base' });			
		},
		deleteFiddle: function( e ){
			this.hideOptionsModal();
			if ( confirm( 'Do you want to delete this fiddle?') ){
				this._submitForm( { action: 'delete' })
			}
		},
		exportFiddle: function( e ){
			this.hideOptionsModal();
			var modal=this.S.export_modal;
			modal.show().center( window );
		},
		forkFiddle: function( e ){
			this._submitForm({ action: 'fork' });			
		},
		hideOptionsModal: function(){ 
			this.S.options_modal.hide();
			$( window ).unbind( 'click.options' );
		},
		lintFiddle: function( e, el ){
			var js=this.panels.javascript.getValue(),
			result=JSHINT( js );
			this.hideOptionsModal();
			if ( result === true ){
				alert( 'All JS Hint tests passed!' );
			}
			else {
				console.log( JSHINT.errors );
			}
		},
		optionsFiddle: function( e, el ){ // show the options dropdow
			var modal=this.S.options_modal;
			return this[ modal.is(':visible' ) ? 'hideOptionsModal' : 'showOptionsModal' ]( e, el );
		},
		refreshResources: function(){
			var
				self=this,
				list=$('#resourceList').html('').sortable( 'destroy' ),
				fiddle=this.fiddle,
				resources=this.fiddle.get( 'resources' );
			$('#resourceCount').text( resources.length );
			_.each( resources, function( r ){
				var name=r.split('/').pop(),
				a=$('<a/>', { 'class': 'right remove', href: '#', title: 'Remove resource' }).click( function(e){
					e.preventDefault();
					self.removeResource( r );
				}),
				fileLink=$('<a />', { target: '_blank', title: r, href: r, html: name });
				$('<li />').append( a ).append( fileLink ).data( 'resource', r ).appendTo( list );
			}, this );
			
			if ( list.find( 'li' ).length > 1 ){
				list.sortable({
					stop: function( e, ui ){
						var arr=[];
						list.find( 'li' ).each( function( i, n ){
							arr.push( $( n ).data( 'resource' ) );
						});
						fiddle.set({ resources: arr });
						//self.refreshResources();
					}
				});
			}
		},
		removeResource: function( resourceName ){
			var resources=this.fiddle.get( 'resources' ),
			index=$.inArray( resourceName, resources );
			if ( index >= 0 ){
				resources.splice( index, 1 );
				this.fiddle.set({ resources: resources });
				this.refreshResources();
			}
		},
		resetFiddle: function( e ){
			if ( confirm( 'Do you want to reset all fields?' ) ){
				_.each( [ 'html', 'css', 'javascript' ], function( name ){
					this.panels[ name ].setValue('');
				}, this );
				this.runFiddle();
			}
		},
		resize: function( opt ){
			if ( !opt ) return this;
			if ( opt.ew ){
				var r=this._resizers.ew;
				r.css({ left: opt.ew });
			}
			if( opt.nsw ){
				this._resizers.ns.filter(':first').css({ top: opt.nsw });
			}
			if( opt.nse){
				this._resizers.ns.filter(':last').css({ top: opt.nse });
			}
			$( window ).resize();
		},
		runFiddle: function( e ){
			this._submitForm({ redirect: false });
		},
		saveFiddle: function( e ){
			this._submitForm({ action: 'save' });
		},
		showDependencies: function( id ){
			var deps=this.deps[ id ], list=$('#frameworkDeps ul:first' ),
			ids=[];
			list.find( 'input:checked').each( function(){ ids.push( $( this ).val() ); });
			list.empty();
			if ( deps && deps.length ){
				_.each( deps, function( dep, i ){
					var id="id_deps_"+i;
					var li=$('<li />').appendTo( list ),
					label=$('<label />', { 'text': dep.name, for: id }).appendTo( li ),
					cb=$('<input />', { type: 'checkbox', name: 'deps', value: dep.pk, id: id }).prependTo( label );
					if ( $.inArray( dep.pk, ids ) >= 0 ){
						cb.attr({ checked: 'checked' });
					}
				});
			}
		},
		showOptionsModal: function( e, el ){ 
			var off=el.offset(),
			modal=this.S.options_modal;
			modal.show().css({ top: off.top + el.outerHeight(), left: off.left }),
			fn=proxy( this.hideOptionsModal, this );
			setTimeout( function(){
				$( window ).bind( 'click.options',  fn );
			}, 10 );
		},
		tidyFiddle: function( e, el ){
			var js=this.panels.javascript.getValue(),
			newcode=js_beautify( js );
			this.panels.javascript.setValue( newcode );
			this.hideOptionsModal();
		},
		toggleSidebar: function( e ){
			var exp=this.content.hasClass( 'expanded' );			
			this.S.sidebar[ exp ? 'removeClass': 'addClass' ]( 'hidden' );
			this.S.content[ exp ? 'removeClass': 'addClass' ]( 'expanded' );
			this.S.toggle[ exp ? 'removeClass' : 'addClass' ]( 'closed' ).attr({ title: ( exp ? 'Hide' : 'Show' )+' sidebar' });
			$( window ).resize();
		},
		_bindKey: function( combo, cmd ){
			var self=this, 
			handler={
				'run':	this.runFiddle,
				'save': this.saveFiddle,
				'sidebar': this.toggleSidebar
				
			};
			if ( handler.hasOwnProperty( cmd ) ){ 
				KeyboardJS.unbind.key( combo );
				KeyboardJS.bind.key( combo, function( ev ){}, function( ev ){ 
					ev.stopPropagation();
					handler[ cmd ].call( self, ev );
				});
			}
		},
		_bindKeys: function( ){
			var keybindings=this.options.keybindings;
			_.each( keybindings, this._bindKey, this);
		},
		_bindResizable: function( id ){
			var
				panel=$( id ),
				gutter=8,
				ph=panel.height(),
				pw=panel.width(),
				poff=panel.offset(),
				columnHeight=ph - gutter * 2,
				columnWidth=pw - gutter * 3,
				nsresizer=panel.find( '.nsresizer' ),
				ewresizer=panel.find( '.ewresizer' ),
				columns=panel.find( '.panelColumn' ),
				leftColumn=columns.filter(':first'),
				rightColumn=columns.filter( ':last' ),
				mask=$('#panelMask'),
				timer=null;

			this._resizers={
				ns: nsresizer,
				ew: ewresizer,
				poff: poff,
				pw: pw,
				ph: ph
			};
			
			nsresizer.draggable({
				axis: 'y',
				zIndex: 30,
				start: dragStart( nsDrag ),
				stop: dragStop( nsDrag, function(){ $.cookie( 'nsresizer'+$( this ).closest( '.panelColumn' ).attr( 'id' ), this.offsetTop ); })
			});
			ewresizer.draggable({
				axis: 'x',
				zIndex: 30,
				start: dragStart( ewDrag ),
				stop: dragStop( ewDrag, function(){ $.cookie( 'ewresizer', this.offsetLeft );} )
			});
			
			function dragStart( fn ){
				return function( e, ui ){
					clearTimeout( timer );
					mask.show().css( { left: gutter, top: gutter} ).width( pw - 2 * gutter ).height( ph - 2 * gutter );
					fn( e, ui );
					timer=setInterval( function(){ fn( e, ui )}, 1 );
				};
			}
			function dragStop( fn, cookieFn ){
				return function( e, ui ){
					clearTimeout( timer );
					mask.hide();
					fn.call( this, e, ui );
					if ( cookieFn ){
						cookieFn.call( this, e, ui );
					}
				};
			}
			function nsDrag( e, ui ){
				updateColumn( ui.helper.closest( '.panelColumn' ) );
			}
			function ewDrag(){ // update outer wrap
				var left=ewresizer[0].offsetLeft;
					updateColumn( leftColumn.width( left - gutter ) );
					updateColumn( rightColumn.css({ left: left + gutter, width:  pw - ( left + 2 * gutter )}) );
			}
			function updateColumn( column ){
				if ( !( column && column.length )){
					console.log( 'FUCKYOU no column' );
					return false;
				}
				var resizer=column.find('.resizer'),
				top=resizer[ 0 ].offsetTop,
				width=column.width(),
				left=ewresizer[0].offsetLeft;
				resizer.prev('.editor').css({ top: 0, height: top - 2, width: width - 2}).trigger( 'change' );
				resizer.next( '.editor' ).css({ height: ph - ( top + gutter * 3) - 2 , top: top + gutter, width: width - 2}).trigger( 'change' );
			}
			
			function onResize( e ){ // set the panels width and height based on available space
				e.stopPropagation();
				update();
				panel.height( ph ).width( pw );
				columns.height( columnHeight ).each( function( i, n ){ updateColumn( $(n) );});
				ewresizer.height( columnHeight ).draggable( 'option', 'containment', [ poff.left + 100, 0, poff.left + pw - 100, 0 ] );
				nsresizer.draggable( 'option', 'containment', [ 0, poff.top + 100, 0, poff.top + ph - 100 ] );
				ewDrag();
				panel.trigger('change');
			}
			
			function reset(){ // set panel sized to defaults
				update();
				var ew=parseInt( $.cookie( 'ewresizer' ) || pw / 2, 10 ),
				ns1=parseInt( $.cookie( 'nsresizerleftColumn' ) || ph / 2, 10 ),
				ns2=parseInt( $.cookie( 'nsresizerrightColumn' ) || ph / 2, 10 );
				columns.css({ top: gutter, left: gutter });
				nsresizer.css({ height: gutter }).filter(':first').css({ top: ns1 }).end().filter(":last").css({ top: ns2 });
				rightColumn.css({ left: ew + gutter });
				
				ewresizer.css({ left: ew, top: gutter, width: gutter,  });
				
				ewDrag();
				
			}
			
			function update(){
				var
					wh=$( window ).height(),
					ww=$( window ).width();
					
				poff=panel.offset();
				ph=wh - poff.top;
				pw=ww - poff.left;
				columnHeight=ph - gutter * 2;
				columnWidth=pw - gutter * 3;
			}
			
			setTimeout( function(){
				reset();
				$( window ).bind( 'resize', onResize ).resize();
			}, 500 );
		},
		_exportFiddle: function( e, el ){
			this.S.export_modal.find( 'form' ).ajaxSubmit({
				dataType: 'json',
				url: this.fiddle.get( 'url' ) || location.href,
				beforeSubmit: function( arr, form ){
					arr.push({ name: 'action', value:'export' });
				},
				error: function(){
				},
				success: function( data ){ console.log( 'data', data )
					if ( data.url ){
						window.open( data.url );
					}
				}
			});
		},
		_handleButton: function( e, el ){
			e.preventDefault();
			var prop=el.data( 'prop' ) || el.attr( 'id' );
				if ( this[ prop ] && $.isFunction( this[ prop ] ) ){
					this[ prop ]( e, el );
				}
		},
		_loadDependencies: function( e, el ){ // refresh supoorted deps; check the server if neccessary
			var self=this,
				id=el.val(),
				deps=this.deps[ id ];
			if ( !deps ){
				$.ajax({
					type: 'get',
					url: location.href,
					data: { pk: id, action: 'deps' },
					success: function( data ){
						self.deps[ id ]=data;
						self.showDependencies( id );
					}
				});
			}
			else{
				this.showDependencies( id );
			}
		},
		_submitForm: function( opt ){
			var fiddle=this.fiddle,
				panels=this.panels,
				o=$.extend({}, {
					redirect: true,
					action: 'run'				
				}, opt || {} );
			_.each( [ 'html', 'javascript', 'css' ], function( name ){
				panels[ name ].editor.save();
			} );
			this.form.ajaxSubmit({
				url: fiddle.get( 'url' ) || location.href,
				beforeSerialize: function( form ){
					form.find( 'input[ name="resources" ]' ).val( JSON.stringify( fiddle.get( 'resources' ) ) );
				},
				beforeSubmit: function( arr, form ){
					arr.push({ name: 'action', value: o.action });
				},
				success: function( data ){
					if ( o.redirect ){
						if ( data.url ){
							document.location.href=data.url;
						}
					}
					else{
						fiddle.set( data );
					}
				}
			});
		},
		_toggleSidebarItem: function( e, el ){
			el.next().slideToggle( 125, function(){
				el[ $( this ).is(':visible' ) ? 'addClass' : 'removeClass' ]( 'open' );
			});
		},
		_uploadResource: function( e, input ){
			var self=this,
			modal=this.S.upload_modal,
			form=modal.find( 'form' );
			form.ajaxSubmit({
				success: function( url ){
					self.addResource( url );
					form.find( 'input[ type="file"]' ).val('');
				}
			});
		}
	});
	
	$.Fiddle.defaults={
		keybindings: {
			run: 'alt+r',
			save: 'alt+s',
			sidebar: 'alt+t'
		},
		models: {
			Fiddle: Fiddle,
		},
		views: {
			Results: ResultPanel,
			Editor: CodeEditor
		},
		selectors: {
			fiddle: '#fiddle',
			content: '#contentPanel',
			form: '#fiddleForm',
			resize_wrap: '#resizeWrap',
			html_editor: '#HTMLEditor',
			css_editor: '#CSSEditor',
			js_editor: '#jsEditor',
			result_panel: '#resultPanel',
			leftColumn: '#leftColumn',
			rightColumn: '#rightColumn',
			buttons: '#fiddleButtons',
			toggle: '#leftToggle',
			upload: '#uploadResource',
			sidebar: '#sidebar',
			current_fw: '#currentFramework',
			resource_button: '#resourceButton',
			resource_count: '#resourceCount',
			resource_list: '#resourceList',
			overlay: '#overlay',
			upload_modal: '#uploadModal',
			editor_modal: '#editorModal',
			options_modal: '#optionsModal',
			export_modal: '#exportModal'
		}
	};
	
	
	
	
	$.fn.tabMe=function( opt ){
		return this.each( function(){
			var ul=$( this ),
			ids;
			ul.on( 'click', 'li a', function( e ){
				e.preventDefault();
				var href=$( this ).attr( 'href' ),
				target=$( href );
				if ( target.length ){
					ul.find( '.selected' ).removeClass( 'selected' );
					$( this ).addClass( 'selected' );
					ids.hide();
					target.show();
				}
			});
			update();
			$( ids ).hide();
			ul.find( 'li a' ).filter(':first').click();
			
			function update(){
				var arr=[]
				ul.find( 'li a' ).each( function( i, n ){
					arr.push( $( this ).attr( 'href' ) );
				});
				ids=$(arr.join( ',' ));
			}
		});
	};
	
	$.fn.modalMe=function( opt ){
		return this.each( function(){
			$( this )
				.draggable({
					handle: 'h3'
				}).on( 'click', '.close', proxy( function(){
					$( this ).closest( '.modal').hide();
				})).bind( 'click', function( e ){ e.stopPropagation(); });
			
		});
	};
	
	$.fn.center=function( el, opt ){
		if ( $.isPlainObject( el ) ){ console.log( 'an object' );
			opt=el;
			el=opt.el;
		}
		el=$( el );
		console.log( 'el is ', el.length );
		if ( el.length ){
			var ow=el.outerWidth(), oh=el.outerHeight(),
			w=$( this ).outerWidth(), h=$( this ).outerHeight();
			$( this ).css({ left: ( ow - w ) /2, top: ( oh - h ) / 2 });
			//~ inner=$( this ).size();
			//~ console.log( 'sie', outer, inner );
			
		}
	};
$.Plugin({ // autocomplete
	name: 'ac',
	options: {
	minLength: 1,
	source: []
	//select: function( ){}
	},
	initialize: function(){
		var self=this, el=this.el, opt=this.options, timer=null;
		this.list=$('<ul />', { 'class': 'ac' }).appendTo( 'body' ).hide().on( 'mousedown', 'li', proxy( this.select, this ) );
		this.cache={};
		
		el.bind( 'keyup.'+this.pid, function( e ){
			var val=$( this ).val();
			if ( val.length >= opt.minLength ){
				timer=setTimeout( function(){
					self.runSearch( val );
				}, 500 );
			}
		}).bind( 'keydown.'+this.pid, function(){
			clearTimeout( timer );
		}).bind( 'dblclick.'+this.pid, function(){
			self.runSearch( $( this ).val() || "" );
			//( $( this ).val() && self.runSearch( $( this ).val() ) );
		});

	},
	filterResults: function( value, arr ){
		return $.grep( arr, function( v ){
			return v.slice( 0, value.length ) == value;
		});
	},
	runSearch: function( value ){
		var self=this, src=this.options.source;
		
		if ( value === true ){ //empty string search
			if ( this.cache._empty ){
				this.showResults( this.cache._empty );
			}
			else {
				if ( $.isArray( src ) ) {
					this.cache._empty=src;
					this.showResults( src );
				}
				else{
					$.ajax({
						url: src,
						data:{ term: ''},
						type: 'get',
						dataType: 'json',
						success: function( data ){
							self.cache._empty=$.isArray( data ) ? data : [ data ];
							self.showResults( self.cache._empty );
						}
					});
				}
			}
		}
		else if ( this.cache.hasOwnProperty( value ) ){
			this.showResults( this.cache[ value ] );
			return this;
		}
		else if ( $.isArray( src ) ){
			var results=this.filterResults( value, src );
			this.showResults( results );
		}
		else if( typeof( src ) === 'string' ){
			$.ajax({
				url: src,
				data:{ term: value},
				type: 'get',
				dataType: 'json',
				success: function( data ){
					self.cache[ value ]=$.isArray( data ) ? data : [ data ];
					self.showResults( data );
				}
			});
		}

	},
	select: function( e, el ){
		var item=el.data( 'item' ), fn=this.options.select, update=true;
		if ( fn && $.isFunction( fn ) ){
			update=fn.call( el, e, { item: item }) !== false;
		}
		if ( update ){
			this.el.val( item.value );
		}
		this.list.hide();
	},
	showResults: function( arr ){ 
		var list=this.list.empty(),
		event='mousedown.'+this.pid,
		off=this.el.offset();
		if ( $.isArray( arr ) && arr.length ){
			for ( var i=0, len=arr.length, item; i<len; i++ ){
				item=arr[ i ];
				if ( typeof( item )== 'string' ){
					item={ value: item, label: item }
				}
				if ( $.isPlainObject( item )){
					$('<li />').text( item.label ).data( 'item', item ).appendTo( list );
				}
			}
			list.show().css({ position: 'absolute', left: off.left, top: off.top + this.el.outerHeight(), width: this.el.outerWidth() });
			$( window ).bind( event, function(){ 
				$( this ).unbind( event );
				list.hide();
			});

		}
		else{
			list.hide();
		}
	}
});

	
	
	
})( jQuery );
