var crypto = require('crypto'),
    fs = require('fs'),
    User = require('../models/user.js'),
    Post = require('../models/post.js'),
    Cate = require('../models/cate.js'),
    formidable = require('formidable'),
    path = require('path');

    
var settings = require('../settings');

module.exports = function(app) {
    app.get('/', function (req, res) {
        return res.redirect('/show/');
    });

    //show FE page
    app.get('/show/:cate?/:id?', function (req, res) {
        Post.getAllByCate(req.params.cate || '', function (err, posts, total) {
            if (posts.length === 0) {
                // no content
                res.writeHead(200, { 'Content-type': 'text/html' });
                res.end('No Content');
                return ;
            }
            var id = req.params.id || posts[0]._id

            if (err) { posts = []; } 
            //{customCate:[{},{}]}
            var ret = {} ;
            posts.forEach(k=>{
                k.customCate && (ret[k.customCate] && ret[k.customCate].push(k) || (ret[k.customCate]=[k]) );
            })
            var showPost = posts.filter(item => item._id == id)
            showPost = showPost[0] || {title: 'not found', cate:'not found'}

            //get cate
            var D = new Cate();
            D.getAll(function (err, docs ) {
                docs = docs || []
                var showCate = docs.filter( k => k.name == showPost.cate)
                var logoImg = showCate.length && showCate[0].img || ''
                res.render('show_index', {
                    title: showPost.title,
                    cate: docs,
                    logoImg: logoImg,
                    menus: ret,
                    post: showPost,
                    success: req.flash('success').toString(),
                    error: req.flash('error').toString()
                });
            });
        });
    });

    //============================
    //=======common img upload
    //============================
    var doImgUpload = function (req, uploadDir, callback) {
        var form = new formidable.IncomingForm();
        form.uploadDir = './tmp'
        form.parse(req, function (err, fields, files) {
            //fields是form提交的字段对象
            if (err) { return console.log('Formidable, form.parse err ', err); }
            for (var item in files) {
                var file = files[item];
                if (!file.name) {
                    callback(fields, '')
                    return  ;
                }
                var type = file.type;
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
                    fs.unlink(file.path, function(){  })
                    callback(fields, result, statusCode );
                }); 
            } 
        });
    }

    //==============================
    //=============Handle Cate 
    //==============================

    app.get('/cate', checkLogin);
    app.get('/cate', function (req, res) {
        var D = new Cate();
        D.getAll(function (err, posts ) {
            if (err) { posts = []; } 
            res.render('cate', {
                title: '品牌管理',
                path: 'cate',
                posts: posts,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });
    app.post('/cate', checkLogin);
    app.post('/cate', function (req, res) {
        doImgUpload(req, 'brand',  function (args, img) {
            var D = new Cate(args.name, img) ;
            D.save(function (err) {
                if (err) {
                    req.flash('error', err); 
                    return res.redirect('/cate');
                }
                req.flash('success', '操作成功!');
                res.redirect('/cate');
            });
        })
    });

    //handle edit cate
    app.get('/edit_cate/:id', checkLogin);
    app.get('/edit_cate/:id', function (req, res) {
        var D = new Cate();
        D.getOne(req.params.id ,function (err, doc ) {
            if (err) { posts = []; } 
            res.render('edit_cate', {
                title: '修改品牌',
                path: 'cate',
                post: doc,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });
    app.post('/edit_cate/:id', checkLogin);
    app.post('/edit_cate/:id', function (req, res) {
        //如果没上传图片，则不会修改图片
        doImgUpload(req, 'brand', function (args, img) {
            var D = new Cate();
            D.update(req.params.id, args.name , img,  function (err) {
                if (err) {
                    req.flash('error', err); 
                    return res.redirect('back');
                }
                req.flash('success', '操作成功!');
                res.redirect('/cate');
            });
        })
    });


    //todo: 删除时删除其类目下的文档
    app.get('/remove_cate/:id', checkLogin);
    app.get('/remove_cate/:id', function (req, res) {
        var D = new Cate();
        var cate = req.params.id ;
        console.log(1);
        D.remove(cate, function (err, doc) {
            if (err) {
                req.flash('error', err); 
                return res.redirect('back');
            }
            Post.removeAllByCate(doc.name, function (err) {
                if (err) {
                    req.flash('error', err); 
                    return res.redirect('back');
                }
                req.flash('success', '操作成功，品牌和对应文档都已删除!');
                res.redirect('/cate');
            });
        });

    });

    //==============================
    //=============Handle Article 
    //==============================

    //postMange
    app.get('/post_manage/:page?', function (req, res) {
        //todo pager
        Post.getPostList( req.params.page || 1, function (err, posts, total, count) {
            if (err) { posts = []; } 

            res.render('post_manage', {
                title: '文章列表',
                path: 'post_manage',
                posts: posts,
                page: req.params.page || 1,
                pageNum: Math.ceil(total/count),
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });

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
                path: 'post',
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
            res.redirect('/post_manage');
        });
    });

    
    //edit single post
    app.get('/edit/:id', checkLogin);
    app.get('/edit/:id', function (req, res) {
        var currentUser = req.session.user;
        Post.edit(req.params.id, function (err, post) {
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
    app.post('/edit/:id', checkLogin);
    app.post('/edit/:id', function (req, res) {
        var currentUser = req.session.user;
        Post.update(currentUser.name, req.params.id, req.body.title, req.body.post, req.body.cate, req.body.custom_cate, function (err) {
            var url = encodeURI('/show/' + req.body.cate + '/' + req.params.id);
            if (err) {
                req.flash('error', err.toString()); 
                return res.redirect(url);
            }
            req.flash('success', '修改成功!');
            res.redirect(url);
        });
    });

    //delete single post
    app.get('/remove/:id', checkLogin);
    app.get('/remove/:id', function (req, res) {
        Post.remove(req.params.id,  function (err) {
            if (err) {
                req.flash('error', err); 
                return res.redirect('back');
            }
            req.flash('success', '删除成功!');
            res.redirect('/post_manage');
        });
    });

    //=========================
    //======== Reg and login
    //=========================
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
                req.session.user = user;
                req.flash('success', '注册成功!');
                res.redirect('/post_manage');
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
            req.session.user = user;
            req.flash('success', '登陆成功!');
            res.redirect('/post_manage/');
        });
    });

    app.get('/logout', checkLogin);
    app.get('/logout', function (req, res) {
        req.session.user = null;
        req.flash('success', '登出成功!');
        res.redirect('/show/');
    });


    //uploadImage for editor
    app.post('/images/upload/', function (req, res) {
        doImgUpload(req, 'upload',  function (args, img, statusCode) {
            res.writeHead(statusCode, { 'Content-type': 'text/html' });
            res.end(img);
        })
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
