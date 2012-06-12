( function( $ ){
	
	
	var proxy=function( fn, ctx ){
		return function( e ){
			( e && e.preventDefault() );
			return fn.call( ctx || this, e, $( this ) );
		};
	};
	
	
	var CodeEditor=Backbone.View.extend({ // codemirror
		initialize: function(){
			var self=this,
				editor=this.editor=CodeMirror.fromTextArea( this.$('textarea')[ 0 ], {
					mode: this.options.mode,
					theme: 'elegant',
					lineNumbers: true
				}),
				el=$( this.el ).bind( 'change', function( e ){ console.log( 'change ', $( this ).width(), $( this ).height(), this.id );
					$( editor.getScrollerElement() ).height( $( this ).height() ).width( $( this ).width() );
				}).change(),
				label=this.label=$('<div />', { 'class': 'editorLabel' }).css({ position: 'absolute', top: 1, right: 1 }).appendTo( this.el ).html( this.options.label ),
				//~ trigger=this.trigger=$('<span />', { 'class': 'editorTrigger' }).appendTo( label ).hide().click( function( e ){
					//~ e.preventDefault();
				//~ });
				timer=null;
				el.bind('mouseenter', function(){
					clearTimeout( timer );
					timer=setTimeout( function(){
					label.fadeOut( 250 );
				}, 1000 );
				}).bind( 'mouseleave', function(){
					clearTimeout( timer );
					label.show();
				});
		},
		getValue: function(){
			return this.editor.getValue();
		},
		setMode: function( mode ){
			this.editor.setOption( 'mode', mode.toLowerCase() );
			this.label.html( mode );
		},
		setTheme: function( theme ){
			this.editor.setOption( 'theme', theme );
		},
		setValue: function( value ){
			this.editor.setValue( value );
			return this;
		},
		setLabel: function( html ){
			this.label.html( html );
		},
		toggleDropdown: function(){
		}
	});
	
	
	var Sidebar=Backbone.View.extend({
		el: '#leftPanel',
		initialize: function(){
			this.$('.accordion>li>a:not(.trigger)').bind( 'click', proxy( this.toggle, this )).each( function( i, n ){
				var text=$( this ).text().split(' ')[0].slice(0, 5 );
				if ( $.cookie( 'contentToggle_'+text ) == '1' ){
					$( this ).next().show();
				}
			});
		},
		toggle: function( e, el ){
			var next=el.next(),
				text=el.text().split(' ')[0].slice( 0, 5 );
			$.cookie( 'contentToggle_'+text, next.is(':hidden') ? 1 : 0 );
			next.slideToggle( 200 );
		}
	});
	
	var ContentPanel=Backbone.View.extend({
		el: '#contentPanel',
		initialize: function(){
			var el=$( this.el ), o=this.options;
			this.wrap=el.find( '.panelWrap' ).resizeMe();
			this.panels={
				html: new CodeEditor({ model: this.model, el: '#HTMLEditor', label: 'HTML', mode: 'htmlmixed' }), 
				javascript: new CodeEditor({ model: this.model, el: '#jsEditor', label: 'Javascript', mode: 'javascript' }),
				css: new CodeEditor({ model: this.model, el: '#CSSEditor', label: 'CSS', mode: 'css'  }),
				result: new ResultPanel({ model: this.model })
			};
		}
	});
	
	var ResultPanel=Backbone.View.extend({
		el: '#resultPanel',
		initialize: function(){
			$( this.el ).on( 'change', $.proxy( this._refresh, this ));
		},
		render: function(){ 
			var el=$( this.el ),
			src=this.model.get( 'src' );
			if ( el.find( 'iframe' ).length ){
				el.find( 'iframe' )[ 0 ].src=src;
			}
			else {
				el.html( '<iframe name="results" src="'+src+'" frameborder="1"></iframe>' );
			}
			this._refresh();
			return this;
		},
		_refresh: function(){
			var el=$( this.el );
			this.$('iframe').width( el.width() -2 ).height( el.height() - 2 );
		}
	});
		
	
	var App=$.Fiddle=Backbone.View.extend({
		el: '#fiddle',
		initialize: function( opt ){
			opt || ( opt = {} );
			var self=this;
			this.form=$( '#fiddleForm' ).submit( function(){ return false; });
			var fiddle=this.fiddle=new Fiddle( opt.fiddle );
			var profile=this.profile=new Profile( opt.profile );
			var sidebar=this.sidebar=$('#leftPanel');
			//var sidebar=this.sidebar=new Sidebar({ model: this.fiddle });
			//~ this.content=new ContentPanel({ model: this.fiddle });
			this.content=$('#contentPanel');
			this.contentWrap=this.content.find( '.panelWrap' ).resizeMe();
			var panels=this.panels={
				html: new CodeEditor({ model: fiddle, el: '#HTMLEditor', label: 'HTML', mode: 'htmlmixed' }), 
				javascript: new CodeEditor({ model: fiddle, el: '#jsEditor', label: 'Javascript', mode: 'javascript' }),
				css: new CodeEditor({ model: fiddle, el: '#CSSEditor', label: 'CSS', mode: 'css'  }),
				result: new ResultPanel({ model: fiddle })
			};
			
			this.fiddle.bind( 'change:src', this._onChange, this );
			this.runButton=$('#runfiddle').bind( 'click', proxy( this.runFiddle, this ) );
			this.saveButton=$('#savefiddle').bind( 'click', proxy( this.saveFiddle, this ) );
			this.leftToggle=$('#leftToggle').bind( 'click', proxy( this.toggleSidebar, this ) );
			this.userButton=$('#userButton' ).bind( 'click', proxy( this.toggleUserDropdown, this ) );
			this.userDropdown=$('#userDropdown').hide().click( function( e ){ e.stopPropagation(); });
			this.shareDropdown=$('#shareDropdown').hide().click( function( e ){ e.stopPropagation(); });
			
			this.content.bind( 'change', function(){
				sidebar.height( $( this ).height() );
			}).trigger( 'change' );
			var cssSelect=this.cssSelect=this.form.find( 'select[ name="csspanel" ]' ).bind( 'change', function(){
				panels.css.setMode( $( this ).find( ':selected' ).text() );
			}).change();
			var jsSelect=this.jsSelect=this.form.find( 'select[ name="jspanel" ]').bind( 'change', function(){
				panels.javascript.setMode( $( this ).find( ':selected' ).text() );
			}).change();
			$('#forkfiddle').click( proxy( this.forkFiddle, this ) );
			$('#basefiddle').click( proxy( this.baseFiddle, this ) );
			$('#resetfiddle').click( proxy( this.resetFiddle, this ) );
			$('#lintfiddle').click( proxy( this.lintFiddle, this ) );
			$('#sharefiddle').click( proxy( this.toggleShareDropdown, this ) );
			$('#resourceButton').click( proxy( this.addResource, this ) );
			this.form.find( 'select.theme_select' ).bind( 'change', function(){ // EDITOR THEMES
				var name=this.name.split('_')[0];
				panels[ name ].setTheme( $( this ).val() );
				$.cookie( this.name, $( this ).val() );
			}).each( function( i, n ){
				var cookie=$.cookie( this.name );
				if ( cookie ){
					$( this ).val( cookie ).change();
				}
			});
			
			if( profile.get( 'username' ) ){ // LOGGED IN USER / SETTINGS BINDINGS
				this.resourceDropdown=$('#resourceDropdown').hide().click( function( e ){ e.stopPropagation(); })
					.on( 'click', 'li a', function( e ){
						e.preventDefault();
						self.addResource( $( this ).attr( 'href' ) );
						$( this ).parent( 'li' ).hide();
					})
					
				$('#resourceDropdownTrigger').bind( 'click', $.proxy( this.toggleResourceDropdown, this ) );
				$('#settingsButton').click( proxy( this.showSettings, this ) );
				this.settingsPanel=$('#settingsPanel').on( 'click', '.close', function(e){
					e.preventDefault();
					$('#settingsPanel,#overlay').hide();
				});
				var settingsForm=this.settingsForm=$('#settingsForm').ajaxForm({
					dataType: 'json',
					beforeSerialize: function( form ){
						var tables=$('#resourcePairs,#frameworkPairs'),
						keyTable=$('#keyPairs'),
						keyInput=form.find( 'input[ name="keybindings" ]' ),
						keyValue=[],
						inputs={ frameworks: form.find( 'input[ name="frameworks" ]' ), resources: form.find( 'input[ name="resources" ]' )};
						tables.each( function( i, n ){
							var values=[];
							$( n ).find( 'tr.deleted' ).remove();
							$( n ).find( 'tbody tr' ).each( function( k, row ){ 
								var url=$( row ).removeClass( 'temp' ).find( 'input[ name="fURL"]' ).val(),
								name=$( row ).find( 'input[ name="fName"]' ).val();
								if ( name && url ){
									values.push( [ url, name ] );
								}
								else{
									$( row ).remove();
								}
							});
							inputs[ $( n ).hasClass( 'frameworkPairing' ) ? 'frameworks' : 'resources' ].val(JSON.stringify( values ));
						});
						keyTable.find( 'tbody tr' ).each( function( k, row ){
							var span=$( row ).find( 'span.keycombo'),
							oldCombo=span.data( 'combo' ),
							name=span.data( 'name' ),
							combo=span.text();
							if ( oldCombo !== combo ){
								KeyboardJS.unbind.key( oldCombo );
								span.data( 'combo', combo );
							}
							keyValue.push( [ name, combo ] );
						});
						keyInput.val( JSON.stringify( keyValue ) );
						
						form.data( 'hidden', form.find( 'input[ name="fURL"],input[ name="fName"]' ).each( function( i, n ){
							$( this ).data( 'name', this.name ).removeAttr( 'name' );
						}));
						
					},
					beforeSubmit: function( arr, form ){
						
					},
					success: function( data ){ 
						profile.set( data );
					}
				});
				
				settingsForm.find( 'span.keycombo' ).keyComboEditor({
					change: function(){ settingsForm.submit(); }
				}).end()
					.find( 'input, select' ).bind( 'change', function(){ settingsForm.submit(); });
				$('#settingsTabs ul:first').tabMe();
				$('#settingsFrameworks,#settingsResources').formPairing();
			}
			
			this.sidebar.find('.accordion>li>a:not(.trigger)').bind( 'click', function( e ){
				e.preventDefault();
				var next=$( this ).next(),
					text=$( this ).text().split(' ')[0].slice( 0, 5 );
				$.cookie( 'contentToggle_'+text, next.is(':hidden') ? 1 : 0 );
				next.slideToggle( 200 );
			}).each( function( i, n ){
					var text=$( this ).text().split(' ')[0].slice(0, 5 );
					if ( $.cookie( 'contentToggle_'+text ) == '1' ){
						$( this ).next().show();
					}
				});
			
			var keybindings=this.profile.get('keybindings');
			this._bindKeys( keybindings );
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
		removeResource: function( resourceName ){
			var resources=this.fiddle.get( 'resources' ),
			index=$.inArray( resourceName, resources );
			if ( index >= 0 ){
				resources.splice( index, 1 );
				this.fiddle.set({ resources: resources });
				this.refreshResources();
			}
			this.resourceDropdown.find( 'a[ href="'+resourceName+'"]' ).parent( 'li' ).show();
		},
		refreshResources: function(){
			var
				self=this,
				list=$('#resourceList').html('').sortable( 'destroy' ),
				fiddle=this.fiddle,
				resources=this.fiddle.get( 'resources' );
			$('#resourceCount').text( resources.length );
			_.each( resources, function( r ){
				var existing=this.resourceDropdown.find( 'a[ href="'+r+'"]');
				var name=existing.length ? existing.text() : r.split('/').pop(),
				a=$('<a/>', { 'class': 'right remove', html: 'X', href: '#', title: 'Remove resource' }).click( function(e){
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
		baseFiddle: function( e ){
			this._submitForm({ action: 'base' });			
		},
		forkFiddle: function( e ){
			this._submitForm({ action: 'fork' });			
		},
		lintFiddle: function(){
		},
		resetFiddle: function( e ){
			if ( confirm( 'Do you want to reset all fields?' ) ){
				_.each( [ 'html', 'css', 'javascript' ], function( name ){
					this.panels[ name ].setValue('');
				}, this );
				this.runFiddle();
			}
		},
		runFiddle: function( e ){
			this._submitForm({ redirect: false });
		},
		saveFiddle: function( e ){
			this._submitForm({ action: 'save' });
		},
		showSettings: function( e ){
			( e && e.preventDefault() );
			this.hideUserDropdown();
			var wrap=this.contentWrap,
				//~ settingsPanel=this.settingsPanel,
				off=wrap.offset(),
				ww=$( window ).width(),
				wh=$( window ).height(),
				width=wrap.width() - 22,
				height=wrap.height() - 22,
				overlay=( $('#overlay').length && $('#overlay' ) ) || $('<div />', { 'class': 'overlay', id: 'overlay' }).appendTo( 'body' );
			overlay.show().css({ width: ww, height: $( document ).height(), top: 0, left: 0 });
			this.settingsPanel.show().css( { left: off.left + 10, top: off.top + 10 }).width( width ).height( height )
			
			var tWrap=$('#tabWrapper');
			tWrap.css({ height: height - ( 50 +  tWrap[0].offsetTop ) });
		},
		_submitForm: function( opt ){
			var fiddle=this.fiddle,
			o=$.extend({}, {
				redirect: true,
				action: 'run'				
			}, opt || {} );
			this.form.find( 'input[ name="resources" ]' ).val( JSON.stringify( fiddle.get( 'resources' ) ) );
			_.each( [ 'html', 'javascript', 'css' ], function( name ){
				this.panels[ name ].editor.save();
			}, this );
			this.form.ajaxSubmit({
				beforeSubmit: function( arr, form ){
					arr.push({ name: 'action', value: o.action });
				},
				url: fiddle.get( 'url' ) || location.href,
				success: function( data ){
					if ( o.redirect ){
						document.location.href=data.url;
					}
					else{
						fiddle.set( data );
					}
				}
			});
		},
		toggleSidebar: function( e ){ 
			var expanded=this.content.hasClass( 'expanded' ),
			a=$( '#leftToggle');
			this.sidebar[ expanded ? 'removeClass': 'addClass' ]( 'hidden' );
			this.content[ expanded ? 'removeClass': 'addClass' ]( 'expanded' );
			if ( expanded ){
				a.prependTo( this.sidebar).css({ top: 4, left: a.data( 'left' )}).removeClass( 'closed' ).attr({ title: 'Close sidebar' });
			}
			else {
				a.data( 'left', a.css( 'left' )).data( 'top', a.css( 'top' )).appendTo( 'body' ).css( { top: this.sidebar.offset().top, left: 0, position: 'absolute' } ).addClass( 'closed' ).attr({ title: 'Open sidebar'});
				console.log( 'top?', a.data( 'top' ));
			}
			$( window ).resize();
			//setTimeout( function(){ $( window ).resize();}, 125 );
		},
		toggleShareDropdown: function(){
			this[( this.shareDropdown.is(':hidden') ? 'show' : 'hide' )+'ShareDropdown']();
		},
		showShareDropdown: function(){ console.log( 'show share' );
			var a=$('#sharefiddle'),
			dropdown=this.shareDropdown,
			fn=proxy( this.hideShareDropdown, this ),
			off=a.offset();
			dropdown.css({ left: off.left, top: off.top + a.outerHeight()}).slideDown( 100, function(){
				$( window ).bind( 'click.sharedropdown', fn );
			});
		},
		hideShareDropdown: function(){ console.log( 'hide share' );
			this.shareDropdown.fadeOut( 100 );
			$( window ).unbind( 'click.sharedropdown' );
		},
		toggleUserDropdown: function( e ){
			if ( e ){ e.preventDefault(); e.stopPropagation(); }
			var showing=this.userDropdown.is(':visible');
			this[ ( showing ? 'hide' : 'show' )+'UserDropdown' ]()
				
		},
		hideUserDropdown: function(){
			this.userDropdown.slideUp( 200 );
			$( window ).unbind( 'click.userbutton' );
		},
		showUserDropdown: function(){
			var btn=this.userButton,
				off=btn.offset(),
				width=btn.outerWidth(),
				height=btn.outerHeight(),
				dropdown=this.userDropdown;
				
			dropdown.css({ right: 10 , top: off.top + height }).slideDown( 200 );
			$( window ).bind( 'click.userbutton', $.proxy( this.hideUserDropdown, this ) );
			
		},
		toggleResourceDropdown: function( e ){
			if ( e ){ e.preventDefault(); e.stopPropagation(); }
			var showing=this.resourceDropdown.is(':visible');
			this[ ( showing ? 'hide' : 'show' )+'ResourceDropdown' ]()
				
		},
		hideResourceDropdown: function(){
			this.resourceDropdown.hide();
			$('#resourceDropdownTrigger' ).removeClass( 'open' )
			$( window ).unbind( 'click.resourcebutton' );
		},
		showResourceDropdown: function(){
			var btn=$('#resourceDropdownTrigger' ).addClass( 'open' ),
				off=btn.offset(),
				width=btn.outerWidth(),
				height=btn.outerHeight(),
				resources=this.fiddle.get( 'resources' ),
				dropdown=this.resourceDropdown;
				
			for ( var i=0, len=resources.length; i<len; i++ ){
				var a=dropdown.find( 'a[ href="'+resources[ i ]+'"]' );
				if ( a.length ){
					a.parent( 'li' ).hide();
				}
			}
			dropdown.css({ left: off.left + width + 5 , top: off.top - 20 }).fadeIn( 100 );
			$( window ).bind( 'click.resourcebutton', $.proxy( this.hideResourceDropdown, this ) );
			
		},
		_bindKey: function( arr ){
			var self=this, 
			handler={
				'run':	this.runFiddle,
				'save': this.saveFiddle,
				'sidebar': this.toggleSidebar
				
			};
			var cmd=arr[ 0 ], combo=arr[ 1 ];
			if ( handler.hasOwnProperty( cmd ) ){ 
				KeyboardJS.unbind.key( combo );
				KeyboardJS.bind.key( combo, function( ev ){}, function( ev ){ 
					ev.stopPropagation();
					handler[ cmd ].call( self, ev );
				});
			}
		},
		_bindKeys: function( keybindings ){
			_.each( keybindings, this._bindKey, this);
		},
		_onChange: function(){ 
			this.panels.result.render();
		}
	});
	
	$.fn.resizeMe=function( opt ){
		return this.each( function(){
			opt || ( opt = {} );
			
			var
				panel=$( this ),
				gutter=opt.gutter || 8,
				ph=panel.height(),
				pw=panel.width(),
				poff=panel.offset(),
				columnHeight=ph - gutter * 2,
				columnWidth=pw - gutter * 3,
				nsresizer=panel.find( '.nsresizer' ),
				ewresizer=panel.find( '.ewresizer' ),
				columns=panel.find( '.panelColumn' ),
				leftColumn=$('#leftColumn'),
				rightColumn=$('#rightColumn' );

			
			nsresizer.draggable({
				axis: 'y',
				drag: nsDrag,
				stop: function( e, ui){
					$.cookie( 'nsresizer'+$( this ).closest( '.panelColumn' ).attr( 'id' ), this.offsetTop );
					nsDrag( e, ui );
				}
			});
			ewresizer.draggable({
				axis: 'x',
				drag: ewDrag,
				stop: function(){
					$.cookie( 'ewresizer', this.offsetLeft );
					ewDrag();
				}
			});
			
			function nsDrag( e, ui ){
				updateColumn( ui.helper.closest( '.panelColumn' ) );
			}
			function ewDrag(){ // update outer wrap
				var left=ewresizer[0].offsetLeft;
					updateColumn( leftColumn.width( left - gutter ) );
					updateColumn( rightColumn.css({ left: left + gutter, width:  pw - ( left + 2 * gutter )}) );
					$.cookie( 'ewresizer', left );
			}
			function updateColumn( column ){
				var resizer=column.find('.resizer'),
				top=resizer[ 0 ].offsetTop,
				width=column.width(),
				left=ewresizer[0].offsetLeft;
				resizer.prev('.editor').css({ top: 0, height: top - 2, width: width - 2}).trigger( 'change' );
				resizer.next( '.editor' ).css({ height: ph - ( top + gutter * 3) - 2 , top: top + gutter, width: width - 2}).trigger( 'change' );
			}
			
			function onResize( e ){ // set the panels width and height based on available space
				e.stopPropagation();
				_update();
				panel.height( ph ).width( pw );
				columns.height( columnHeight ).each( function( i, n ){ updateColumn( $(n) );});
				ewresizer.height( columnHeight ).draggable( 'option', 'containment', [ poff.left + 100, 0, poff.left + pw - 100, 0 ] );
				nsresizer.draggable( 'option', 'containment', [ 0, poff.top + 100, 0, poff.top + ph - 100 ] );
				ewDrag();
				panel.trigger('change');
			}
			
			function reset(){ // set panel sized to defaults
				_update();
				var ew=parseInt( $.cookie( 'ewresizer' ) || pw / 2, 10 ),
				ns1=parseInt( $.cookie( 'nsresizerleftColumn' ) || ph / 2, 10 ),
				ns2=parseInt( $.cookie( 'nsresizerrightColumn' ) || ph / 2, 10 );
				columns.css({ top: gutter, left: gutter });
				nsresizer.css({ height: gutter }).filter(':first').css({ top: ns1 }).end().filter(":last").css({ top: ns2 });
				rightColumn.css({ left: ew + gutter });
				
				ewresizer.css({ left: ew, top: gutter, width: gutter,  });
				
				ewDrag();
				
			}
			
			function _update(){
				var
					wh=$( window ).height(),
					ww=$( window ).width();
					
				poff=panel.offset();
				ph=wh - poff.top;
				pw=ww - poff.left;
				columnHeight=ph - gutter * 2;
				columnWidth=pw - gutter * 3;
			}
			
			reset();
			$( window ).on( 'resize' , onResize );
			setTimeout( function(){ $( window ).trigger('resize'); }, 500 );
		});
	};
	
	$.fn.tabMe=function(){
		return this.each( function(){
			var ul=$( this ),
			arr=[],
			ids='';
			links=ul.find( 'li a' ).each( function( i, n ){
				var href=$( this ).attr( 'href' );
				arr.push( href );
				$( this ).click( function( e ){
					e.preventDefault();
					ul.find( '.selected' ).removeClass( 'selected' );
					$( this ).addClass( 'selected' );
					$( ids ).hide();
					$( href ).show();
				});
			});
			ids=arr.join( ',' );
			$( ids ).hide();
			$( links[ 0 ] ).click();
		});
	};
	
	$.fn.formPairing=function(){
		return this.each( function(){
			var self=$( this ),
			form=self.closest( 'form' ),
			table=self.find( 'table tbody' ),
			baseRow=table.find( 'tr:first' );
			self.on( 'click', '.remove', function( e ){
				e.preventDefault();
				var row=$( this ).closest( 'tr' ).toggleClass( 'deleted' );
				if ( row.hasClass( 'temp' ) ){
					row.remove();
				}
			})
			.on( 'click', '.add', function(){
				var newRow=baseRow.clone().appendTo( table ).addClass( 'temp' );
				newRow.find( 'input[ type="text"]').val('');
			})
			.on( 'click', '.upload', function( e ){
				e.preventDefault();
				var newRow=baseRow.clone().appendTo( table ).addClass( 'temp' );
				newRow.find( 'input[ type="text"]').val('');
				var fInput=$('<input type="file" name="resource" />').insertBefore( newRow.find( 'input[ name="fURL"]').hide() ).
					bind( 'change', function( ev ){
						var uploadForm=$('#uploadForm')
							//.show()
							.css({ position: 'absolute', width: 1, height: 1, left: '-10px' })
							
							uploadForm.find( 'p' ).empty().append( fInput );
							
							uploadForm.ajaxSubmit({
								dataType: 'html',
								//type: 'post',
								//url: uploadForm.attr( 'action' ),
								success: function( d ){
									var data=JSON.parse( d );
									newRow.find( 'input[ name="fURL"]').val( data.url ).show();
									newRow.find( 'input[ name="fName"]').val( data.name );
									uploadForm.hide();
									fInput.remove();
								}
							});
						
					});
			});
			table.sortable({
				selector: 'tr',
				handle: '.handle'
			});
		});
	};
	

	
	$.fn.keyComboEditor=function( opt ){
		return this.each( function(){
			opt || ( opt={} );
			var span=$( this ),
			input=( $('#keycomboInput').length && $( '#keycomboInput' )) || $('<input type="text" name="combo" id="keycomboInput" />');
			
			function update( keys ){
				input.val( keys.join( '+') ).bind( 'keydown.submit', function( e ){
					if ( ( e.which || e.keyCode ) === 13 ){
						stopEditing();
					}
				}).bind( 'blur', stopEditing );
			}
			function startEditing(){
				input.val( span.text() ).insertAfter( span.hide()).show()[0].focus();
				input.unbind( 'keydown.combo' ).bind( 'keydown.combo', function(e){
					var keys=[];
					var keyInterval=setInterval( function(){
						keys=KeyboardJS.activeKeys();
					}, 10 );
					$( this ).bind( 'keyup.combo', function(){
						$( this ).unbind( 'keyup.combo' );
						clearInterval( keyInterval );
						if ( keys.length ){
							e.stopPropagation();
							update( keys );
							keys=[];
						}
					});
				});
			}
			function stopEditing(){
				var combo=input.val();
				span.text( combo ).show().trigger( 'change', { 'combo': combo} );
				input.unbind().remove();
				if ( opt.change ){
					opt.change.call( span, combo, span );
				}
			}
			
			span.bind( 'click', startEditing);
		});
	};
	
	
	
	
	
})( jQuery );
