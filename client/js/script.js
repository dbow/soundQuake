/* Author:

*/

var DATA = {};

(function () {

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
                    var newObj = {};
                    newObj.columns = ['Date', 'Latitude', 'Longitude']; // Required Fusion Table columns.
                    newObj.rows = [];
                    newObj.earliest;
                    newObj.latest;
                    newObj.params = {};  // Up to two other numeric columns.
                    dataObjects[id] = newObj;
                }

                DATA.source.setCurrId(id);
                DATA.source.retrieveColumns();

            },

            retrieveColumns: function () {

                $.get(encodeURI(SERVER_URL + describeUrl + currFtId), function(data) {

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
                                function ParamsObj () {
                                  this.lowest = 0;
                                  this.highest = 0;
                                }
                                dataObj.params[colObj['name']] = new ParamsObj;
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

                    $.get(fullSelectUrl, function(data) {
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
                        for (j=0; j < numColumns; j++) {
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
                    objParam;

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
                }

            },

            createPlay: function (param, x, y, time) {
                if (param < 0) {
                  param = 0;
                }
                scheduledQuakes.push(setTimeout(function () {
                        Visual.addQuake(param, x, y);
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
    
    $(document).on('keydown', function (e) {
      if (e.which === 32) {
        e.preventDefault();
        e.stopPropagation();
        _stop();
      }
      else if (e.which === 67) {
        Visual.toggleCameraMove();
      }
    });

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
    
    $('#controls-select-colors').on('change', function () {
      Visual.selectColorScheme($(this).val());
    });

  };

  return me;

})();

$(function() {

  DATA.source.init('1jtomLnD5Afah8LUo2T4CT9GwI5NpDS6-2Cv4HWY'); // default data set (bay area quakes from 1973+)
  UI.init();

});


