/**
 * CONTEXTSWITCHER.JS
 *
 * Basic controls for switching between region and county map contexts. Eventually this
 * should be smart enough to build a list from context options passed to the module.
 */

var Events = require('./Listener.js');

module.exports = {

	init: function(context) {
		window.location.hash = context;

		$("#options").val(context);
		this.bindUIEvents();
	},

	bindUIEvents: function() {
		$("#options").change(function() { 
		    // Set the scope and store the rel attribute as a variable for selecting the right map
		    var newContext = $(this).val();
		    window.location.hash = newContext;
		    
		    Events.publish('Switch contexts', {
		    	newContext: newContext
		    });
		  });
	}
}