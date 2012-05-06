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
 * Server makes HTTP request to Google Fusion tables for data,
 * acting as a proxy for client (to avoid cross-domain issues).
 */
exports.data = function(req, response) {

    var http = require('http'),
        query = encodeURI(req.param('query', '')),
        options = {
            host: 'www.google.com',
            port: 80,
            path: '/fusiontables/api/' + query
        },
        responseData = '';

    // If data is cached, return it.
    if (dataCache[query]) {
        response.send(dataCache[query]);
    } else {
        // Else, make HTTP request to Fusion tables.
        http.get(options, function(res) {
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
