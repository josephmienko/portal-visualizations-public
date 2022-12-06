/**
 * SpaghettiPlot.js
 *
 * Creates a spaghetti plot based on arbitrary data passed in from a
 * CSV file. The plot assumes a numeric x-axis with the first column
 * of the CSV representing a geographic dimension (in this case, states).
 * The geographic dimension can be generalized further depending on future needs.
 */

var Events = require('./Listener.js');

module.exports = {

 		init: function(options) {
 			// Preserve current scope for later use
 			var self = this;

 			// Listen for the data load event and append the graph when all
 			// data objects are ready. This allows us to prevent d3's usual 
 			// nested callbacks when loading data from multiple CSVs.
		    Events.subscribe('Data loaded', function(obj) {
		    	// Pull the data out of the published event
		    	var regionsList = obj.regions;
		    	var data = obj.data;

		    	self.appendGraph(data, regionsList);
		    });
 		},

 		/**
 		 * @function appendGraph
 		 *
 		 * @param {Array} axisRange - The min and max values for the X and Y axes
 		 * @param {Object} data - The full dataset returned by DataService
 		 * @param {Array} regionsList - a list of state names and corresponding region codes as
 		 *   key-value pairs
 		 */
 		appendGraph: function(data, regionsList) {
 			var self = this;
 			var axisRange = self.getMinMaxValues(data);

 			// Set up values for scales and sizes so that we can append the graph
 			var w = parseInt(d3.select('#graph').style('width'), 10) - 20;
			var h = 476;
			var margin = 30;
		    var xMin = axisRange.xMin;
		    var xMax = axisRange.xMax;
		    var yMin = axisRange.yMin;
		    var yMax = axisRange.yMax;

		    // Set up scale ranges for the x and y axes. These are used both to draw the lines
		    // and create the axes later. See https://github.com/mbostock/d3/wiki/Quantitative-Scales#linear_domain
		    // for details about how D3 sets up quantitative scales with ranges ties to the specific values.
		    // of the dataset.
		    // NOTE: The Y range has to be listed inverted for the scale to show up correctly
			var y = d3.scale.linear()
				   .domain([yMin, yMax])
				   .range([h - margin, 0 + margin]);

			var x = d3.scale.linear()
			        .domain([xMin, xMax])
			        .range([0 + margin - 5, w - 30]);

			// This fails id the max range is just xMax
			var range = d3.range(xMin, xMax + 1);

			// Small function for drawing a line along the scale created above
 			var line = d3.svg.line().x(function (d, i) {
			    return x(d.x);
			}).y(function (d) {
			    return y(d.y);
			});

			// Append an empty SVG that will hold all of the axes and data lines
			var graph = d3.select("#graph")
						.append("svg:svg")
						.attr("width", w)
						.attr("height", h)
						.append("svg:g");

			// Append a path for each line in the CSV
			var startX = {}, stateNames = {};
			for (i = 1; i < data.length; i++) {
		        var values = data[i].slice(3, data[i.length - 1]);
		        var currData = [];
		        stateNames[data[i][1]] = data[i][0];
		        var started = false;

		        // Iterates over the csv minus header row and appends a 
		        // line for each row.
		        for (j = 0; j < values.length; j++) {
		            if (values[j] != '') {
		                currData.push({
		                    x: range[j],
		                    y: parseFloat(values[j])
		                });
		                if (!started) {
		                    startX[data[i][1]] = {
		                        'startX': range[j],
		                        'startVal': parseFloat(values[j])
		                    };
		                    started = true;
		                } else if (j == values.length - 1) {
		                    startX[data[i][1]]['endX'] = range[j];
		                    startX[data[i][1]]['endVal'] = parseFloat(values[j]);
		                }
		            }
		        }

		        graph.append("svg:path")
		        	 .data([currData])
		        	 .attr("state", data[i][0])
		        	 .attr("start", data[i][1])
		        	 .attr("end", data[i][2])
		        	 .attr("class", regionsList[data[i][0]])
		        	 .attr("d", line);
		    }

		    // Once lines are appended, add axes and click handlers
		    self.appendAxes(graph, x, y, h, yMin, yMax, xMin, xMax);

		    // Now we can kick off any modules that require the SVG
		    // to be in place already.
		    Events.publish('SVG created');
 		},

 		/** 
 		 * @function appendAxes
 		 *
 		 * Uses the X and Y axis range and scales to append two axes with
 		 * tick marks and labels at intervals. Modify this method to add
 		 * text labels for each axis.
 		 *
 		 * @param {node} graph - The selected graph svg
 		 * @param {function} x - The x-axis scale function
 		 * @param {function} y - The y-axis scale function
 		 * @param {number} h - The graph height
 		 * @param {number} yMin
 		 * @param {number} yMax
 		 * @param {number} xMin
 		 * @param {number} xMax
 		 */
 		appendAxes: function(graph, x, y, h, yMin, yMax, xMin, xMax) {
			// Appends an X and Y axis with tick marks

			graph.append("svg:line")
				 .attr("x1", x(xMin))
				 .attr("y1", y(yMin))
				 .attr("x2", x(xMax))
				 .attr("y2", y(yMin))
				 .attr("class", "axis")

			// Y axis
			graph.append("svg:line")
				 .attr("x1", x(xMin)) 
				 .attr("y1", y(yMin))
				 .attr("x2", x(xMin))
				 .attr("y2", y(yMax))
				 .attr("class", "axis")
			graph.selectAll(".xLabel")
				 .data(x.ticks(5))
				 .enter()
				 .append("svg:text")
				 .attr("class", "xLabel")
				 .text(String)
				 .attr("x", function (d) {
			    	return x(d)
				 })
				 .attr("y", h - 10)
				 .attr("text-anchor", "middle")
			graph.selectAll(".yLabel")
				 .data(y.ticks(4))
				 .enter()
				 .append("svg:text")
				 .attr("class", "yLabel")
				 .text(String)
				 .attr("x", 0)
				 .attr("y", function (d) {
				    return y(d)
		  		 })
		  		 .attr("text-anchor", "right")
		  		 .attr("dy", 3)
			graph.selectAll(".xTicks")
				 .data(x.ticks(5))
				 .enter()
				 .append("svg:line")
				 .attr("class", "xTicks")
				 .attr("x1", function (d) {
			   	 	return x(d);
				 })
				 .attr("y1", y(yMin))
				 .attr("x2", function (d) {
			    	return x(d);
				 })
				 .attr("y2", y(yMin) + 7)
			graph.selectAll(".yTicks")
				 .data(y.ticks(4))
				 .enter()
				 .append("svg:line")
				 .attr("class", "yTicks")
				 .attr("y1", function (d) {
			    	return y(d);
				 })
				 .attr("x1", x(0))
				 .attr("y2", function (d) {
			    	return y(d);
				 })
				 .attr("x2", x(0))
 		},

 		/**
 		 * @function getMinMaxValues
 		 *
 		 * Returns the minimum and maximum X and Y values for the dataset, assuming that the
 		 * first three columns are non-value columns for the plot. D3 relies heavily on hard
 		 * coded ranges, so we need to store these values for later.
 		 *
 		 * @param {Array} data
 		 */
 		getMinMaxValues: function(data) {
		    // Get min and max values so that we can draw the plot.
		    // The CSV ingestion converts integers to text, annoyingly,
		    // so they need to be converted back to integers.
		    var xMin = parseInt(data[0][3]);
		    var xMax = parseInt(data[0].slice(-1)[0]);
		    var yMin = 0;
		    var yMax = 0;

		    // Iterate over each row to determine the largest value. If it is
		    // greater than the current value of yMax, set yMax to the new 
		    // number.
		    for (var i = 1; i < data.length; i++) {
			    var values = (data[i].slice(3));
			    var max = Math.max.apply(Math, values);
			    
			    if (max > yMax) {
			    	yMax = max;
			    }
			}

			return {
				"yMin": yMin,
				"yMax": yMax,
				"xMin": xMin,
				"xMax": xMax
			};
 		}
 };