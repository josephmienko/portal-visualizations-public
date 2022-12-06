/*
 *  IMAGE DOWNLOAD
 * 
 *  Copies graph SVG to a canvas and enables download as
 *  a PNG image. Relies on the FileSaver library.
 */

var DetectFeatureSupport = require('./DetectFeatureSupport.js');
var Events = require('./Listener.js');

module.exports = {

    init: function() {
        var self = this;

      Events.subscribe('Map colorized', function(obj) {
        var min = obj.min;
        var max = obj.max;
        self.bindUIEvents();
        self.graphToDataURL(min, max);
      });
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
              self.downloadImage();
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

    /** 
     * @function graphToDataUrl
     *
     * Uses the canvg plugin to build a data url version of the image and save it as HTML. This constructed
     * image can then be saved and downloaded.
     */
    graphToDataURL: function(min, max) {
      var title = d3.select("#data-title h2").text();
      var html = d3.select("#map svg")
            .attr("version", 1.1)
            .attr("xmlns", "http://www.w3.org/2000/svg")
            .node().parentNode.innerHTML;
     
      var imgsrc = 'data:image/svg+xml;base64,'+ btoa(html);
      var img = '<img src="'+imgsrc+'">'; 
      d3.select("#image").html(img);
     
     
      var canvas = document.querySelector("canvas"),
      context = canvas.getContext("2d");
     
      var image = new Image;
      image.src = imgsrc;

      image.onload = function() {
        canvas.width = 650;
        canvas.height = 500;

        context.save();
        context.fillStyle = '#ffffff';
        context.fillRect( 0, 0, 650, 500 );
        context.restore();

        context.save();
        context.font="20px Lucida Grande";
        context.textAlign = 'center';
        context.fillText(title, canvas.width/2, 30);
        context.restore();

        context.save();
        context.drawImage(image, 0, 0);
        context.restore();

        context.save();
        var minRate = "Min: " + min;
        var maxRate = "Max: " + max;
        context.font="14px Lucida Grande";
        context.fillText(minRate, 10, 450);
        context.fillText(maxRate, 10, 470);
        context.restore();

        context.save();
        var dataUpdated = "Data Updated: 02 May, 2019";
        var currentDate = new Date();
        var formattedDate = (currentDate.getMonth()+ 1) + '/' + currentDate.getDate() + '/' + currentDate.getFullYear();
        dateText = dataUpdated + "  |  Data accessed " + formattedDate;
        context.textAlign = 'left';
        context.fillText( dateText, 10, 493 );
        context.restore();

        context.save();
        var visitText = "http://partnersforourchildren.org/data";
        context.textAlign = 'right';
        context.fillText( visitText, 590, 493);
        context.restore();
     
        var canvasdata = canvas.toDataURL("image/png");
        var pngimg = '<img src="'+canvasdata+'">';
        d3.select("#pngdataurl").html(pngimg);
    }
}
};