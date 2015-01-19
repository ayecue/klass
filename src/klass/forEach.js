/**
 *	Loop through objects
 */
module.exports = function(obj,callback,pre){
	if (obj == null) {
		return pre;
	}

	var t, d = {result:pre,skip:false};

	if (t = obj.length) {
		for (var k = 0; k < t && !d.skip; callback.call(d,k,obj[k++]));                                
	} else {
		for (var k in obj) {
			typeof obj[k] != 'unknown' && callback.call(d,k, obj[k]);
	
			if (d.skip) {
				break;
			}
		}
	}
	
	return d.result;
};