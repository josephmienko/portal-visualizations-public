Sidebar.prototype.dotChart = function(currData) {
    var values = getChartValues(currData);
    console.log(values);

    var min = d3.min(d3.values(values));
    var max = d3.max(d3.values(values));

    console.log(min + ", " + max);

    var width = 140,
        height = 132,
        barHeight = 17;

    var x = d3.scale.linear()
        .domain([0, max])
        .range([0, width]);

    var y = d3.scale.linear()
      .range([height, 0]);

    var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom");

    var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left");

    $('#contextChart').empty();

    $('#contextChart').append('<h4>Rate per Region</h4>');

    var svg = d3.select("#contextChart").append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("class", "barChart")
        .attr("style", "padding: 0 0 0 5px;");

    var bar = svg.selectAll("g")
        .data(values)
        .enter().append("g")
        .attr("transform", function(d, i) { return "translate(0," + i * barHeight + ")"; })
        .attr("class", "bar")
        .attr("data-rate", function(d) { return d; })
        .attr("id", function(d) { return d; });

    bar.append("rect")
        .attr("width", width)
        .attr("height", 1)
        .attr("transform", "translate(0,5)");

    bar.append("circle")
        .attr("class", "circle")
        .attr("cx", function(d) { return x(d)-5; })
        .attr("cy", barHeight / 3)
        .attr("r", barHeight / 3);

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(4," + 107 + ")")
        .call(xAxis);

    $(".barChart .bar").each(function() {
        var $this = $(this);
        var rate = $this.attr("id");
        var geog = $("path[data-rate='" + rate + "']");
        var geogName = $(geog).attr("name");
        $this.qtip({
          content: {
            text: "Rate: "+rate,
            title: geogName
          },
            position: {
              my: 'left bottom',
              at: 'top left'
            },
            style: {
              classes: 'qtip-dark qtip-rounded'
            },
            show: {
              event: 'click mouseenter'
            },
            hide: {
              fixed: true,
              delay: 300,
            }
        });
    });

  $(".barChart").on("click", "circle", function() {
     var $this = $(this);

     $(".active-circle").attr("class", "circle");
     $this.attr("class", "circle active-circle");

     var parentRate = $this.parent("g").attr("id");
     var relatedPath = $('.map').find("[data-rate='" + parentRate + "']");
     var relatedPathId = '#' + $(relatedPath).attr("id");
     var oldFill = $(".active-path").attr("data-fill");
     $(".active-path").attr("style", "fill: " + oldFill + ";").attr("class", "");

     $(relatedPathId).attr("style", "fill: #D9BB32;").attr("class", "active-path");
  });

  $(".barChart").on("click", ".active-circle", function() {
      var $this = $(this);
      clearSideChart($this);
  });
};

Sidebar.prototype.histogram = function(currData) {
    var values = getChartValues(currData);

    // TODO: Reduce redundancy
    var min = d3.min(d3.values(values)),
        max = d3.max(d3.values(values));

    var formatCount = d3.format(",.0f");

    var margin = {top: 0, right: 5, bottom: 30, left: 5},
        width = 160 - margin.left - margin.right,
        height = 120 - margin.top - margin.bottom;

    var x = d3.scale.linear()
        .domain([0, max])
        .range([0, width]);

    // Generate a histogram using six uniformly-spaced bins.
    var data = d3.layout.histogram()
        .bins(x.ticks(12))
        (values);

    var y = d3.scale.linear()
        .domain([0, d3.max(data, function(d) { return d.y; })])
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    $('#contextChart').empty();

    $('#contextChart').append('<h4>Counties Grouped by Rate</h4>');

    var svg = d3.select("#contextChart").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("class", "histogram")
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var bar = svg.selectAll(".bar")
        .data(data)
        .enter().append("g")
        .attr("class", "bar")
        .attr("data-values", function(d) { return d ;})
        .attr("transform", function(d) { return "translate(" + x(d.x) + "," + y(d.y) + ")"; });

    bar.append("rect")
        .attr("x", 1)
        .attr("width", x(data[0].dx) - 1)
        .attr("height", function(d) { return height - y(d.y); });

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    $(".histogram").on("click", ".bar", function() {
       var $this = $(this);

       $(".active-bar").attr("class", "bar");
       $this.attr("class", "bar active-bar");

       var binValues = $this.attr("data-values");
       var binArray = binValues.split(",");

       $(".active-path").each(function() {
            var oldFill = $(this).attr("data-fill");
            $(this).attr("style", "fill: " + oldFill + ";").attr("class", "");
       });
       
       for (var i=0;i<binArray.length;i++) {
          var value = binArray[i];
          var relatedPath = $('.map').find("[data-rate='" + value + "']");
          var relatedPathId = '#' + $(relatedPath).attr("id");
          $(relatedPathId).attr("style", "fill: #D9BB32;").attr("class", "active-path");
       }
    });

    $(".histogram").on("click", ".active-bar", function() {
      var $this = $(this);
      clearSideChart($this);
      $this.attr("class", "bar");
    });
};

var getChartValues = function(currData) {
    values = [];

    currData.forEach(function(d) {
       values.push(parseFloat(d.datacol));
    });

    values.shift();
    return values;
};

var clearSideChart = function($this) {
  $this.attr("class", "");

  $(".active-path").each(function() {
    var fill = $(this).attr("data-fill");
    $(this).attr("style", "fill: " + fill + ";").attr("class", "");
  })
};
