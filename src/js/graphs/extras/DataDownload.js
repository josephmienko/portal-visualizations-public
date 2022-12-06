/*
 *  DATA DOWNLOAD
 *
 *  Enables download of default Google data table
 */

var DetectFeatureSupport = require('./DetectFeatureSupport.js');

var quote = function(s){
	var ret = '"' + s.replace( /"/g, '""') + '"';
	return ret;
};

module.exports = {

	downloadFile: $('#data-title h2').text().replace(/ /g, "_"),

	init: function() {
		var self = this,
		    isIE = DetectFeatureSupport.detectIE();
 		
 		$('#js-dataDownload').on('click', function() {
			if(isIE) {
				self.toText();
			} else {
				self.toCSV();
			}
		});
	},

	toCSV: function() {
		var delim = ",",
	        tableString = this.scrapeTableData(delim);

	    var blob = new Blob([tableString], {type: "text/plain;charset=utf-8"});
	    saveAs(blob, this.downloadFile+".csv");
	},

	toText: function() {
		var delim = "\t",
	        tableString = this.scrapeTableData(delim);

	    var blob = new Blob([tableString]);
	    window.navigator.msSaveOrOpenBlob(blob, this.downloadFile+".txt");
	},

	scrapeTableData: function(delim) {
	    var table = $("table.google-visualization-table-table")[0];
	    //Get number of rows/columns
	    var rowLength = table.rows.length;
	    var colLength = table.rows[0].cells.length;
	    //Declare string to fill with table data
	    var tableString = "";

	    //Get column headers
	    for (var i = 0; i < colLength; i++) {
	      var colHeader = table.rows[0].cells[i];
				var colHeaderVal = quote( colHeader.textContent.split(String.fromCharCode(8195)).join("") );
				if( i !== 0 ){
					tableString += delim;
				}
	      tableString += colHeaderVal;
	    }
	    tableString += "\r\n";

	    //Get row data
	    for (var j = 1; j < rowLength; j++) {
	      for (var k = 0; k < colLength; k++) {
					var colCell = table.rows[j].cells[k];
					var colCellVal = colCell.innerHTML.split(",").join("");
					if( k !== 0 ){
						tableString += delim;
					}
	        tableString += colCellVal;
	      }
	      tableString += "\r\n";
	    }

	    return tableString;
	}
};