var crypto = require('crypto'),
    fs = require('fs'),
    User = require('../models/user.js'),
    Post = require('../models/post.js'),
    Cate = require('../models/cate.js'),
    formidable = require('formidable'),
    async = require('async'),
    path = require('path');

    
var settings = require('../settings');

module.exports = function(app) {
    app.get('*', getLoginStatus)

    app.get('/', function (req, res) {
        Cate.getAll(function (err, docs ) {
            docs = docs || []
            res.render('index', {
                title: 'GuideLine',
                data: docs,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });
    app.get('/show/:vid', checkPermission,  function (req, res) {
        Cate.getOne({vid: req.params.vid}, function (err, doc ) {
            if (err) { doc = []; } 
            res.render('show', {
                title: doc.project_name,
                path: '',
                data: doc,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });


    //============================
    //=======common img upload
    //============================
    var doImgUpload = function (req, uploadDir, cb) {
        var form = new formidable.IncomingForm();
        form.uploadDir = './tmp'
        form.parse(req, function (err, fields, files) {
            if (err) { return console.log('Formidable, form.parse err ', err); }

            var ret = {}
            var task = []
            for (var item in files) { 
                if (files[item].name) {
                    task.push(item) 
                }else {
                    ret[item] = {statusCode: 404, img: ''}
                }
            }

            async.eachSeries(task, (item, callback)=> {
                var file = files[item]
                var filename = file.name;
                var extname = filename.lastIndexOf('.') >= 0 ? filename.slice(filename.lastIndexOf('.') - filename.length) : '';
                var d = new Date();
                var dArr = [d.getFullYear(), d.getMonth()+1, d.getDate(),d.getHours(),d.getMinutes() ,'-', (Math.random()*100|0)];
                filename = dArr.join('') + extname;
                var filenewpath = path.join(process.cwd(), 'public/images/' + uploadDir + '/' + filename) ;
                fs.rename(file.path, filenewpath, function (err) {
                    var result = '';
                    if (err) {
                        statusCode = 502
                        result = 'error|save error';
                    } else {
                        statusCode = 200
                        result = '/images/' + uploadDir + '/' + filename;
                    }
                    ret[item] = {statusCode: statusCode, img: result}
                    callback(err)

                    fs.unlink(file.path, function(){  })
                }); 
            },(err) => {
                if (err) {
                    console.log('error: %s'.error, err.message);
                }else {
                    for (var i in ret) {fields[i] = ret[i].img }
                    cb(fields, ret);
                }
            });
        });
    }


    //==============================
    //=============Handle Cate(project)
    //==============================
    //menu
    app.post('/menu/update/:id', checkPermission, function (req, res) {
        var data = { treemenu: req.body.treemenu };
        Cate.update(req.params.id, data, function (err) {
            if (err) { return res.json({error:1, message: 'db error: '+ err.message}) }
            res.json({error:0, message: 'ok'})
        });
    });

    app.get('/cate/get', checkLogin, function (req, res) {
        if (req.session.username != 'alextang') {
            return res.redirect('404') ;
        }
        Cate.getAll(function (err, posts ) {
            if (err) { posts = []; } 
            res.render('cate_list', {
                title: '项目列表',
                path: 'cate_list',
                posts: posts,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });

    app.get('/cate/add', checkLogin, function (req, res) {
        res.render('cate', {
            title: '新增项目',
            path: 'cate_add',
            post: {managerArr:[]},
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });
    app.post('/cate/add', checkLogin, function (req, res) {
        doImgUpload(req, 'brand',  function (fields, ret) {
            fields.treemenu = ''
            Cate.save(fields, function (err) {
                if (err) {
                    req.flash('error', err); 
                    return res.redirect('/cate/add');
                }
                req.flash('success', '操作成功!');
                res.redirect('/cate/get');
            });
        })
    });

    //handle edit cate
    app.get('/cate/edit/:id',checkPermission, function (req, res) {
        Cate.getOne({id: req.params.id},function (err, doc ) {
            if (err) { doc = []; } 
            doc.managerArr = doc.manager.split(',')
            res.render('cate', {
                title: '修改',
                post: doc,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });
    app.post('/cate/edit/:id',checkLogin, function (req, res) {
        doImgUpload(req, 'brand', function (fields, ret) {
            if (!fields.logo) { delete fields.logo }
            if (!fields.cover) { delete fields.cover }

            Cate.update(req.params.id, fields, function (err) {
                if (err) {
                    req.flash('error', err); 
                    return res.redirect('back');
                }
                req.flash('success', '操作成功!');
                res.redirect('/cate/get');
            });
        })
    });


    app.get('/cate/remove/:id',checkPermission, function (req, res) {
        var cate = req.params.id ;
        Cate.remove(cate, function (err, doc) {
            if (err) {
                req.flash('error', err); 
                return res.redirect('back');
            }
            Post.removeAllByParentId(doc._id, function (err) {
                if (err) {
                    req.flash('error', err); 
                    return res.redirect('back');
                }
                req.flash('success', '操作成功，项目和对应文档都已删除!');
                res.redirect('/cate/get');
            });
        });
    });

    //==============================
    //=============Handle item
    //==============================
    app.post('/item/update/:pid', checkLogin,  checkPermission, function (req, res) {
        var data = {
            last_editor: req.session.username,
            id: req.body.id,
            content: req.body.content
        };
        Post.update(data, function (err) {
            if (err) { return res.json({error:1, message: 'db error: '+ err.message}) }
            res.json({error:0, message: 'ok'})
        });
    });

    app.post('/item/add/:pid', checkLogin, checkPermission, function (req, res) {
        var data = {
            author: req.session.username,
            last_editor: req.session.username,
            content: req.body.content,
            pv: 1
        };
        if (!req.params.pid) {
            return res.json({error:1, message: '无法获取项目id'})
        }

        Post.save(data, function (err, id) {
            if (err) {
                req.flash('error', err); 
                return res.redirect('/');
            }
            req.flash('success', '发布成功!');
            res.json({error:0, message: id && id[0]})
        });
    });

    app.get('/item/remove/:pid/:id',checkLogin, checkPermission, function (req, res) {
        Post.remove(req.params.id,  function (err) {
            if (err) { return res.json({error:1 , message: err.message}); }
            res.json({error:0, message:'ok'})
        });
    });

    app.get('/item/get/:pid/:id', checkLogin, checkPermission, function (req, res) {
        Post.getOne(req.params.id, function (err, doc) {
            if (err) { return res.json({error:1, message: err.message}) }
            res.json({error:0, message: doc})
        });
    });



    

    //==============================
    //=============Common
    //==============================

    //get login status
    function getLoginStatus(req, res, next) {
        var login = require('../models/login')
        login(req, res, '/', function (err, username) {
            req.session.username = username 
            res.locals.username = username
            next()
        })
    }
    app.get('/login', function (req, res) {
        var signinUrl = 'http://login.oa.com/modules/passport/signin.ashx?url={yourWebsite}';
        var homeUrl = req.protocol + "://" + req.get('host') + '/';	
        signinUrl = signinUrl.replace('{yourWebsite}', encodeURIComponent(homeUrl));	
        res.redirect(signinUrl);
    });

    app.get('/logout', function (req, res) {
        req.session.username = null;
        req.flash('success', '登出成功!');
        res.redirect('http://passport.oa.com/modules/passport/signout.ashx');
    });


    //uploadImage for editor
    app.post('/images/upload/', function (req, res) {
        doImgUpload(req, 'upload',  function (args, ret) {
            res.writeHead(ret.editorFile.statusCode, { 'Content-type': 'text/html' });
            res.end(ret.editorFile.img);
        })
    });
    app.post('/images/attachment/', function (req, res) {
        doImgUpload(req, 'attachment',  function (args, ret) {
            res.writeHead(ret.editorFile.statusCode, { 'Content-type': 'text/html' });
            res.end(ret.editorFile.img);
        })
    });

    app.use(function (req, res) { res.render("404"); });

    //permissionCheck
    function checkPermission(req, res, next) {
        var path = req.route.path
        var user = req.session.username || ''
        if (path === '/show/:vid') {
            Cate.getOne({vid: req.params.vid}, function (err, doc ) {
                if (err) { doc = []; } 
                if (doc.private) {
                    var owner = doc.manager + ',' + doc.member 
                    var ownerArr = owner.split(',') || []
                    // user = 'xxx'
                    if (ownerArr.indexOf(user) == -1) {
                        req.flash('error', '权限不够'); 
                        return res.redirect('back');
                    }
                }
                next()
            });
        }else if (path ==='/cate/edit/:id' || path === '/cate/remove/:id' || path === '/menu/update/:id'){
            Cate.getOne({id: req.params.id},function (err, doc ) {
                if (err) { doc = []; } 
                var ownerArr = doc.manager.split(',') || []
                if (ownerArr.indexOf(user) == -1) {
                    if (path.indexOf('menu/update') > -1) {
                        return res.json({error:1, message:'权限不够'})
                    }else {
                        req.flash('error', '权限不够'); 
                        return res.redirect('back');
                    }
                }
                next()
            });
        }else if (path==='/item/add/:pid' || path === '/item/update/:pid' || path === '/item/remove/:pid/:id' || path==='/item/get/:pid/:id'){
            Cate.getOne({id: req.params.pid},function (err, doc ) {
                if (err) { doc = []; } 
                var owner = doc.manager + ',' + doc.member 
                var ownerArr = owner.split(',') || []
                // user = 'x'
                if (ownerArr.indexOf(user) == -1) {
                    return res.json({error:1, message:'权限不够'})
                }
                next()
            });
        }
    }

    function checkLogin(req, res, next) {
        if (!req.session.username) {
            req.flash('error', '未登录!'); 
            return res.redirect('/login');
        }
        next();
    }

    function checkNotLogin(req, res, next) {
        if (req.session.username) {
            req.flash('error', '已登录!'); 
            return res.redirect('back');
        }
        next();
    }
};
