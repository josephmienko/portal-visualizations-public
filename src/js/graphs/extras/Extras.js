/*
 *  SECONDARY.JS
 *
 *  Imports modules for secondary features (not critical to creating a visualization)
 */

var DataDownload = require('./DataDownload.js'),
    CitationDownload = require('./CitationDownload.js'),
    Share = require('./Share.js'),
    ImageDownload = require('./ImageDownload.js');


 var SecondaryFeatures = {
 	run: function() {
 		DataDownload.init();
 		CitationDownload.init();
 		Share.init();
 		ImageDownload.init();
 	}
 };

SecondaryFeatures.run();