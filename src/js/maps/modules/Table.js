/**
 * LEGEND.JS
 *
 * Creates a legend of colors and values based on the current data view.
 */

var Events = require('./Listener.js');

module.exports = {

    init: function(context, legendLabel) {
      var self = this;
      var content = context;

      Events.subscribe('Switch contexts', function(obj) {
        context = obj.newContext;
      });

      // Wait until the map is full finished initializing. TODO: Remove this dependency.
      Events.subscribe('Map colorized', function() {
        self.appendTable(context, legendLabel);
      });
    },
    
    appendTable: function(context, legendLabel) {
        var self = this;
        var tableData = self.getTableData();

        $('#tableContent').empty();

        var columnHeaders = [];

        if (context == "regions") {
             columnHeaders = ["Region", legendLabel];
        } else {
             columnHeaders = ["County", legendLabel];
        }

        var table = d3.select("#tableContent")
                 .append("table")
                 .attr('class', 'striped');
        var thead = table.append("thead");
        
        thead.append("tr")
          .selectAll("th")
          .data(columnHeaders)
          .enter()
          .append("th")
            .text(function(columnHeader) { return columnHeader; });

        var columns = ["name", "rate"];

        var tbody = d3.select('#tableContent table').append("tbody"); 

        var rows = tbody.selectAll("tr")
              .data(tableData)
              .enter()
              .append("tr");
        
        var cells = rows.selectAll("td")
              .data(function(row) {
                  return columns.map(function(column) {
                      return {column: column, value: row[column]};
                  });
              })
              .enter()
              .append("td")
                  .html(function(d) { return d.value; });

        // Once everything has been appended, make it sortable using the DataTables plugin
        $('#table table').DataTable({
          "bPaginate": false,
            "oLanguage": {
          "sSearch": "Type and press enter to filter results: "
        }
        });
    },

    // REFACTOR
    getTableData: function() {
        tableData = [];
        $('.map path').each(function() {
           var name = $(this).attr('name');
           var rate = $(this).attr('data-rate');
           tableData.push({name:name, rate:rate});
        });
        return tableData; 
    }
 } // module