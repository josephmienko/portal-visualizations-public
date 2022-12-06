/*
 *  CITATION DOWNLOAD
 *
 *  Enables download of citation data for a graph.
 *  Uses Filesaver library to generate blobs.
 */

var DetectFeatureSupport = require('./DetectFeatureSupport.js');

module.exports = {

  /**
   * @function init
   *
   * Appends citation and attaches click handler actions based on whether the current
   * browser is Internet Explorer.
   */
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

  scrapeCitationDetails: function() {
    var title, date, dateUpdated, url, filters, fullCitation;

      // Get the metadata
      title = $('#data-title h2').text();
      citation = $('#citation-example').text();
      dateUpdated = $('#dbUpdated').text();
      url = $('#citation-url').text();

      fullCitation = "Citation downloaded from Center for Social Sector Analytics & Technology" + "\r\n\r\n";

      fullCitation += citation + "\r\n\r\n";
      fullCitation += dateUpdated + "\r\n\r\n";
      fullCitation += "Link: " + url;

      return fullCitation;
  }
};