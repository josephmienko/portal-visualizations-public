/*
 *  APP.JS
 *
 *  Imports modules for the current visualization
 */

var Events = require('./modules/Listener.js');
var DataService = require('./modules/DataService.js');
var Filters = require('./modules/Filters.js');
var RankBlurb = require('./modules/RankBlurb.js');
var SpaghettiPlot = require('./modules/SpaghettiPlot.js');
var Table = require('./modules/Table.js');

var SpaghettiApp = {

	init: function(options) {
		var self = this;

		DataService.init(options);
		SpaghettiPlot.init();
		Filters.init();
		RankBlurb.init(options);
		Table.init();
	}
}

window.SpaghettiApp = SpaghettiApp;