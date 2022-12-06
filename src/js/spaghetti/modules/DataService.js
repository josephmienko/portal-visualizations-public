/**
 *  DATA SERVICE
 *
 *  Imports and parses data for distribution to app modules.
 */

var Events = require('./Listener.js');

module.exports = {

	init: function(context) {
		var self = this;
		// Get the file name from the options passed in from the config file and 
		// load the data and region code files. Once those are both done loading,
		// begin the graph load process.
		var dataFile = options["fileName"] + '.csv';

		// Using the parallel load process described by Mike Bostock here: 
		// https://groups.google.com/forum/#!msg/d3-js/3Y9VHkOOdCM/YnmOPopWUxQJ
		var regionArray, data, remaining = 2;
		d3.text('../content-data/data/spaghetti/state-regions.csv', 'text/csv', function (text) {
			regionArray = text;
			if (!--remaining) self.distributeData(regionArray, data);
		});

		d3.text('../content-data/data/spaghetti/' + dataFile, 'text/csv', function (text) {
			data = text;
			if (!--remaining) self.distributeData(regionArray, data);
		});
	},

	distributeData: function(regionArray, data) {
		var self = this;

		// Start by parsing regionsArray into a usable list
 		var regions = d3.csv.parseRows(regionArray);
		var regionList = self.createRegionList(regions);
		var data = d3.csv.parseRows(data);
		
		Events.publish('Data loaded', {
			regions: regionList,
			data: data
		});
	},

	/**
	 * @function createRegionList
	 *
	 * Splits off the long region names and returns the results as an array that will be used
	 * to attach class names to each SVG path on the graph
	 *
	 * @param {Object} regions - A list of states and their corresponding region codes/region names
	 */
	createRegionList: function(regions) {
		var state_regions = {};
	    for (i = 1; i < regions.length; i++) {
	        state_regions[regions[i][0]] = regions[i][1];
	    }

		return state_regions;
	}
};