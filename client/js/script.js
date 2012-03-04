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
                    parsedArray = [];

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

        var sourceData = DATA.source.getRows(),
            mapBounds = DATA.source.getBounds(),
            xAxis,
            yAxis;

        return {

            play: function (dataArray) {

                var subset = dataArray || sourceData,
                    setLen = subset.length,
                    i;

                for (i = 0; i < setLen; i++) {

                }

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

            }

        };

    })();

    DATA.visualize.init();

})();

