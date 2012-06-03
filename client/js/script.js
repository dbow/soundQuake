/**
 * DATA
 * Module handling the data for the application.
 */
var DATA = {};

(function () {

    /**
     *  DATA.source
     *  Module that handles retrieval and parsing of source data.
     */
    DATA.source = (function () {

        var currFtId = '',
            dataObjects = {},
            SERVER_URL = '/data?query=',
            describeUrl = 'query?sql=DESCRIBE ',
            selectUrl = 'query?sql=SELECT ',
        // Default map window (roughly the bay area)
            latLngBounds = {
                TOP_LAT: 38.090668,
                BOT_LAT: 37.342867,
                LEFT_LONG: -122.921226,
                RIGHT_LONG: -121.687317
            };

        return {

            setCurrId: function (newId) {
                currFtId = newId;
            },

            getBounds: function () {
                return latLngBounds;
            },

            getColumns: function () {
                return dataObjects[currFtId].columns;
            },

            getRows: function () {
                return dataObjects[currFtId].rows;
            },

            getParams: function () {
                return dataObjects[currFtId].params;
            },

            getEarliest: function () {
                return dataObjects[currFtId].earliest;
            },

            getLatest: function () {
                return dataObjects[currFtId].latest;
            },

            createDataObject: function (id) {

                if (!dataObjects[id]) {
                    dataObjects[id] = {
                        columns: ['Date', 'Latitude', 'Longitude'], // Required Fusion Table columns.
                        rows: [],
                        params: {}  // Up to two other numeric columns.
                    };
                }

                DATA.source.setCurrId(id);
                DATA.source.retrieveColumns();

            },

            retrieveColumns: function () {

                $.get(encodeURI(SERVER_URL + describeUrl + currFtId), function (data) {

                    var parsedData = DATA.source.parseResponse(data),
                        obj,
                        colObj,
                        dataObj = dataObjects[currFtId];

                    for (obj in parsedData) {
                        if (parsedData.hasOwnProperty(obj)) {
                            colObj = parsedData[obj];
                            if (dataObj.columns.length < 5) {
                                if (colObj['type'] === 'number' && dataObj.columns.indexOf(colObj['name']) < 0) {
                                    dataObj.columns.push(colObj['name']);
                                    dataObj.params[colObj['name']] = {
                                        lowest: 0,
                                        highest: 0
                                    };
                                }
                            }
                        }
                    }

                    DATA.source.retrieveRows();

                });

            },

            retrieveRows: function () {

                var dataObj = dataObjects[currFtId];

                if (dataObj.columns.length > 0) {

                    var selectCols = "'" + dataObj.columns.join("', '") + "'",
                        fullSelectUrl = encodeURI(SERVER_URL + selectUrl + selectCols + ' FROM ' + currFtId);

                    $.get(fullSelectUrl, function (data) {
                        dataObj.rows = DATA.source.parseResponse(data, true);
                        DATA.visualize.init();
                    });

                }

            },

            parseResponse: function (data, rowParse) {

                var rows = data.split(/\n/),
                    columns = rows.shift().split(','),
                    numColumns = columns.length,
                    numRows = rows.length,
                    i,
                    row,
                    rowObj,
                    j,
                    rowVal,
                    reqRow = false,
                    populatedRow = false,
                    validRow = true,
                    parsedArray = [];

                for (i = 0; i < numRows; i++) {
                    row = rows[i].split(',');
                    if (row.length === numColumns) {
                        rowObj = {};
                        populatedRow = false;
                        validRow = true;
                        for (j = 0; j < numColumns; j++) {
                            rowVal = row[j];
                            if (!populatedRow && rowVal !== '') {
                                populatedRow = true;
                            }
                            // Require a Date, Lat and Long for each row if rowParse is true.
                            if (rowParse) {
                                reqRow = ['Date', 'Latitude', 'Longitude'].indexOf(columns[j]) >= 0;
                                if (validRow && rowVal === '' && reqRow) {
                                    validRow = false;
                                }
                                // Convert non-req rows (numeric) to numbers.
                                if (!reqRow) {
                                    rowVal = +rowVal;
                                }
                            }
                            rowObj[columns[j]] = rowVal;
                            if (rowParse) {
                                DATA.source.checkParams(columns[j], rowVal);
                            }
                        }
                        if (rowObj['Date']) {
                            rowObj['datetime'] = new Date(rowObj['Date']);
                            if (rowParse) {
                                DATA.source.checkDateOrder(rowObj['datetime']);
                            }
                        }
                        if (populatedRow && validRow) {
                            parsedArray.push(rowObj);
                        }
                    }
                }

                return parsedArray;

            },

            checkParams: function (columnVal, rowVal) {

                var dataObj = dataObjects[currFtId],
                    param = dataObj.params[columnVal];

                if (param) {
                    if (!param.lowest || rowVal < param.lowest) {
                        param.lowest = rowVal;
                    }
                    if (!param.highest || rowVal > param.highest) {
                        param.highest = rowVal;
                    }
                }

            },

            checkDateOrder: function (datetime) {

                var dataObj = dataObjects[currFtId];

                if (!dataObj.earliest || datetime < dataObj.earliest) {
                    dataObj.earliest = datetime;
                }
                if (!dataObj.latest || datetime > dataObj.latest) {
                    dataObj.latest = datetime;
                }

            },

            init: function (id) {

                DATA.source.createDataObject(id);

            }

        };

    })();


    /**
     * DATA.visualize
     * Module that converts source data to input for the visual modules.
     */
    DATA.visualize = (function () {

        var mapBounds = DATA.source.getBounds(),
            xAxis,
            yAxis,
            rate = 5,
            increment = 'weeks', // per second
            msPer = {
                'days': 1000 * 60 * 60 * 24,
                'weeks': 1000 * 60 * 60 * 24 * 7,
                'months': 1000 * 60 * 60 * 24 * 30,
                'years': 1000 * 60 * 60 * 24 * 365
            },
            scheduledQuakes = [],
            timelineIncrement,
            TIMELINE_UPDATE = 250,
            timelineIntervalId;

        return {

            setIncrement: function (newInc) {
                if (msPer[newInc]) {
                    increment = newInc;
                }
            },

            setRate: function (newRate) {
                if (newRate > 0) {
                    rate = newRate;
                }
            },

            getScheduledQuakes: function () {

                return scheduledQuakes;

            },

            play: function (dataArray) {

                var subSet = dataArray || DATA.source.getRows(),
                    setLen = subSet.length,
                    i,
                    setObj,
                    setObjCoords,
                    timeBegin = subSet[0]['datetime'],
                    timeSpan = subSet[setLen - 1]['datetime'] - timeBegin,
                    currRate = 1000 / (rate * msPer[increment]),
                    realTimeSpan = timeSpan * currRate,
                    offSet,
                    params = DATA.source.getParams(),
                    param,
                    paramObj,
                    newParamObj,
                    firstParam,
                    secondParam,
                    objParam,
                    timelineMap = {},
                    objYear,
                    leftOffset,
                    rightOffset;

                // Retrieve numeric params of the dataset
                for (param in params) {
                    if (params.hasOwnProperty(param)) {
                        paramObj = params[param];
                        newParamObj = {
                            'name': param,
                            'highest': paramObj.highest,
                            'lowest': paramObj.lowest
                        };
                        if (!firstParam) {
                            firstParam = newParamObj;
                        } else {
                            secondParam = newParamObj;
                        }
                    }
                }

                for (i = 0; i < setLen; i++) {
                    setObj = subSet[i];
                    setObjCoords = DATA.visualize.convertToXY(setObj.Latitude, setObj.Longitude);
                    offSet = parseInt(((setObj['datetime'] - timeBegin) / timeSpan) * (realTimeSpan), 10);
                    objParam = (setObj[firstParam.name] - firstParam.lowest) / (firstParam.highest - firstParam.lowest);
                    DATA.visualize.createPlay(objParam, setObjCoords.x, setObjCoords.y, offSet);

                    // Assemble timelineMap object with years as keys and number of events as values.
                    objYear = setObj['datetime'].getFullYear();
                    if (timelineMap[objYear]) {
                        timelineMap[objYear] += 1;
                    } else {
                        timelineMap[objYear] = 1;
                    }
                }

                // Create timeline
                leftOffset = DATA.source.getEarliest().getMonth() / 12;
                rightOffset = DATA.source.getLatest().getMonth() / 12;
                UI.setupTimeline(timelineMap, leftOffset, rightOffset);

                // Calculate px increment that pointer should be moved every TIMELINE_UPDATE interval.
                timelineIncrement = UI.getTimelineWidth() * (TIMELINE_UPDATE / realTimeSpan);

                // Initiate pointer movement along timeline.
                DATA.visualize.updateTimeline(UI.getPxWidthPerYear() * leftOffset);

                // Call play again after the last quake is scheduled this time, with a 5 second delay.
                setTimeout(function () {
                    var scheduledQuakes = DATA.visualize.getScheduledQuakes(),
                        arrayLen = scheduledQuakes.length,
                        i;
                    for (i = 0; i < arrayLen; i++) {
                        clearTimeout(scheduledQuakes[i]);
                    }
                    Visual.stop();
                    DATA.visualize.play();
                    Visual.start();
                }, realTimeSpan + 15000);

            },

            // Moves timeline-pointer along the timeline at a set interval based on data timespan.
            updateTimeline: function (timerPosition) {

                var thisIntervalId;

                thisIntervalId = setInterval(function () {

                    var timelineWidth = UI.getTimelineWidth();

                    // If updateTimeline has been called again or end is reached, clear this interval.
                    if (timelineIntervalId !== thisIntervalId || timerPosition >= timelineWidth) {
                        clearInterval(thisIntervalId);
                    }

                    // Move pointer and increment timerPosition.
                    $('#timeline-pointer').css('left', timerPosition);
                    timerPosition += timelineIncrement;

                }, TIMELINE_UPDATE);

                // Sets timelineIntervalId to new ID when this method is called.
                timelineIntervalId = thisIntervalId;

            },

            createPlay: function (param, x, y, time) {
                if (param < 0) {
                    param = 0;
                }
                scheduledQuakes.push(setTimeout(function () {
                    Visual.addQuake(param, x, y);
                }, time));
            },

            convertToXY: function (latitude, longitude) {

                var planeBounds = Visual.getBounds(),
                    yDist = mapBounds.TOP_LAT - latitude,
                    xDist = mapBounds.RIGHT_LONG - longitude,
                    yConv = yDist / yAxis,
                    xConv = xDist / xAxis;

                return {
                    x: xConv * planeBounds.x,
                    y: yConv * planeBounds.y
                };

            },

            setupXY: function () {

                xAxis = mapBounds.RIGHT_LONG - mapBounds.LEFT_LONG;
                yAxis = mapBounds.TOP_LAT - mapBounds.BOT_LAT;

            },

            init: function () {

                DATA.visualize.setupXY();
                // UI.enableRun();
                DATA.visualize.play();

            }

        };

    })();

})();


/**
 * UI module
 * Handles interface interactions and setup.
 */
var UI = (function () {

    var me = {},
        actualTimelineWidth,
        pxWidthPerYear,
        _hudTimeout = 0;

    me.enableRun = function () {

        $('#controls-input-run').removeClass('disabled');

    };

    me.enableStop = function () {

        $('#controls-input-run').addClass('disabled');
        $('#controls-input-stop').removeClass('disabled');

    };

    me.disableStop = function () {

        $('#controls-input-run').removeClass('disabled');
        $('#controls-input-stop').addClass('disabled');

    };

    me.getPxWidthPerYear = function () {

        return pxWidthPerYear;

    };

    me.getTimelineWidth = function () {

        return actualTimelineWidth;

    };

    me.setupTimeline = function (timelineObj, leftOffset, rightOffset) {

        var sortedYears = _.sortBy(_.keys(timelineObj), function(num) { return parseInt(num, 10); }),
            firstYear = parseInt(sortedYears[0], 10),
            lastYear = parseInt(sortedYears.pop(), 10),
            numYears = lastYear - firstYear + 1,
            i,
            numQuakes,
            maxQuakes = 0,
            quakeRatio,
            yearHtml,
            timelineHtml = '',
            timelineWidth = $('#timeline-range').outerWidth(),
            remainder = timelineWidth % numYears,
            widthPerYear,
            countHeight = parseInt($('#timeline-range').css('margin-top'), 10);

        // Calculate how wide each year should be given the available space and number of years to represent.
        pxWidthPerYear = Math.floor(timelineWidth / numYears);
        widthPerYear = ((pxWidthPerYear / (pxWidthPerYear*numYears)) * 100) + '%';

        // Add the pointer.
        $('#timeline-range').html('<div id="timeline-pointer"></div>');
        // Start pointer in a relative position to the first data point.
        $('#timeline-pointer').css('left', leftOffset);

        // Create timeline-range-date divs for each year in the dataset.
        for (i = firstYear; i <= lastYear; i++) {
            numQuakes = timelineObj[i];
            yearHtml = '<div class="timeline-range-date" id="' + numQuakes + '_' + i + '_timeline_year">' + i +
                       '<div class="timeline-range-data-bar"></div>' +
                       '<div class="timeline-hover hidden">' + numQuakes + ' earthquakes in ' + i + '</div></div>';
            timelineHtml += yearHtml;
            if (numQuakes > maxQuakes) {
                maxQuakes = numQuakes;
            }
        }

        // Add timeline-range-date divs to timeline-range.
        $('#timeline-range').append(timelineHtml);

        // Adjust dimensions of each timeline-range-date to be the calculated width.
        $('.timeline-range-date').css('width', widthPerYear);

        // Set height of timeline-range-data-bar to relative height based on # of data points that year.
        quakeRatio = countHeight / maxQuakes;
        $('.timeline-range-date').each(function () {
            var quakeNum = parseInt(this.id, 10),
                relRatio = quakeNum * quakeRatio;
            $(this).find('.timeline-range-data-bar').css('height', relRatio);
        });

        // Set actualTimelineWidth to the effective width of the timeline div given the dataset/offsets, etc.
        actualTimelineWidth = timelineWidth - remainder - leftOffset - rightOffset;

        // Set up hovers to show data.
        $('.timeline-range-date').hover(function () {
            $(this).find('.timeline-hover').removeClass('hidden');
        }, function () {
            $(this).find('.timeline-hover').addClass('hidden');
        });

    };

    me.toggleTimeline = function () {

        var timeline = $('#timeline'),
            about = $('#about-button'),
            reveal = false;

        if (timeline.hasClass('hidden')) {
            timeline.removeClass('hidden');
            about.removeClass('hidden');
            reveal = true;
        } else {
            timeline.addClass('hidden');
            about.addClass('hidden');
        }

        return reveal;

    };

    me.init = function () {

        // TODO (dbow): Removing the ability to control playback for the installation.
        /*
        $(document).on('click', '#controls-input-run:not(".disabled")', function () {

            var rate = $('#controls-rate').val(),
                incr = $('#controls-increment').val(),
                intRate,
                error = false;

            $('.controls-error').hide();

            if (rate) {
                intRate = +rate;
                if (!intRate) {
                    $('#controls-error-num').show();
                    error = true;
                }
            } else {
                $('#controls-error-val').show();
                error = true;
            }

            if (!error) {
                Visual.start();
                DATA.visualize.setRate(intRate);
                DATA.visualize.setIncrement(incr);
                DATA.visualize.play();
                UI.enableStop();
            }

        });

        function _stop() {
            var scheduledQuakes = DATA.visualize.getScheduledQuakes(),
                arrayLen = scheduledQuakes.length,
                i;

            for (i = 0; i < arrayLen; i++) {
                clearTimeout(scheduledQuakes[i]);
            }

            Visual.stop();
            UI.disableStop();
        }

        $(document).on('click', '#controls-input-stop:not(".disabled")', _stop);

        $(document).on('click', '#controls.inactive', function () {

            $('#controls').removeClass('inactive');
            $('#controls-select').hide();
            $('#controls-input').show();
            Visual.stopCameraMove();

        });

        $(document).on('click', '#controls-input-close', function () {

            $('#controls').addClass('inactive');
            $('#controls-select').show();
            $('#controls-input').hide();
            //Visual.startCameraMove();
        });
        */

        $('#controls-select-colors').on('change', function () {
            Visual.selectColorScheme($(this).val());
        });


        // About Dialogue events

        $('#about-button').click(function () {
            $('#about-dialog').toggle('fade');
            $()
        });
        $('#about-dialog .close').click(function () {
            $('#about-dialog').fadeOut();
        });

        $('.about-dialog-tab').click(function (e) {
            var tabName = $(e.target).attr('id').replace('-tab', '');
            $('.about-dialog-tab').removeClass('about-selected');
            $('.about-content').hide();
            $('#' + tabName + '-tab').addClass('about-selected');
            $('#' + tabName + '-tab-content').show();
        });

        $(document).on('keydown', function (e) {

            // TODO - qarren - no stopping the sim
            /*
             if (e.which === 32) {
             e.preventDefault();
             e.stopPropagation();
             _stop();
             }
             */

            /**
             * DESKTOP CONTROLS
             */

            // press Z to Zoom
            if (e.which === 90) {
                if (Visual.toggleCameraZoom()) {
                    me.showHudMessage('Zoom');
                }
            }

            // press C to Move
            else if (e.which === 67) {
                if (Visual.toggleCameraMove()) {
                    me.showHudMessage('Move');
                }
            }

            // press M to adjust map opacity
            else if (e.which === 77) {
                if (Visual.toggleMapOpacity()) {
                    me.showHudMessage('Map');
                }
            }

            // press T to toggle Timeline
            else if (e.which === 84) {
                if (UI.toggleTimeline()) {
                    me.showHudMessage('Timeline');
                }
                e.preventDefault();
                e.stopPropagation();
            }

            // press X to toggle the Cursor
            else if (e.which === 88) {
                $(document.body).toggleClass('no-cursor');
            }


            /**
             * TRACKBALL CONTROLS
             */
            // TODO - dbow - Need to map trackball buttons to keys.

            // Turn off Zoom and Move via trackball button
            else if (e.which === 35) {  // 35 = 'end' which can be mapped to trackball button.
                Visual.resetBoth();
                e.preventDefault();
                e.stopPropagation();
                me.showHudMessage('Off');
            }

            // Toggle Timeline via trackball button
            else if (e.which === 36) {  // 36 = 'home' which can be mapped to trackball button.
                if (UI.toggleTimeline()) {
                    me.showHudMessage('Timeline');
                }
                e.preventDefault();
                e.stopPropagation();
            }

            // Toggle Moving via trackball button.
            else if (e.which === 33) {  // 33 = 'page up' which can be mapped to trackball button.
                if (Visual.toggleCameraMove()) {
                    me.showHudMessage('Move');
                }
            }

        });

        //TODO - qarren - not sure this is good given that we have some buttons now
        /*
        // Toggle Zooming via mouse click.
        $(document).on('click', function (e) {
            if (e.button === 0) {
                if (Visual.toggleCameraZoom()) {
                    me.showHudMessage('Zoom');
                }
            e.preventDefault();
            e.stopPropagation();
            }
        });
        */

    };

    me.showHudMessage = function (message) {

        if (_hudTimeout) {
            clearTimeout(_hudTimeout);
        }

        $('#hud').text(message).show();

        _hudTimeout = setTimeout(function () {
            $('#hud').fadeOut();
        }, 2000);

    };

    return me;


})();

$(function() {

    DATA.source.init('1jtomLnD5Afah8LUo2T4CT9GwI5NpDS6-2Cv4HWY'); // default data set (bay area quakes from 1973+)

    UI.init();

    setTimeout(function () {
        window.location = window.location;
    }, 1000*60*60);

});


