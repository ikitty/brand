var mongodb = require('./db');
var Oid = require('mongodb').ObjectID 

function Post(name,  title, cate, post, customCate) {
    this.name = name;
    this.title = title;
    this.cate = cate;
    this.customCate = customCate;
    this.post = post;
}

module.exports = Post;

//存储
Post.prototype.save = function(callback) {
    var date = new Date();
    var time = {
        date: +date,
        day : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate(),
        minute : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes())
    }
    var post = {
        name: this.name,
        cate: this.cate,
        customCate: this.customCate,
        title:this.title,
        post: this.post,
        time: time,
        pv: 0
    };
    mongodb.open(function (err, db) {
        if (err) { return callback(err); }
        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            collection.insert(post, {
                safe: true
            }, function (err) {
                mongodb.close();
                if (err) { return callback(err); }
                callback(null);
            });
        });
    });
};

//后台获取文章列表
// todo : get posts by user or page
Post.getPostList = function( page , callback) {
    mongodb.open(function (err, db) {
        if (err) { return callback(err); }

        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            var query = {};
            //if (name) { query.name = name; }

            collection.count(query, function (err, total) {
                collection.find(query, {
                    skip: (page - 1)*10,
                    limit: 10
                }).sort({
                    time: -1
                }).toArray(function (err, docs) {
                    mongodb.close();
                    if (err) { return callback(err); }

                    callback(null, docs, total);
                });
            });
        });
    });
};
//get All by cate
Post.getAllByCate = function(cate, callback) {
    mongodb.open(function (err, db) {
        if (err) { return callback(err); }
        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            var query = {};
            if (cate) { query.cate = cate; }
            collection.find(query).sort({
                time: -1
            }).toArray(function (err, docs) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                callback(null, docs);
            });
        });
    });
};

//一次获取十篇文章
Post.getTen = function(name, page, callback) {
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            var query = {};
            if (name) {
                query.name = name;
            }
            //使用 count 返回特定查询的文档数 total
            collection.count(query, function (err, total) {
                //根据 query 对象查询，并跳过前 (page-1)*10 个结果，返回之后的 10 个结果
                collection.find(query, {
                    skip: (page - 1)*10,
                    limit: 10
                }).sort({
                    time: -1
                }).toArray(function (err, docs) {
                    mongodb.close();
                    if (err) {
                        return callback(err);
                    }
                    callback(null, docs, total);
                });
            });
        });
    });
};


Post.edit = function(id, callback) {
    mongodb.open(function (err, db) {
        if (err) { return callback(err); }
        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }

            collection.findOne({
                "_id": Oid(id)
            }, function (err, doc) {
                mongodb.close();
                if (err) { return callback(err); }
                callback(null, doc);
            });
        });
    });
};

//更新一篇文章
Post.update = function(name, id, newTitle, post,cate, customCate,  callback) {
    mongodb.open(function (err, db) {
        if (err) { return callback(err); }

        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            var query = {"_id": Oid(id), "name": name};
            //todo 如果是管理员，则不需要name鉴定

            collection.update(query, {
                $set: {post: post, title: newTitle, cate: cate, customCate: customCate}
            }, function (err) {
                mongodb.close();
                if (err) { return callback(err); }
                callback(null);
            });
        });
    });
};

//删除一篇文章
Post.remove = function(id,  callback) {
    mongodb.open(function (err, db) {
        if (err) { return callback(err); }
        
        db.collection('posts', function (err, collection) {
            if (err) { mongodb.close(); return callback(err); }
            
            var query = {"_id": Oid(id)}
            collection.findOne(query, function (err, doc) {
                if (err) { mongodb.close(); return callback(err); }

                collection.remove(query, {
                    w: 1
                }, function (err) {
                    mongodb.close();
                    if (err) { return callback(err); }
                    callback(null);
                });
            });
        });
    });
};





//============
//todo getUpdate pv
Post.getOne = function(name, day, title, callback) {
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            collection.findOne({
                "name": name,
                "time.day": day,
                "title": title
            }, function (err, doc) {
                if (err) {
                    mongodb.close();
                    return callback(err);
                }
                if (doc) {
                    collection.update({
                        "name": name,
                        "time.day": day,
                        "title": title
                    }, {
                        $inc: {"pv": 1}
                    }, function (err) {
                        mongodb.close();
                        if (err) {
                            return callback(err);
                        }
                    });
                    callback(null, doc);
                }
            });
        });
    });
};
