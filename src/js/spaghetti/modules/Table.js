/**
 *  TABLE
 *
 *  Creates a sortable table from the CSV values, minus the rankings.
 */

var Events = require('./Listener.js');

module.exports = {

	init: function() {
		var self = this;

		Events.subscribe('Data loaded', function(obj) {
	    	// Pull the data out of the published event
	    	var data = obj.data;

	    	self.appendTable(data);
	    });
	},

	appendTable: function(data) {
		// Remove two entries from each row because we 
 		// don't need the ranking information for the table
		var filteredData = [];
		var row;
		var filteredRow;
		for(var i = 0; i < data.length; i++) {
			var row = data[i];
			filteredRow = row.splice(1,2);
			filteredData.push(row);
		}

		var headerColumns = filteredData[0];
		var dataValues = filteredData.slice(1);

		var table = d3.select('#table')
					  .append('table')
					  .attr('class', 'striped');
		var thead = table.append("thead");
        var tbody = table.append("tbody");

        // Append the header row
        thead.append("tr")
            .selectAll("th")
            .data(headerColumns)
            .enter()
            .append("th")
                .text(function(d) {
                    return d;
                });

        // Append a row for each state
        tbody.selectAll('tr')
        	 .data(dataValues)
        	 .enter()
        	 .append('tr')
        	 .selectAll('td')
        	 .data(function(d) { return d; })
        	 .enter()
        	 .append('td')
        	 .text(function(d) { return d; });

        // Once everything has been appended, make it sortable using the DataTables plugin
        $('#table table').DataTable({
        	"bPaginate": false,
        	  "oLanguage": {
			    "sSearch": "Type and press enter to filter results: "
			  }
        });
	}
}