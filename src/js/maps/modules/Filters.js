/*
 * FILTERS
 *
 * Initializes a set of filters based on the data received.
 */

var Events = require('./Listener.js');
var Utils = require('./Utils.js');

module.exports = {

	init: function(loadOptions){
		var self = this;
		self.filterOptions = loadOptions;

		// Listens for the data load to finish and acts on the returned
		// data and headerKeys array
		Events.subscribe('Data loaded', function(obj) {
			self.displayFilters(obj.headerKeys);
		});
	},

	reset: function() {
		$('.fieldInput').each(function() {
	      $(this).prop('selectedIndex', 0);
	    });

	    $('#fieldInput-date_type').val('2018-01-01 00:00:00');
	    $('#fieldInput-date_year').val('2018-01-01 00:00:00');
	},

	displayFilters: function(headerKeys) {
		var self = this;
	    // Load the params-display file that drives the rest of the data portal
	    d3.json("/content-data/data/graphs/params-display.json", function(error, params) {
	        // First figure out what filters we need to display
	        var matchedParams = Utils.matchKeysToParams(headerKeys);

	        // Get all the display options 
	        $.each(params, function(key, innerjson) {
	            legend = innerjson.display.legend;
	            selected = innerjson.display.selected;
	            help = innerjson.display.help;

	            if (typeof help == 'object') {
	              var defaultHelp = help;
	              help = defaultHelp.default;
	            }

	            // Check against matchedParams and output the fields according to display options
	            // There is some special handling that really should be removed once filters for this
	            // app are better defined.
	            if(matchedParams.indexOf(key) !== -1 && key !== "ethnicity" && key !== "age") {
	                filterName = key;

	               if(filterName === 'date_type') {
	               	 selected = '2018-01-01 00:00:00';
	               }

	               // Append the filter and options
	               self.appendFilter(filterName, help);
	               self.appendFilterOptions(filterName, selected);

	              if(self.filterOptions != 'default') {
	              	  var filterOptions = self.filterOptions;
	              	  var filterValuesToSelect = filterOptions.filtersToSelect;
	                 self.selectFilterValues(filterValuesToSelect);
	              }
	            }
	        });

			 // Broadcast finished filters and bind events to the filters
			 // now that they have been appended to the page
			 Events.publish('Filters loaded', {});
			 self.bindUIEvents();
	    });
	},

	appendFilter: function(filterName) {
		// Append a list item container for the filter in the sidebar
	    d3.select("#filters")
	        .append('li')
	        .attr("id", filterName)
	        .attr("class", "field");

	    // Append a fieldset and label for the filter
	    d3.select("#" + filterName)
	        .append("fieldset")
	        .attr("id", "fieldset-" + filterName)
	        .attr("class", "fieldset")
	   		.append('label')
	   		.text(legend);

	   	// Append the select list. Giving it a class of "browser-default"
	   	// so that Materialize doesn't apply ubre minimal styling
	   	d3.select("#" + filterName + " fieldset")
	        .append("select")
	        .attr("class", "fieldInput browser-default")
	        .attr("name", "fieldInput-" + filterName)
	        .attr("id", "fieldInput-" + filterName);

	    if(help) {
	      d3.select("#" + filterName + " .fieldsetHeader")
	        .append('span')
	        .attr("class", "help");
	    }
	},


	// Loops over mapParams to check if it matches the current filterName. If so, append a form and radio button
	// inputs for each option. This is a necessary extra step because we don't have access to the lookup tables
	appendFilterOptions: function(filterName, selected) {
	    $.each(mapParams, function(key, innerjson) {
	        param = innerjson.param;

	        if(filterName == param) {
	            options = innerjson.map;

	            $.each(options, function(key, value) {
	                d3.select("#fieldInput-" + filterName)
	                    .append("option")
	                    .attr("value", key)
	                    .text(value);
	            });
	        }
	    });

	    if(typeof selected != 'undefined') {
	    	$("#fieldInput-" + filterName).val(selected);
	    }
	    else {
	    	$("#fieldInput-" + filterName).val(0);
	    }
	},

	bindUIEvents: function() {
		 var self = this;

	    $(".fieldInput").change(function() {
	        $("#update").addClass("highlighted");
	    });

	    $('#reset').click(function() {
	    	  self.reset();
	    });
	},

	selectFilterValues: function(filterValuesToSelect) {
	    for( var filter in filterValuesToSelect ){
	    	var id = filter;
	      var val = filterValuesToSelect[filter];

	      $("select#fieldInput-" + id).val(val);
	  }
	}
}

