/*
 * UTILS
 *
 * Functions used in various modules throughout the app.
 */

module.exports = {

	/**
	 * @function getFilterSelections
	 *
	 * If the default view has been loaded, determine the default selection
	 * based on the first row of data. Otherwise, determine the current selections
	 * from the current value of the filters.
	 *
	 * @param {Object} data - The full dataset, used to get default values
	 * @param {Array} headerKeys - The column named of the data, used to create an array of
	 *    column names and their default values.
	 * @param {Boolean} isDefault - Determines whether a default view is bing loaded
	 * @returns {Object} filterSelections - Key-value pairs of column names and their values
	 */
	getFilterSelections: function(data, headerKeys, isDefault) {
		var filterSelections = {};

	    if( isDefault === true ) {
	        // Get date information
	        var firstRow = data[1],
	            dateCol = Object.keys(firstRow)[0],
	            dateStart = firstRow[dateCol];

	        // Loop over the params and add them and the default value as key/value pairs
	        $(headerKeys).each(function(i, v) {
	            var lookup = v;

	            if(i === 0) {
	              filterSelections[lookup] = dateStart;
	            } 
	            else {
	              filterSelections[lookup] = "0";
	            }
	        });
	    }
	    else {
	        var options = $("select.fieldInput");

	        $.each(options, function() {
	            var id = $(this).attr("id").split("fieldInput-")[1],
	                val = $(this).val();

	            $.each(mapParams, function(key, innerjson) {
	                if (id == innerjson.param) {
	                    var lookup = key;
	                    filterSelections[lookup] = val;
	                }
	            });
	        });
	    }
	    return filterSelections;
	},

	getNumberFormat: function(mapType) {
		 // Need different format depending on type of map,
	    // Rates to one decimal place and counts rounded
	    // with a thousands separator. See http://koaning.s3-website-us-west-2.amazonaws.com/html/d3format.html
	    // for documentation with examples.
	    var format;

	    if(mapType === 'Rate') {
	      format = d3.format(".1f");
	    } else {
	      format = d3.format(",.0f");
	    }

	    return format;
	},

	matchKeysToParams: function(headerKeys) {
		matchedParams = [];

	    // Match headerKeys to the keys from params.js
	    $.each(mapParams, function(key, innerjson) {
	        param = innerjson.param;

	        if(headerKeys.indexOf(key) != -1) {
	           matchedParams += param;
	        }

	    });

	    return matchedParams;
	},

	quantize: function(min, max, gradients) {
		d3.scale.quantize()
        .domain([min, max])
        .range(d3.range(6).map(function(i) {
            var colorClass = "q" + i + "-6";
            var color = gradients[colorClass];
            return color;
      	}));
	}
}