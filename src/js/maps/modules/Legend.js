/**
 * LEGEND.JS
 *
 * Creates a legend of colors and values based on the current data view.
 */

var Events = require('./Listener.js');
var Utils = require('./Utils.js');

module.exports = {

    init: function(legendLabel) {
      var self = this;

      // Wait for map colorization to finish, otherwise we have
      // no need for a legend. The event returns a quantize scale
      // of colors corresponding to those used in the map.
      Events.subscribe('Map colorized', function(obj) {
        self.appendSVG(obj.scale);
      });

      if(typeof legendLabel != 'undefined') {
         $('#legend-label').text(legendLabel);
      }
    },

    appendSVG: function(scale) {
      var width = 300;
      var svg = d3.select("#legend").append("svg")
            .attr("id", "map_legend");

      var legend = svg.selectAll('g.legendEntry')
            .data(scale.range().reverse())
            .enter()
            .append('g').attr('class', 'legendEntry');

      legend
          .append('rect')
          .attr("x", width - 280)
          .attr("y", function(d, i) {
             return i * 20;
          })
          .attr("width", 10)
          .attr("height", 10);

      legend
          .append('text')
          .attr("x", width - 265) //leave 5 pixel space after the <rect>
          .attr("y", function(d, i) {
             return i * 20;
          })
          .attr("dy", "0.8em") //place text one line *below* the x,y point
          .text(function(d,i) {
              var extent = scale.invertExtent(d),
                  format = Utils.getNumberFormat();

              // Return a range. This makes sense for regions because the 
              // cut points don't always exactly match the rates if they are
              // not evenly distributed.
              return format(+extent[0]) + " - " + format(+extent[1]);
          });
    }  // appendSVG
} // module