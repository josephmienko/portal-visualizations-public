/*
 * DATA SERVICE
 *
 * Requests data depending on the parameters of the current view.
 */

var Events = require('./Listener.js');
var Utils = require('./Utils.js');

module.exports = {

   /**
    * @function init
    *
    * Receives configuration information from MapApp.init and requests data
    * based on the specified data source.
    *
    * TODO: The two params should be combined.
    *
    * @param file - The data source filename minus the geographic context
    * @param context - The geographic context to be loaded first.
    */
   init: function(file, context, loadOptions) {
      // Declare 'this' as 'self' to prevent scope issues later
      var self = this;
      self.loadOptions = loadOptions;
      self.loadData(file, context, 'Data loaded');

      Events.subscribe('Switch contexts', function(obj) {
         var newContext = obj.newContext;
         self.loadData(file, newContext, 'New data context');
      });
   },

   update: function(data, headerKeys) {
      var self = this;
      var isDefault = false;
      var filterSelections = Utils.getFilterSelections(data, headerKeys, isDefault);
      var viewData = self.filterData(data, headerKeys, filterSelections);

      Events.publish('Data updated', {
          data: viewData,
          headerKeys: headerKeys
        });
   },

   loadData: function(file, context, msg) {
      var self = this;
      // File path variables for data load
      var dir = file.split("_")[0];
      var filePath = "../../content-data/data/maps/" + file + '_' + context + '.csv';
    
      d3.csv(filePath, function(data) {
             var isDefault = true;
             var data = data;
             var headerKeys = self.getHeaderKeys(data);
             var viewData;
             var resetData;
             var loadOptions;
             var filterSelections;
             var defaultFilterSelections;

             // Get current view and reset data depending on whether we are
             // loading from parameters or loading default values

             // Default loading selection
             if(self.loadOptions === 'default') {
                 filterSelections = Utils.getFilterSelections(data, headerKeys, isDefault);
                 viewData = self.filterData(data, headerKeys, filterSelections);
                 resetData = viewData;
             }
             else if (self.loadOptions != 'default' && isDefault === false) {
                 filterSelections = Utils.getFilterSelections(data, headerKeys, isDefault);
                 viewData = self.filterData(data, headerKeys, filterSelections);
                 resetData = viewData;
             }
             // Loading the page with parameters
             else {
                 // Get fiter selections from params
                 loadOptions = self.loadOptions;
                 filterSelections = loadOptions.filtersToSelect;

                 // Get data for the current view
                 viewData = self.filterData(data, headerKeys, filterSelections);

                 // Reset data should be based on default selections
                 defaultFilterSelections = Utils.getFilterSelections(data, headerKeys, true);
                 resetData = self.filterData(data, headerKeys, defaultFilterSelections);
             }

             Events.publish(msg, {
                data: viewData,
                headerKeys: headerKeys
             });

             self.bindUIEvents(data, headerKeys, resetData);
      });
   },

   /**
    * @function filterData
    *
    * Receives the full dataset and returns a reduced set of data for use in
    * the visualization based on the currently selected filters.
    *
    * @param data {Object} - The full dataset loaded from the CSV
    * @param headerKeys {Array} - The CSV column names corresponding to filter values
    * @param filterSelections {Object} - The filter names and default/currently selected values as key|value pairs
    */
   filterData: function(data, headerKeys, filterSelections) {
      var filteredData = data.filter(function(row) {
           // Go over each param in headerKeys and check whether the current row's value for that column
           // matches the selected filter values
           return headerKeys.reduce(function(prev, next) {
                    return prev && (
                        row[next] === filterSelections[next] ||
                        filterSelections[next].indexOf(row[next]) >= 0
                    );
                }, true);
          });
       return filteredData;
   },

   /**
    * @function getHeaderKeys
    *
    * Returns the first row of the CSV, which should be column names, minus data and geography columns. 
    * The column names are used to determine which filters should be loaded.
    *
    * @param data - The full dataset loaded from the CSV
    */
   getHeaderKeys: function(data) {
       var headerKeys = d3.keys(data[0]);

       // The last two columns always contain a geographic code and data,
       // so we don't need them to determine the filters in use
       var paramsEnd = headerKeys.length-2;

       headerKeys.splice(paramsEnd);
       return headerKeys;
   },

   /**
    * @function bindUIEvents
    *
    * Sets click handlers for the update and reset buttons and publishes
    * new data to the application in response.
    *
    * @param {Object} data - The original dataset
    * @param {Array} headerKeys - The first row of the data
    * @param {Object} resetData - The view data set on page load 
    */
   bindUIEvents: function(data, headerKeys, resetData) {
      var self = this;

      // Calls the Data Service update function
      $('#update').click(function() {
         $(this).removeClass("highlighted");
         self.update(data, headerKeys);
      });

      // Reset re-publishes the original data set from page load
      $('#reset').click(function() {
         Events.publish('Data reset', {
            data: resetData
         });
      });
   }
};