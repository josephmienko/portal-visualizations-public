/*
 *  DATA DOWNLOAD
 *
 *  Enables download of default data table aas a text file or CSV
 *  depending on browser. IE is restrictive about what kinds of files
 *  can be built and downloaded from the front end.
 */

var DetectFeatureSupport = require('./DetectFeatureSupport.js');

var quote = function(s){
	var ret = '"' + s.replace( /"/g, '""') + '"';
	return ret;
};

module.exports = {

	// Variable needed throughout the scope of the module
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
	    var table = $("table.dataTable")[0];
	    //Get number of rows/columns
	    var rowLength = table.rows.length;
	    var colLength = table.rows[0].cells.length;
	    //Declare string to fill with table data
	    var tableString = "";

	    //Get column headers
	    for (var i = 0; i < colLength; i++) {
	      var colHeader = table.rows[0].cells[i];
	      var colHeaderVal = quote(colHeader.innerHTML);
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