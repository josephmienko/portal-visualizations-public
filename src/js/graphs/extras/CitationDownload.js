/*
 *  CITATION DOWNLOAD
 *
 *  Enables download of citation data for a graph.
 *  Uses Filesaver library to generate blobs.
 */

var DetectFeatureSupport = require('./DetectFeatureSupport.js');

module.exports = {

	init: function() {
		var self = this,
		    isIE = DetectFeatureSupport.detectIE(),
			downloadName = $('#data-title h2').text().replace(/ /g, "_");

		self.appendCitation();
 		
 		$('#js-citationDownload').on('click', function() {
 			var citation = self.scrapeCitationDetails(),
 			    blob = new Blob([citation]);

			if(isIE) {
				window.navigator.msSaveOrOpenBlob(blob, downloadName+".txt");
			} else {
				saveAs(blob, downloadName+".txt");
			}
		});
	},

	// Build a list of citation details from the elements on the page and
	// append them to the empty citation containers.
	appendCitation: function() {
		var title, date, year, url, filters;

        title = $('#data-title h2').text();

        var currentDate = new Date();
        date = (currentDate.getMonth() + 1) + '/' + currentDate.getDate() + '/' + currentDate.getFullYear();
        year = currentDate.getFullYear();
        longUrl = window.location.href;
        url = longUrl.replace('!', '').replace('#', '');

        $("#citation-title").empty().append(title);
        $("#citation-year").empty().append(year);
        $("#citation-date").empty().append(date);
        $("#citation-url").empty().append(url);
	},

	// On click, scrape the most recent citation details and format as a string that
	// can be added to a downloadable text file
	scrapeCitationDetails: function() {
		var title, date, dateUpdated, url, filters, fullCitation;

	    // Get the metadata
	    title = $('#data-title h2').text();
	    citation = $('#citation-example').text();
	    dateUpdated = $('#dbUpdated').text();
	    filters = "Filters used: \r\n";
	    
	    // First get dynamic filters 
	    $(".config-type-filter.visible").each(function() {
	      // Get the label and value
	      var dynamicFilterName = $(this).children().find(".fieldsetLabel").text();
	      var dynamicFilterValue = $(this).children().find(".fieldInput:checked").next("label").map(function() { return $(this).text(); }).get().join("; ");

	      // Handle the dynamic range separately
	      if(dynamicFilterName == "Date Range") {
	        dynamicFilterValue = $("#dynamicMonthStart .slider").text();
	      }

	      filters += "\t" + dynamicFilterName + ": " + dynamicFilterValue + "\r\n";
	    });

	    // Handle filter list
	    $("#citation-filters .filter").each(function(){
	      var filter = $(this).text();
	      filters += "\t" + filter + "\r\n";
	    });

	    fullCitation = "Citation downloaded from Center for Social Sector Analytics & Technology" + "\r\n\r\n";

	    fullCitation += citation + "\r\n\r\n";
	    fullCitation += filters + "\r\n\r\n";
	    fullCitation += dateUpdated + "\r\n\r\n";

	    return fullCitation;
	}
};