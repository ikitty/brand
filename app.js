var path = require('path');
var fs = require('fs');
var express = require('express');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');

var MongoStore = require('connect-mongo')(session);
var flash = require('connect-flash');
var settings = require('./settings');
var errorLog = fs.createWriteStream('error.log', {flags: 'a'});

//var multer  = require('multer'); //for img upload


//start
var app = express();
app.set('port', process.env.PORT || 3009);
app.set('views', path.join(__dirname, 'views'));
app.engine('.html', require('ejs').__express);
app.set('view engine', 'html');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
    secret: settings.cookieSecret,
    key: settings.db,//cookie name
    cookie: {maxAge: 1000 * 3600 * 24 * 30},
    store: new MongoStore({
        db: settings.db,
        host: settings.host,
        port: settings.port
    })
    ,resave: false
    ,saveUninitialized: false
}));
app.use(flash());
app.use(express.static(path.join(__dirname, 'public')));

// handle route
var router = require('./routes/');
router(app);


// handle error
app.use(function (err, req, res, next) {
    var d = new Date();
    var d1 = [d.getFullYear(), d.getMonth()+1, d.getDate()].join('-');
    var d2 = [d.getHours(), d.getMinutes(), d.getSeconds()].join(':');
    var meta = '\n[' + d1 + ' ' + d2 + '] ' + req.url + '\n';
    errorLog.write(meta + err.stack + '\n');
    next();
});

app.listen(app.get('port'), function(){
    console.log('Server listening on port ' + app.get('port'));
});
