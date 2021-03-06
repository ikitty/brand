var crypto = require('crypto'),
    fs = require('fs'),
    User = require('../models/user.js'),
    Post = require('../models/post.js'),
    Cate = require('../models/cate.js'),
    formidable = require('formidable'),
    async = require('async'),
    path = require('path');

module.exports = function(app) {
    //getLoginStatus
    app.use((req, res, next) => {
        //get oa login
        res.locals.username = req.session.username || ''
        next()
    });

    //=============IndexList============
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
    //=============ProjectShow============
    app.get('/show/:vid', checkPermission,  function (req, res) {
        Cate.getOne({vid: req.params.vid}, function (err, doc ) {
            if (err) { doc = []; } 
            var user = req.session.username
            if (doc && (doc.manager.indexOf(user) > -1)) {
                doc.isManager = 1
            }
            if (doc && (doc.member.indexOf(user) > -1)) {
                doc.isMember = 1
            }
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

                    //todo in MAC
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
        Cate.getAll(function (err, doc ) {
            if (err) { doc = []; } 
            res.render('cate_list', {
                title: '项目列表',
                path: 'cate_list',
                data: doc,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });

    app.get('/cate/add', checkLogin, function (req, res) {
        res.render('cate', {
            title: '新增项目',
            path: 'cate_add',
            data: {managerArr:[]},
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
                data: doc,
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
    app.post('/item/add/:pid', checkLogin, checkPermission, function (req, res) {
        var data = {
            author: req.session.username,
            last_editor: req.session.username,
            content: req.body.content,
            pid: req.params.pid,
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

    app.post('/item/update/:pid/:id', checkLogin,  checkPermission, function (req, res) {
        console.log(req.body) ;
        var data = {
            last_editor: req.session.username,
            id: req.params.id,
            content: req.body.content
        };
        Post.update(data, function (err) {
            if (err) { return res.json({error:1, message: 'db error: '+ err.message}) }
            res.json({error:0, message: 'ok'})
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



    //check vid duplicating
    app.get('/vid/check/:vid', function (req, res) {
        Cate.getOne({vid: req.params.vid},function (err, doc ) {
            var ret ;
            if (doc && doc.vid) {
                ret = {error:1, message: 'duplicate'}
            }else {
                ret = {error:0, message: 'ok'}
            }
            res.json(ret);
        });
    });

    

    //==============================
    //=============Common
    //==============================
    //handle login and logout using OA API, [login, logout]

    app.get('/reg', function (req, res) {
        res.render('reg', {
            title: '注册',
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });

    app.post('/reg', checkNotLogin, function (req, res) {
        var name = req.body.name,
        password = req.body.password,
        password_re = req.body['password-repeat'];
        if (password_re != password) {
            req.flash('error', '两次输入的密码不一致!'); 
            return res.redirect('/reg');
        }
        var md5 = crypto.createHash('md5'),
            password = md5.update(req.body.password).digest('hex');
        var newUser = new User({
            name: req.body.name,
            password: password,
            email: req.body.email
        });
        User.get(newUser.name, function (err, user) {
            if (user) {
                req.flash('error', '用户已存在!');
                return res.redirect('/reg');
            }
            newUser.save(function (err, user) {
                if (err) {
                    req.flash('error', err);
                    return res.redirect('/reg');
                }
                req.session.username = user.name;
                req.flash('success', '注册成功!');
                res.redirect('/');
            });
        });
    });

    app.get('/login', function (req, res) {
        res.render('login', {
            title: '登录',
            data: {},
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        }); 
    });

    app.post('/login', function (req, res) {
        var md5 = crypto.createHash('md5'),
        password = md5.update(req.body.password).digest('hex');
        User.get(req.body.name, function (err, user) {
            if (!user) {
                req.flash('error', '用户不存在!'); 
                return res.redirect('/login');
            }
            if (user.password != password) {
                req.flash('error', '密码错误!'); 
                return res.redirect('/login');
            }
            req.session.username = user.name;
            req.flash('success', '登陆成功!');
            res.redirect('/');
        });
    });

    //app.get('/logout', checkLogin);
    app.get('/logout', function (req, res) {
        req.session.username = null;
        req.flash('success', '登出成功!');
        res.redirect('/');
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
        }else if (path==='/item/add/:pid' || path.indexOf('/item/update/')>-1|| path === '/item/remove/:pid/:id' || path==='/item/get/:pid/:id'){
            //todo: should get pid from Posts table, and query Cate table by this pid
            Cate.getOne({id: req.params.pid},function (err, doc ) {
                if (err) { doc = []; } 
                var owner = doc.manager + ',' + doc.member 
                var ownerArr = owner.split(',') || []
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
