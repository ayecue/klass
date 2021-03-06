/**
 *	Dependencies
 */
var forEach = require('./forEach'),
	toArray = require('./toArray');

/**
 *	Extend properties to object
 */
module.exports = function() {
	var args = toArray(arguments),
		last = args.length - 1,
		nil = true,
		src = args.shift() || {};

	if (typeof args[last] == 'boolean') { 
		nil = args.pop();
	}
	
	return forEach(args,function(index,item){
		if (typeof item == 'object') {
			this.result = forEach(item,function(prop,child){
				if (!!(nil || (child != null && child.length)) && item.hasOwnProperty(prop)) {
					this.result[prop] = child;
				}
			},this.result);
		}
	},src);
};