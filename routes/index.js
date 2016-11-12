var crypto = require('crypto'),
    fs = require('fs'),
    User = require('../models/user.js'),
    Post = require('../models/post.js'),
    Cate = require('../models/cate.js'),
    formidable = require('formidable'),
    path = require('path');

    
var settings = require('../settings');

module.exports = function(app) {
    //show FE page
    app.get('/show/:cate?/:id?', function (req, res) {
        Post.getAllByCate(req.params.cate || '', function (err, posts, total) {
            if (posts.length === 0) {
                return res.redirect('back');
            }
            var id = req.params.id || posts[0]._id

            if (err) { posts = []; } 
            var ret = {} ;
            posts.forEach(k=>{
                k.customCate && (ret[k.customCate] && ret[k.customCate].push(k) || (ret[k.customCate]=[k]) );
            })
            var showPost = posts.filter(item => item._id == id)
            showPost = showPost[0] || {title: 'not found', cate:'not found'}

            //get cate
            var D = new Cate();
            D.getAll(function (err, docs ) {
                docs = (docs||[]).map(k=>k.name);
                res.render('show_index', {
                    title: showPost.title,
                    cate: docs,
                    menus: ret,
                    post: showPost,
                    success: req.flash('success').toString(),
                    error: req.flash('error').toString()
                });
            });
        });
    });

    app.get('/', function (req, res) {
        return res.redirect('/show/');
    });

    //postMange
    app.get('/post_manage', function (req, res) {
        Post.getPostList( 1, function (err, posts, total) {
            if (err) {
                posts = [];
            } 
            res.render('post_manage', {
                title: '文章列表',
                posts: posts,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });

    app.get('/reg', checkNotLogin);
    app.get('/reg', function (req, res) {
        res.render('reg', {
            title: '注册',
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });

    app.post('/reg', checkNotLogin);
    app.post('/reg', function (req, res) {
        var name = req.body.name,
        password = req.body.password,
        password_re = req.body['password-repeat'];
        //检验用户两次输入的密码是否一致
        if (password_re != password) {
            req.flash('error', '两次输入的密码不一致!'); 
            return res.redirect('/reg');//返回主册页
        }
        //生成密码的 md5 值
        var md5 = crypto.createHash('md5'),
            password = md5.update(req.body.password).digest('hex');
        var newUser = new User({
            name: req.body.name,
            password: password,
            email: req.body.email
        });
        //检查用户名是否已经存在 
        User.get(newUser.name, function (err, user) {
            if (user) {
                req.flash('error', '用户已存在!');
                return res.redirect('/reg');//返回注册页
            }
            //如果不存在则新增用户
            newUser.save(function (err, user) {
                if (err) {
                    req.flash('error', err);
                    return res.redirect('/reg');//注册失败返回主册页
                }
                req.session.user = user;//用户信息存入 session
                req.flash('success', '注册成功!');
                res.redirect('/');//注册成功后返回主页
            });
        });
    });

    app.get('/login', checkNotLogin);
    app.get('/login', function (req, res) {
        res.render('login', {
            title: '登录',
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        }); 
    });

    app.post('/login', checkNotLogin);
    app.post('/login', function (req, res) {
        //生成密码的 md5 值
        var md5 = crypto.createHash('md5'),
        password = md5.update(req.body.password).digest('hex');
        //检查用户是否存在
        User.get(req.body.name, function (err, user) {
            if (!user) {
                req.flash('error', '用户不存在!'); 
                return res.redirect('/login');//用户不存在则跳转到登录页
            }
            if (user.password != password) {
                req.flash('error', '密码错误!'); 
                return res.redirect('/login');
            }
            //用户名密码都匹配后，将用户信息存入 session
            req.session.user = user;
            req.flash('success', '登陆成功!');
            res.redirect('/');//登陆成功后跳转到主页
        });
    });

    //handle cate
    app.get('/cate', checkLogin);
    app.get('/cate', function (req, res) {
        var D = new Cate();
        D.getAll(function (err, posts ) {
            if (err) { posts = []; } 
            res.render('cate', {
                title: '品牌管理',
                posts: posts,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });

    app.get('/remove_cate/:id', checkLogin);
    app.get('/remove_cate/:id', function (req, res) {
        var D = new Cate();
        D.remove(req.params.id, function (err) {
            if (err) {
                req.flash('error', err); 
                return res.redirect('back');
            }
            req.flash('success', '操作成功!');
            res.redirect('/cate');
        });
    });
    app.get('/edit_cate/:id/:name', checkLogin);
    app.get('/edit_cate/:id/:name', function (req, res) {
        var D = new Cate();
        D.update(req.params.id, req.params.name, function (err) {
            if (err) {
                req.flash('error', err); 
                return res.redirect('back');
            }
            req.flash('success', '操作成功!');
            res.redirect('/cate');
        });
    });

    app.post('/cate', checkLogin);
    app.post('/cate', function (req, res) {
        var currentUser = req.session.user,
            name = req.body.name ,
            D = new Cate(name) ;

        D.save(function (err) {
            if (err) {
                req.flash('error', err); 
                return res.redirect('/');
            }
            req.flash('success', '操作成功!');
            res.redirect('/cate');
        });
    });

    //article
    app.get('/post', checkLogin);
    app.get('/post', function (req, res) {
        var D = new Cate();
        D.getAll(function (err, docs ) {
            if (err) { 
                docs = [];
            } else {
                docs = docs.map(k=>k.name);
            }
            res.render('post', {
                title: '新增文档',
                cate: docs,
                customCate: settings.customCate || [],
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });
    app.post('/post', checkLogin);
    app.post('/post', function (req, res) {
        var currentUser = req.session.user,
            post = new Post(currentUser.name,  req.body.title, req.body.cate, req.body.post, req.body.custom_cate);
            post.save(function (err) {
            if (err) {
                req.flash('error', err); 
                return res.redirect('/');
            }
            req.flash('success', '发布成功!');
            res.redirect('/');
        });
    });

    app.get('/logout', checkLogin);
    app.get('/logout', function (req, res) {
        req.session.user = null;
        req.flash('success', '登出成功!');
        res.redirect('/show/');
    });

    
    //edit single post
    app.get('/edit/:name/:day/:title', checkLogin);
    app.get('/edit/:name/:day/:title', function (req, res) {
        var currentUser = req.session.user;
        Post.edit(req.params.name, req.params.day, req.params.title, function (err, post) {
            if (err) {
                req.flash('error', err); 
                return res.redirect('back');
            }
            //get All cate
            var D = new Cate();
            D.getAll(function (err, docs ) {
                docs = (docs||[]).map(k=>k.name);
                res.render('edit', {
                    title: '编辑',
                    post: post,
                    cate: docs,
                    customCate: settings.customCate || [],
                    user: req.session.user,
                    success: req.flash('success').toString(),
                    error: req.flash('error').toString()
                });
            });
        });
    });
    app.post('/edit/:name/:day/:title', checkLogin);
    app.post('/edit/:name/:day/:title', function (req, res) {
        var currentUser = req.session.user;
        Post.update(currentUser.name, req.params.day, req.params.title, req.body.title, req.body.post, req.body.cate, req.body.custom_cate, function (err) {
            var url = encodeURI('/u/' + req.params.name + '/' + req.params.day + '/' + req.body.title);
            if (err) {
                req.flash('error', err.toString()); 
                return res.redirect(url);
            }
            req.flash('success', '修改成功!');
            res.redirect(url);
        });
    });

    //delete single post
    app.get('/remove/:name/:day/:title', checkLogin);
    app.get('/remove/:name/:day/:title', function (req, res) {
        Post.remove(req.params.name, req.params.day, req.params.title, function (err) {
            if (err) {
                req.flash('error', err); 
                return res.redirect('back');
            }
            req.flash('success', '删除成功!');
            res.redirect('/post_manage');
        });
    });


    //uploadImage for editor
    app.post('/images/upload/', function (req, res) {
        var form = new formidable.IncomingForm();
        form.parse(req, function (err, fields, files) {
            if (err) { return console.log('formidable, form.parse err', err); }
            for (var item in files) {
                var file = files[item];
                var tempfilepath = file.path;
                var type = file.type;
                var filename = file.name;
                var extname = filename.lastIndexOf('.') >= 0
                                ? filename.slice(filename.lastIndexOf('.') - filename.length)
                                : '';
                var d = new Date();
                var dArr = [d.getFullYear(), d.getMonth()+1, d.getDate(),d.getHours(),d.getMinutes()];
                filename = dArr.join('')+ '-'+ (Math.random()*10000 |0)  + extname;

                var filenewpath = path.join(process.cwd(), 'public/images/upload/' + filename) ;
                fs.rename(tempfilepath, filenewpath, function (err) {
                    var result = '';
                    if (err) {
                        result = 'error|save error';
                    } else {
                        result = '/images/upload/' + filename;
                    }
                    res.writeHead(200, { 'Content-type': 'text/html' });
                    res.end(result);
                }); 
            } 
        });
    });

    app.use(function (req, res) { res.render("404"); });

    function checkLogin(req, res, next) {
        if (!req.session.user) {
            req.flash('error', '未登录!'); 
            return res.redirect('/login');
        }
        next();
    }

    function checkNotLogin(req, res, next) {
        if (req.session.user) {
            req.flash('error', '已登录!'); 
            return res.redirect('back');
        }
        next();
    }
};
