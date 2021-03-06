"use strict";
define(function(){

	var AtlasCore = new $Class({ name: "AtlasCore", namespace: "Trident.SOM.Node.Atlas" }, {
		getArgs: {
			static: true,
			value: function(map, attributes, type, node, parentNode){
				if (typeof map == "function"){
					return map;
				}

				var result = [];
				var value;

				if (map){
					_.forEach(map, function(arg, index){
						if (typeof arg !== "string"){
							result[index] = arg;
						}

						result[index] = this.getValue(arg, attributes, type, node, parentNode);
					}.bind(this));
				}

				return result;
			}
		},
		getObjectValueName: {
			static: true,
			value: function(alias){
				var name = alias;

				if (alias.indexOf("::") > -1){
					name = alias.split("::")[1];
				}

				if (alias.indexOf("=") > -1){
					name = alias.split("=")[0];
				}

				return name;
			}
		},
		getValue: {
			static: true,
			value: function ( alias, attributes, type, node, parentNode ){
				var directive;

				alias = alias.replace(/\s/g, "");

				/*Alternative values `widthSegments|segments`*/
				if ( alias.indexOf("|") > -1 ){
					alias = alias.split("|");

					for ( var a = 0, l = alias.length, v; a < l; a++ ){
						v = this.getValue(alias[a], attributes, type, node, parentNode);

						if ( typeof v !== "undefined" ){
							return v;
						}
					}

					return null;
				}


				/*Objects*/
				if ( alias.indexOf("{") == 0 && alias.lastIndexOf("}") == alias.length - 1 ){
					return this.getObjectValue(alias, attributes, type, node, parentNode);
				} 

				/*Directives*/
				if ( alias.indexOf("::") > 0 ){
					directive = alias.split("::")[0];
					alias = alias.substring(alias.indexOf("::") + 2, alias.length);

					if (this.directives[directive]){
						return this.directives[directive](alias, type, node, parentNode, attributes);
					} else {
						console.warn("Trident.SOM.Node.Atlas: handler for " + alias.split("::")[0] + " directive is not described");
						return null;
					}
				} 

				/*Computed value*/
				if ( typeof attributes[alias] == "string" && attributes[alias].indexOf("{") == 0 && attributes[alias].lastIndexOf("}") == attributes[alias].length - 1){
					try {
						return eval(attributes[alias].substring(1, attributes[alias].length - 1));
					} catch (err){
						console.warn("Trident.SOM.Node.Atlas: invalid computable value for " + alias, attributes[alias], a);
						return;
					}
				} 

				/*Common way*/
				return attributes[alias];

			}
		},
		getObjectValue : {
			static: true,
			value: function ( alias, attributes, type, node, parentNode ){
				alias = alias.substring(1, alias.length-1);

				var tokens = alias.split(",");
				var result = {};

				_.forEach(tokens, function(alias){
					var name = this.getObjectValueName(alias);
					var value;

					if ( alias.indexOf("=") > -1 ){
						alias = alias.substring(alias.indexOf("=") + 1, alias.length);
					}

					value = this.getValue(alias, attributes, type, node, parentNode);

					if ( typeof value !== "undefined" ){
						result[name] = value;
					}

				}.bind(this));

				return result;
			}
		},
		isChildFirst: {
			static: true,
			value: function(type){
				return this.descriptions[type] && this.descriptions[type].childFirst === true;
			}
		},
		applyFunc: {
			static: true,
			value: function(func, a, isConstructor){
			 	if (isConstructor){
			 		return new func(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10]);
			 	} else {
			 		return func(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10]);
			 	}
			}
		},
		create: {
			static: true,
			value: function(node, type, attributes, parentNode){
				var description = this.descriptions[type];
				var constructArgs;
				var construct;
				var subject = null;
				var argsMap;

				if (description){
					switch (description.source){
						case "constructor":
							construct = description.construct;
							argsMap = description.constructArgs;

							if (typeof construct == "object" && attributes.type && construct[attributes.type]){
								construct = construct[attributes.type];
							}

							if (typeof construct != "function"){
								console.warn("Trident.SOM.Node.Atlas: " + type + "`s constructor is not a function");
							}

							if (!Array.isArray(argsMap) && typeof argsMap == "object" && attributes.type && argsMap[attributes.type]){
								argsMap = argsMap[attributes.type];
							}


							constructArgs = this.getArgs(argsMap, attributes, type, node, parentNode);
							// subject = new (Function.prototype.bind.apply(construct, constructArgs));
							subject = this.applyFunc(construct, constructArgs, true);
							// console.log(type, subject, constructArgs);
						break;
						case "factory":
							construct = description.construct;
							argsMap = description.constructArgs;

							if (typeof construct == "object" && attributes.type && construct[attributes.type]){
								construct = construct[attributes.type];
							}

							if (typeof construct != "function"){
								console.warn("Trident.SOM.Node.Atlas: " + type + "`s factory is not a function");
							}

							if (!Array.isArray(argsMap) && typeof argsMap == "object" && attributes.type && argsMap[attributes.type]){
								argsMap = argsMap[attributes.type];
							}

							constructArgs = this.getArgs(argsMap, attributes, type, node, parentNode);
							// subject = new (Function.prototype.bind.apply(construct, constructArgs));
							subject = this.applyFunc(construct, constructArgs);

						break;
						case "property":
							if (typeof description.name == "string"){
								if (parentNode.subject){
									subject = parentNode.subject[description.name];
								}
							} else if (typeof description.name == "function") {
								subject = description.name(parentNode.subject, attributes);
							}
							
						break;
					}

					if (typeof description.onCreate == "function"){
						description.onCreate(type, subject, attributes, parentNode);
					}

					if (typeof description.link == "string"){
						var child = subject;
						var parent = parentNode.subject;


						try {
							eval(description.link);
						} catch (err){
							console.warn("Trident.SOM.Node.Atlas: invalid link directive for " + type, node);
						}
					} else if (typeof description.link == "function"){
						var child = subject;
						var parent = parentNode.subject;

						description.link(parent, child);
					}

				} else {
					console.warn("Trident.SOM.Node.Atlas: no description for element type " + type, node);
				}	
				return subject;
			}
		},
		setup: {
			static : true,
			value : function(node, type, subject, attributes, parentNode){
				if (!subject){
					return;
				}


				var description = this.descriptions[type];
				var method; 
				var methodArgs;
				var context;
				var attributesRegExp = new RegExp(_.map(attributes, function(value, name){
					return name;
				}).join("|"));

				if (description){
					_.forEach(description.members, function(member, name){
						var argsRegExp;
						var needUpdate;

						if (member.type == "method"){
							argsRegExp = member.args.join("|");
							needUpdate = argsRegExp.match(attributesRegExp) !== null;

							if (!needUpdate){
								return;
							}

							methodArgs = this.getArgs(member.args, attributes, type, node, parentNode);
							context = member.context || subject;
							method = subject[name];

							if (typeof methodArgs == "function"){
								methodArgs(method);
							} else {
								method.apply(context, methodArgs);
							}
						} else if (member.type == "property"){
							var value = this.getValue(member.value || name, attributes, type, node, parentNode);
							if (typeof value !== "undefined" && value !== null){
								subject[name] = value;
							}

						}
					}.bind(this));
				} else {
					console.warn("Trident.SOM.Node.Atlas: no description for element type " + type);
				}	
			}
		},
	});

	return AtlasCore;

});