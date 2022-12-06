/**
 *  MAP.JS
 *
 *  Instantiates an SVG map of Washington with choropleth fill colors
 *  based on the current data set.
 */

var Events = require('./Listener.js');
var Utils = require('./Utils.js');

module.exports = {

  /**
   * @function init
   *
   * Initializes the map based on settings from the config file. Context and map type are
   * set on MapApp.init() and extend the Map object so that these variables do not have to be
   * exchanged between methods within the object.
   */
  init: function() {
    var self = this;

    // Wait for data load, then append the SVG and colorize the paths.
    // Doing it this way to avoid a flash of unfilled SVG paths.
    Events.subscribe('Data loaded', function(obj) {
      self.appendSVG();
      self.colorizeSVG(obj.data);
      self.bindUIEvents();
    });

    // Respond to changes in the context switcher
    Events.subscribe('Switch contexts', function(obj) {
      $('#wa_' + self.context + '_map').remove();
      self.context = obj.newContext;
    });

    // Append and colorize SVG with data from new context if we have it
    Events.subscribe('New data context', function(obj) {
      self.appendSVG();
      self.colorizeSVG(obj.data);
      self.bindUIEvents();
    });

    // Finally, perform data-dependent operations
    // pending topic publications
    Events.subscribe('Data updated', function(obj) {
      self.colorizeSVG(obj.data);
    });

    Events.subscribe('Data reset', function(obj) {
      self.colorizeSVG(obj.data);
    });
  },

  /**
   * @function appendSVG 
   *
   * Based on the current context, appends an SVG of Washington regions or counties.
   */
  appendSVG: function() {
     var self = this;
     var context = self.context;
     // mapID and mapHeight are used in the same way regardless of context
     var mapID = 'wa_' + context + '_map';
     var mapHeight = 500;

      // Settings for region or county SVG
     var settings = self.getContextSettings(context);

      // First check to make sure that the map does not already exist. Each map context
      // has a different ID; if it already exists, we don't need to append the map again.
      if ($('#' + mapID).length === 0) {

        var svg = d3.select("#map").append("svg")
                .attr("id", mapID)
                .attr("class", "map")
                .attr("viewBox", settings.viewBox)
                .attr("width", settings.mapWidth)
                .attr("height", mapHeight);
        
        // Loops over the data in the regions array and attaches name, id, and class to a <g> element
        var map = svg.selectAll("g")
                          .data(settings.geography)
                          .enter().append("g") 
                          .attr("class", context)
                          .attr("id", function(d){ return d.id; });

        // Appends path and "d" attribute to each item from the data
        map.append("path")
                  .attr("d",function(d){ return d.path; })
                  .attr("id", function(d){ return d.geog; })
                  .attr("name", function(d){ return d.name; })
                  .attr("transform", settings.transform)
                  .style("stroke","#fff")
                  .style("stroke-width", settings.strokeWidth);

      // Loops over data array and checks it against the county/region_path array. If the ID matches the name of a county/region in county/region_path, an additional path is appended to the <g> element. This catches all of the islands that cannot be captured with a single path.
        for(var i=0, c_len=settings.geography.length;i<c_len;i++){
          for(var j=0, p_len=settings.extraPaths.length;j<p_len;j++){
              if(settings.geography[i]["id"]==settings.extraPaths[j][context]){
                  d3.select("#"+settings.geography[i]["id"]).append("path")
                      .attr("d",settings.extraPaths[j]["path"])
                      .style("stroke","#fff")
                      .style("stroke-width", settings.strokeWidth);  
              }
          }
        }
    }
  },

  /**
   * @function colorizeSVG
   *
   * Based on the current data set, creates a range of colors and binds them
   * to the SVG paths on the map.
   */
  colorizeSVG: function(currData) {
     //Retrieve object properties for local use
      var self = this;
      var context = self.context;
      var mapType = self.type;

      // Get array of rates and geographic codes to generate the choropleth scale
      var dataArray = self.getGeogRates(currData);

      // Find the min and max so that we can set up the right domain
      var min = d3.min(d3.values(dataArray)),
          max = d3.max(d3.values(dataArray));

      var gradients = {
        "q0-6" : "#DADFE7",
        "q1-6" : "#B2C3D1",
        "q2-6" : "#7699B0",
        "q3-6" : "#3a6f8f",
        "q4-6" : "#224357",
        "q5-6" : "rgba(0, 0, 0, 1)"
      }; 

      // Split the domain into five quintiles and return fill values
      // based on the rate (i).
      // TODO: abstract this
      var quantize = d3.scale.quantize()
        .domain([min, max])
        .range(d3.range(6).map(function(i) {
            var colorClass = "q" + i + "-6";
            var color = gradients[colorClass];
            return color;
      }));

      d3.selectAll("." + context)
        .selectAll("path")
        .attr("data-rate", function(d) { return dataArray.get(d.geog); })
        .attr("data-fill", function(d) { return quantize(dataArray.get(d.geog)); })
        .style("fill", function(d) { return quantize(dataArray.get(d.geog)); })
        .call(d3.helper.tooltip(function(d, i){return self.appendTooltip(d, currData, mapType);}));

      d3.select("#map_legend").remove();

      d3.select("#map_legend")
          .append('rect')
          .attr("x", 20)
          .attr("y", 100)
          .style("fill", "#D9BB32")
          .style("stroke-width", "50");

      // Once colorization is done, publish the scale so that the Legend
      // module can pick it up.
      var scale = quantize.copy();

      Events.publish('Map colorized', {
         scale: scale,
         min: min,
         max: max
      });
  },

  /**
   * @function bindUIEvents
   *
   * Defines events that occur when a user interacts with the map in specific ways.
   */
  bindUIEvents: function() {
    // Variables for the hover effect events
    var rate;
    var isActive = false;
    var self = this;
    var context = self.context;
    var settings = self.getContextSettings(context);

    $(".map").on({
        mouseenter: function() {
          if (isActive === false) {
            title = $(this).attr("name");
            rate = $(this).attr('data-rate');
          }

          $(this).attr("style", "fill: #5bb1b4;");
        },

        click: function() {
            var wasClicked = $(this).attr('class');

            if(wasClicked == 'clicked-path'){
              isActive = false;
            } 
            else {
              var fill = $('.clicked-path').attr('data-fill');
              $('.clicked-path').attr('class', '').attr('style', 'fill: ' + fill + ';' + 'stroke-width: ' + settings.strokeWidth + '; stroke: #fff;');
              $(this).attr('class', 'clicked-path');
              isActive = true;
              title = $(this).attr("name");
              rate = $(this).attr('data-rate');
            }
        },

        mouseleave: function() {
            var fill;
            var path = $(this);
            var wasClicked = $(this).attr('class');

            if(isActive === true && wasClicked == 'clicked-path'){
              fill = "#5bb1b4";
            } else {
              fill = path.attr("data-fill");
            }

            path.attr("style", "fill: " + fill + ";" + 'stroke-width: ' + settings.strokeWidth + '; stroke: #fff;');
          }
        }, 
    "path");
  },

  /**
   * @function getGeogRates
   *
   * @param {Object} currData - the current data in view
   * @returns {Array} dataArray - An array of geographic codes and the corresponding rate
   *    for the current data view.
   */

  getGeogRates: function(currData) {
    var dataArray = d3.map();

    currData.forEach(function(d) {
       dataArray.set(d.geog, +d.datacol);
    });

    return dataArray;
  },

  /**
   * @function appendTooltip
   */
  appendTooltip: function(d, currData, mapType) {
    var self = this;
    var geog = d.geog,
        format = Utils.getNumberFormat(mapType),
        rate;

    currData.forEach(function(d) {
       if (d.geog == geog) {
        rate = $("#" + geog).attr("data-rate");
       }
    });

    if (rate == 'undefined') {
      rate = "No results";
    }

    return d.name + "<br/>" + mapType + ": <span id='currRate'>" + format(rate) + "</span>";
  },

  /**
   * @function getContextSettings
   *
   * Returns an array of settings for use with appending a map to the DOM. The county and
   * region maps are different sizes and depend on different sets of GeoJSON data, so those
   * settings are defined here.
   *
   * @param {string} context - The geographic context or map that is currently on view
   * @returns {Array} svgSettings - An array of settings depending on the map that is in use
   */
  getContextSettings: function(context) {
    var svgSettings;

    switch(context) {
      case "regions":
        svgSettings = {
          viewBox: "50 50 860 500",
          geography: regions,
          extraPaths: region_path,
          transform: "translate(0, -50)",
          strokeWidth: "2",
          mapWidth: 615
        };
        break;
      case "counties":
        svgSettings = {
          viewBox: "-32550,-19037 59361,38626",
          geography: counties,
          extraPaths: county_path,
          transform: "translate(0, 0)",
          strokeWidth: "100",
          mapWidth: 590
        };
        break;
    }

    return svgSettings;
  }
};