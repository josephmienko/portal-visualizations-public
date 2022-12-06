/*
 * FACTBOX
 */

var Events = require('./Listener.js');
var Utils = require('./Utils.js');

module.exports = {

	init: function(){
		var self = this;
		var subscription = Events.subscribe('data', function(data) {
			console.log(data);
		});
	}
}

/***************************************************************************************

                                      #SIDEBAR

***************************************************************************************/

function Sidebar(currData) {
  this.currData = currData;
  this.format = getNumberFormat();

  if( context == 'regions' ) {
    this.title = 'Region 2 South';
    // Region 2 South is always the fourth item in the list
    this.rate = currData != 'undefined' ? this.format(currData[3].datacol) : 'error';
  //  this.dotChart(this.currData);
    this.reportLink = function() {
       $("#report").attr("style", "opacity: 0");
    };
  }

  if( context == 'counties') {
    this.title = 'King';
    // King County is alphabetically #17
    this.rate = currData != 'undefined' ? this.format(currData[16].datacol) : 'error';
  //  this.histogram(this.currData);
    this.reportLink = function(title) {
      $("#report").attr("style", "opacity: 1");
      var noReport = ["Garfield","Lincoln","San Juan","Skamania","Wahkiakum","Klickitat", "Pacific","Asotin","Ferry","Pend Oreille","Adams"];
      var hasNoReport = noReport.indexOf(title) > -1;
      
      if (hasNoReport === false) {
          var link = '<a href="http://www.partnersforourchildren.org/county-reports/county_report_' + title + '.pdf" target="_blank"><strong>View County Report</strong></a><br/><br/>'
          $("#report").empty();
          $("#report").append(link);
        } 
      else {
          $("#report").text('There is no report for this county.');
      }
    };
  }

  this.factbox(this.title, this.rate, this.reportLink);
}

Sidebar.prototype.factbox = function(title, rate, reportLink) {
    $('#geog_title').empty().append(title);
    // Map type passed in via Drupal. Current options are Count and Rate.
    $("#rate").empty().append(mapType + ": " + rate);
    $("#report").empty();
    reportLink(title);
};