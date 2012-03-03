
/*
 * GET home page.
 */

exports.index = function(req, res){

    var fs = require('fs'),
        data;

    data = fs.readFileSync(__dirname + '/../../client/index.html', 'UTF-8');

    res.writeHead(200, {'Content-Type': 'text/html','Content-Length':data.length});
    res.write(data);
    res.end();

};