
/**
 * Module dependencies.
 */

var express = require('express'),
    bodyParser = require('body-parser'),
    routes = require('./routes'),
    app = express();


// Middleware

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(__dirname + '/../client'));


// Routes

app.get('/', routes.index);
app.get('/data', routes.data);


// Error handling

if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500).json({ error: err.message, stack: err.stack });
    });
} else {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500).json({ error: err.message });
    });
}


var server = app.listen(3000, function() {
    console.log("Express server listening on port %d in %s mode", server.address().port, app.get('env'));
});
