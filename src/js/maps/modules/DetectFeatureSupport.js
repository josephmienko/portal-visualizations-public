/*
 *  DETECT FEATURE SUPPORT
 * 
 *  Utilities for detecting whether the user's browser
 *  does not support key features.
 */

 module.exports = {
	detectIE: function() {
		var rv = -1;
	    if (navigator.appName == 'Microsoft Internet Explorer') {
	      var ua = navigator.userAgent;
	      var re  = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})");
	      if (re.exec(ua) != null)
	        rv = parseFloat( RegExp.$1 );
	    }
	    else if (navigator.appName == 'Netscape') {
	      var ua = navigator.userAgent;
	      var re  = new RegExp("Trident/.*rv:([0-9]{1,}[\.0-9]{0,})");
	      if (re.exec(ua) != null)
	        rv = parseFloat( RegExp.$1 );
	    }
	    return rv == -1 ? false: true;
	},

	detectSVG: function() {
    	// http://stackoverflow.com/questions/9689310/which-svg-support-detection-method-is-best
    	var isSvgSupported = typeof SVGRect != "undefined";
    	return isSvgSupported;
	}
};