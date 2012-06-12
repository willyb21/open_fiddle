
( function( $, undefined ){
	var root=this,
	slice=function( arr, index ){
		return Array.prototype.slice.call( arr, index );
	},
	isString=function( str ){
		return typeof str === 'string';
	};
	
	(function(){
	var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;
	  root.Class = function(){};
	  Class.extend = function(prop) {
		  
		  function extend( properties ){
				for (var name in properties) {
				  prototype[name] = typeof properties[name] == "function" &&
					typeof _super[name] == "function" && fnTest.test(properties[name]) ?
					(function(name, fn){
					  return function() {
						var tmp = this._super;
						this._super = _super[name];
						var ret = fn.apply(this, arguments);       
						this._super = tmp;
						return ret;
					  };
					})(name, properties[name]) :
					( name === 'options' && $.isPlainObject( properties[ name ] ) && $.isPlainObject( prototype[ name ]) ?
						$.extend({}, prototype[ name ], properties[ name ] ) :
						properties[name]
					) ;
				}
		  }
		var _super = this.prototype;
		initializing = true;
		var prototype = new this();
		initializing = false;
		extend( prop );
		if ( prototype.mixins && $.isArray( prototype.mixins )){
			for ( var i=0,len=prototype.mixins.length, mixin; i<len; i++ ){
				mixin=prototype.mixins[ i ];
				extend( $.isFunction( mixin ) ? mixin.prototype : mixin );
			}
			prototype._mixins=JSON.stringify( prototype.mixins );
		}
		delete prototype.mixins;

		function Class() {
		  if ( !initializing && this.init )
			var ret=this.init.apply(this, arguments);
			if ( ret !== undefined ){
				console.log( 'override ', ret );
				return ret;
			}
		}
		Class.prototype = prototype;
		Class.constructor = Class;
		Class.extend = arguments.callee;
		return Class;
	  };
	})();
	var uid=function(){
		var prefixes={};
		return function( prefix ){
			prefix || ( prefix='none' );
			if ( !prefixes.hasOwnProperty( prefix ) ){
				prefixes[ prefix ] = 0;
			}
			var count=prefixes[ prefix ] = prefixes[ prefix ] + 1;
			return prefix == 'none' ? count : prefix+''+count;
		}
	}();
	
	var Observable=Class.extend({
		listeners: {},
		init: function( options, defer ){
			options=options || {};
			var
				self=this,
				listeners=$.extend( {}, this.listeners, options.listeners || {} );
				
			this.listeners={};
			$.each( listeners, $.proxy( this.bind, this ) );
			
			// prefix these methods with underscore to return a function
			$.each( [ 'trigger', 'bind', 'unbind' ], $.proxy( function( m ){
				this[ '_'+m ]=function(){
					var args=slice( arguments );
					return function(){
						var sargs=slice( arguments );
						return self[ m ].apply( self, args.concat( sargs ) );
					}
				};
			}, this ));
			this._applyEvents();
			if ( !defer ){
				this.initialize();
			}
		},
		initialize: function(){},
		bind: function( e, fn, context ){
			if ( !e ) return this; 
			var events=this._splitEvents( e ),
				listeners=this.listeners;
			$.each( events, function( i, event ){
				var arr=listeners[ event ] || ( listeners[ event ] = [] );
				arr.push({ fn: fn, context: context });
			});
			return this;
		},
		hasListener: function( event ){
			return !!( this.listeners[ event ] && this.listeners[ event ].length );
		},
		trigger: function( e ){ /* DOES NOT RETURN ITSELF */
			function fireAll( aListeners, args ){
				for ( var i=0, len=aListeners.length, listener; i<len; i++ ){
					listener=aListeners[ i ];
					if ( listener.fn.apply( listener.context || self, args ) === false ){
						return false;
					}
				}
				return true;
			}
			
			var self=this,
			args=slice( arguments, 1 ),
			events=this._splitEvents( e ),
			i=0, len=events.length, event,
			listeners=this.listeners;
			for( ; i<len; i++){
				event=events[ i ];
				args.unshift( event );
				( listeners[ 'all' ] && fireAll( listeners[ 'all' ], args ) );
				args.shift(); // remove the event arg
				if ( listeners[ event ] ){
					if(  fireAll( listeners[ event ], args ) === false ){
						break;
					}
				}
			}
			return true;
		},
		unbind: function( event, fn ){
			if ( !event ){
				this.listeners={};
			}
			else if ( !fn ){
				( this.listeners[ event ] && ( this.listeners[ event ] = [] ) );
			}
			else {
				var arr=this.listeners[ event ];
				if ( arr ){
					var i=arr.length;
					while( i-- ){
						if ( arr[ i ].fn === fn ){
							arr.splice( i, 1 );
							break;
						}
					}
				}
			}
			return this;
		},
		_applyEvents: function(){
			var self=this, el=this.el, events=this.events;
			$.each( events, function( event, fn ) {
				if ( isString( fn ) ){
					fn=self[ fn ];
				}
				if ( $.isFunction( fn ) ){
					var cb=function( e ){
						var ret=fn.apply( self, arguments );
						if ( ret !== true ) e.preventDefault();
						return ret
					},
					arr=event.split(' '),
					e=arr[ 0 ]; // the event
					/*{ 'click td a.name': function(){}} */
					if ( e ){
						e=$.trim( e );
						if ( arr.length > 1 ) {
							el.on( e, slice( arr, 1 ).join(' '), cb );
						}
						else{
							el.on( e, cb );
						}
					}
					
				}
				else console.log( 'Bad event', event, fn );
			} );
		},
		_splitEvents: function( e ){ // in the events hash
			if ( e.indexOf( ',' ) >= 0 ){
				var events=e.split(',');
				return $.grep( events, function( event ){
					return ( event && $.trim( event ) );
				});
			}
			return [ e ];
		}
	});
	
	var Pigpen=function(){ // useless?
		var pigs={};
		
		function getPig( pid ){
			return pigs[ pid ];
		}
		function registerPig( pig ){
			var pid=pig.pid=uid('p');
			pigs[ pid ]=pig
		}
		function removePig( pig ){
			delete pigs[ pig.pid ];
		}
		return {
			registerPig: registerPig,
			removePig: removePig,
			getPig: getPig
		};
	}();
	var Pig=Observable.extend({ // a class like function for creating jQuery plugins / new plugins extend this object
		options: {},
		events: {},
		init: function( el, options, defer ){
			el=this.el=$( el );
			this._options=options;
			this.options=$.extend( {}, this.options, options || {} );
			if ( this.options.events ){
				this.events=$.extend({}, this.events, this.options.events );
			}
			this[ '$' ]=function(){
				return el.find.apply( el, arguments );
			};
			this._super( this.options, defer );
		},
		destroy: function(){
			this.el.unbind().remove();
			this.trigger( 'destroy', this );
			Pigpen.removePig( this );
		},
		initialize: function(){},
		on: function( ){ // I FUCKING HATE THIS METHOD...USELESS
			this.el.on.apply( this.el, arguments );
			return this;
		},
		run: function( command, key, value){ 
			// override this to change how an instantiated element handles new calls
			if ( command === 'option' ){
				return this._setOption( key, value ); // get or set
			}
			else if ( this[ command ] && $.isFunction( this[ command ]) && command.charAt( 0 ) !== '_'  ){ 
				this[ command ].apply( this, slice( arguments, 1 ) );
			}
			return this;
			
		},
		_setOption: function( key, value ){
			if ( !value ){
				return this.options[ key ];
			}
			else if ( key && value ) {
				this.options[ key ] = value;
				this.trigger( 'setoption', key, value, this );
			}
		}
	});
	
	
	var Piglet=Class.extend({ // create a new piglet per plugin
		abstract: false,			/* if true, no plugin is defined on the jQuery namespace */
		base: undefined, 		/* starting point for addressing this plugins namespace */
		name: undefined, 		/* the jquery method to call this plugin */
		ns: undefined, 			/* textual namespace to put the plugin definition */
		plugin: undefined,		/* the classtype to return as plugin function  defaults to Pig */
		init: function( opt ){	/* @opt - Object - Pig class methods and properties */
			opt= opt || {};			
			var name=opt.name || this.name,
				abstract=opt.abstract ||  this.abstract,
				ns=opt.ns || this.ns || name,
				plugin=opt.plugin || this.plugin || Pig,
				namespace=opt.base || jQuery, 
				_ns='$',					// text representation of namespace ( used only for visualizing the resolved namespace )
				farmer; 					// the function which handles invoking/reinvoking the plugin on an element 
				
			if ( !name ) throw "This little Piglet needs a name!";
			if ( !plugin ) throw "Piglet requires a plugin class!";
			if ( $.fn[ name ] ) throw "The plugin name "+name+" is already taken";
			
			plugin=this.plugin=plugin.extend( opt );// overwrite our plugin with extended class
			this.name=name;
			this.base=namespace;
			
			farmer=function( el ){ // invokation of the plugin always passes through the farmer
				function P(){
					return plugin.constructor.apply( this, args );
				}
				P.prototype=plugin.prototype;
				P.constructor=plugin;
				
				var
					pig=$( el ).data( name ),
					args=arguments;
					
				if ( pig ){ // this plugin has been invoked ~ call the invoked plugin's run method
					return pig.run.apply( pig, slice( args, 1 ) );
				}
				pig=new P();
				Pigpen.registerPig( pig );
				$( el ).data( name, pig );
			};
			
			/* ( return constructor )  --  new PluginName( o )  \\  $( el ).pluginname( o )  \\  new $.namespace.PluginName( o ) */
			var rc=this.rc=function( el, instanceOptions ){ 
				if ( $.isPlainObject( el ) ){
					instanceOptions=el;
					el=instanceOptions.el;
					delete instanceOptions.el;
				}
				el=$( el );
				if ( el.length ){ // call our plugin on the element
					el[ name ]( instanceOptions );
					return el.data( name );
				}
				else {
					console.error( 'No element was passed to the Pig constructor. Pass an element as first argument or as an el property to an options object' );
				}
			};
			
			// create a new Plugin passing our extended plugin 
			rc.extend=function( pigOptions ){ 
				return Plugin($.extend({}, pigOptions, { plugin: plugin }))
			};
			rc.prototype=plugin.prototype;
			rc.constructor=plugin;
			
			
			// register namespace
			for( var arr=ns.split( '.' ), i=0, len=arr.length, n; i<len; i++ ){
				n=$.trim( arr[ i ] );
				if ( !( namespace.hasOwnProperty( n ))){
					namespace[ n ]= i===( len - 1 ) ? rc : {};
				}
				else if ( i === ( len - 1 ) ){ // last item in namespace array
					if ( $.isPlainObject( namespace[ n ] ) ){ // namespace has been created before, copy object properties and attach them to the function
						var tmp=namespace[ n ];
						namespace[ n ]=rc;
						for ( var k in tmp ){
							namespace[ n ][ k ]=tmp[ k ];
						}
					}
					else{
						console.error( 'Namespace is taken...holy shit!' );
					}
				}
				_ns=_ns+'.'+n;
				namespace=namespace[ n ];
			}
			
			/* register a plugin to call the farmer function */
			$.fn[ name ]=function(){
				farmer.apply( null, [ this ].concat( slice( arguments )) );
				return this;
			};
			
		}
	});
	
	var Plugin=function( opt, base ){
		var piglet=new ( base || Piglet )( opt );
		return piglet.rc;
	};
	$.extend( $, {
		Class: Class,
		Observable: Observable,
		Pig: Pig,
		Piglet: Piglet,
		Pigpen: Pigpen,
		Plugin: Plugin
	});

})( jQuery );
