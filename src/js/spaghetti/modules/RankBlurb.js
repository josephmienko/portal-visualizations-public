/**
 *  RANK BLURB
 *
 *  Creates a small blurb picking out the ranked values specified in the second and third
 *  columns of the dataset. Also adds a hover effect so that users can see the ranking or 
 *  min/max values of a particular line.
 */

var Events = require('./Listener.js');

module.exports = {

	init: function(options) {
		var self = this;

		Events.subscribe('Data loaded', function(obj) {
	    	// Pull the data out of the published event
	    	var data = obj.data;

	    	self.appendRanking(options, data);
	    	self.bindChangeOnHover();
	    });
	},

	appendRanking: function(options, data) {
		// Set the defaults from the config file
		var defaultName = options["defaultName"];
		var rankTextBegin = options["rankTextBegin"];
		var rankTextMiddle = options["rankTextMiddle"];
		var rankTextEnd = options["rankTextEnd"];

		// Pick out the default rank information
	 	// from the received dataset
		var defaultRank, name, row;
		var defaultName = options["defaultName"];
		for(var i = 1; i < data.length; i++) {
			row = data[i];
			name = row[0];

			if( name === defaultName ) {
				defaultRank = {
					"start": row[1],
					"end": row[2]
				}
			}
		}

		// Append all defaults to their containers
		d3.selectAll('.stateName').text(defaultName);
		d3.select('#rankTextBegin').text(rankTextBegin);
		d3.select('#rankStart').text(defaultRank["start"]);
		d3.select('#rankTextMiddle').text(rankTextMiddle);
		d3.select('#rankEnd').text(defaultRank["end"]);
		d3.select('#rankTextEnd').text(rankTextEnd);
	},

	bindChangeOnHover: function() {
		 d3.selectAll('#graph path')
			  .on('mouseover', function(d, i) {
				    var currClass = d3.select(this).attr("class");
				    d3.select(this).attr("class", currClass + " current");
				    var state = $(this).attr("state");
				    var rankStart = $(this).attr("start");
				    var rankEnd = $(this).attr("end");
				    
				    d3.selectAll('.stateName').text(state);
				    d3.select('#rankStart').text(rankStart);
				    d3.select('#rankEnd').text(rankEnd);
			  })
			  .on('mouseout', function(d, i) {
			  		var currClass = d3.select(this).attr("class");
				    var prevClass = currClass.substring(0, currClass.length - 8);
				    d3.select(this).attr("class", prevClass);
			  });
	}
}