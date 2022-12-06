/**
 *  PERMALINK
 *
 *  Provides functionality for specifying visualization filter selections
 *  in the URL. This allows users to either share or load a specific view of
 *  the visualization. The modules uses the Google URL Shortener API to format
 *  the link as a shortlink so that it is easier to save or copy.
 */

var Events = require('./Listener.js');

var Permalink = function(){

  /**
   * @function init
   *
   * Loads the Google URL Shortener script so that it can be used when the user
   * requests a short link, then binds a click handler to the "Get Link" button
   * that will return and display a short link for the current view.
   */
  function init() {
      var url;
      var shortlink;

      // Attach Google API client to the page
      var googleApiLoaded = function() {
          gapi.client.setApiKey("AIzaSyA5Jz5mOEW1k83BwmuD8O4PEKv8v0AaiEU");
          gapi.client.load("urlshortener", "v1", function(){});
      };

      // Attach API load to the window 
      window.onload = googleApiLoaded;

      // Bind click handler to js-share so that a URL is generated on request
      $('#js-share').click(function() {
        url = urlParamsFromFieldsets();
        shortlink = makeShortURL(url);
      });
  };

  /**
   * @function appendLinks
   *
   * Given the short URL returned from Google, attach links for copying or sharing via 
   * Facebook, Twitter and email. The Facebook and Twitter share URLs may change, so
   * this should be tested on occasion.
   *
   * @param link {string} - The short URL returned from Google's API
   */
  function appendLinks(link) {
      $('#short-url').empty();
      $('#short-url').append('<a href="'+link+'">'+link+'</a>');
      $('#twitter').attr("href", "http://twitter.com/share?url="+link);
      $("#email").attr('href', 'mailto:'+link);
      $('#facebook').attr("href", "http://www.facebook.com/sharer.php?u="+link);
  };

  /**
   * @function makeShortURL
   *
   * Given a long url as input, makes a request to Google's URL Shortnener API and
   * returns the reponse id (the link is stored as an id).
   *
   * @param url {string} - The long version of the URL with parameters for the selected filters
   */
  function makeShortURL(url) {
        var link;
        var request = gapi.client.urlshortener.url.insert({
          resource: {
            longUrl: url
          }
        });
        request.execute(function(response) {
            link = response.id; // This is how Google's API formats the response
            appendLinks(link);
        });
        return link;
  };

  /**
   * @function getParamsArray
   *
   * Called on load if a URL with params is detected. Takes the URL and splits the params
   * into information tthat will be used to load the correct view of the map.
   *
   * @param url {string}
   * @returns loadContext, filtersToSelect {Object}
   */
  function getParamsArray(url) {
    var paramsArray;
    var filterValuesToSelect;

    // Turn URL string into an array of parameters,
    // then split them into key | value pairs
    urlParams = url.split("#")[1];
    loadContext = urlParams.split("&")[0];
    paramsArray = urlParams.split("&");
    paramsArray.shift();
    filterValuesToSelect = paramsArray;
    urlParams = {};

    for( var param in paramsArray ){
      var val = paramsArray[param].split("=")[1];
      var key = paramsArray[param].split("=")[0];

      // Change the date key to match expected input
      // 'date_type' is necessary for connecting this
      // param to the right entry in params-display.json
      if(key == 'date_type'){
        key = 'date';
      }

      urlParams[key] = val;
    }

    return {
      loadContext: loadContext,
      filtersToSelect: urlParams
    };
  };

  /**
   * @function urlParamsFromFieldsets
   *
   * Gets params as key|value pairs and formats them as URL parameters
   */
  var urlParamsFromFieldsets = function() {
      var params = paramsFromFieldsets();

      // Get the current URL
      var url = window.location.href;

      // Add the parameters
      var sep = '&';
      for( var param in params ){
        var val = params[param];
        url += sep + param + '=' + val;
      }

      return url;
  };

  /**
   * @function paramsFromFieldsets
   *
   * Loops over filters on the page and returns an object containing key|value
   * pairs of the currently selected values.
   */
  var paramsFromFieldsets = function() {
      var vals = {};

      $('.fieldInput').each(function(){
        var value = $(this).val();
        var key = $(this).attr("id").split("-")[1];

        if(key == 'date_type'){
          var year = value.split(" ")[0];
          var newval = year.split("-")[0];
          value = newval;
        }
        
        vals[key] = value;
      });

      return vals;
  };

  return {
    init: init,
    getParamsArray: getParamsArray
  };
}();

module.exports = Permalink;