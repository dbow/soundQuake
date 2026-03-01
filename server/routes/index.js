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

    res.writeHead(200, {'Content-Type': 'text/html', 'Content-Length': Buffer.byteLength(data)});
    res.write(data);
    res.end();

};


/**
 * Load the query→filename mapping from data/cache.json at startup.
 * Keys in cache.json are percent-encoded; decode them so they match the
 * plain string that Express gives us in req.query.query.
 */
var path = require('path'),
    fs   = require('fs'),
    DATA_DIR = path.join(__dirname, '../data'),
    cacheMap = {};

try {
    var raw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'cache.json'), 'utf8'));
    Object.keys(raw).forEach(function(key) {
        cacheMap[decodeURIComponent(key)] = raw[key];
    });
} catch (e) {
    console.error('Failed to load data/cache.json:', e.message);
}


/**
 * Data request handler.
 *
 * Looks up the query in cache.json and returns the corresponding local JSON file.
 */
exports.data = function(req, response) {

    var query    = req.query.query || '',
        filename = cacheMap[query];

    if (!filename) {
        response.status(404).json({ error: 'Query not found in cache', query: query });
        return;
    }

    fs.readFile(path.join(DATA_DIR, filename), 'utf8', function(err, data) {
        if (err) {
            response.status(500).json({ error: 'Failed to read data file', file: filename });
            return;
        }
        response.type('json').send(data);
    });

};
