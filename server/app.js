
/**
 * Module dependencies.
 */

var express = require('express'),
    routes = require('./routes'),
    app = module.exports = express.createServer();


// Configuration

app.configure(function () {
    app.set('views', __dirname + '/../client/index.html');
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(__dirname + '/../client'));
});

app.configure('development', function () {
    app.use(express.errorHandler({
        dumpExceptions: true,
        showStack: true
    }));
});

app.configure('production', function () {
    app.use(express.errorHandler());
});


// Routes

app.get('/', routes.index);
app.get('/data', routes.data);

app.listen(3000); // TODO - dbow - In production use 80
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
