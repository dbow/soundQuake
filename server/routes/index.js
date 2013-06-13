/**
 * Index page request handler.
 *
 * Returns index.html file.
 *
 */
exports.index = function(req, res) {

    var fs = require('fs'),
        data;

    data = fs.readFileSync(__dirname + '/../../client/index.html', 'UTF-8');

    res.writeHead(200, {'Content-Type': 'text/html','Content-Length':data.length});
    res.write(data);
    res.end();

};

// Server caches results, keying on query value.
var dataCache = {};


/**
 * Data request handler.
 *
 * Server makes HTTPS request to Google Fusion tables for data,
 * acting as a proxy for client (to avoid cross-domain issues).
 */
exports.data = function(req, response) {

    var https = require('https'),
        query = encodeURI(req.param('query', '')),
        key = require('./credentials.js').credentials.fusionTablesKey,
        url = 'https://www.googleapis.com/fusiontables/v1/',
        responseData = '';

    // If data is cached, return it.
    if (dataCache[query]) {
        response.send(dataCache[query]);
    } else {
        // Else, make HTTPS request to Fusion tables.
        https.get(url + query + '&key=' + key, function(res) {
            if (res.statusCode !== 1000) {
                res.setEncoding('utf8');
                res.on('data', function (chunk) {
                    responseData += chunk;
                    dataCache[query] = responseData;
                    response.send(responseData);
                });
            }
            res.on('error', function(e) {
                console.log("Got error: " + e.message);
            });
        });
    }

};
