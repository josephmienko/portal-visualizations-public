(function($) {

/**
  GRAPH.JS

  This is the primary JS file for the Google Charts on the Data Portal. It was extended over time 
  without assistance from any tools that would help keep the code modular, so it is now a fairly
  dense and interconnected series of functions that are not always clear in name or purpose. 

  When I took it over in mid-2014 the code was not documented at all and many of the features in the
  "extras" folder were also in this file. I extracted secondary features and have tried to document
  functions here as I added featured, debugged, etc. The documentation effort was a prelude to
  more significant refactoring - many functions are so tightly coupled and dependent on architectural
  problems with the database/API that a lot of work is going to have to happen in one pass.

  Not everything is documented, but I tried to point out some of the densest logic or functionality
  when I came across it.

  KNOWN ISSUES
    * == instead of === : many value comparisons are currently being made with ==, which
      means that there could be some situations where type coercion is relied on for the expected result.
    * hoisting: Variables are declared, sometimes more than once, throughout a given function. Some functions
      are fairly complex, so it will take time to find, correct, and test all of these cases.
    * global variables: In many cases, these are declared deliberately to avoid passing data between functions.
      if a variable is global, assume it was meant to be that way.
 */

 // Sets the paths that will return metadata and data objects. I have never seen the relative URL
 // option used and am not sure where it was supposed to come from, so this may be deprecated.
    if (typeof useRelativeUrl === "boolean" && useRelativeUrl) {
        tableUrl = '../data/${table}';
        fieldsUrl = '../metadata';
    } else {
        tableUrl='/data/${table}';
        fieldsUrl = '/metadata';
    }

    /* @var {Array} colors - The default color palette for line charts. Google Charts picks colors
         for each data stream from the top down, which can result in some odd and inconsistent behavior
         when switching filter choices. Since Google Charts is an external API and control is limited,
         fixing this issue will likely take some stored procedure work.
    */
    colors = [
        '#ffc400', // yellow
        '#00acc1', // teal
        '#f44336', // red
        '#4caf50', // green
        '#fb8c00', // orange
        '#673ab7', // purple
        '#d81b60', // pink
    ];

    /* @var {Array} comboColors - The default color palette for scatter charts with trendlines. 
        They needed to be grouped this way so that the dots and lines would match, but it gets
        strange when one or the other is turned off.
    */
    comboColors = [
        '#ffc107',
        '#ffc107',
        '#d84315',
        '#d84315',
        '#4db6ac',
        '#4db6ac',
        '#7cb342',
        '#7cb342',
        '#01579b',
        '#01579b',
        '#6E9CAE',
        '#f57f17',
        '#f57f17',
        '#f48fb1',
        '#f48fb1',
    ];

    colorPallete = {
        std: colors
    }

    // Groups are in multiples of 6.
    // If you need N colors, use colorGroup[roundDown((N-1)/6)]
    colorGroupRaw = [
        ['std', 'std', 'std', 'std', 'std', 'std', 'std', 'std', 'std'],
        ['std+std', 'std+std', 'std+std', 'std+std', 'std+std'],
        ['std+std+std', 'std+std+std', 'std+std+std'],
        ['std+std+std+std', 'std+std+std+std', 'std+std+std+std']
    ];

    colorGroup = []; // Built by initColorGroups

    /**
     * Wrapper function for console.log for older browser compatibility. 
     * Unfortunately does away with line numbers.
     * @param {string} msg - The message to be logged in the console.
     */
    function consoleLog(msg) {
        if (console && console.log) {
            console.log(msg);
        }
    }

    /**
     * Initializes the script once the Google visualization package is loaded.
     * @param {init} - The function that runs on callback
     */
    google.setOnLoadCallback(init);

    /**
     * Initializes the chart application by calling /metadata to get the parameter and
     * config file information for the current page. Pulls apart the JSON reponse to set
     * several variables for use in different parts of the application, then parses the
     * config file for chart type information.
     * 
     * CALLED BY: google.setOnLoadCallback
     * CALLS: populateChartType, initFieldsets, initColorGroups, paramsToFieldsets
     *
     * @callback
     */
    function init() {

        $.ajax({
            url: fieldsUrl,
            data: {
                sp: slug
            },
            dataType: 'json'
                //}).done(function( data ){
                ,
            success: function(data) {
                consoleLog("done");

                // Date information is parsed first. This calls a series of custom date handling
                // functions that should probably be revisited. Using something like Moment.js will
                // probably keep the code slimmer and reduce the potential for error.
                // 
                // This block will need to be removed or changed if the date tables in Annie are going
                // to be retired.
                dateInfo = data.dateInfo;
                dateInfo.minQuarterAny = dateToYQ(dateInfo.minDateAny);
                dateInfo.minQuarterAll = dateToYQ(dateInfo.minDateAll);
                dateInfo.maxQuarterAny = dateToYQ(dateInfo.maxDateAny);
                dateInfo.maxQuarterAll = dateToYQ(dateInfo.maxDateAll);

                $(".dbDate").text(dateInfo.dbDateFormatted);

                fieldset = data.param;
                tableInfo = data.tableInfo;
                fieldsetDisplay = data.display;
                fieldsetLag = data.lag;

                //pageInfo  = getPageInfo( tableInfo );
                for (var key in tableInfo) {
                    // If chartType is set on the object, add the class
                    populateChartType(tableInfo[key]);

                    // Some cleanup
                    if (tableInfo[key].charts === null) {
                        delete tableInfo[key].charts;
                    }
                    if (tableInfo[key].multicharts === null) {
                        delete tableInfo[key].multicharts;
                    }

                    // If we have multiple charts, handle each one
                    if (typeof tableInfo[key].charts != 'undefined') {
                        for (var co = 0; co < tableInfo[key].charts.length; co++) {
                            populateChartType(tableInfo[key].charts[co]);
                        }
                    }

                    if (typeof tableInfo[key].multicharts != 'undefined') {
                        for (var mkey in tableInfo[key].multicharts) {
                            var mc = tableInfo[key].multicharts[mkey];
                            if (mc.length) {
                                for (var co = 0; co < mc.length; co++) {
                                    populateChartType(mc[co]);
                                }
                            } else {
                                populateChartType(mc);
                            }
                        }
                    }
                }

                initFieldsets();
                initColorGroups();
                paramsToFieldsets();
                initChart();
            },
            error: function(xhr, status, err) {
                if (typeof err !== 'undefined' && err) {
                    showErrorMessage();
                }
                consoleLog("error: " + status);
            }
        });
    }
    window.init = init;

    /**
     * @function populateChartType
     *
     * Adds the Google Charts function call to the the config object with a key of "chartClass"
     * based on the chartType informtion in the config file. This setting is used in drawGraph 
     * to generate the graph.
     * 
     * CALLED BY: init
     * CALLS: nothing
     * 
     * @param {Object} o - The current config file
     */
    function populateChartType(o) {
        if (typeof o.chartType == 'undefined') {
            return;
        }

        switch (o.chartType) {
            case 'line':
                o.chartClass = google.visualization.LineChart;
                break;
            case 'area':
                o.chartClass = google.visualization.AreaChart;
                break;
            case 'column':
                o.chartClass = google.visualization.ColumnChart;
                break;
            case 'steppedArea':
                o.chartClass = google.visualization.SteppedAreaChart;
                break;
            case 'scatterChart':
                o.chartClass = google.visualization.LineChart;
                break;
            case 'combo':
                o.chartClass = google.visualization.ComboChart;
                break;
            default:
                o.chartClass = google.visualization.Table;
                break;
        }
    }

    /**
     * @function initFieldsets
     *
     * Globals: @var fieldset, @var fieldsetDisplay
     *
     * Parses fieldsetDisplay information to append parameters to different containers,
     * then appends date and cohort information to the page to save for later use. Finally,
     * sets event handlers for inputs and calls initChart, displaySelectedTables, and 
     * setDataTitle to fill out the rest of the page.
     *
     * CALLED BY: init
     * CALLS: addFieldsetsMatching, addCohorts, addMonthsType, setCohortsType,
     *        displaySelectedTables, initChart, setDataTitle
     */

    function initFieldsets() {
        fieldsetName = {};
        for (var key in fieldsetDisplay) {
            var display = fieldsetDisplay[key];
            if (display) {
                fieldsetName[key] = display.legend;
            }
        }

        // Fieldset appending was set up such that you have to explicitly pass in
        // the ID of the div and type of fieldset (corresponding to params-display.json)
        addFieldsetsMatching('displayFields', 'filter');
        addFieldsetsMatching('dateFields', 'dateType');
        addFieldsetsMatching('dateFields', 'filter');
        addFieldsetsMatching('dateFields', 'param');
        addFieldsetsMatching('demographicFields', 'filter');
        addFieldsetsMatching('demographicFields', 'param');
        addFieldsetsMatching('locationFields', 'filter');
        addFieldsetsMatching('locationFields', 'param');
        addFieldsetsMatching('advancedFields', 'filter');
        addFieldsetsMatching('advancedFields', 'param');

        dateFields = [];
      //  addCohorts(dateInfo.minQuarterAny.year, dateInfo.minQuarterAny.quarter,
           // dateInfo.maxQuarterAny.year, dateInfo.maxQuarterAny.quarter);

        addMonthTypes(dateInfo.minQuarterAny.year, dateInfo.minQuarterAny.quarter,
            dateInfo.maxQuarterAny.year, dateInfo.maxQuarterAny.quarter);

        $(".show").show();
        $(".hide").hide();

        setCohortsType();
        filterFields();

        // Bind events for handling new data selections
        $("input[type='checkbox']").click(function(e) {
            var ret = true;
            var checked = $(":checked");
            var numChecked = getNumChecked({
                multiply: true
            });

            // Skip that. Use a value based on the most from one category possible
            var maxChecked = 40;
            if (currentTable && currentTable.info && currentTable.info.maxChecked) {
                maxChecked = currentTable.info.maxChecked;
            }

            var tooMany = numChecked > maxChecked;
            if (tooMany) {
                var msg = 'Sorry, we are not able to show that many lines on the graph at once. Please use the table or select fewer filter options.';
                $(".loading").hide();
                showErrorMessage(msg);
                setTimeout(function() {
                    $(".loading").hide();
                }, 8000);
                ret = false;
            } else {
                $(".loading").hide();
            }

            return ret;
        });

        $('#update').click(initChart);
        $('#reset').click(resetFilters);
    }

    /*
     * @function initColorGroups
     *
     * Parses @var colorGroupRaw to create @var groupSet for use by Google Charts.
     * It's not clear why this needs to happen immediately on initialization and not
     * when the rest of the GC options are being prepared.
     * 
     * CALLED BY: init
     * CALLS: nothing
     */
    function initColorGroups() {
        for (var cgi = 0; cgi < colorGroupRaw.length; cgi++) {
            var groupSetRaw = colorGroupRaw[cgi];
            var groupSet = [];
            for (var gsi = 0; gsi < groupSetRaw.length; gsi++) {
                var palleteNameStr = groupSetRaw[gsi];
                var palleteNames = palleteNameStr.split('+');
                var palleteColors = [];
                for (var pni = 0; pni < palleteNames.length; pni++) {
                    var name = palleteNames[pni];
                    var pallete = colorPallete[name];
                    for (var pi = 0; pi < pallete.length; pi++) {
                        var color = pallete[pi];
                        palleteColors.push(color);
                    }
                }
                groupSet.push(palleteColors);
            }
            colorGroup.push(groupSet);
        }
    }

    /**
     * @function paramsToFieldsets
     *
     * Checks if parameters have been passed via the URL. If so, parses the parameters
     * and sets values on the appropriate filter. Also turns filters on or off so that
     * the correct filters are being displayed. TODO: check if filterFields is necessary.
     *
     * CALLED BY: init
     * CALLS: paramToFieldset, filterFields
     */

    function paramsToFieldsets() {
        //var query = window.location.search;
        var query = window.location.hash;
        if (query && query.length > 1) {
            query = query.substring(1);
        }
        window.location.hash = '';

        var paramVals = query.split('&');
        var fieldVal = {};
        for (var co = 0; co < paramVals.length; co++) {
            // Get each parameter and the value set
            var param, val;
            var paramVal = paramVals[co];
            var i = paramVal.indexOf('=');
            if (i) {
                param = paramVal.substr(0, i);
                val = paramVal.substr(i + 1);
            } else {
                param = paramVal;
                val = '';
            }

            // Set or update the field's value
            // Normalizing all values as arrays to make it easier to go through later
            var newVal = fieldVal[param];
            if (typeof newVal !== 'undefined') {
                newVal.push(val);
            } else {
                newVal = [val];
            }
            fieldVal[param] = newVal;
        }

        // Go through each field and try to set the values on it
        for (param in fieldVal) {
            val = fieldVal[param];
            paramToFieldset(param, val);
        }

        filterFields();
    }

    /**
     * @function paramToFieldset
     * For a given parameter, appends the values and relevant CSS classes to the fieldset
     * so that the fieldset can be manipulated and read from.
     *
     * @param fieldName Name of the fieldset
     * @param vals Array of values to set (and others should be cleared)
     */
    function paramToFieldset(fieldName, vals) {
        // Get the reference for the fieldset
        var $fieldset = $('#' + fieldName);

        if (fieldName === 'table') {
            $fieldset.val(vals[0]);

        } else if (fieldName === 'multichart') {
            $fieldset.attr('data-permalink', vals[0]);

        } else if ($fieldset.hasClass('config-type-dateRange') ||
            $fieldset.hasClass('config-type-dynamicDateRange')) {
            // For some types (dateRange and dynamicDateRange), we handle them differently
            paramToFieldsetRange(fieldName, vals);

        } else if ($fieldset.hasClass('config-type-param') ||
            $fieldset.hasClass('config-type-filter')) {
            // Everything else are checkboxes, so just set the values
            paramToFieldsetCheckboxes($fieldset, vals);

        } else {
            // This is something unexpected
            consoleLog('Unexpected parameter to set: ' + fieldName);
        }
    }

    /**
     * @function paramToFieldsetRange
     *
     * Appends a date range slider with values, then appends one
     * checkbox for each value to mimic the functionality of the
     * other fieldsets.
     */
    function paramToFieldsetRange(fieldName, vals) {
        var selector = '#' + fieldName;
        consoleLog('paramToFielsetRange ' + fieldName);
        $(selector + ' .control').slider('values', vals);
        $(selector).attr('data-sliderSet', 'true');
        updateMonthsRangeText(selector, vals[0], vals[1]);
        updateMonthsRangeValues(selector, vals[0], vals[1]);
    }

    /**
     * @function paramToFieldsetCheckboxes
     *
     * Resets all checkbox fields and then appends a checkbox for each
     * value, then sets appropriate classes depending on the defaults an/or
     * parameters passed in via url.
     */
    function paramToFieldsetCheckboxes($fieldset, vals) {
        if (typeof vals !== 'undefined' && vals.length) {
            // Uncheck everything
            $fieldset.find('input[type="checkbox"]').prop('checked', false);
            $fieldset.find('input.last-checked').removeClass('last-checked');
            $fieldset.find('input.is-checked').removeClass('is-checked');

            // Check just the values that are set
            for (var co = 0; co < vals.length; co++) {
                var val = vals[co];
                var $field = $fieldset.find('input[value="' + val + '"]');
                $field.prop('checked', true);
                $field.addClass('is-checked');
            }

            // Set the last value to the last one checked (for consistency)
            $field.addClass('last-checked');
        }
    }

    /**
     * @function getNumChecked
     *
     * Called on input click. Skips the daterange slider and iterates over currently in-use
     * filters to get a count of how many are checked. The returned number is used to check
     * if too many have been checked and a graph cannot be displayed.
     *
     * @param {Object} p - specifies whether params should be multiplied or not.
     * @returns {Number}
     */
    function getNumChecked(p) {
        var params = $.extend({
            includeDateRange: false,
            multiply: false
        }, p);

        var ret = 0;
        if (params.multiply) {
            ret = 1;
        }

        // Go through just the fields for the selected table
        // Possibly skip "monthStart" because it may be a huge date range
        // currentTable has been defined globally by page load, so the variable
        // can be used here. SHOULD REFACTOR.
        for (var co = 0; co < currentTable.params.length; co++) {
            var fs = info.params[co];
            var $fs = $('#' + fs);
            var isDateRange = $fs.hasClass('config-type-dateRange') || $fs.hasClass('config-type-dynamicDateRange')
            if (!isDateRange || params.includeDateRange) {
                var checked = $("#" + fs + " :checked");
                var len = checked.length;
                if (params.multiply) {
                    if (len === 0) {
                        len = 1;
                    }
                    ret *= len;
                } else {
                    ret += len;
                }
            }
        }
        return ret;
    }

    /**
     * @function objectSize
     *
     * Checks if the argument is an object and returns the length of the 
     * object. Used by filterParams to determine if there are param inputs 
     * that should be checked.
     */
    function objectSize(o) {
        var ret = 0;

        var t = typeof o;
        if (t === 'object') {
            ret = o.length;

            if (typeof ret === 'undefined') {
                ret = 0;
                // Maybe this is an object that has attributes, not an array
                for (var p in o) {
                    if (o.hasOwnProperty(p)) {
                        ret++;
                    }
                }
            }
        }

        return ret;
    }

    /**
     * @function filterParams
     *
     * Accepts a group of params as arguments. Filters/controls, params, and the multichart
     * param are separately passed to this function. Determines which params should be made
     * visible as well as some deprecated container visibility functionality.
     *
     * CALLED BY: filterFields
     */
    function filterParams(params, info) {
        if (typeof params === 'undefined') {
            return;
        } else if (typeof params === 'string') {
            params = [params];
        }
        for (var co = 0; co < params.length; co++) {
            var fs = params[co];
            var fsinfo = fieldset[fs];
            var tfsinfo = typeof fsinfo;

            // tableInfo is globally defined
            var currentGraph = Object.keys(tableInfo)[0];
            if (objectSize(fsinfo) > 1 || tfsinfo === 'undefined') {
                // Make the column visible if there is a usable filter inside of it
                $('#' + fs).parents('li.filter').addClass('open');
                // Date fields are undefined, other fields should have more than one setting
                $("#" + fs).show();
                $("#" + fs).addClass("visible");
                if (info.mutexAllOthers) {
                    $("#" + fs).addClass("mutexAll");
                }
                
                if(fieldsetDisplay[fs].help) {
                    appendHelpText(fs, fieldsetDisplay[fs], currentGraph);
                }
                // Poorly named function. Depending on the the element's showhide class,
                // shows or hides the entire fieldset. The class is added in addFieldset
                // based on the value of "visible" in params-display.json
                redrawFieldset(fs);
            }
        }
    }

    /**
     * @function appendHelpText
     *
     * Evaluates whether a given fieldset has hlp text set in params-display.json. If so,
     * append a help text entry in the modal.
     */
    function appendHelpText(fs, displayInfo, currentGraph) {
        var hasHelpText = $('#help-' + fs).length;

        if(hasHelpText === 0) {
            if (typeof displayInfo.help === 'object') {
                // Handle cases where different help text is assigned for the same param
                // depending on the current measure
                var helpText = '';
                var helpVal = displayInfo.help[currentGraph] || displayInfo.help["default"];
                helpText += "<dt id='help-" + fs + "'>" + displayInfo.legend + "</dt><dd class='helpContent'>" + helpVal + "</dd>";
            } else {
                helpText = "<dt id='help-" + fs + "'>" + displayInfo.legend + "</dt><dd class='helpContent'>" + displayInfo.help + "</dd>";
            }
         }

        $('#filter-help dl').append(helpText);
    }

    /**
     * @function filterFields
     *
     * This function is a doozy and should probably be half a dozen functions or more.
     *
     * To understand what's going on here, remember that ever possible parameter and filter has
     * already been appended to the page and set to be invisible. This function access the current
     * config information to determine which of those filters and parameters need to be present on
     * the current page and then makes them visible. A complex series of visibility classes are added
     * so that later functions can dinstinguish currently in-use parameters that need to be included
     * in the stored procedure call. My best guess is that this tactic was chosen so that users could
     * flip between measures that might use different params without reloading the page or appending
     * new elements.
     *
     * This is a core design issue - DOM elements should not be used as temporary state storage in this
     * manner when the relevant information is already available from the metadata call. It slows down
     * the page load process and makes it very difficult to see what is actually going on. Unfortunately,
     * availability of all params/filters at a given time + visibility checks are so central to how this
     * script works that I've never had time to get to the root of the issue and refactor it. Ideally, it
     * should work more like maps - i.e., use the config or data information to detemine which params are
     * needed, then only append those parameters without a middle step that affects visiblity.
     */
    function filterFields(e) {
        // Clear everything to defaults
        $("fieldset").hide();
        $("fieldset").removeClass("required");
        $("fieldset").removeClass("visible");
        $("fieldset").removeClass("mutexAll");
        $(".fieldset").hide();
        $(".fieldset").removeClass("required");
        $(".fieldset").removeClass("visible");
        $(".fieldset").removeClass("mutexAll");

        // Get the table info for the table selected
        var table = Object.keys(tableInfo)[0];
        var info = getInfo(table);

        if (typeof info === 'undefined') {
            consoleLog('No table defined');
            return;
        }

        // If "All Others" are allowed, then include it
        if (info.showAllOthers) {
            $(".fieldInputAll").removeClass("hideFieldInputAll");
        } else {
            $(".fieldInputAll").addClass("hideFieldInputAll");
        }

        // Show the fields for this table
        filterParams(info.params, info);
        filterParams(info.controls, info);
        if (typeof info.multicharts !== 'undefined') {
            filterParams('multichart', info);
        }

        // Do date adjustments on our date field
        for (var co = 0; co < dateFields.length; co++) {
            var dateField = dateFields[co][0];
            if ($("#" + dateField).hasClass('visible')) {
                // This is a date field used by this table

                // Adjust the max date by hiding all of them and then
                // just showing those in the date range
                $("#" + dateField + " input[type='checkbox']").hide();
                $("#" + dateField + " tr.year").hide();
                var maxDateAnyEnd = dateToYQ(info.tableDate.maxDateAny);
                var minDateAnyStart = dateToYQ(info.tableDate.minDateAny);
                var yearStart = minDateAnyStart.year;
                var yearEnd = maxDateAnyEnd.year;
                $('#' + dateField).attr('data-date-min', info.tableDate.minDateAny);
                $('#' + dateField).attr('data-date-max', info.tableDate.maxDateAny);
                for (var year = yearStart; year <= yearEnd; year++) {
                    $("#" + dateField + " tr.year" + year).show();
                    for (var quarter = 1; quarter <= 4; quarter++) {
                        if ((year == yearStart && quarter >= minDateAnyStart.quarter) ||
                            (year > yearStart && year < yearEnd) ||
                            (year == yearEnd && quarter <= maxDateAnyEnd.quarter)) {
                            $("#" + dateField + " .year" + year + " .quarter" + quarter + " input[type='checkbox']").show();
                        } else {
                            $("#" + dateField + " .year" + year + " .quarter" + quarter + " input[type='checkbox']").hide();
                        }
                    }
                }

                // Check a default value if it isn't already set
                var numChecked = $("#" + dateField + " :checked").length;
                if (numChecked == 0) {
                    // Nope, nothing currently checked
                    // Use the table-specific maxDateAll as a default
                    var maxDateAll = info.tableDate.maxDateAll;
                    var sel = "#" + dateField + " input[value='" + maxDateAll + "']";
                    var selj = $(sel);
                    selj.prop('checked', 'checked');
                }
            }
        }

        // Adjust any visible slider fields
        $('.range').each(function() {
            var id = this.id;
            var isVisible = $("#" + id).hasClass('visible');
            if (isVisible) {
                var checked = $("#" + id + " :checked").length;
                if (checked == 0 || checked > 60) {
                    // Nothing checked or more than 5 years checked,
                    // so set to the default range
                    var end = dateToEpoch(info.tableDate.maxDateAny);
                    var start;
                    if (typeof info.tableDate.minDateAny != 'undefined') {
                        start = dateToEpoch(info.tableDate.minDateAny);
                    } else if (typeof info.tableDate.maxDateYr != 'undefined') {
                        start = dateToEpoch(info.tableDate.maxDateYr) - 12;
                    } else if (typeof info.tableDate.maxDateQtr != 'undefined') {
                        start = dateToEpoch(info.tableDate.maxDateQtr) - 12;
                    } else {
                        start = end - 12;
                    }
                    start = Math.max(0, start);
                    setMonthsRange(id, start, end);
                }
            }
        });

        // Set the defaults for "month"
        if ($("#month").hasClass('visible')) {
            var numChecked = $("#month :checked").length;
            if (numChecked == 0) {
                $("#month input[type='checkbox']").prop('checked', 'checked');
            }
        }

        // Set defaults and visibility for the monthSelector
        if ($('#monthSelector').hasClass('visible')) {
            $('#monthSelector .selector').show();
            var numChecked = $('#monthSelector .selected :checked').length;
            if (numChecked == 0) {
                // Need to add a default
                var maxDateAll = info.tableDate.maxDateAll;
                var nameSelected = 'selected-monthSelector';
                var label = dateToMY(maxDateAll);
                var value = maxDateAll;
                var config = {
                    type: 'selector',
                    selected: value
                };
                var cl = 'selector';
                addInput(nameSelected, value, label, config, cl);
            }
        }

        // Highlight required fieldsets
        for (var co = 0; co < info.requiredParams.length; co++) {
            var rf = info.requiredParams[co];
            var jq = $("#" + rf);
            jq.addClass("required");
        }

        // Enforce mutexAll
        var jqma = $(".mutexAll");
        jqma.each(function(i, e) {
            var allSelected = $(this).find("div.fieldInputAll input:checked");
            var othersSelected = $(this).find("div.fieldInput input:checked");

            var allSelectedCount = allSelected ? allSelected.length : 0;
            var othersSelectedCount = othersSelected ? othersSelected.length : 0;

            // If all is selected, clear everything else
            if (allSelectedCount) {
                $(this).find("div.fieldInput input").attr("checked", false);
            }
        });

        // Hide advanced header if it's not applicable
        var leftFilters = $('#advancedLeft').find('div.visible');
        var rightFilters = $('#advancedRight').find('div.visible');

        if ( leftFilters.length === 0 && rightFilters.length === 0) {
            $('#advancedHeader').hide();
        }

    }

    /**
     * @function resetFilters
     *
     * Mostly self-explanatory. Unchecks all of the currently checked inputs and restores
     * defaults by re-calling filterFields and then initializing the chart again.
     */
    function resetFilters() {
        // Reset date fields
        $('.range').each(function(i, e) {
            setMonthsRange(this.id);
        });
        $('#selected-monthSelector').empty();

        // Mark everything as not having changed
        $('.mutexAllFirst').removeClass('mutexAllFirst');

        // Clear checkboxes, then set them back to their defaults
        $('.fieldset input[type="checkbox"]').prop('checked', false);
        $('.fieldset input.default-value').prop('checked', true);
        $('.fieldset input.last-checked').removeClass('last-checked');
        $('.fieldset input.default-value').addClass('last-checked');
        $('.fieldset input.is-checked').removeClass('is-checked');
        $('.fieldset input.default-value').addClass('is-checked');

        filterFields();
        setCohortsType();
        initChart();
    }

    // Set the params object so it has a field 'field' with the comma
    // separated values of which of that field have been checked.
    // Also return this comma separated value.
    function updateParams(params, field) {
        var ret = '';
        var allVals = [];

        // Get checkbox values
        $('#' + field + ' input:checked').each(function() {
            allVals.push($(this).val());
        });
        if (allVals.length > 0) {
            ret = allVals.join();
            if (typeof params !== 'undefined') {
                if (fieldsetDisplay[field] && fieldsetDisplay[field].alias) {
                    var alias = fieldsetDisplay[field].alias;
                    params[alias] = ret;

                } else {
                    params[field] = ret;

                }
            }
        }
        return ret;
    }

    // Given an array of strings, each in the form:
    //    label|value
    // generate the fieldInput block
    function addInputs(name, labelValueArray, config, cl, dataValueSets) {
        for (var co = 0; co < labelValueArray.length; co++) {
            var labelValue = labelValueArray[co];
            var lv = labelValue.split('|');
            addInput(name, lv[1], lv[0], config, cl, dataValueSets);
        }
    }

    function removeInput(name, value) {
        var divName = 'div-' + name + value;
        $('#' + divName).remove();
    }

    /**
     * @function addInput
     *
     * This function adds a single checkbox with label to a given fieldset. It is very long
     * because it includes all of the logic for deciding whether this particular input needs
     * to be checked on load. It also contains special handling for filters and params that need
     * it. Some of that special handling may be deprecated pending a review of current measures.
     */
    function addInput(name, value, label, config, cl, dataValueSets) {
        // set/modify the class assigned to the div and input
        if (typeof cl === 'undefined') {
            cl = 'fieldInput';
        }
        if (typeof dataValues === 'undefined') {
            dataValues = {};
        }
        var altValue = undefined;
        var isDisabled = false;
        if (typeof value === 'string') {
            altValue = parseInt(value);
        } else if (typeof value === 'number') {
            altValue = "" + value;
        }
        if (arrayContains(config.disabled, value) || arrayContains(config.disabled, altValue)) {
            isDisabled = true;
        }

        // Create a div to store the input
        var divName = 'div-' + name + value;
        var div = "<div id='" + divName + "' class='" + cl + "'/>";
        var selector = $("#" + name);
        selector.append(div);

        // Create the contents
        selector = $('#' + divName);
        if (value < 0 && label == '-') {
            // Special case - contents should be a horizontal line
            selector.append("<hr class='" + cl + "'/>");
        } else {
            // A checkbox with the label
            var i = "<input type='checkbox' id='" + name + value + "' value='" + value + "' class='" + cl + "'/>";
            selector.append(i);
            var $i = selector.find('input:last');
            for (var setKey in dataValueSets) {
                var dataSet = dataValueSets[setKey];
                if (dataSet) {
                    var dataValues = dataSet[name];
                    if (dataValues) {
                        var dataValueVal = dataValues[value];
                        $i.attr('data-' + setKey, dataValueVal);
                    }
                }
            }
            if (config.format) {
                var format = config.format[value];
                $i.attr('data-format', format);
            }

            var l = "<label for='" + name + value + "' class='" + cl + "'>" + label + "</label>";
            selector.append(l);
        }

        // Set the default value for filters
        if (config.type === 'filter' || config.type === 'selector' || config.type === 'param') {
            if (typeof config.selected != 'undefined') {
                var configSelectedStr = '' + config.selected;
                var valueStr = '' + value;
                var valueNum = parseInt(valueStr, 10);
                if (configSelectedStr === valueStr || config.selected === '*' ||
                    (typeof config.selected !== 'string' && arrayContains(config.selected, valueStr)) ||
                    (typeof config.selected !== 'string' && arrayContains(config.selected, valueNum))) {
                    $('#' + name + value).addClass('default-value');
                    $('#' + name + value).addClass('last-checked');
                    $('#' + name + value).addClass('is-checked');
                    $('#' + name + value).prop('checked', true);
                }
            }
        }

        // Handle disabled entries at this time
        if (isDisabled) {
            $('#' + divName).addClass('disabled');
            $('#' + name + value).attr('disabled', true);
        }

        // Any special checkbox handling?
        $('#' + name + value).click(function(e) {
            var doRedrawChart = false;

            var newValue = $('#' + name + value).prop('checked'),
                currentValue = !newValue;

            var jqname = $('#' + name),
                isFilter = jqname.hasClass('config-type-filter'),
                isMultiClass = jqname.hasClass('config-multi'),
                isMutex = jqname.hasClass('mutexAll'),
                isMutexFirst = jqname.hasClass('mutexAllFirst'),
                isSelector = jqname.hasClass('selected'),
                hasLag = jqname.hasClass('has-lag');

            /*
             * Multiple selection will be done if
             * it has the multi class set (isMultiClass) AND ONE of the following:
             *
             * 1) The multichart filter isn't set (ie - there are no multicharts)
             * 2) The multichart filter has a multiAllowed input that is checked
             *
             */
            var selHidden = $('#multichart :hidden'),
                selAllowed = $('#multichart .multiAllowed :checked'),
                isMultiAllowed = (selHidden && selHidden.length) || (selAllowed && selAllowed.length),
                isMulti = isMultiClass && isMultiAllowed;

            //var isDateType = name === "date_type";
            var isDateType = jqname.hasClass('config-type-dateType');

            // Mark this checkbox as the last (ie - most recent) one checked for this fieldset
            // if it was checked on. If it was turned off, don't worry about it
            if (newValue) {
                $('#' + name + ' input.last-checked').removeClass('last-checked');
                $('#' + name + value).addClass('last-checked');
                $('#' + name + value).addClass('is-checked');
            } else {
                $('#' + name + value).removeClass('is-checked');
            }

            if (isFilter && isMulti) {
                // Multiple selection allowed, but something must always
                // be checked. Toggle the value ONLY if there is more than
                // one value already checked OR we are currently off.
                var newValue = $('#' + name + value).prop('checked');
                var currentValue = !newValue;
                var checked = $('#' + name + ' input:checked');
                var numChecked = checked.length;
                if (numChecked != 0) {
                    $('#' + name + value).prop('checked', newValue);
                    doRedrawChart = true;
                } else {
                    $('#' + name + value).prop('checked', currentValue);
                }

            } else if (isFilter && !isMulti) {
                // Non multi, so a click clears everything except what is
                // checked, much like a radio box.
                $('#' + name + ' input').prop('checked', false);
                $('#' + name + value).prop('checked', true);
                doRedrawChart = true;

            } else if (isMutex) {
                // Either of the following may be true, but not both
                // - "All" may be checked
                // - Any number of non-all checkboxes may be checked
                if (value == 0) {
                    // All was toggled, but since you can't toggle it off
                    // it is always set, and the others are always cleared
                    $('#' + name + ' input').prop('checked', false);
                    $('#' + name + value).prop('checked', true);

                } else {
                    // Something else was toggled.
                    var allChecked = $('#' + name + '0').prop('checked');
                    if (allChecked) {
                        // All was checked, but now needs to be turned
                        // off.
                        $('#' + name + '0').prop('checked', false);
                        $('#' + name + value).prop('checked', true);
                    } else {
                        // All was not checked, so we can do any toggling
                        // we want, unless we try to turn them all off
                        var newValue = $('#' + name + value).prop('checked');
                        var currentValue = !newValue;
                        var checked = $('#' + name + ' input:checked');
                        var numChecked = checked.length;
                        if (numChecked != 0) {
                            $('#' + name + value).prop('checked', newValue);
                            doRedrawChart = true;
                        } else {
                            $('#' + name + value).prop('checked', currentValue);
                        }
                    }

                }
                doRedrawChart = true;

            } else if (isSelector) {
                // When unchecked, remove the entire div
                $('#div-' + name + value).empty().remove();

            } else if (!isMutexFirst) {
                // The first time we check on something besides all, remove the
                // "All" and mark that we have done so. Afterwards, we won't
                // care until a reset.
                if (value === 0) {
                    // This was "All", and we're not allowed to unclick it
                    // until we click on something else
                    $('#' + name + value).prop('checked', true);

                } else {
                    // For everything else
                    // Uncheck all
                    $('#' + name + '0').prop('checked', false)
                        .removeClass('is-checked');

                    // Then make sure we never hit this block again
                    $('#' + name).addClass('mutexAllFirst');
                }

            } else {
                // Just a regular click. Don't worry about it.
            }

            // If we have changed the multichart to an option that does not allow
            // other fieldsets to have multiple choices selected, and those other
            // fieldsets have more than one selected, then clear it back to the
            // last one selected.
            // Recompute selection and isMultiAllowed based on current click being done
            var wasEnforced = enforceMultiAllowed(name);
            doRedrawChart = doRedrawChart || wasEnforced;

            if (hasLag) {
                updateCohorts();
            }

            if (isDateType) {
                var jq = $("#" + name + " input:checked");
                var val = jq.val();
                setCohortsType(val);
            }

            // redrawChart is slow, so call it after the box is checked
            setTimeout(function() {
                if (doRedrawChart) {
                    redrawChart();
                }
            }, 50);
        });

    }

    function enforceMultiAllowed(name) {
        if (typeof name === 'undefined') {
            name = 'multichart';
        }
        var ret = false;
        var selection = $('#multichart .multiAllowed :checked');
        var isMultiAllowed = selection && selection.length;
        if (name === 'multichart' && !isMultiAllowed) {
            // Uncheck everything
            $(".config-multi input").prop('checked', false);

            // Check just the last one that was checked
            //$(".config-multi input.last-checked").attr( 'checked', true );

            // Check all the ones that are checked
            $(".config-multi input.is-checked").prop('checked', true);

            ret = true;
        }
        return ret;
    }

    // Return the largest lag currently checked. Used by updateCohorts function to provide
    // special functionality for cohort params.
    function computeLag() {
        var ret = 0;

        $('.has-lag input:checked').each(function(i) {
            var $this = $(this);
            var lagVal = parseInt($this.attr('data-lag'), 10);

            // lagVal is actually negative, so we really want the smallest
            ret = lagVal < ret ? lagVal : ret;
        });

        return ret;
    }

    function computeCohortLagDate($cohort, lag, defaultMaxDate) {
        var maxDate = new Date(defaultMaxDate.getTime());
        var maxVal = $cohort.attr('data-date-max');
        if (maxVal) {
            maxDate = dateToJs(maxVal);
        }

        // Lag is currently in (negative) days. So remove that number of days
        var maxTime = maxDate.getTime();
        var lagDays = lag * 24 * 60 * 60 * 1000;
        maxTime = maxTime + lagDays;
        maxDate.setTime(maxTime);

        var ret = jsToDate(maxDate);
        return ret;
    }

    function doShowFieldset(name) {
        $("#" + name + " div.fieldInput").show();
        $("#" + name + " div.fieldInputAll").show();
        $("#" + name).addClass("showHide-show");
        $("#" + name).removeClass("showHide-hide");
    }

    function doHideFieldset(name) {
        $("#" + name + " div.fieldInput").hide();
        $("#" + name + " div.fieldInputAll").hide();
        $("#" + name).addClass("showHide-hide");
        $("#" + name).removeClass("showHide-show");
    }

    function toggleFieldset(name) {
        if ($("#" + name).hasClass("showHide-show")) {
            doHideFieldset(name);
        } else {
            doShowFieldset(name);
        }
    }

    function redrawFieldset(name) {
        if ($("#" + name).hasClass("showHide-show")) {
            //consoleLog( "reshow "+name );
            doShowFieldset(name);
        } else {
            //consoleLog( "rehide "+name );
            doHideFieldset(name);
        }
    }

    function configDefault(config, key, def) {
        if (typeof config[key] === 'undefined') {
            config[key] = def;
        }
        return config;
    }

    function addFieldsetsMatching(column, type) {
        for (var key in fieldsetDisplay) {
            var display = fieldsetDisplay[key];
            if (display && column === display.column && type === display.type) {
                addFieldset(display.column, key, display.legend, undefined, display);
            }
        }
    }

    function addFieldset(column, name, legend, values, config) {
        // default configuration values
        if (typeof legend === 'undefined') {
            legend = fieldsetName[name];
        }
        if (typeof config === 'undefined') {
            config = {};
        }
        configDefault(config, 'type', 'param');
        configDefault(config, 'multi', false);
        configDefault(config, 'sort', false);
        configDefault(config, 'selected', 0);
        configDefault(config, 'resultUnavailable', 'show');

        var lag = fieldsetLag[name];

        var advanced = column == 'advancedLeft' || column == 'advancedRight';
        var configType = config.type;
        if (configType === 'cohort' || configType === 'dateRange' || configType === 'dateSelect') {
            configType = 'param';
        } else if (configType === 'dynamicDateRange' || configType === 'dateType') {
            configType = 'filter';
        }

        $("#" + column).append("<div class='fieldset' id='" + name + "'></div>");
        clearFieldset(name, legend, config);

        if (typeof values === 'undefined') {
            values = fieldset[name];
        }
        var orderBy = typeof values !== 'undefined' &&
            typeof values.length !== 'undefined' &&
            values.length &&
            typeof values[0] === 'string' &&
            values[0].indexOf('|') > 0;
        configDefault(config, 'zeroLast', !orderBy);

        // Sometimes we put the 0 element last, so we need to record all this
        var label0 = undefined;
        var value0 = 0;
        var cl0 = configType === 'filter' ? undefined : 'fieldInputAll';

        // Compute all the label values
        var labelValues = [];

        var start = config.zeroLast ? 1 : 0;
        if (typeof values == 'array') {
            for (var co = start; co < values.length; co++) {
                //addInput( name, co, values[co], config );
                var val = values[co];
                if (val.indexOf('|') > 0) {
                    labelValues.push(val);
                } else {
                    labelValues.push('' + val + '|' + co);
                }
            }
            if (config.zeroLast && values[0] != null && values[0].length > 0) {
                //addInput( name, 0, values[0], config, cl0 );
                label0 = values[0];
            }
        } else if (typeof values == 'object') {
            for (var key in values) {
                if ((!config.zeroLast) || (key !== 0 && key !== '0')) {
                    //addInput( name, key, values[key], config );
                    labelValues.push('' + values[key] + '|' + key);
                }
            }
            if (config.zeroLast && values[0] != null && values[0].length > 0) {
                //addInput( name, 0, values[0], config, cl0 );
                label0 = values[0];
            }
        } else {
            consoleLog("typeof values=" + (typeof values));
        }

        // If the values should be sorted, do so
        if (config.sort === true) {
            labelValues.sort();
            labelValues = adjustSeparatorLabels(labelValues);

        } else if (typeof config.sort === 'string') {
            var func = compareFunction[config.sort];
            labelValues.sort(func);

        } else {
            labelValues = adjustSeparatorLabels(labelValues);

        }

        var dataValueSets = {
            lag: fieldsetLag
        };

        // Add all the inputs (possibly except the 0 one)
        addInputs(name, labelValues, config, undefined, dataValueSets);

        // Add the 0 input last, perhaps
        if (typeof label0 !== 'undefined') {
            addInput(name, value0, label0, config, cl0, dataValueSets);
        }

        //var showFieldset = ( configType == 'filter' || advanced );
        var showFieldset = (configType == 'filter');
        if (typeof config.visible !== 'undefined') {
            showFieldset = config.visible;
        }
        if (showFieldset) {
            doShowFieldset(name);
        } else {
            doHideFieldset(name);
        }

        var $name = $('#' + name);
        $name.addClass('config-type-' + configType);
        if (configType !== config.type) {
            $name.addClass('config-type-' + config.type);
        }
        if (config.multi) {
            $name.addClass('config-multi');
        }
        if (lag) {
            $name.addClass('has-lag');
        }

        $name.addClass('result-unavailable-' + config.resultUnavailable);
    }

    // Separator labels are those with a negative value and a display value of "-"
    // Each one should be placed after the corresponding positive value (so value
    // 3 will be followed by a separator with the value -3, if one exists.
    // (Note that the raceEthnicity values use a totally different method for this.)
    function adjustSeparatorLabels(l) {
        var ret = [];

        var normal = [];
        var separator = {};

        // Split the separators from the normal ones
        for (var co = 0; co < l.length; co++) {
            var v = l[co].split('|');
            if (v[1].indexOf('-') == 0) {
                separator[v[1]] = l[co];
            } else {
                normal.push(l[co]);
            }
        }

        // Go through the normal ones, adding them to the return array,
        // and possibly adding a separator after it if one exists.
        for (co = 0; co < normal.length; co++) {
            ret.push(normal[co]);

            var v = normal[co].split('|');
            var s = separator['-' + v[1]];
            if (typeof s !== 'undefined') {
                ret.push(s);
            }
        }

        return ret;
    }

    /**
     * HERE BE DRAGONS
     *
     * The next two functions provide special handling for the race/ethnicity filters and the query type filters.
     * All of these comparisons are dense and performed loosely, so use caution when making and testing changes.
     */

    // Return -1 if a < b
    // Return  0 if a == b
    // Return  1 if a > b
    function raceEthnicityCompare(a, b) {
        var ret = 0;

        var aa = a.split('|');
        var ab = b.split('|');
        var va = aa[1];
        var vb = ab[1];

        if (va > 0 && vb > 0) {
            ret = va - vb;
        } else if (va == 0 || vb == 0) {
            // All should sort after 8 and before -1 and before 9
            var mult = 1;
            if (va == 0) {
                mult = -1;
                var tmp = va;
                va = vb;
                vb = tmp;
            }
            if (va == -1) {
                ret = 1;
            } else if (va <= 8) {
                ret = -1;
            } else {
                ret = 1;
            }
            ret = ret * mult;
        } else {
            // -1 should sort after 8, after 0, and before 9
            var mult = 1;
            if (va == -1) {
                mult = -1;
                var tmp = va;
                va = vb;
                vb = tmp;
            }
            if (va <= 8) {
                ret = -1;
            } else {
                ret = 1;
            }
            ret = ret * mult;
        }
        return ret;
    }

    //Return -1 if a < b
    //Return  0 if a == b
    //Return  1 if a > b
    // Order should be 1, 0, 2 (First, Unduplicated, All)
    function qryTypeCompare(a, b) {
        var ret = 0;

        var aa = a.split('|');
        var ab = b.split('|');
        var va = aa[1];
        var vb = ab[1];

        var mult = 1;

        if (va > vb) {
            var tmp = va;
            va = vb;
            vb = tmp;
            mult = -1
        }

        if (va == 1) {
            // 1 comes before everything
            ret = -1;
        } else if (va == 2) {
            // 2 comes after everything
            ret = 1;
        } else if (vb == 2) {
            // va is 0, and 0 comes before 2
            ret = -1;
        } else {
            // va is 0, vb is 1, and 0 comes after 1
            ret = 1;
        }

        ret = ret * mult;
        return ret;
    }

    var compareFunction = {
        'raceEthnicityCompare': raceEthnicityCompare,
        'qryTypeCompare': qryTypeCompare
    };

    function clearFieldset(name, legend, config) {
        if (typeof legend == 'undefined') {
            legend = $('#' + name + ' .fieldsetLabel').text();
        }

        var showHide = " <span class='show'></span>" +
            "<span class='hide'></span>";

        $("#" + name).html('');
        $("#" + name).append("<div class='fieldsetHeader showhide'><span class='fieldsetLabel'>" + legend + "</span>" + showHide + "</div>");

        $("#" + name + " .showhide").click(function() {
            toggleFieldset(name);
        });
    }

    function addCohort(y, q, display) {
        var ms = ['', '01', '04', '07', '10'];
        var ds = ['', '01', '01', '01', '01'];
        var me = ['', '03', '06', '09', '12'];
        var de = ['', '31', '30', '30', '31'];
        var vals = "" + y + "-" + ms[q] + "-" + ds[q];
        var vale = "" + y + "-" + me[q] + "-" + de[q];

        if (q == 1) {
            $("table.quarter").append("<tr class='year year" + y + "'><td>" + y + "</td></tr>");
        }
        $("table.quarter .year" + y).append("<td class='quarter quarter" + q + "'>&nbsp;</td>");

        if (display) {
            $("table.quarterStart .year" + y + " .quarter" + q).html("&nbsp;<input type='checkbox' value='" + vals + "'/>");
            $("table.quarterEnd .year" + y + " .quarter" + q).html("&nbsp;<input type='checkbox' value='" + vale + "'/>");

            $("table.quarter .year" + y + " .quarter" + q).click(function(e) {
                // If we are in year mode, and we unclick on the year, make sure all the quarters are unclicked
                $("table.quarter input.yearMarker:not(:checked)").parent().parent().find('input').attr("checked", false);
            });
        }

        // Check the default
        if (typeof defaultCohort !== 'undefined' && defaultCohort != null) {
            var yq = dateToYQ(defaultCohort);
            if (typeof yq === 'object') {
                $("table.quarter .year" + yq.year + " .quarter" + yq.quarter + " input").prop('checked', 'checked');
            }
        }
    }

    function addCohorts(startY, startQ, endY, endQ, fieldInfo) {
        for (var key in fieldsetDisplay) {
            var display = fieldsetDisplay[key];
            if (display && display.type && display.type === 'cohort') {
                var quarterDate = display.quarterDate ? display.quarterDate : 'start';
                var quarterStartEnd = 'quarter' +
                    (quarterDate.substr(0, 1).toUpperCase()) +
                    (quarterDate.length > 1 ? quarterDate.substr(1).toLowerCase() : '');
                addFieldset(display.column, key, display.legend, [], display);
                $('#' + key).append("<table class='quarter " + quarterStartEnd + "'></table>");
                $('#' + key).addClass("fieldset-cohort");
                dateFields.push([key, display.legend, quarterStartEnd]);
            }
        }

        var co;
        /*
    for( co=0; co<fieldInfo.length; co++ ){
        var fi = fieldInfo[co];
        addFieldset( 'fieldsLeft', fi[0], fi[1], [] );
        $('#'+fi[0]).append( "<table class='quarter "+fi[2]+"'></table>" );
        $('#'+fi[0]).addClass( "fieldset-cohort" );
    }
    */

        $("table.quarter").append("<tr class='quarter-header'><th>&nbsp;</th></tr>");
        for (co = 1; co <= 4; co++) {
            $("table.quarter tr").append("<th class='quarter" + co + "'>Q" + co + "</th>");
        }


        for (var y = startY; y <= endY; y++) {
            for (var q = 1; q <= 4; q++) {
                var display = false;
                if ((y == startY && q >= startQ) ||
                    (y == endY && q <= endQ) ||
                    (y > startY && y < endY)) {
                    display = true;
                }
                addCohort(y, q, display);
            }
        }

        $("table.quarter").hide();
    }

    function setCohortsYear() {
        // Hide the table headers
        $("table.quarter tr.quarter-header th").html("&nbsp;");

        // Hide Q2-4 checkboxes
        for (var co = 2; co <= 4; co++) {
            $("table.quarter .quarter" + co).hide();
        }

        // Make sure checkboxes reflect actual data
        if (typeof currentTable !== 'undefined' && typeof currentTable.info !== 'undefined') {
            var minDateAny = dateToYQ(currentTable.info.tableDate.minDateAny);
            var maxDateAny = dateToYQ(currentTable.info.tableDate.maxDateAny);
            for (var y = minDateAny.year; y <= maxDateAny.year; y++) {
                $("table.quarter .year" + y + " .quarter1 input[type='checkbox']").show();
            }
        }

        // For each row
        $("table.quarter tr.year").each(function(i, e) {
            // If any of the quarters are checked
            var jqQuartersChecked = $(this).find("input:checked");
            if (jqQuartersChecked.length > 0) {
                // Is the first quarter already checked?
                var firstQuarter = $(this).find("td.quarter1 input");
                var firstQuarterChecked = firstQuarter.attr("checked");
                if (!firstQuarterChecked) {
                    // If not, check it, and note that we are
                    firstQuarter.addClass("yearMarker");
                    firstQuarter.attr("checked", true);
                } else {
                    // It was checked, don't need to do anything else
                }
            }
        });

        // Rename the header
        $(".fieldset-cohort .fieldsetLabel").each(function(i, e) {
            var t = $(this).text();
            t = t.replace(/Quarter/g, 'Year');
            $(this).text(t);
        });
    }

    function anyDateYQ($table, attrName, tableDateField, def) {
        var $div = $table.parent();
        var val = $div.attr(attrName);
        if (!val && typeof currentTable !== 'undefined' && typeof currentTable.info !== 'undefined') {
            if ( typeof currentTable.info.tableDate !== 'undefined' ) {
                val = currentTable.info.tableDate[tableDateField];
            }
        }
        if (!val) {
            val = def;
        }
        var ret = dateToYQ(val);
        return ret;
    }

    function setCohortsMonth() {
        // Reshow headers and checkboxes
        for (var co = 1; co <= 4; co++) {
            $("table.quarter tr.quarter-header th.quarter" + co).html("Q" + co);
            $("table.quarter .quarter" + co).show();
        }

        // Make sure checkboxes reflect the actual table
        $('table.quarter').each(function(i) {
            var $this = $(this);
            var minDateAny = anyDateYQ($this, 'data-date-min', 'minDateAny', '2000-01-01');
            var maxDateAny = anyDateYQ($this, 'data-date-max', 'maxDateAny', jsToDate());

            for (var y = minDateAny.year; y <= maxDateAny.year; y++) {
                for (var q = 1; q <= 4; q++) {
                    var $input = $this.filter(".year" + y + " .quarter" + q + " input[type='checkbox']");
                    if ((y == minDateAny.year && q >= minDateAny.quarter) ||
                        (y == maxDateAny.year && q <= maxDateAny.quarter) ||
                        (y > minDateAny.year && y < maxDateAny.year)) {
                        $input.show();
                    } else {
                        $input.hide();
                    }
                }
            }

        });

        // Any yearMarkers that have been cleared should force all the month markers to be cleared
        //$("input.yearMarker:not(:checked)").parent().parent().find('input').attr( "checked", false );

        // Remove any checkboxes that were placed simply because we went from Month -> Year
        $("input.yearMarker").attr("checked", false);
        $("input.yearMarker").removeClass("yearMarker");

        // Rename the header
        $(".fieldset-cohort .fieldsetLabel").each(function(i, e) {
            var t = $(this).text();
            t = t.replace(/Year/g, 'Quarter');
            $(this).text(t);
        });
    }

    function setCohortsType(dateType) {
        if (typeof dateType == 'undefined') {
            dateType = $('.config-type-dateType.visible input:checked').val();
        }
        if (dateType == 2) {
            // Year
            setCohortsYear();
        } else {
            setCohortsMonth();
        }
    }

    function updateCohort($cohort, maxDate) {
        // Enable everything
        $cohort.find('input:disabled').prop('disabled', false);

        // Disable only those after the max date
        $cohort.find('input').each(function(i) {
            var $this = $(this);
            var date = $this.val();
            if (date > maxDate) {
                $this.prop('disabled', true);
            }
        });
    }

    function updateCohorts(lag) {
        if (typeof lag === 'undefined') {
            lag = computeLag();
        }

        //var max = currentTable.info.tableDate.maxDateAny;
        var maxAny = dateInfo.maxDateAny;
        var maxDate = dateToJs(maxAny);

        $('.fieldset-cohort').each(function(i) {
            var $cohort = $(this);
            var lagDate = computeCohortLagDate($cohort, lag, maxDate);
            updateCohort($cohort, lagDate);
        });
    }

    /**
     * @function addMonthTypes
     *
     * Iterates over the param/filter display information and adds the date range slider
     * using the min and max dates from dateInfo.
     *
     * @param {Number} startY - Corresponds to dateInfo.minQuarterAny.year
     * @param {Number} startQ - Corresponds to dateInfo.minQuarterAny.quarter
     * @param {Number} endY - Corresponds to dateInfo.maxQuarterAny.year
     * @param {Number} endQ - Corresponds to dateInfo.minQuarterAny.quarter
     */
    function addMonthTypes(startY, startQ, endY, endQ) {
        for (var key in fieldsetDisplay) {
            var display = fieldsetDisplay[key];
            if (display && display.type) {
                if (display.type === 'dateRange' || display.type === 'dynamicDateRange') {
                    addMonthsRange(display.column, key, display.legend, startY, startQ, endY, endQ, display);
                } else if (display.type === 'dateSelect') {
                    addMonthsSelector(display.column, key, display.legend, startY, startQ, endY, endQ, display);
                }
            }
        }
    }

    /**
     * @function addMonthsRange
     *
     * Creates a slider (based on the jQuery UI widget) that has an underlying series of hidden
     * checkboxes corresponding to months in the slider range. As you move the slider, it increments
     * up the steps and the hidden checkboxes are updated as well. This method was probably chosen 
     * due to browser support concerns and out of habit for using checkboxes; it should definitely
     * be refactored.
     */
    function addMonthsRange(column, name, legend, startY, startQ, endY, endQ, config) {
        if (typeof config === 'undefined') {
            config = {};
        }
        configDefault(config, 'monthStep', 1);
        configDefault(config, 'monthLimit', 60);
        var step = config.monthStep;
        var limit = config.monthLimit;
        var startM = (startQ * 3) - 2;
        var endM = (endQ * 3);
        var startVal = monthsInEpoch(startY, startM);
        var endVal = monthsInEpoch(endY, endM);

        addFieldset(column, name, legend, [], config);
        var selector = "#" + name;
        $(selector).addClass('range');
        $(selector).append("<p class='slider'><span class='fromDate'></span> through <span class='toDate'></span></p>");
        $(selector).append("<div class='slider control' data-startVal='" + startVal + "' data-endVal='" + endVal + "'></div>");
        $(selector).append("<div class='values'></div>");
        $(selector + ' .values').append("<input id='step' type='hidden' value='" + step + "'/>");
        $(selector + ' .values').append("<input class='date-start' type='hidden' value='" + epochToDate(startVal) + "'/>");
        $(selector + ' .values').append("<input class='date-end'   type='hidden' value='" + epochToDate(endVal) + "'/>");
        $(selector + ' .values').append("<input class='date-limit' type='hidden' value='" + limit + "'/>");
        $(selector + " .values").hide();

        var isFilter = $(selector).hasClass('config-type-filter');
        if (isFilter) {
            updateMonthsRangeCheckboxes(selector);
        }

        $(selector + " .control").slider({
            range: true,
            min: startVal,
            max: endVal,
            step: step,
            values: [startVal, endVal],
            slide: function(event, ui) {
                return updateMonthsRange(selector, event, ui, limit);
            },
            change: function(event, ui) {
                return updateMonthsRange(selector, event, ui, limit);
            }
        });
        //$(selector).attr('data-sliderset', 'true');
    }

    var updateMonthsRedrawTimeout;

    function updateMonthsRange(selector, event, ui, limit) {
        var startVal = ui.values[0];
        var endVal = ui.values[1];
        updateMonthsRangeValues(selector, startVal, endVal, limit);
    }

    function updateMonthsRangeValues(selector, startVal, endVal, limit) {
        consoleLog('updateMonthsRangeValues selector=' + selector + ' startVal=' + startVal + ' endVal=' + endVal);
        if (typeof limit == 'undefined') {
            limit = $(selector).find('.date-limit').val();
            if (typeof limit == 'string') {
                limit = parseInt(limit, 10);
            }
        }
        consoleLog('updateMonthsRangeValues limit=' + limit);
        if ((limit > 0) && (endVal - startVal > limit)) {
            return false;
        }

        var isFilter = $(selector).hasClass('config-type-filter');

        updateMonthsRangeText(selector, startVal, endVal);
        if (isFilter) {
            if (typeof currentTable !== 'undefined') {
                $selector = $(selector);
                $selector.find('.date-start').val(epochToDate(startVal));
                $selector.find('.date-end').val(epochToDate(endVal));
                if (updateMonthsRedrawTimeout) {
                    clearTimeout(updateMonthsRedrawTimeout);
                }
                updateMonthsRedrawTimeout = setTimeout(redrawChart, 200);
            }
        } else {
            updateMonthsRangeCheckboxes(selector);
        }
    }

    function updateMonthsRangeText(selector, startVal, endVal) {
        $(selector + " .fromDate").text(epochToMY(startVal));
        $(selector + " .toDate").text(epochToMY(endVal));
    }

    function updateMonthsRangeCheckboxes(selector) {
        if ($(selector).attr('data-sliderset') === 'true') {
            var step = parseInt($(selector + ' #step').val(), 10);
            //consoleLog( 'step='+step );
            var jq = $(selector + " .values");
            var startVal = $(selector + ' .control').slider('option', 'values')[0];
            var endVal = $(selector + ' .control').slider('option', 'values')[1];
            jq.html('');
            jq.append("<input id='step' type='hidden' value='" + step + "'/>");
            jq.append("<input class='date-start' type='hidden' value='" + epochToDate(startVal) + "'/>");
            jq.append("<input class='date-end'   type='hidden' value='" + epochToDate(endVal) + "'/>");
            for (var v = startVal; v <= endVal; v += step) {
                //consoleLog( ''+startVal+'-'+v+'-'+endVal );
                var d = epochToDate(v);
                jq.append("<input type='checkbox' value='" + d + "' checked='checked'/>");
            }
        }
    }

    // start and end (if provided) should be in "epoch" format, 
    // as generated by dateToEpoch
    function setMonthsRange(name, start, end) {
        var selector = "#" + name + " .control";
        var jq = $(selector);
        var startVal;
        var endVal;
        if (typeof start === 'undefined' && typeof end === 'undefined') {
            // Default to entire range
            startVal = jq.slider("option", "min");
            endVal = jq.slider("option", "max");
        } else {
            startVal = start
            if (typeof end !== 'undefined') {
                endVal = end;
            } else {
                endVal = Math.max(0, startVal - 12);
            }
            if (endVal < startVal) {
                var tmp = startVal;
                startVal = endVal;
                endVal = tmp;
            }
            jq.slider("option", "min", startVal);
            jq.slider("option", "max", endVal)
        }
        var isSet = $('#' + name).attr('data-sliderSet') === 'true';
        consoleLog('isSet ' + name + ' ' + isSet);
        if (!isSet) {
            jq.slider("values", 0, startVal);
            jq.slider("values", 1, endVal);
            $('#' + name).attr('data-sliderset', 'true');
            updateMonthsRangeText('#' + name, startVal, endVal);
        }
        updateMonthsRangeCheckboxes('#' + name);
    }

    function addMonthsSelector(column, name, legend, startY, startQ, endY, endQ, config) {
        if (typeof config === 'undefined') {
            config = {};
        }
        configDefault(config, 'monthStep', 1);
        var step = config.monthStep;
        var startM = (startQ * 3) - 2;
        var endM = (endQ * 3);
        var startVal = monthsInEpoch(startY, startM);
        var endVal = monthsInEpoch(endY, endM);

        addFieldset(column, name, legend, []);
        var selector = "#" + name;

        var nameSelected = 'selected-' + name;
        $(selector).append('<div id="' + nameSelected + '" class="selected">');

        $(selector).append('<select>');

        selector = '#' + name + ' select';
        $(selector).append('<option value="">Add Month/Year</option>')
        for (var y = startY; y <= endY; y++) {
            for (var m = 1; m <= 12; m += step) {
                var display = true;
                if ((y == startY && m < startM) ||
                    (y == endY && m > endM)) {
                    display = false;
                }
                if (display) {
                    var date = ymToDate(y, m);
                    var dateMY = dateToMY(date);
                    var optval = '' + dateMY + '|' + date;
                    $(selector).append('<option value="' + optval + '">' + dateMY + '</option>');
                }
            }
        }
        $(selector).change(function(e) {
            var val = $(selector).val();
            var vals = val.split('|');
            var label = vals[0];
            var value = vals[1];
            var config = {
                type: 'selector',
                selected: value
            };
            var cl = 'selector';
            removeInput(nameSelected, value);
            addInput(nameSelected, value, label, config, cl);
            $(selector).val('');
        });
    }

    function monthsInEpoch(y, m) {
        var firstY = 1998;
        var ret = (y - firstY) * 12 + m - 1;
        return ret;
    }

    function epochToDate(e) {
        var firstY = 1998;
        var em = (e % 12) + 1;
        var ey = Math.floor(e / 12);
        var y = firstY + ey;
        var m = em;
        if (em < 10) {
            m = '0' + em;
        }
        var ret = '' + y + '-' + m + '-01';
        return ret;
    }

    function epochToMY(e) {
        var d = epochToDate(e);
        var ret = dateToMY(d);
        return ret;
    }

    function isADate(date) {
        var ret = typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}/) != null;
        return ret;
    }

    function ymToDate(y, m) {
        if (m < 10) {
            m = '0' + m;
        }
        var ret = '' + y + '-' + m + '-01';
        return ret;
    }

    function dateToMY(date) {
        var ret = date;
        if (isADate(date)) {
            var months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            var ys = date.substr(0, 4);
            var ms = date.substr(5, 2);
            var md = parseInt(ms, 10);
            var m = months[md];
            ret = m + ' ' + ys;
        }
        return ret;
    }

    function dateToJs(date) {
        var ret;
        if (isADate(date)) {
            var ys = date.substr(0, 4);
            var ms = date.substr(5, 2);
            var yd = parseInt(ys, 10);
            var md = parseInt(ms, 10);
            ret = new Date(yd, md, 1);
        }
        return ret;
    }

    function jsToDate(dateObj) {
        if (typeof dateObj === 'undefined') {
            dateObj = new Date();
        }
        var year = dateObj.getFullYear();
        var mon = dateObj.getMonth() + 1;
        var day = dateObj.getDate();
        var mon = mon < 10 ? '0' + mon : mon;
        var day = day < 10 ? '0' + day : day;
        var ret = '' + year + '-' + mon + '-' + day;
        return ret;
    }

    function dateToEpoch(date) {
        var ret = -1;
        if (isADate(date)) {
            var ys = date.substring(0, 4);
            var yd = parseInt(ys, 10);
            var ms = date.substring(5, 7);
            var md = parseInt(ms, 10);
            ret = monthsInEpoch(yd, md);
        }
        return ret;
    }

    /**
     * @function dateToYQ
     *
     * Parses the min date returned from the database and returns as a year and quarter
     * for use in the year/quarter filter toggle.
     *
     * @param {Number} date - A date formatted as 2000-01-01
     */
    function dateToYQ(date) {
        var ret = date;
        if (isADate(date)) {
            var year = parseInt(date.substring(0, 4), 10);
            var month = date.substring(5, 7);
            var q = Math.floor((parseInt(month, 10) + 2) / 3);
            ret = {
                year: year,
                quarter: q
            };
        }
        return ret;
    }

    function dateToQ(date) {
        var ret = date;
        var yq = dateToYQ(date);
        if (typeof yq === 'object') {
            ret = '' + yq.year + 'Q' + yq.quarter;
        }
        return ret;
    }

    function dateToType(date, dateType) {
        var ret;
        var pattern;
        if (typeof dateType == 'undefined') {
            dateType = -1;
        }
        if (typeof dateType == 'string') {
            pattern = dateType;
            dateType = parseInt(dateType, 10);
        }
        switch (dateType) {
            case 0:
                // Month
                ret = dateToMY(date);
                break;
            case 1:
                // Quarter
                ret = dateToQ(date);
                break;
            case 2:
                // Year
                var yq = dateToYQ(date);
                ret = yq.year ? '' + yq.year : date;
                break;
            default:
                if (pattern && isADate(date)) {
                    var jsDate = dateToJs(date);
                    var formatter = new google.visualization.DateFormat({
                        pattern: pattern
                    });
                    ret = formatter.formatValue(jsDate);

                } else if (!isADate(date)) {
                    ret = date;

                } else {
                    ret = dateToMY(date);
                }
                break;
        }
        return ret;
    }

    /**
     * @function initChart
     *
     * Builds a list of parameters for the database query and initiates the AJAX request
     * for data that will be used in the chart.
     *
     * CALLED BY: initFieldsets, resetFilters
     * CALLS: updateParams, loadChart
     */
    function initChart() {
        var table = Object.keys(tableInfo)[0];

        var info = getInfo(table);
        var params = {};
        for (var co = 0; co < info.params.length; co++) {
            updateParams(params, info.params[co]);
        }

        // Check the required fields
        var requiredGood = true;
        for (var co = 0; co < info.requiredParams.length; co++) {
            var paramVal = params[info.requiredParams[co]];
            if (paramVal == null || paramVal.length == 0) {
                requiredGood = false;
                consoleLog('missing:' + info.requiredParams[co]);
            }
        }

        if (requiredGood) {
            loadChart(table, params);
        } else {
            showErrorMessage();
        }
    }

    /**
     * @function loadChart
     *
     * Issues a request for data based on the current table and parameters, 
     * then parses the results and initiates the chart load process.
     *
     * @param table {string} - The name of the stored procedure to be called
     * @param params {Object} - The parameters currently in use.
     *
     * CALLED BY: initChart
     * CALLS: getInfo, getHeaderAlias, getRows, getHeaderObjs, drawChart
     */
    function loadChart(table, params) {
        $('#updateLoader').show();
        var fullUrl = tableUrl.replace("${table}", slug);

        // Sometimes queries take a long time if they are not in cache. Set a 
        // timeout in case this is the case. The error message will be removed 
        // once the data loads.
        var loadTimeout = setTimeout(function() {
            var msg = 'We have not run this query before, so the data may take a while to load...';
            $('#loadMsg').text(msg);
            $('#loadMsg').show();
        }, 5000);

        $.ajax({
            url: fullUrl,
            data: params,
            dataType: 'json',
            success: function(data) {
                var urlParams = '?' + $.param(params);
                thisUrl = {
                    json: fullUrl + urlParams,
                    xlsx: fullUrl.replace('json', 'xlsx') + urlParams,
                    csv: fullUrl.replace('json', 'csv') + urlParams
                };
                var info = getInfo(table);
                var headerAlias = getHeaderAlias(info);
                var rows = getRows(info, data.row, headerAlias);
                var headerObjs = getHeaderObjs(info, data.row);

                $('#updateLoader').hide();
                $('#loadMsg').hide();
                clearTimeout(loadTimeout);

                drawChart(data, rows, headerObjs, headerAlias);
                showParams('filtersUsed', data.params);
            },
            error: function(xhr, status, err) {
                if (typeof err !== 'undefined' && err) {
                    showErrorMessage();
                }
                consoleLog("error: " + status);
            }
        });
    }

    /** 
     * @function getInfo
     *
     * Accesses the globally stored config information to retrieve information for the current
     * measure being viewed. This is probably deprecated since we now show only one measure at 
     * a time.
     */
    function getInfo(table) {
        var info = tableInfo[table];
        if (info == null) {
            info = tableInfo['default'];
        }
        return info;
    }

    function hasDifferentValues(row) {
        var ret = false;

        if (typeof row !== "undefined") {
            for (var co = 1; co < row.length - 1; co++) {
                ret = ret || row[co] !== row[co + 1];
            }
        }

        return ret;
    }

    function arrayContains(a, val) {
        var ret = false;
        if (typeof a !== 'undefined') {
            var index = $.inArray(val, a);
            ret = index != -1;
        }
        return ret;
    }

    function arrayMin(a) {
        var ret = undefined;
        if (typeof a !== 'undefined') {
            for (var co = 0; co < a.length; co++) {
                var val = a[co];
                if (ret === undefined || val < ret) {
                    ret = val;
                }
            }
        }
        return ret;
    }

    function getHeaderRow(allRows, headerRows, dateHeaderRows, controlHeaderRows, headerAlias) {
        var ret = [];
        var useAllRows = false;

        // Initialize the header to undefined to start
        if (allRows.length > 0) {
            for (var co = 0; co < allRows[0].length; co++) {
                ret[co] = undefined;
            }
        }

        // Determine which field, if any, has the date type. This could be the
        // field with the visible dateType configuration, or the default of "date_type".
        var dateField = undefined;
        var dateFieldDefault = undefined;
        var dateTypeName = $('.config-type-dateType.visible').attr('id');
        for (var co = 0; co < allRows.length && dateField === undefined; co++) {
            var fieldLabel = allRows[co][0];
            if (fieldLabel === dateTypeName) {
                dateField = co;
            } else if (fieldLabel === 'date_type') {
                dateFieldDefault = co;
            }
        }
        if (dateField === undefined) {
            dateField = dateFieldDefault;
        }

        // Go through each row in allRows that is a header row
        for (var co = 0; co < headerRows.length; co++) {
            var headerRowIndex = headerRows[co];
            var row = allRows[headerRowIndex];
            // If columns 1..N are different, then we use this row
            if (hasDifferentValues(row) || useAllRows) {
                // Add this row's values to the return values
                for (var col = 0; col < row.length; col++) {
                    // Get the value
                    var val = row[col];

                    // If this is a date, format it
                    if (arrayContains(dateHeaderRows, headerRowIndex)) {
                        var dateType = undefined;
                        if (dateField !== undefined) {
                            dateType = allRows[dateField][col];
                        }
                        val = dateToType(val, dateType);
                    }

                    // If this is a control field, get the text value
                    if (arrayContains(controlHeaderRows, headerRowIndex)) {
                        var fieldName = allRows[headerRowIndex][0];
                        var field = fieldset[fieldName];
                        if (typeof field === 'undefined') {
                            var fieldAlias = headerAlias[fieldName];
                            if (typeof fieldAlias !== 'undefined') {
                                field = fieldset[fieldAlias];
                            }
                        }
                        if (typeof field !== 'undefined') {
                            var fieldVal = field[val];
                            val = fieldVal;
                        } else {
                            consoleLog('Problem with header row ' + headerRowIndex + ': ' + fieldName + ':' + fieldAlias);
                        }
                    }

                    // Add the value, possibly with a separator if there were already values
                    if (ret[col] == undefined) {
                        ret[col] = val;
                    } else {
                        ret[col] += " / " + val;
                    }
                }
            }
        }

        // If anything is left as undefined, turn it into an empty string
        for (var co = 0; co < ret.length; co++) {
            if (ret[co] == undefined) {
                ret[co] = '';
            }
        }

        // Return it as an array with just one item
        return [ret];
    }

    function getRows(info, allRows, headerAlias) {
        var headerRows = getHeaderRow(allRows, info.returnRowHeaders, info.returnRowDateHeaders, info.returnRowControlHeaders, headerAlias);
        //allRows.slice( info.returnRowHeader, info.returnRowHeader+1 );
        var dataRows = allRows.slice(info.returnRowStart, allRows.length);
        var dataRowsCopy = [];
        $.extend(true, dataRowsCopy, dataRows);
        var ret = headerRows.concat(dataRowsCopy);
        return ret;
    }

    function getHeaderObjs(info, allRows) {
        // Create objects for each column
        var ret = [];

        if (allRows && allRows.length > 0) {
            var numCol = allRows[0].length;
            for (var col = 0; col < numCol; col++) {
                ret[col] = {};
            }

            // Go through the header rows, storing each
            for (var row = 0; row < info.returnRowStart; row++) {
                var rowName = allRows[row][0];
                for (var col = 0; col < numCol; col++) {
                    ret[col][rowName] = allRows[row][col];
                }
            }
        }

        return ret;
    }

    function getHeaderAlias(info) {
        var headerAlias = {};
        for (var co = 0; co < info.headerNames.length; co++) {
            var headerNameVal = info.headerNames[co];
            var headerKeyVal = headerNameVal.split(/[*=]/);
            if (headerKeyVal.length === 2) {
                headerAlias[headerKeyVal[1]] = headerKeyVal[0];
                headerAlias[headerKeyVal[0]] = headerKeyVal[1];
            }
        }

        return headerAlias;
    }

    // Given a fullArray and an array of elements toRemove,
    // return an array that contains values from the fullArray
    // that are not indexed in toRemove
    function sliceFromArray(fullArray, toRemove) {
        var ret = [];

        if (typeof fullArray == 'undefined') {
            // No array to slice from, so return nothing
            return [];
        }
        if (typeof toRemove == 'undefined') {
            // Nothing to remove, so return the fullArray
            return fullArray;
        }

        for (var co = 0; co < fullArray.length; co++) {
            if (!arrayContains(toRemove, co)) {
                // Nope, not to be removed, so add it to the results
                ret.push(fullArray[co]);
            }
        }

        return ret;
    }

    function showParams(divName, params, showAll) {
        if (typeof showAll === 'undefined') {
            showAll = false;
        }
        $("#" + divName).html('Filters:<ul></ul>');
        for (var key in params) {
            // Get the values
            var valStr = params[key];
            var val = [];

            if (typeof valStr === 'undefined' || (valStr != null && valStr !== '')) {
                valStr = '' + valStr;
                val = valStr.split(',');
            } else if (showAll) {
                val = '0';
            }

            // See if this is a date field
            var df = undefined;
            for (var co = 0; co < dateFields.length; co++) {
                if (dateFields[co][0] === key) {
                    df = dateFields[co];
                }
            }

            // Now try to see if this is a fieldset
            var fs = fieldset[key];

            // Handle printing and formatting
            var label = '';
            var showEmptyFields = false;
            var skip = false;
            if (val.length == 0 && !showEmptyFields) {
                skip = true;

            } else if (typeof fs !== 'undefined') {
                label = fieldsetName[key];
                formatter = function(v) {
                    var ret = fs[v];
                    if (fs[0].indexOf('|') >= 0) {
                        // This is an array that has been ordered, so we need to search for
                        // the value we want.
                        for (var fsc = 0; fsc < fs.length; fsc++) {
                            var sep = fs[fsc].indexOf('|');
                            var label = fs[fsc].substring(0, sep);
                            var testV = fs[fsc].substring(sep + 1);
                            if (v === testV) {
                                ret = label;
                            }
                        }
                    }
                    return ret;
                };

            } else if (typeof df !== 'undefined') {
                label = df[1];
                formatter = function(v) {
                    return dateToQ(v);
                };

            } else {
                skip = true;
                //consoleLog( 'Ignoring filter parameter: '+ key );
            }

            if (!skip) {
                $('#' + divName + ' ul:first').append('<li class="filter"></li>');
                if (val.length == 0) {
                    $('#' + divName + ' ul:first li:last').text(label);
                } else if (val.length == 1) {
                    $('#' + divName + ' ul:first li:last').text(label + ': ' + formatter(val[0]));
                } else {
                    $('#' + divName + ' ul:first > li:last').text(label + ': ');
                    $('#' + divName + ' ul:first > li:last').append("<ul class='filtersUsed-" + key + "'></ul>");
                    for (var co = 0; co < val.length; co++) {
                        var valf = formatter(val[co]);
                        $('#' + divName + ' ul.filtersUsed-' + key).append("<li>" + "\r\n\t\t" + valf + "</li>");
                    }
                }
            }

        }

    }

    /*
     * If the headerNames contain something matching *header or header*set,
     * return the set value. Return undefined if there is no match
     */
    function getPointerSet(headerNames, header) {
        var ret = undefined;

        for (var co = 0; co < headerNames.length && !ret; co++) {
            var name = headerNames[co];
            var index = name.indexOf('*');
            var tmpHeader = undefined;
            var tmpSet = undefined;
            if (index == 0) {
                tmpHeader = name.substring(1);
                tmpSet = tmpHeader;
            } else if (index > 0) {
                tmpHeader = name.substring(0, index);
                tmpSet = name.substring(index + 1);
            }

            if (tmpHeader && tmpHeader === header) {
                ret = tmpSet;
            }
        }

        return ret;
    }

    function getOrigTable(data, info) {
        var values = data.values; // These are the rows. Each value contains attributes->values that make up columns
        var rows = [];

        var pivoted = data.row;
        var returnRowHeaders = info.returnRowHeaders;

        // Determine which attributes are in the row header
        var headerField = [];
        for (var co = 0; pivoted && pivoted.length && (co < returnRowHeaders.length); co++) {
            var i = returnRowHeaders[co];
            var val = pivoted[i][0];
            headerField.push(val);
        }

        // Which attribute has the date?
        var dateField = undefined;
        if (info.transform) {
            if (info.transform.startDateField) {
                dateField = info.transform.startDateField;
                //var i = headerField.indexOf( dateField );
                var i = $.inArray(dateField, headerField);
                if (i >= 0) {
                    // Remove this date from the headerFields, since we add it in again later
                    headerField.splice(i, 1);
                }
                if (info.transform.dateField) {
                    // The other date field should be added as a header
                    headerField.push(info.transform.dateField);
                }
            } else {
                dateField = info.transform.dateField;
            }
        }

        // Which attributes are data?
        var dataField = [];
        var func = info.transform ? info.transform.Function : '';
        if (typeof pivoted === 'undefined' || pivoted.length == 0) {
            // There is no data returned

        } else if (func === 'trim' || func === '') {
            // Data fields can be found in column 0 for each row starting at the returnRowStart
            var start = info.returnRowStart
            for (var co = start; co < pivoted.length; co++) {
                var val = pivoted[co][0];
                if (val.match(/^[0-9]+$/g)) {
                    val = 'M' + val;
                }
                if (!arrayContains(dataField, val)) {
                    dataField.push(val);
                }
            }

        } else {
            // Assume data fields are the unique values from pivoted row 0
            for (var co = 1; co < pivoted[0].length; co++) {
                var val = pivoted[0][co];
                if (!arrayContains(dataField, val)) {
                    dataField.push(val);
                }
            }
        }

        // First row should contain the column data
        var firstRow = [''];
        for (var co = 0; co < dataField.length; co++) {
            var val = dataField[co];
            val = val.replace(/_/g, ' ');
            firstRow.push(val);
        }
        rows.push(firstRow);

        // Loop through each value, creating a new row
        var rowHeaderObjs = [''];
        for (var co = 0; co < values.length; co++) {
            var value = values[co];
            var newRow = [];

            // Build the row header
            var rowHeader = undefined;

            // Get all the possible row header values
            var rowHeaderObj = {};
            for (var hc = 0; hc < headerField.length; hc++) {
                var header = headerField[hc];
                var headerVal = value[header];
                if (headerVal !== undefined) {

                    // If this is a pointer, then use the value it points to
                    var headerSet = getPointerSet(info.headerNames, header);
                    if (headerSet) {
                        headerVal = fieldset[headerSet][headerVal];
                    }

                    rowHeaderObj[header] = headerVal;
                }
            }

            // Add the date to the header, formatting as appropriate 
            if (typeof dateField !== 'undefined') {
                var dateVal = value[dateField];
                var $dateTypeVisible = $('.config-type-dateType.visible');
                var dateTypeName = $dateTypeVisible.attr('id');
                var dateType = value[dateTypeName];
                var $dateTypeChecked = $dateTypeVisible.find('[value="' + dateType + '"]');
                var dateTypeFormat = $dateTypeChecked.attr('data-format');
                var dateTypeVal = dateTypeFormat || $dateTypeChecked.val();
                //var dateValFormatted = dateToType( dateVal, dateType );
                var dateValFormatted = dateToType(dateVal, dateTypeVal);
                //consoleLog( 'orig '+dateVal+'/'+dateValFormatted );
                rowHeaderObj[dateField] = dateValFormatted;
            }

            // Add the row header to the row
            rowHeaderObjs.push(rowHeaderObj);
            newRow.push('');

            // Add each value
            for (var dc = 0; dc < dataField.length; dc++) {
                var dataName = dataField[dc];
                var dataVal = value[dataName];
                newRow.push(dataVal);
            }

            // Add the row to all the rows
            rows.push(newRow);
        }

        // Build a DataTable with the rows and return it
        var ret = {
            values: values,
            rows: rows,
            rowHeaders: rowHeaderObjs,
            headerField: headerField,
            dateField: dateField,
            dataField: dataField
        };
        return ret;
    }

    // Given the data that has been loaded, do some additional processing
    // and save the data so it can be differently-viewed later, then draw it.
    function drawChart(data, dataArray, headerObjs, headerAlias) {
        var table = data.table;
        var title = data.table;
        var params = data.params;
        var allData = data.row;

        // Modify the first column
        for (var co = 1; co < dataArray.length; co++) {
            var val = '' + dataArray[co][0];
            val = val.replace(/_/g, ' ');
            if (val.indexOf('M') == 0) {
                var m = val.substring(1);
                //dataArray[co][0] = parseInt(m,10);
                dataArray[co][0] = m;

            } else if (val.match(/^\d{4}-\d{2}/g)) {
                // We can't format here based on date_type because there is only
                // one date for the entire row, which may contain values for 
                // multiple date_types
                //dataArray[co][0] = dateToMY( val );
                dataArray[co][0] = val;

            } else {
                dataArray[co][0] = val;
            }
        }

        // Some metadata
        var info = getInfo(table);
        var nodata = (dataArray.length == 0 || dataArray.length == 1);
        var numCols = 0;
        if (!nodata) {
            numCols = dataArray[0].length;
        }
        var largeLabels = (dataArray[1]) && (dataArray[1][0].length > 3);

        // If this is a multichart, update the multichart selector
        var badchar = new RegExp('[^A-Za-z0-9]', 'g');
        var fromTo = [
            [new RegExp('-', 'g'), ' '],
            [new RegExp('_p', 'g'), '('],
            [new RegExp('_P', 'g'), ')'],
            [new RegExp('_b', 'g'), '['],
            [new RegExp('_B', 'g'), ']'],
            [new RegExp('_s', 'g'), '/'],
            [new RegExp('_S', 'g'), '\\'],
            [new RegExp('_a', 'g'), '@'],
            [new RegExp('_A', 'g'), '&amp;'],
            [new RegExp('_x', 'g'), '+'],
            [new RegExp('_X', 'g'), '*'],
            [new RegExp('_c', 'g'), ','],
            [new RegExp('_C', 'g'), ':'],
            [new RegExp('_q', 'g'), '&apos;'],
            [new RegExp('_Q', 'g'), '&quot;'],
            [new RegExp('_ ', 'g'), '-'],
            [new RegExp('__', 'g'), '_']
        ];
        if (typeof info.multicharts !== 'undefined') {
            var currentValue = $("#multichart input:checked").val();
            if (typeof currentValue === 'undefined') {
                currentValue = $('#multichart').attr('data-permalink');
            }
            clearFieldset('multichart');
            var numMulticharts = 0
            for (var key in info.multicharts) {
                var chartInfo = info.multicharts[key];
                if (typeof chartInfo === 'object' && chartInfo.length) {
                    chartInfo = chartInfo[0];
                }
                var config = {
                    type: 'filter',
                    selected: currentValue
                };
                var name = key;
                var label = key;
                for (var co = 0; co < fromTo.length; co++) {
                    var from = fromTo[co][0];
                    var to = fromTo[co][1];
                    label = label.replace(from, to);
                }
                //var cl = typeof chartInfo.addInputClass === 'undefined' ? 'fieldInput' : 'fieldInput '+chartInfo.addInputClass;
                var cl = 'fieldInput';
                if (typeof chartInfo.addInputClass !== 'undefined') {
                    cl += ' ' + chartInfo.addInputClass;
                } else if (typeof info.addInputClass !== 'undefined') {
                    cl += ' ' + info.addInputClass;
                }

                addInput('multichart', name, label, config, cl);
                numMulticharts++;
            }

            // If nothing is checked, make sure the first one is checked
            var numChecked = $("#multichart input:checked").length;
            if (numChecked == 0) {
                $("#multichart input:first").attr("checked", true);
            }

            // Make sure the fieldset is visible if there are multiple multicharts, or hidden
            // if we just used multicharts to define some things.
            var display = fieldsetDisplay['multichart'];
            var visible = true;
            if (typeof display.visible !== 'undefined') {
                visible = display.visible;
            }
            if (numMulticharts > 1) {
                if (visible) {
                    doShowFieldset('multichart');
                } else {
                    doHideFieldset('multichart');
                }
                enforceMultiAllowed();
            } else {
                $('#multichart').hide();
            }
        }

        // Which date-type is active?
        var dateTypeName = $('.config-type-dateType.visible').attr('id');

        // Modify date_type displayed and defaulted to
        var dateTypeValueSet = getHeaderValueSet(headerObjs, dateTypeName);
        if (dateTypeValueSet.length == 0) {
            dateTypeValueSet = getHeaderValueSet(headerObjs, 'date_type');
        }
        var dateTypeValues = fieldset[dateTypeName];
        var dateTypeDisplay = fieldsetDisplay[dateTypeName];

        // Determine what should be shown, and possibly what is currently checked
        var currentlySelected = undefined;
        for (var co = 0; typeof dateTypeValues !== 'undefined' && co < dateTypeValues.length; co++) {
            var divSelector = '#div-' + dateTypeName + co;
            var isSelected = $(divSelector + ' input:checked').length > 0;
            $(divSelector + ' input').prop('checked', false);
            if (arrayContains(dateTypeValueSet, co)) {
                $(divSelector).show();
                if (isSelected) {
                    currentlySelected = co;
                }
            } else {
                $(divSelector).hide();
            }
        }

        // Use currently checked value, the default value if it has been set in the
        // configuration, or a computed default from the available options
        var dateTypeChecked;
        if (currentlySelected != undefined) {
            dateTypeChecked = currentlySelected;

        } else if (typeof dateTypeDisplay !== 'undefined' && arrayContains(dateTypeValueSet, dateTypeDisplay.selected)) {
            dateTypeChecked = dateTypeDisplay.selected;

        } else {
            dateTypeChecked = arrayMin(dateTypeValueSet);
            if (!arrayContains(dateTypeValueSet, 0) && arrayContains(dateTypeValueSet, 1)) {
                // If there is no "Month" value available, default to "Year"
                dateTypeChecked = 2;
            } else if (arrayContains(dateTypeValueSet, 0) && arrayContains(dateTypeValueSet, 2)) {
                // If "Month" is available, default to "Year"if we can
                dateTypeChecked = 2;
            }
        }

        $('#div-' + dateTypeName + dateTypeChecked + ' input').prop('checked', true);
        setCohortsType(dateTypeChecked);

        // Create the data table.
        var dataTable = google.visualization.arrayToDataTable(dataArray);

        // Create a table based on the original values
        var origTable = getOrigTable(data, info);

        // Format the values in the data table
        var formatParams = info.numberFormat;
        if (typeof formatParams === 'undefined' &&
            typeof info.labels !== 'undefined' &&
            typeof info.labels.yFormat !== 'undefined') {
            formatParams = {
                pattern: info.labels.yFormat
            };
        }
        if (typeof formatParams === 'undefined') {
            formatParams = {
                fractionDigits: 2,
                suffix: '%'
            };
        }
        var formatters = [];
        if ($.isArray(formatParams)) {
            formatters = new Array();
            for (var co = 0; co < formatParams.length; co++) {
                formatters[co] = new google.visualization.NumberFormat(formatParams[co]);
            }
        } else {
            formatters.push(new google.visualization.NumberFormat(formatParams));
        }

        for (co = 1; co < numCols; co++) {
            var fi = (co - 1) % formatters.length;
            var formatter = formatters[fi];
            formatter.format(dataTable, co);
        }

        // Store all this information globally so we can use it later
        currentTable = {
            data: data,
            allData: allData,
            table: table,
            info: info,
            dataTable: dataTable,
            origTable: origTable,
            nodata: nodata,
            numRows: dataArray.length,
            numCols: numCols,
            largeLabels: largeLabels,
            title: title,
            params: params,
            headerObjs: headerObjs,
            headerAlias: headerAlias
        };

        hideUnavailableFilters();

        // Clear the chart. Add sub-charts if necessary
        $('#chart').html('');
        addSubcharts(currentTable.info.charts);

        redrawChart();
    }

    /**
     * For filters that have class result-unavailable-disable or result-unavailable-hide
     * and classes visible and config-type-filter (ie - they are currently valid
     * filters which may get some results hidden), go through the results which
     * are available for this filter and mark those not present in the results.
     */
    function hideUnavailableFilters() {
        $('.config-type-filter.visible.result-unavailable-disable').each(hideUnavailableFilter);
        $('.config-type-filter.visible.result-unavailable-hide').each(hideUnavailableFilter);
    }

    function hideUnavailableFilter(index) {
        var $this = $(this);
        var name = $this.attr('id');
        var alias = currentTable.headerAlias[name];

        // Get the values set for this field in the results
        var values = [];
        for (var co = 0; co < currentTable.headerObjs.length; co++) {
            var val = "" + currentTable.headerObjs[co][name];
            if (typeof val !== 'undefined' && !arrayContains(values, val)) {
                values.push(val);
            }

            if (typeof alias !== 'undefined') {
                val = "" + currentTable.headerObjs[co][alias];
                if (typeof val !== 'undefined' && !arrayContains(values, val)) {
                    values.push(val);
                }
            }
        }

        consoleLog(name + ':' + alias + ':' + values);

        // Mark everything as available and enable all checkboxes
        $this.children('.unavailable').removeClass('unavailable');
        $this.find('input').attr('disabled', false);

        // Go through each div.fieldInput
        $this.children('div.fieldInput').each(function(index) {
            // And get the value for the child input
            var $divInput = $(this);
            var $input = $divInput.children('input');
            var inputVal = $input.attr('value');

            // If the input value is not in the result values, mark this div as unavailable
            if (!arrayContains(values, inputVal)) {
                $divInput.addClass('unavailable');
            }
        });

        // Disable the checkboxes we should disable
        $this.find('.unavailable input').attr('disabled', true);

        // Make sure there is at least one available checkbox checked
        var $available = $this.children('.fieldInput').not('.unavailable');
        var $selected = $available.find('input:checked');
        if ($selected.length === 0) {
            // Check the last one if there aren't
            $available.last().find('input').prop('checked', true);
        }

    }

    function addSubcharts(charts) {
        if (typeof charts === 'undefined') {
            return;
        }
        $('#chart').html('');
        for (var co = 0; co < charts.length; co++) {
            var chartId = charts[co].chartId;
            if (typeof chartId === 'undefined') {
                chartId = 'chart' + (co + 1);
            }
            $('#chart').append('<div id="' + chartId + '">');

            var style = charts[co].style ? charts[co].style : currentTable.info.style;
            if (typeof style != 'undefined' && style.length > 0) {
                $('#' + chartId).attr('style', style);
            }
        }
    }

    function getHeaderText(headerObj, headerNames, headerValueSet, returnArray) {
        var ret = [];
        for (var co = 0; co < headerNames.length; co++) {
            var name = headerNames[co];
            var setName;

            var isPointer = false;
            var isAlias = false;
            var index = name.indexOf('*');
            if (index >= 0) {
                isPointer = true;
            } else {
                index = name.indexOf('=');
            }

            if (index === 0) {
                name = name.substring(1);
                setName = name;
                isAlias = true;

            } else if (index > 0) {
                setName = name.substring(index + 1);
                name = name.substring(0, index);
                isAlias = true;
            }

            var namedSet = headerValueSet[name];
            if (typeof namedSet !== 'undefined' && namedSet.length > 1) {
                var val = headerObj[name];
                if (isAlias && val === name) {
                    // This is the header, so use the fieldsetName title instead
                    var fieldName = fieldsetName[setName];
                    val = fieldName;

                } else if (isPointer) {
                    // A value that derives from the fieldset
                    var field = fieldset[setName];
                    var fieldVal = field[val];
                    val = fieldVal;
                }

                ret.push(val);
            }
        }

        if (returnArray) {
            return ret;
        } else {
            return ret.join(' / ');
        }
    }

    // Given all the header objects and a particular key against them,
    // return a set of all the values for that key.
    // Each value will be in the set once and only once, so it is easy
    // to determine if the value is unique across all the headers.
    function getHeaderValueSet(headerObjs, name) {
        var ret = [];

        for (var co = 1; co < headerObjs.length; co++) {
            var val = headerObjs[co][name];
            if (typeof val !== 'undefined' && !arrayContains(ret, val)) {
                ret.push(val);
            }
        }

        return ret;
    }


    // Redreaw the current chart based on any additional controls in place
    function redrawChart() {
        // We will show or hide some columns, so use a DataView
        var data = new google.visualization.DataView(currentTable.dataTable);

        // Get the controls that have been set
        var controls = {};
        if (typeof currentTable.info.controls != 'undefined') {
            for (var co = 0, controlsLength = currentTable.info.controls.length; co < controlsLength; co++) {
                updateParams(controls, currentTable.info.controls[co]);
            }
        }

        // Format the first column, since it is possibly a date, based on date_type
        var $dateTypeVisible = $('.config-type-dateType.visible'),
            dateTypeName = $dateTypeVisible.attr('id'),
            $dateTypeChecked = $dateTypeVisible.find(':checked'),
            dateTypeVal = $dateTypeChecked.attr('data-format') || $dateTypeChecked.val(),
            unformattedValue,
            formattedValue;
        for (var co = 0, numRows = currentTable.dataTable.getNumberOfRows(); co < numRows; co++) {
            unformattedValue = currentTable.dataTable.getValue(co, 0);
            formattedValue = dateToType(unformattedValue, dateTypeVal);
            currentTable.dataTable.setFormattedValue(co, 0, formattedValue);
        }

        // Go through the controls and remove any columns that don't match
        var hideCol = [];
        for (var controlName in controls) {
            var controlVal = controls[controlName];
            var controlVals = controlVal.split(',');
            for (var col = 1; col < currentTable.numCols; col++) {
                var headerVal = "" + currentTable.headerObjs[col][controlName];
                var aliasName = currentTable.headerAlias[controlName];
                if (controlName === dateTypeName && typeof aliasName === 'undefined') {
                    aliasName = 'date_type';
                }
                var aliasVal = aliasName && "" + currentTable.headerObjs[col][aliasName];
                var controlMatch = arrayContains(controlVals, headerVal);
                var aliasMatch = arrayContains(controlVals, aliasVal);
                var match = controlMatch || aliasMatch;
                if (!match) {
                    hideCol.push(col);
                }
            }
        }
        data.hideColumns(hideCol);

        // Potentially hide rows
        var hideRow = [];
        var startDate, endDate;
        var firstParam = currentTable.info.params[0];
        var $firstParam = $('#' + firstParam);
        if ($firstParam.hasClass('config-type-dynamicDateRange')) {
            startDate = $firstParam.find('.date-start').val();
            endDate = $firstParam.find('.date-end').val();
        }

        var hideRowWhen = currentTable.info.hideRow;
        if (typeof hideRowWhen === 'undefined') {
            hideRowWhen = 'anyEmpty';
        }

        for (var row = 0, numRows = currentTable.numRows - 1; row < numRows; row++) {
            var hideThisRow = false;

            // Remove rows whose date is out of range, if we have a range filter
            if (typeof startDate !== 'undefined' && typeof endDate !== 'undefined') {
                var val = currentTable.dataTable.getValue(row, 0);
                startDate += ' 00:00:00';
                endDate += ' 00:00:00';
                hideThisRow = val < startDate || val > endDate;
            }

            // Remove rows whose visible columns are undefined
            if (hideRowWhen !== 'ignoreEmpty' && !hideThisRow) {

                // This test has to be inside this !hideThisRow test
                // and before we start evaluating the columns.
                if (hideRowWhen === 'allEmpty') {
                    hideThisRow = true;
                }

                for (var col = 1, numCols = currentTable.numCols; col < numCols; col++) {
                    if (!arrayContains(hideCol, col)) {
                        // This column should not be hidden, so evaluate it
                        var val = currentTable.dataTable.getValue(row, col);
                        if (hideRowWhen === 'allEmpty') {
                            hideThisRow = hideThisRow && (val == null);

                        } else if (hideRowWhen === 'anyEmpty') {
                            hideThisRow = hideThisRow || (val == null);

                        } else {
                            consoleLog('unknown hideRow ' + hideRowWhen);
                        }
                        //consoleLog( 'row='+row+' col='+col+' val='+val+' hide='+hideThisRow );
                    }
                }
            }

            if (hideThisRow) {
                hideRow.push(row);
            }
        }
        data.hideRows(hideRow);

        // Get the headers for the columns that we're displaying,
        // along with the values that those headers have
        var dataHeaderObjs = [];
        for (var co = 0, headerObjLength = currentTable.headerObjs.length; co < headerObjLength; co++) {
            if (!arrayContains(hideCol, co)) {
                dataHeaderObjs.push(currentTable.headerObjs[co]);
            }
        }
        var headerValueSet = {};
        for (var headerName in dataHeaderObjs[0]) {
            headerValueSet[headerName] = getHeaderValueSet(dataHeaderObjs, headerName);
        }

        // Adjust headers based on currently visible columns
        if (typeof currentTable.info.headerNames !== "undefined") {
            for (var co = 0; co < currentTable.dataTable.getNumberOfColumns(); co++) {
                var headerText = getHeaderText(currentTable.headerObjs[co], currentTable.info.headerNames, headerValueSet);
                currentTable.dataTable.setColumnLabel(co, headerText);
            }
        }

        // The table should contain all of the data
        //drawTable( data );
        drawRows(currentTable.origTable, controls);

        // Cluster the coloring of the columns based on various similar properties
        var colorData = colors;

        // Do we have one chart, or multiple charts
        $("#tooManySets").hide();
        if (typeof currentTable.info.charts == 'undefined' && typeof currentTable.info.multicharts == 'undefined') {
            // One chart
            drawLimitedGraph(data, currentTable.info, colorData);
            drawLegendCounter = 0;
            drawLegend(data, colorData);
          //  copyGraph([currentTable.info]);

        } else {
            // Multiple charts
            // Use "charts" if that is defined, or use the selected multichart
            var chartlist = currentTable.info.charts;
            if (typeof chartlist == 'undefined') {
                var mchartName = updateParams(undefined, 'multichart');
                chartlist = currentTable.info.multicharts[mchartName];
                if (typeof chartlist === 'object' && typeof chartlist.length === 'undefined') {
                    // This is not an array
                    chartlist = [chartlist];
                }
                addSubcharts(chartlist);

                // Check if it's a combo chart
                var allCharts = currentTable.info.multicharts;
                hasCombo = false;

                hasCombo = queryMulticharts(allCharts);
            }

            drawLegendCounter = 0;
            for (var co = 0, chartlistLength = chartlist.length; co < chartlistLength; co++) {
                //var currentChartInfo = chartlist[co];
                var currentChartInfo = $.extend({}, currentTable.info, chartlist[co]);
                if (typeof currentChartInfo.chartId === 'undefined') {
                    currentChartInfo.chartId = 'chart' + (co + 1);
                }

                if(typeof currentChartInfo.chartType != 'undefined' && currentChartInfo.chartType == 'combo' || hasCombo === true) {
                    colorData = comboColors;
                    hasCombo = true;
                }

                var currentData = new google.visualization.DataView(data);
                var currentColorData = colorData;
                if (typeof currentChartInfo.hideColumns != 'undefined') {
                    var hideCol = [];
                    var hideColorCol = [];
                    var numClusters = (data.getNumberOfColumns() - 1) / currentTable.info.columnClusterSize;
                    for (var i = 0; i < numClusters; i++) {
                        for (var j = 0; j < currentChartInfo.hideColumns.length; j++) {
                            var col = i * currentTable.info.columnClusterSize + currentChartInfo.hideColumns[j];
                            hideCol.push(col + 1); // +1 to skip the x-axis label column
                            hideColorCol.push(col);
                        }
                    }
                    currentData.hideColumns(hideCol);
                    currentColorData = sliceFromArray(colorData, hideColorCol);
                }

                // If we have more data than colors, use the full colorData set
                if (currentData.getNumberOfColumns() - 1 > currentColorData.length) {
                    currentColorData = colorData;
                }

                var wasDrawn = drawLimitedGraph(currentData, currentChartInfo, currentColorData);
                if (wasDrawn) {
                    drawLegend(currentData, currentColorData);
                }
            }
        //    copyGraph(chartlist);
        }

        //drawLegend( data, colorData );
    }

    function queryMulticharts(obj) {
        var i = 0;
        for (var attr in obj){
            var chart = obj[attr][0];

            if ( typeof chart != 'undefined' && chart.chartType === 'combo') {
                return true;
            }

            i++;
        }
        return false;
    }

    function drawTable(data) {
        // Create a separate tab for a table of the information,
        // with some changes to the parameters
        var baseOptions = {
            width: 745,
            height: 430
        };
        var tableChartOptions = $.extend({}, baseOptions, {
            alternatingRowStyle: true,
            cssClassNames: {
                headerRow: 'tableChart-header',
                tableRow: 'tableChart-even',
                oddTableRow: 'tableChart-odd'
            }
        });

        var tableChartjq = $('#tableChart')[0];
        if (currentTable.nodata) {
            $("#tableChart").html('');
        } else {
            var dt = new google.visualization.Table(tableChartjq);
            dt.draw(data, tableChartOptions);
        }
    }

    function getHeaderCaption(name) {
        var ret = name;

        // Do we have an entry in headerName[] that has *name or name=setName?
        var setName;
        for (var co = 0; currentTable.info.headerNames && co < currentTable.info.headerNames.length && !setName; co++) {
            var headerName = currentTable.info.headerNames[co];
            var index = headerName.indexOf('*');
            if (index == -1) {
                index = headerName.indexOf('=');
            }
            if (index == 0) {
                var tmpName = headerName.substring(1);
                if (name == tmpName) {
                    setName = tmpName;
                }
            } else if (index >= 0) {
                var tmpName = headerName.substring(0, index);
                if (name == tmpName) {
                    setName = headerName.substring(index + 1);
                }
            }
        }

        if (setName) {
            ret = fieldsetName[setName];
        }

        return ret;
    }

    function drawRows(rowInfo, controls) {
        var newRows = [];
        var render = [];
        newRows.push(rowInfo.rows[0]);
        //render.push( rowInfo.rows[0] );
        var newHeaders = [];
        newHeaders.push(rowInfo.rowHeaders[0]);

        // Go through each row, adding the row/header only if the control values match
        for (var co = 1, rowLength = rowInfo.rows.length; co < rowLength; co++) {
            var headersMatch = true;

            var header = rowInfo.rowHeaders[co],
                cvalsStr,
                cvals,
                rval,
                hval,
                hc,
                aname,
                aval,
                ac;
            for (var cname in controls) {
                cvalsStr = controls[cname];
                cvals = cvalsStr.split(',');
                rval = rowInfo.values[co - 1];
                hval = rval[cname];
                hc = arrayContains(cvals, "" + hval);
                aname = currentTable.headerAlias[cname];
                aval = aname && rval[aname];
                ac = aname && arrayContains(cvals, "" + aval);
                headersMatch = headersMatch && (hc || ac);
            }

            if (headersMatch) {
                newRows.push(rowInfo.rows[co]);
                newHeaders.push(header);
            }
        }

        // Get unique header sets
        var headerAndDateFields = typeof rowInfo.dateField === 'undefined' ? rowInfo.headerField : rowInfo.headerField.concat(rowInfo.dateField),
            rowHeaderValueSets = {},
            headerCaptions = {},
            header,
            set;
        for (var co = 0, hdFieldsLength = headerAndDateFields.length; co < hdFieldsLength; co++) {
            header = headerAndDateFields[co];
            set = getHeaderValueSet(newHeaders, header);
            rowHeaderValueSets[header] = set;
            headerCaptions[header] = getHeaderCaption(header);
        }

        // Build the header for each row with just non-unique header sets
        // and add all the row's cells
        var row;
        for (var co = 0, newRowsLength = newRows.length; co < newRowsLength; co++) {
            if (co == 0) {
                row = getHeaderText(headerCaptions, headerAndDateFields, rowHeaderValueSets, true);
            } else {
                row = getHeaderText(newHeaders[co], headerAndDateFields, rowHeaderValueSets, true);
            }
            for (var c1 = 1; c1 < newRows[co].length; c1++) {
                row.push(newRows[co][c1]);
            }
            render.push(row);
        }

        // Make the new dataTable and draw it
        var data = google.visualization.arrayToDataTable(render);
        drawTable(data);
    }

    function drawLegend(data, colorData) {
        // First check if using combo charts

        // Create a separate tab for the legend
        var start = 1;
        if (drawLegendCounter == 0) {
            $("#chartLegendInner").html('<table></table>');
            start = 0;
        }
        var isEmpty = true;
        for (var co = start; co < data.getNumberOfColumns(); co++) {
            var label = '' + data.getColumnLabel(co);
            var labels = label.split(" / ");
            var oddEvenRow = drawLegendCounter % 2 ? 'row' + drawLegendCounter + ' chartLegend-odd' : 'row' + drawLegendCounter + ' chartLegend-even';
            $("#chartLegend table").append("<tr class='" + oddEvenRow + "'></tr>");
            var tag = 'td';
            if (co == 0) {
                tag = 'th';
            }
            $("#chartLegend table tr:last").append("<" + tag + " class='colorCol'>&nbsp;</" + tag + ">");
            if (co > 0) {
                var cindex = (co - 1) % colorData.length;
                var color = colorData[cindex];
                $("#chartLegend table tr:last " + tag).css('backgroundColor', color);
            }
            for (var c1 = 0; c1 < labels.length; c1++) {
                isEmpty = isEmpty && labels[c1].length == 0;
                $("#chartLegend table tr:last").append("<" + tag + ">" + labels[c1] + "</" + tag + ">");
            }
            drawLegendCounter++;
        }
        if (isEmpty) {
            showParams('chartLegendInner', currentTable.params, true);
        }

        showParams('citation-filters', currentTable.params, true);
    }

    // If the graph has no more than some number of lines, draw it, otherwise show a message
    function drawLimitedGraph(data, chartInfo, colorData) {
        var numSets = data.getNumberOfColumns() - 1;
        var maxSets = chartInfo.maxSets;

        if (typeof maxSets === 'undefined') {
            maxSets = 7;
        } else if (maxSets <= 0) {
            maxSets = 1000;
        }

        var ret;
        if (numSets <= 0) {
            // No data
            var msg = 'Sorry, your selection returned no results.';
            showErrorMessage(msg);
            ret = false;
        } else if (numSets <= maxSets) {
            drawGraph(data, chartInfo, colorData);
            ret = true;
        } else {
            var msg = 'Sorry, we are not able to show that many lines on the graph at once. Please use the table or select fewer filter options.';
            showErrorMessage(msg);
            $('a[href="#tableContainer"]').click();
            consoleLog("TOO MANY: " + numSets + " > " + maxSets);
            ret = false;
        }
        return ret;
    }

    /**
     * @function getBaseOptions
     *
     * Returns an object with options for the graph height and width
     * if it was not explicitly set in the config file.
     */
    function getBaseOptions(chartInfo) {
        var baseOptions = chartInfo.baseOptions;

        // Because we're using tabs, need to set the width manually
        // if the graph gets refreshed while its tab is hidden
        var graphIsVisible = $('#chartContainer').is(':visible');
        var baseWidth;

        if(graphIsVisible === false) {
            baseWidth = 700;
        }
        else {
            baseWidth = '100%';
        }

        if (typeof baseOptions == 'undefined') {
            baseOptions = {
                width: baseWidth,
                height: 500,
                chartArea: {
                    left: 75,
                    top: 30,
                    width: "85%",
                    height: "85%"
                }

            };
        }
        return baseOptions;
    }

    /**
     * If value is set, set option[field] to the value. If not, and a default is
     * set, set option[field] to the default. Otherwise leave option[field] unset/changed.
     * @param option
     * @param field
     * @param value
     * @param def
     */
    function updateOptions(option, field, value, def) {
        if (typeof value !== 'undefined') {
            option[field] = value;
        } else if (typeof def !== 'undefined') {
            option[field] = def;
        }
    }

    // Draw the current dataTable or the passed dataView
    function drawGraph(data, chartInfo, colorData) {

        if (typeof data === 'undefined') {
            data = new google.visualization.DataView(currentTable.dataTable);
        }

        if (currentTable.title !== null) {
            $("#chartBody h1").text(currentTable.title);
        }

        // Set chart options
        //legendPosition = 'right';
        legendPosition = 'none';
        if (currentTable.nodata) {
            legendPosition = 'none';
            $("#noData").show();
        } else {
            $("#noData").hide();
        }

        // The base formatting options for the graph
        var baseOptions = getBaseOptions(chartInfo);

        var gridCount = 16;
        var showTextEvery = 1;
        var numLabelsShown = gridCount;
        if (!currentTable.nodata && currentTable.largeLabels) {
            numLabelsShown /= 2;
        }
        if (chartInfo.chartType === 'line' ||
            chartInfo.chartType === 'area' ||
            chartInfo.chartType === 'steppedArea' ||
            chartInfo.chartType === 'scatterChart' ||
            chartInfo.chartType === 'combo' ||
            (chartInfo.chartType === 'column' && data.getNumberOfRows() > 12)) {
            showTextEvery = data.getNumberOfRows() / numLabelsShown;
            showTextEvery = Math.round(showTextEvery + 1);
        }

        var opacity = 0.0
        var stackSetting = false;

        var linewidth = 2;
        var pointsize = 0;

        if (chartInfo.chartType === 'scatterChart' || chartInfo.chartType === 'combo') {
            linewidth = 0;
            pointsize = 2;
        }


        if (chartInfo.chartType === 'combo') {
            var dataCols = currentTable.numCols - 1;
            var series = {};

            // Check how many data columns we have and pick out trend line series accordingly
            for( var co=0; co<dataCols; co++ ){
                var isTrend = co % 2;

                if( isTrend === 1 ) {
                   series[co] = {
                        type: "line",
                        lineWidth: 2,
                        pointSize: 0
                    }
                }
            }

            var chartOptions = $.extend({}, baseOptions, {
                legend: {
                    'position': legendPosition
                },
                vAxis: {
                    title: chartInfo.labels.y
                },
                hAxis: {
                    gridlines: {
                        count: gridCount
                    },
                    showTextEvery: showTextEvery,
                    allowContainerBoundaryTextCufoff: true,
                    title: chartInfo.labels.x
                },
                animation: {
                    duration: 2500
                },
                colors: colorData,
                isStacked: stackSetting,
                lineWidth: linewidth,
                pointSize: pointsize,
                areaOpacity: 1,
                //fontName: '"Lucida Sans","Lucida Grande","Lucida Sans Unicode",sans-serif'
                fontName: 'Arial',
                seriesType: "line",
                series: series
            });
        } 
        else {
            var chartOptions = $.extend({}, baseOptions, {
            legend: {
                'position': legendPosition
            },
            vAxis: {
                title: chartInfo.labels.y
            },
            hAxis: {
                gridlines: {
                    count: gridCount
                },
                showTextEvery: showTextEvery,
                allowContainerBoundaryTextCufoff: true,
                title: chartInfo.labels.x
            },
            animation: {
                duration: 2500
            },
            colors: colorData,
            isStacked: stackSetting,
            lineWidth: linewidth,
            pointSize: pointsize,
            areaOpacity: opacity,
            //fontName: '"Lucida Sans","Lucida Grande","Lucida Sans Unicode",sans-serif'
            fontName: 'Arial'
        });
        }

        updateOptions(chartOptions.hAxis, 'format', chartInfo.labels.xFormat);
        updateOptions(chartOptions.hAxis, 'minValue', chartInfo.labels.xMin, 0);
        updateOptions(chartOptions.hAxis, 'maxValue', chartInfo.labels.xMax, 48);
        updateOptions(chartOptions.vAxis, 'format', chartInfo.labels.yFormat);
        updateOptions(chartOptions.vAxis, 'minValue', chartInfo.labels.yMin, 0);
        updateOptions(chartOptions.vAxis, 'maxValue', chartInfo.labels.yMax);

        // Instantiate and draw our chart, passing in some options.
        var chartId = chartInfo.chartId;
        if (typeof chartId == 'undefined') {
            chartId = 'chart';
        }
        var chartjq = $('#' + chartId)[0];

        var c = new chartInfo.chartClass(chartjq);
        c.draw(data, chartOptions);
    }

    /**
     * @function showErrorMessage
     *
     * Shows a custom error message and removes the loader if an error is encountered
     * while the graph is loading.
     *
     * @param msg {String} - The error message. If undefined, a default message is shown.
     */
    function showErrorMessage(msg) {
        var errorMsg = typeof msg === 'undefined' ? 'The website encountered an error. Please try again later.' : msg;
        $('#loadMsg').text(errorMsg);
        $('#loadMsg').show();
        $('#updateLoader').hide();
    }

})(jQuery);

// $Id: visualization-chart.js,v 1.186 2014/07/10 13:34:24 prisoner Exp $