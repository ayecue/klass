/**
 *	Class Framework
 *
 *	API:
 *		Class Keywords:
 *			static 		> Scope for static functions and objects.
 *			extends 	> Set parent class and extend properties to child.
 *			_self 		> Pointer to class.
 *			_parents 	> Collection of all parents.
 *			_listener 	> Collection of all listener.
 *
 *		Class Build Settings:
 *			singleton			> Just got one instance.
 *			debug				> Output of debug messages.
 *			autoSetterGetter 	> Automatically creating standart setter and getter functions.
 *
 *		Class Internal Methods:
 *			getCalledFunctionName 			> Name of current calling function.
 *			getCalledFunctionContextName 	> Get name of current scope.
 *			callParent 						> Calling single parent. Also returning the value of the parent function.
 *			callParents 					> Calling all parents.
 *			getParents 						> Get all extending parents.
 *			addListener 					> Add hook to function.
 *			removeListener 					> Remove hook from function.
 *			getName 						> Get class name.
 *			setName 						> Set class name.
 *			logMessage 						> Special message just for the class. (Output: [%classname%.%methodname%] strings objects)
 */

var /**
	 * 	Shortcuts
	 */
	_forEach = require('./klass/forEach'),
	_toArray = require('./klass/toArray'),
	_extend = require('./klass/extend'),
	_printf = require('./klass/printf');

/**
 *	Default Properties
 */
var defaultDeepLoggingLevel = false,
	defaultDebugging = false,
	defaultAutoSetterGetter = true,
	exceptionColor = '#D8000C',
	successColor = '#4F8A10',
	userColor = '#008B8B';

/**
 *	Internal Properties
 */
var classCollection = {},
	extendSetterTpl = 'set%:olettersnumber,camelcase:keyword%',
	extendGetterTpl = 'get%:olettersnumber,camelcase:keyword%',
	logMessageUnknownName = 'unknown',
	logMessageAnonymousName = 'anonymous',
	logMessageSearchPattern = /pLogMessage/i,
	logMessageTracePattern = /at\s(\S+)\s[^\(]*\(([^\)]+)\)/i,
	logMessageTraceTpl = '${%name%} (%link%)',
	logMessageStyleTpl = 'color:%hexcode%;';

/**
 *	Context Functions
 */
var getClass = function(path,delimiter){
		var splitted = path.split(delimiter || '.');
		
		return _forEach(splitted,function(_,className){
			if (className in this.result) {
				this.result = this.result[className];
			} else {
				this.result = null;
				this.skip = true;
			}
		},this);
	},
	getClassName = function(){
		var self = this;
	
		if ('name' in self) {
			return self.name;
		} else if ('_self' in self && 'name' in self._self) {
			return self._self.name;
		}
		
		return getClassId();
	},
	getClassSetup = function(){
		return {
			deepLoggingLevel : defaultDeepLoggingLevel,
			debug : defaultDebugging,
			autoSetterGetter : defaultAutoSetterGetter,
			_self : this,
			_parent : null,
			_listener : {
				before : {},
				after : {}
			}
		};
	},
	setClassContext = function(base,keyword,property){
		_extend(this,{
			'_calledFunctionContext' : base,
			'_calledFunctionName' : keyword,
			'_calledFunction' : property
		});
	},
	getClassOldContextArgs = function(base,keyword,property){
		return [
			this._calledFunctionContext,
			this._calledFunctionName,
			this._calledFunction
		];
	},
	addClassCallback = function(event,keyword,fn){
		var self = this;
	
		if (!(event in self._listener)) {
			self._listener[event] = [];
		}
		
		if (keyword in self._listener[event]) {
			self._listener[event][keyword].push(fn);
		} else {
			self._listener[event][keyword] = [fn];
		}
	},
	removeClassCallback = function(event,keyword,fn){
		var self = this;
	
		if (event in self._listener && keyword in self._listener[event]) {
			self._listener[event][keyword] = _forEach(self._listener[event][keyword],function(i,n){
				if (n != fn) {
					this.result.push(n);
				}
			},[]);
		}
	},
	createClassFunction = function(keyword,property){
		var base = this,
			basename = base.getName();
			
		return function(){
			var self = this,
				oldArgs = getClassOldContextArgs.call(self),
				result;
		
			setClassContext.call(self,base,keyword,property);
			
			if (_forEach(self._listener.before[keyword],function(_,callback){
				if (callback.call(self,keyword,property,base,basename) === false){
					this.result = false;
					this.skip = true;
				}
			},true)) {
				result = property.apply(self,arguments);
			}
			
			_forEach(self._listener.after[keyword],function(_,callback){
				callback.call(self,keyword,property,base,basename,result);
			});
			
			setClassContext.apply(self,oldArgs);
			
			return result;
		};
	},
	addClassFunction = function(keyword,property){
		var base = this,
			fn = createClassFunction.call(base,keyword,property);
	
		if (base.debug) {
			addClassCallback.call(base,'before',keyword,function(keyword,property,base,basename){
				pLogMessage.call(this,'start');
			});
			
			addClassCallback.call(base,'after',keyword,function(keyword,property,base,basename,result){
				pLogMessage.call(this,['returns:',result]);
			});
		
			base[keyword] = function(){
				return fn.apply(this,arguments);
			};
		} else {
			base[keyword] = fn;
		}
	},
	addClassValue = function(keyword,property){
		this[keyword] = property;
	},
	addParentProperty = function(base,keyword,property){
		var self = this,
			name = getClassName.call(base),
			parent = self._parent || {};

		parent[keyword] = property;
		
		self._parent = parent;
	},
	addClassProperty = function(keyword,property){
		var self = this,
			type = typeof property;
			
		if (type in defaultClassExtendHandling) {
			defaultClassExtendHandling[type].call(self,keyword,property);
		} else {
			defaultClassExtendHandling['default'].call(self,keyword,property);
		}
	},
	extendGetterSetterEx = function(properties){
		var self = this;

		for (var keyword in properties){
			var property = self[keyword];

			if (typeof property != 'function') {
				var setterName = _printf(extendSetterTpl,'keyword',keyword),
					getterName = _printf(extendGetterTpl,'keyword',keyword);

				if (!(setterName in self)) {
					var template = _printf(defaultSetterCode,'keyword',keyword),
						constructor = new Function(template);

					self[setterName] = constructor();
				}

				if (!(getterName in self)) {
					var template = _printf(defaultGetterCode,'keyword',keyword),
						constructor = new Function(template);

					self[getterName] = constructor();
				}
			}
		}
	},
	extendParentEx = function(base,object){
		var self = this;
		
		for (var keyword in object) {
			var property = object[keyword];
			
			if (!isNativeProperty(keyword)) {
				if (!(keyword in self)) {
					addClassProperty.call(self,keyword,property);
				}
				
				addParentProperty.call(self,base,keyword,property);
			}
		}
	},
	extendClassEx = function(object){
		var self = this;
		
		for (var keyword in object) {
			var property = object[keyword];
			
			if (!isNativeProperty(keyword)) {
				addClassProperty.call(self,keyword,property);
			}
		}
	},
	extendSetterGetter = function(properties){
		var self = this;

		if (self.autoSetterGetter) {
			extendGetterSetterEx.call(self,self);
			extendGetterSetterEx.call(self.prototype,self.prototype);
		}
	},
	extendPrototypes = function(){
		var self = this;
		
		_extend(self,defaultPrototypes);
		_extend(self.prototype,defaultPrototypes);
	},
	extendKeywordsEx = function(properties){
		var self = this;
		
		_forEach(defaultKeywords,function(keyword,fn){
			if (keyword in properties) {
				fn.call(self,keyword,properties[keyword]);
			}
		});
	},
	extendSettingsEx = function(properties){
		var self = this;
		
		_forEach(defaultSettings,function(keyword,fn){
			if (keyword in properties) {
				fn.call(self,keyword,properties[keyword]);
				fn.call(self.prototype,keyword,properties[keyword]);
			}
		});
	};
	
/**
 *	Keyword Context Functions
 */
var kExtends = function(keyword,property){
		var self = this,
			type = typeof property;
		
		if (type == 'object') {
			if (property instanceof Array) {
				_forEach(property,function(_,c){
					kExtends.call(self,_,c);
				});
			} else {
				pExtendParent.call(self,property);
			}
		} else if (type == 'string') {
			var handle = getClassHandle(property);
			
			if (handle) {
				pExtendParent.call(self,handle);
			}
		}
	},
	kInterfaceExtend = function(keyword,property){
		var self = this,
			type = typeof property;
		
		if (type == 'object') {
			if (property instanceof Array) {
				_forEach(property,function(_,c){
					kInterfaceExtend.call(self,keyword,c);
				});
			} else {
				_forEach(property,function(_,c){
					if (!(_ in self.prototype)) {
						self.prototype[_] = c;
					}
				});
			}
		} else if (type == 'string') {
			var handle = getClassHandle(property);
			
			if (handle) {
				_forEach(handle.prototype,function(_,c){
					if (!(_ in self.prototype)) {
						self.prototype[_] = c;
					}
				});
			}
		}
	},
	kSet = function(keyword,property){
		this[keyword] = property;
	};
 
/**
 *	Prototype Context Functions
 */
var pAddListener = function(){
		addClassCallback.apply(this,arguments);
	},
	pRemoveListener = function(){
		removeClassCallback.apply(this,arguments);
	},
	pGetCalledFunction = function(){
		return this._calledFunction;
	},
	pGetCalledFunctionContext = function(){
		return this._calledFunctionContext;
	},
	pGetCalledFunctionContextName = function(){
		return getClassName.call(pGetCalledFunctionContext.call(this));
	},
	pGetCalledFunctionName = function(){
		return this._calledFunctionName;
	},
	pCallParent = function(args) {
		var self = this,
			parent = pGetParent.call(self);
		
		if (parent) {
			return parent.apply(self,args || []);
		}
	},
	pGetParent = function(){
		var self = this,
			lastCtx = pGetCalledFunctionContext.call(self) || self,
			lastFn = pGetCalledFunctionName.call(self);
		
		if (lastCtx && lastFn in lastCtx._parent) {
			return lastCtx._parent[lastFn];
		}
	},
	pGetName = function(){
		var self = this,
			lastCtx = pGetCalledFunctionContext.call(self) || self;
	
		return getClassName.call(lastCtx);
	},
	pSetName = function(id){
		var self = this,
			lastCtx = pGetCalledFunctionContext.call(self) || self;
	
		lastCtx.name = id;
	},
	pSetup = function(){
		var self = this,
			lastCtx = pGetCalledFunctionContext.call(self) || self;
	
		_extend(lastCtx,getClassSetup.call(lastCtx));
		_extend(lastCtx.prototype,getClassSetup.call(lastCtx));
	},
	pExtend = function(){
		var self = this,
			args = _toArray(arguments);

		_extend.apply(null,[self].concat(args));
		extendGetterSetterEx.call(self._self.prototype,self);
	},
	pExtendParent = function(){
		var self = this;
		
		_forEach(arguments,function(_,parent){
			extendParentEx.call(self,parent,parent);
			extendParentEx.call(self.prototype,parent,parent.prototype);
		});
	},
	pExtendClass = function(){
		var self = this;
		
		_forEach(arguments,function(_,properties){
			extendClassEx.call(self.prototype,properties);
		});
	},
	pExtendKeywords = function(){
		var self = this;

		_forEach(arguments,function(_,properties){
			extendKeywordsEx.call(self,properties);
		});
	},
	pExtendSettings = function(){
		var self = this;
	
		_forEach(arguments,function(_,properties){
			extendSettingsEx.call(self,properties);
		});
	},
	pLogMessage = function(args,error){
		contextLogMessage(this,args,error);
	};
 
/**
 *	Context Default Properties
 */
var defaultClassCode = [
		'return function %id%(%params%){',
		'	%code%',
		'	return !!this.create ? (this.create.apply(this,arguments) || this) : this;',
		'};'
	].join(''),
	defaultSetterCode = [
		'return function(v){',
		'	this.%keyword%=v;',
		'	return this;',
		'};'
	].join(''),
	defaultGetterCode = [
		'return function(){',
		'	return this.%keyword%;',
		'};'
	].join(''),
	defaultClassExtendHandling = {
		'function' : addClassFunction,
		'default' : addClassValue
	},
	defaultKeywords = {
		'statics' : kExtends,
		'extends' : kExtends,
		'traits' : kInterfaceExtend,
		'_self' : kSet,
		'_parent' : kSet,
		'_listener' : kSet
	},
	defaultSettings = {
		'singleton' : kSet,
		'debug' : kSet,
		'autoSetterGetter' : kSet
	},
	defaultPrototypes = {
		'getCalledFunction' : pGetCalledFunction,
		'getCalledFunctionContext' : pGetCalledFunctionContext,
		'getCalledFunctionContextName' : pGetCalledFunctionContextName,
		'getCalledFunctionName' : pGetCalledFunctionName,
		'callParent' : pCallParent,
		'getParent' : pGetParent,
		'extend' : pExtend,
		'extendParent' : pExtendParent,
		'extendClass' : pExtendClass,
		'extendKeywords' : pExtendKeywords,
		'extendSettings' : pExtendSettings,
		'addListener' : pAddListener,
		'removeListener' : pRemoveListener,
		'getName' : pGetName,
		'setName' : pSetName,
		'setup' : pSetup,
		'logMessage' : pLogMessage
	};

/**
 *	Functions
 */
var isNativeProperty = function(key){
		return key in defaultKeywords || key in defaultPrototypes;
	},
	getDeepContext = function(context){
		var info = {};

		Error.captureStackTrace(info);

		var splittedInfo = info.stack.split('\n'),
			indexOfLine = _forEach(splittedInfo,function(index,str){
				if (logMessageSearchPattern.test(str)) {
					this.result = index + 1;
					this.skip = true;
				}
			},-1),
			greppedLine = splittedInfo[indexOfLine];

		if (!greppedLine) {
			return;
		} 

		// 1. link - 2. name
		var matches = greppedLine.match(logMessageTracePattern);

		if (!matches) {
			return;
		}

		var	link = matches.pop(),
			name = matches.pop();

		return _printf(logMessageTraceTpl,{
			name : name,
			link : link
		});
	},
	getContextName = function(context) {
		return pGetCalledFunctionContextName.call(context) || context.constructor.name || logMessageUnknownName;
	},
	getFunctionName = function(context) {
		return pGetCalledFunctionName.call(context) || logMessageAnonymousName;
	},
	contextLogMessage = function(context,args,error) {
		var message = [].concat('[',args,']');

		logMessage(context,message,error,userColor);
	},
	getLogMessageString = function(args){
		return _forEach(args,function(_,item){
			var messages = this.result,
				type = typeof item;

			if (type == 'string') {
				messages.push('%s');
			} else if (type == 'number') {
				messages.push('%d');
			} else if (type == 'boolean') {
				messages.push('%s');
			} else {
				messages.push('%O');
			}
		},[]);
	},
	getLogMessageStyle = function(color){
		return _printf(logMessageStyleTpl,'hexcode',color || successColor);
	},
	logMessage = function(context,args,error,color){
		var logColor = error ? exceptionColor : color,
			logStyle = getLogMessageStyle(logColor),
			lastContextName = getContextName(context),
			lastFunctionName = getFunctionName(context),
			logMessages = getLogMessageString(args);

		if (context) {
			if (context.deepLoggingLevel || lastFunctionName == logMessageAnonymousName) {
				var deepTrace = getDeepContext(context);

				console.groupCollapsed.apply(console,['%c' + lastContextName + '.' + lastFunctionName + logMessages.join(' '),logStyle].concat(args));
				console.log('%c' + deepTrace,logStyle);
				console.groupEnd();
			} else {
				console.log.apply(console,['%c' + lastContextName + '.' + lastFunctionName + logMessages.join(' '),logStyle].concat(args));
			}
		} else {
			console.log.apply(console,['%c' + logMessages.join(' '),logStyle].concat(args));
		}
	},
	addToCollection = function(id,classhandle,overwrite){
		if (overwrite || !(id in classCollection)) {
			classCollection[id] = classhandle;
		}
	},
	getClassId = function(){
		return 'class#' + Math.random().toString(36);
	},
	evalClass = function(id){
		try {
			var handle = new Function(_printf(defaultClassCode,{
				id : id
			}))();
			
			addToCollection(id,handle,true);
		} catch(e) {
			logMessage(['evalClass','expection code:',e],true);
		
			return null;
		}
		
		return handle;
	},
	createClass = function(){
		var args = _toArray(arguments),
			id = typeof args[0] == 'string' ? args.shift() : getClassId(),
			handle = evalClass(id);
	
		if (handle) {
			extendPrototypes.call(handle);
			
			handle.setup();
			handle.setName(id);
			
			_forEach(args,function(_,properties){
				handle.extendSettings(properties);
				handle.extendClass(properties);
				handle.extendKeywords(properties);
			});

			extendSetterGetter.call(handle);
			
			return !!handle.singleton ? new handle() : handle;
		}
		
		return {};
	},
	getClassHandle = function(){
		return getClass.apply(classCollection,arguments);
	};
		
module.exports = {
	define : createClass,
	pool : classCollection,
	get : getClassHandle,
	forEach : _forEach,
	toArray : _toArray,
	extend : _extend,
	printf : _printf
};