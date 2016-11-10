var path = require('path');
var fs = require('fs');
var express = require('express');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var flash = require('connect-flash');
var multer  = require('multer');
var settings = require('./settings');

var accessLog = fs.createWriteStream('access.log', {flags: 'a'});
var errorLog = fs.createWriteStream('error.log', {flags: 'a'});

var app = express();

app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
//app.use(logger('dev'));
//app.use(logger({stream: accessLog}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(multer({
    dest: './public/images',
    rename: function (fieldname, filename) {
        return filename;
    }
}));
app.use(cookieParser());
app.use(session({
    secret: settings.cookieSecret,
    key: settings.db,//cookie name
    cookie: {maxAge: 1000 * 60 * 60 * 24 * 30},//30 days
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

app.use((req, res, next) => {
    res.locals.user = req.session.user
    next()
});


var router = require('./routes/');
router(app);

app.use(function (err, req, res, next) {
    var d = new Date();
    var d1 = [d.getFullYear(), d.getMonth()+1, d.getDate()].join('-');
    var d2 = [d.getHours(), d.getMinutes(), d.getSeconds()].join(':');
    var meta = '\n[' + d1 + ' ' + d2 + '] ' + req.url + '\n';
    errorLog.write(meta + err.stack + '\n');
    next();
});

app.listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
});
