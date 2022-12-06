/*
 *  APP.JS
 *  -----------------------
 *  Author: Erika Deal
 *  Contact: edeal@uw.edu
 *  Date: August 2015
 *  -----------------------
 *  Imports modules for the current visualization and initializes them.
 *
 */

var ContextSwitcher = require('./modules/ContextSwitcher.js');
var Events = require('./modules/Listener.js');
var DataService = require('./modules/DataService.js');

var Citation = require('./modules/Citation.js');
var DataDownload = require('./modules/DataDownload.js');
var Filters = require('./modules/Filters.js');
var ImageDownload = require('./modules/ImageDownload.js');
var Legend = require('./modules/Legend.js');
var Map = require('./modules/Map.js');
var Permalink = require('./modules/Permalink.js');
var Table = require('./modules/Table.js');

var MapApp = {

	init: function(options) {
		var self = this;
		// Options passed in at initialization based on the values in the config file.
		// This lets us define config and content in the same file.
		var pageTitle = options.title;
		var context = options.config.defaultContext;
		var file = options.config.file;
		var urlParams = 'No params';
		var mapType = options.config.mapType;
		var legendLabel = options.config.legendLabel;
		var subtitle = options.subtitle;

		// Check if the current page is being loaded with parameters other
      // than the defaults
      var url = window.location.href;
      var loadOptions = 'default';

      if(url.indexOf('&') > -1) {
		  loadOptions = Permalink.getParamsArray(url);
        context = loadOptions.loadContext;
      }

      // Set basic page load options
		Map.context = context;
		Map.type = mapType;

		// Initialize the modules
		DataService.init(file, context, loadOptions);
		Filters.init(loadOptions);
		Map.init(context, mapType);
		ContextSwitcher.init(context);
		Legend.init(legendLabel);
		Table.init(context, legendLabel);

		// Initialize download features
		Citation.init();
		DataDownload.init();
		ImageDownload.init();
		Permalink.init();

		self.appendPageTitle(pageTitle, subtitle);
	},

	/**
	 * @function appendPageTitle
	 * 
	 * Once the app has initialized, append the page title and subtitle
	 * to the #data-title div based on the options set in the content file.
	 */
	appendPageTitle: function(pageTitle, subtitle) {
		// Set the title and subtitle if we have it
		$('#data-title h2').text(pageTitle);

		if(typeof subtitle != 'undefined') {
			$('#data-title h4').text(subtitle);
		} 
		else {
			$('#data-title h4').remove();
		}
	}
};

// For the sake of simplicity, attach the app to the window so that it can be called in
// visualization.php
window.MapApp = MapApp;
