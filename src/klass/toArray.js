/**
 * 	Shortcuts
 */
var _arr = Array;

/**
 * 	Convert array like object to array
 */
module.exports = 'slice' in _arr.prototype ? function(n){
	return _arr.prototype.slice.call(n,0);
} : function(n){
	var t = [];
	
	_arr.push.apply(t,n);
	
	return t;
};