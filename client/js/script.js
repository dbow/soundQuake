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
            msPerYearRate = 10000,
            MS_PER_YEAR = 1000*60*60*24*365;

        return {

            play: function (dataArray) {

                var subSet = dataArray || DATA.source.getRows(),
                    setLen = subSet.length,
                    i,
                    setObj,
                    setObjCoords,
                    timeBegin = subSet[0]['datetime'],
                    timeAxis = subSet[setLen - 1]['datetime'] - timeBegin,
                    years = timeAxis / MS_PER_YEAR,
                    offSet,
                    objMag;

                for (i = 0; i < setLen; i++) {
                    setObj = subSet[i];
                    setObjCoords = DATA.visualize.convertToXY(setObj.Latitude, setObj.Longitude);
                    offSet = parseInt(((setObj['datetime'] - timeBegin) / timeAxis) * (msPerYearRate * years), 10);
                    objMag = setObj['Magnitude'] / 10;
                    DATA.visualize.createPlay(objMag, setObjCoords.x, setObjCoords.y, offSet);
                }

            },

            createPlay: function (mag, x, y, time) {
                setTimeout(function () {
                        Visual.addQuake(mag, x, y);
                }, time);
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
                DATA.visualize.play();

            }

        };

    })();

})();


/**
 * UI module
 */
var UI = (function () {

  var me = {};

  me.init = function () {

    $(document).on('click', '#controls.inactive', function () {

      $('#controls').removeClass('inactive');
      $('#controls-select').hide();
      $('#controls-close').show();
    });

    $(document).on('click', '#controls-close', function () {

      $('#controls').addClass('inactive');
      $('#controls-select').show();
      $('#controls-close').hide();

    });

  };

  return me;

})();

$(function() {

  UI.init();

});


