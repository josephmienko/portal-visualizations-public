// Modified from http://rveciana.github.io/geoexamples/d3js/d3js_electoral_map/tooltipCode.html

d3.helper = {};
 
d3.helper.tooltip = function(accessor){

  // Select the map container and only append/remove element on mouseenter and mouseleave. This prevents
  // the flickering that occurred with the original code.
    $("#map").on("mouseenter", function() {
        if($('.tooltip').length != -1) {
            $(this).stop().append("<div class='tooltip'></div").append("<div class='tooltip-triangle'></div>");
        }
    });

    $("#map").on("mouseleave", function() {
      $('.tooltip').remove();
      $('.tooltip-triangle').remove();
    });

    return function(selection){
        var tooltipDiv;
        var bodyNode = d3.select('#map').node();
        var offsetY = 75;
        var offsetX = 75;

        selection.on("mouseover", function(d, i){
            var absoluteMousePos = d3.mouse(bodyNode);
            tooltipDiv = d3.select('.tooltip');
            tooltipTriangle = d3.select('.tooltip-triangle')

            tooltipDiv.style('left', (absoluteMousePos[0] - offsetX)+'px')
                .style('top', (absoluteMousePos[1] - offsetY)+'px')
                .style('position', 'absolute')
                .style("display", "block")
                .style('z-index', 1001);
            tooltipTriangle.style("display", "block")
                .style('top', (absoluteMousePos[1]-offsetX+57)+'px')
                .style('left', (absoluteMousePos[0]-offsetX+50)+'px')
                .style("position", "absolute")
                .style('z-index', 1000);
            // Add text using the accessor function
            var tooltipText = accessor(d, i) || '';
        })
        .on('mousemove', function(d, i) {
            // Move tooltip
            var absoluteMousePos = d3.mouse(bodyNode);
            tooltipDiv.style('left', (absoluteMousePos[0] - offsetX)+'px')
                .style('top', (absoluteMousePos[1] - offsetY)+'px');

            tooltipTriangle
                .style('top', (absoluteMousePos[1]-offsetX+57)+'px')
                .style('left', (absoluteMousePos[0]-offsetX+50)+'px')
            var tooltipText = accessor(d, i) || '';
            tooltipDiv.html(tooltipText);
        });
 
    };
};