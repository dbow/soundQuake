/* Author:

*/

var DATA = {};

(function () {

    DATA.source = (function () {

        var FT_ID = '1jtomLnD5Afah8LUo2T4CT9GwI5NpDS6-2Cv4HWY',
            SERVER_URL = '/data?query=',
            describeUrl = encodeURI('query?sql=DESCRIBE ' + FT_ID),
            selectUrl = 'query?sql=SELECT ',
            columns = [],
            rows,
            latLngBounds = {
                TOP_LAT: 38.090668,
                BOT_LAT: 37.342867,
                LEFT_LONG: -122.921226,
                RIGHT_LONG: -121.687317
            };

        return {

            getColumns: function () {
                return columns;
            },

            getRows: function () {
                return rows;
            },

            getBounds: function () {
                return latLngBounds;
            },

            retrieveColumns: function () {

                $.get(SERVER_URL + describeUrl, function(data) {

                    var parsedData = DATA.source.parseResponse(data),
                        obj,
                        colObj;

                    for (obj in parsedData) {
                        if (parsedData.hasOwnProperty(obj)) {
                            colObj = parsedData[obj];
                            columns.push(colObj['name']);
                        }
                    }

                    DATA.source.retrieveRows();

                });

            },

            retrieveRows: function () {

                if (columns.length > 0) {

                    var selectCols = "'" + columns.join("', '") + "'",
                        fullSelectUrl = encodeURI(SERVER_URL + selectUrl + selectCols + ' FROM ' + FT_ID);

                    $.get(fullSelectUrl, function(data) {
                        rows = DATA.source.parseResponse(data);
                        DATA.visualize.init();
                    });

                }

            },

            parseResponse: function (data) {

                var rows = data.split(/\n/),
                    columns = rows.shift().split(','),
                    numColumns = columns.length,
                    numRows = rows.length,
                    i,
                    row,
                    rowObj,
                    j,
                    rowVal,
                    populatedRow = false,
                    parsedArray = [],
                    dateArray;

                for (i = 0; i < numRows; i++) {
                    row = rows[i].split(',');
                    if (row.length === numColumns) {
                        rowObj = {};
                        for (j=0; j < numColumns; j++) {
                            rowVal = row[j];
                            if (populatedRow !== true && rowVal !== '') {
                                populatedRow = true;
                            }
                            rowObj[columns[j]] = rowVal;

                        }
                        if (rowObj['Date']) {
                            dateArray = rowObj['Date'].split('/');
                            rowObj['datetime'] = new Date(dateArray[2], dateArray[0], dateArray[1]);
                        }
                        if (populatedRow) {
                            parsedArray.push(rowObj);
                            populatedRow = false;
                        }
                    }
                }
                return parsedArray;

            },

            init: function () {

                DATA.source.retrieveColumns();

            }

        };

    })();

    DATA.source.init();

    DATA.visualize = (function () {

        var mapBounds = DATA.source.getBounds(),
            xAxis,
            yAxis,
            rate = 5,
            increment = 'years', // per second
            msPer = {
              'days': 1000 * 60 * 60 * 24,
              'weeks': 1000 * 60 * 60 * 24 * 7,
              'months': 1000 * 60 * 60 * 24 * 30,
              'years': 1000 * 60 * 60 * 24 * 365
            },
            scheduledQuakes = [];

            // TODO(dbow): Notes on calculating time offset... remove soon!
            // 5 years (timeSpan) per second (realTime)
            // 5 msPer['years'] (timeSpan) per second (realTime)
            // 5 msPer['years'] (timeSpan) per 1000 ms (realTime)
            // 1000 ms (realTime) per 5 msPer['years'] (timeSpan)
            // 1000 / 5 msPer['years'] (realTime) per 1 ms (timeSpan)
            // rate: x ms (realTime) per 1 ms (timeSpan)

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
                    objMag;

                for (i = 0; i < setLen; i++) {
                    setObj = subSet[i];
                    setObjCoords = DATA.visualize.convertToXY(setObj.Latitude, setObj.Longitude);
                    offSet = parseInt(((setObj['datetime'] - timeBegin) / timeSpan) * (realTimeSpan), 10);
                    objMag = setObj['Magnitude'] / 10;
                    DATA.visualize.createPlay(objMag, setObjCoords.x, setObjCoords.y, offSet);
                }

            },

            createPlay: function (mag, x, y, time) {
                scheduledQuakes.push(setTimeout(function () {
                        Visual.addQuake(mag, x, y);
                }, time));
            },

            convertToXY: function (lat, long) {

                var planeBounds = Visual.getBounds(),
                    yDist = mapBounds.TOP_LAT - lat,
                    xDist = mapBounds.RIGHT_LONG - long,
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
                UI.enableRun();
                //DATA.visualize.play();

            }

        };

    })();

})();


/**
 * UI module
 */
var UI = (function () {

  var me = {};

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

  me.init = function () {

    $('#controls-input-interval').slider({
      range: true,
      min: 0,
      max: 500,
      values: [ 75, 300 ],
      slide: function( event, ui ) {
        var timeInterval = ui.values;
        // TODO(dbow): set interval.
      }
    });

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

    $(document).on('click', '#controls-input-stop:not(".disabled")', function () {

      var scheduledQuakes = DATA.visualize.getScheduledQuakes(),
          arrayLen = scheduledQuakes.length,
          i;

      for (i = 0; i < arrayLen; i++) {
        clearInterval(scheduledQuakes[i]);
      }

      Visual.stop();
      UI.disableStop();

    });
    
    $(document).on('click', '#controls.inactive', function () {

      $('#controls').removeClass('inactive');
      $('#controls-select').hide();
      $('#controls-input').show();

    });

    $(document).on('click', '#controls-input-close', function () {

      $('#controls').addClass('inactive');
      $('#controls-select').show();
      $('#controls-input').hide();

    });

  };

  return me;

})();

$(function() {

  UI.init();

});


