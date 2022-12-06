/**
 *  FILTERS
 *
 *  Creates simple filters that highlight the paths corresponding to a given region.
 */

var Events = require('./Listener.js');

module.exports = {

	init: function() {
		var self = this;

		Events.subscribe('SVG created', function(obj) {
			self.bindUIEvents();
		});
	},

	bindUIEvents: function() {
	 	// Apply click handler to filters so that paths corresponding to the 
		// region are highlighted on click
		$('#filters a').click(function() {
            var region = $(this).attr("id");
            $(this).toggleClass(region);
       		var states = d3.selectAll("path." + region);
		    if (states.classed('highlight')) {
		        states.attr("class", region);
		    } else {
		        states.classed('highlight', true);
		    }
        });
	}
}