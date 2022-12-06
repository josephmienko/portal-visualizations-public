/*
 *  SHARE
 *
 *  Implements social sharing features for the current
 *  visualization.
 */

module.exports = {

	init: function() {
		var self = this;

		$('#js-share').click(function() {
            var url = self.makeLongURL();
			self.makeShortURL(url);
		});

        // Attach Google API client to the page
        var googleApiLoaded = function() {
            gapi.client.setApiKey("AIzaSyA5Jz5mOEW1k83BwmuD8O4PEKv8v0AaiEU");
            gapi.client.load("urlshortener", "v1", function(){});
        };

        window.onload = googleApiLoaded;

	},

	appendShareLinks: function(link) {
      $('#twitter').attr("href", "http://twitter.com/share?url="+link);
      $("#email").attr('href', 'mailto:'+link);
      $('#facebook').attr("href", "http://www.facebook.com/sharer.php?u="+link);
	},

	makeLongURL: function() {
		var self = this;
        var params = self.getParamsArray();

        // Get the current URL
        var url = window.location.href;
        var hash = url.indexOf('#');
        if (hash > 0) {
            url = url.substring(0, hash);
        }

        // Add the parameters
        var sep = '#'
        for (var param in params) {
            var vals = params[param];
            for (var co = 0; co < vals.length; co++) {
                var val = vals[co];
                url += sep + param + '=' + val;
                sep = '&';
            }
        }

        return url;
	},

	makeShortURL: function(url) {
	    var self = this;
        
        var request = gapi.client.urlshortener.url.insert({
          resource: {
            longUrl: url
          }
        });
        request.execute(function(response) {
            var link = response.id;
            $('#short-url').empty();
            $('#short-url').append('<a href="'+link+'">'+link+'</a>');
            self.appendShareLinks(link);
        });
	},

	getParamsArray: function() {
        var params = {},
        	self  = this;

        $('.fieldset.visible').each(function() {
            var $fieldset = $(this);

            var name = $fieldset.attr('id');
            var vals = undefined;
            if ($fieldset.hasClass('config-type-dateRange') ||
                $fieldset.hasClass('config-type-dynamicDateRange')) {
                // For some types (dateRange and dynamicDateRange), we handle them differently
                vals = self.getParamsFromFieldsetRange($fieldset);

            } else if ($fieldset.hasClass('config-type-param') ||
                $fieldset.hasClass('config-type-filter')) {
                // Everything else are checkboxes, so just set the values
                vals = self.getParamsFromFieldsetCheckboxes($fieldset);

            } else {
                // This is something unexpected
                consoleLog('Unexpected parameter to get: ' + fieldName);
            }

            if (vals) {
                params[name] = vals;
            }
        });

        return params;
	},

	getParamsFromFieldsetCheckboxes: function($fieldset) {
        var checkedBoxes = [];
        $fieldset.find('input:checked').each(function() {
            var val = $(this).val();
            checkedBoxes.push(val);
        });
        return checkedBoxes;
	},

	getParamsFromFieldsetRange: function($fieldset) {
        var range = $fieldset.find('.control').slider('option', 'values');
        return range;
	}
};