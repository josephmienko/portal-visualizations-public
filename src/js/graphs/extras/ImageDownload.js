/*
 *  IMAGE DOWNLOAD
 * 
 *  Copies graph SVG to a canvas and enables download as
 *  a PNG image. Relies on the FileSaver library.
 */

var DetectFeatureSupport = require('./DetectFeatureSupport.js');

module.exports = {

	init: function() {
        var self = this;

        self.bindUIEvents();
	},

    bindUIEvents: function() {
        var self = this,
            isSvgSupported = DetectFeatureSupport.detectSVG(),
            isFileSaverSupported = false;
        try { isFileSaverSupported = !!new Blob(); } catch(e){}

        // From examining source code of FileSaver.js
        var isFileSaverWellSupported = (typeof requestFileSystem !== 'undefined') ||
          (typeof webkitRequestFileSystem !== 'undefined') ||
          (typeof mozRequestFileSystem !== 'undefined') ||
          (typeof navigator.msSaveBlob !== 'undefined');

        if( !isSvgSupported || !isFileSaverSupported ){
          alert('Sorry, this feature is not supported for your broswer');

        } else {
          // All others should do download
          // based on the "data-canvas" and "data-filename" attributes.
          $('#js-imageDownload' ).click(function(){
                self.graphToDataURL();
                self.downloadImage();
          });

          $('#update').click(function() {
                setTimeout(function() {
                   self.graphToDataURL();
                }, 5000);
          });

        }
    },

    downloadImage: function() {
        var downloadElement = $('#canvas canvas'),
            downloadTitle = $("#data-title h2").text().replace(/ /g, '_'),
            downloadName = downloadTitle + ".png",
            canvas = $(downloadElement)[0];
        canvas.toBlob( function(blob){
          saveAs( blob, downloadName );
        });
    },

	graphToDataURL: function() {
        // We'll be counting how much space we need for the canvas
        var totalHeight = 0;
        var maxWidth = 0;

        // The canvas and context to use
        var $canvas = $('#canvas canvas');
        var canvas = $canvas[0];
        var context = canvas.getContext('2d');

        // Figure out header info and some general font info. Font has to be computed manually due
        // to issues in Firefox
        var headerHeight = 60;
        var titleFont = $('#data-title').css('font-family');
        var font = "bold 16px " + titleFont;
        totalHeight += (headerHeight * 2);

        // Get the height and width of the charts in the #chart div
        offset = [];
        $('#chart svg').each(function(index) {
            offset[index] = totalHeight;
            // Add height of this div to the total height
            var height = parseInt($(this).attr('height')),
                width = parseInt($(this).attr('width'));
            console.log("Height: " + height + " width: " + width);
            totalHeight += height;
            maxWidth = width > maxWidth ? width : maxWidth;
        });

        // Compute the legend data and metadata
        context.save();
        var fontFamily = $('#chartLegend td').css('font-family');
        var $chartLegendRows = $('#chartLegend table tr');
        var legendRowHeight = 10;
        var legendRowMargin = 5;
        var legendColMargin = 5;
        var legendRowOffset = [];
        var legendColWidth = [];
        var legendRowColor = [];
        var legendRowFont = [];
        var legendText = [];
        for (var r = 0; r < $chartLegendRows.length; r++) {
            var fontWeight = r === 0 ? 'bold' : 'normal';
            legendRowFont[r] = fontWeight + ' ' + legendRowHeight + 'px ' + fontFamily;
            context.font = legendRowFont[r];

            var tr = $chartLegendRows[r];
            legendText[r] = [];
            legendRowOffset[r + 1] = totalHeight;
            totalHeight += legendRowHeight + legendRowMargin;

            var $row = $(tr);
            var $cols = $row.children('td');
            if (!$cols.length) {
                $cols = $row.children('th');
            }
            for (var c = 0; c < $cols.length; c++) {
                var td = $cols[c];
                var text = $(td).text();
                text = text ? text : '';
                text = text.replace('&nbsp;', ' ');
                legendText[r][c] = text;

                var tdWidth = context.measureText(text).width;
                legendColWidth[c] = (r === 0 || !legendColWidth[c] || tdWidth > legendColWidth[c]) ? tdWidth : legendColWidth[c];
                if (c === 0) {
                    legendRowColor[r] = $(td).css('background-color');
                }
            };
        };
        var legendColOffset = [];
        var legendWidth = 0;
        legendColWidth[0] = legendRowHeight;
        for (var i = 0; i < legendColWidth.length; i++) {
            legendColOffset[i] = legendWidth;
            var w = legendColWidth[i];
            legendWidth += w + legendColMargin;
        };
        maxWidth = legendWidth > maxWidth ? legendWidth : maxWidth;
        totalHeight += 50;
        context.restore();

        // Get data updated date
        var dataUpdated = $('#dbUpdated').text();

        // Get current date
        var currentDate = new Date();
        var formattedDate = (currentDate.getMonth() + 1) + '/' + currentDate.getDate() + '/' + currentDate.getFullYear();

        // Set canvas dimensions
        $canvas.height(totalHeight);
        $canvas.width(maxWidth);
        canvas.height = totalHeight;
        canvas.width = maxWidth;

        context.save();
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, maxWidth, totalHeight);
        context.restore();


        // Draw the title
        context.save();
        context.fillStyle = '#000000';
        context.font = font;
        context.textAlign = 'center';
        var title = $('#data-title h2').text();
        context.fillText(title, canvas.width / 2, headerHeight);
        context.restore();

        // Draw the subtitle
        context.save();
        context.fillStyle = '#000000';
        context.font = 'normal 14px' + titleFont;
        context.textAlign = 'center';
        var subtitle = $('#data-title h4').text();
        context.fillText(subtitle, canvas.width / 2, headerHeight + 20);
        context.restore();

        var div = $('#chart svg').siblings('div');
        $(div).remove();
        // Iterate over each <svg> and call canvg at the y offset for this iteration
        $('#chart svg').each(function(index, svgElement) {
            var svg = svgElement.parentNode.innerHTML;
            //consoleLog( svg );
            var options = {
                offsetY: offset[index],
                ignoreClear: true,
                ignoreMouse: true,
                ignoreAnimation: true,
                ignoreDimensions: true
            };
            context.save();
            canvg(canvas, svg, options);
            context.restore();

        });

        // Display the legend colors
        context.save();
        for (var r = 0; r < legendRowColor.length; r++) {
            var color = legendRowColor[r];
            if (color) {
                context.fillStyle = color;
                context.fillRect(15, legendRowOffset[r], legendRowHeight, legendRowHeight);
            }
        };
        context.restore();

        // Display the legend text
        context.save();
        context.textAlign = 'left';
        for (var r = 0; r < legendText.length; r++) {
            context.font = legendRowFont[r];
            for (var c = 0; c < legendText[r].length; c++) {
                var text = legendText[r][c];
                if (text) {
                    var y = legendRowOffset[r] + legendRowHeight;
                    var x = legendColOffset[c];
                    context.fillText(text, x + 15, y);
                }
            }
        }
        context.restore();

        // Display the data updated date and access date
        context.save();
        var y1 = totalHeight - 5;
        dateText = dataUpdated + "  |  Data accessed " + formattedDate;
        context.textAlign = 'left';
        context.fillText(dateText, 25, y1);
        context.restore();

        // Add POC URL to the bottom
        context.save();
        var visitText = "http://data.partnersforourchildren.org/";
        var y2 = y1;
        context.textAlign = 'right';
        context.fillText(visitText, maxWidth - 200, y2);
        context.restore();

        // Make a copy of the canvas to the <img> tag
        if (canvas.toDataURL) {
            var img = $('#image img')[0];
            img.src = canvas.toDataURL();
        }
	}
};