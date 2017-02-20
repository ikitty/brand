var mongodb = require('./db');
var Oid = require('mongodb').ObjectID 

var Post = {}
module.exports = Post;

//存储
Post.save = function(data, callback) {
    var date = + new Date()
    data.created = date;
    data.updated = date;

    mongodb.open(function (err, db) {
        if (err) { return callback(err); }
        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            collection.insert(data, {
                safe: true
            }, function (err, ret) {
                mongodb.close();
                if (err) { return callback(err); }
                callback(null, ret.insertedIds);
            });
        });
    });
};

//后台获取文章列表
// todo : get posts by user or page
Post.getPostList = function( page , callback) {
    mongodb.open(function (err, db) {
        if (err) { return callback(err); }

        var count = 10 ;
        var query = {};
        //if (name) { query.name = name; }

        db.collection('posts').count(query, function (err, total) {
            db.collection('posts').find(query, {
                skip: (page - 1)*count,
                limit: count
            }).sort({
                time: -1
            }).toArray(function (err, docs) {
                mongodb.close();
                if (err) { return callback(err); }
                callback(null, docs, total, count);
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


Post.getOne = function(id, callback) {
    mongodb.open(function (err, db) {
        if (err) { return callback(err); }
        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }

            var query = {_id: Oid(id)}
            collection.update(query, { $inc: {"pv": 1} }, function (err) {
                mongodb.close();
            });

            collection.findOne(query, function (err, doc) {
                mongodb.close();
                if (err) { return callback(err); }
                if (doc) {
                }
                callback(null, doc);
            });
        });
    });
};

Post.update = function(data, callback) {
    mongodb.open(function (err, db) {
        if (err) { return callback(err); }

        data.updated = + new Date()
        query = {_id: Oid(data.id)}
        delete data.id

        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }

            collection.update(query, {
                $set: data
            }, function (err) {
                mongodb.close();
                if (err) { return callback(err); }
                callback(null);
            });
        });
    });
};

Post.remove = function(id,  callback) {
    mongodb.open(function (err, db) {
        if (err) { return callback(err); }
        
        var query = {"_id": Oid(id)}
        db.collection('posts').remove(query, { w: 1 }, function (err) {
            mongodb.close();
            if (err) { return callback(err); }
            callback(null);
        });
    });
};


//remove all by parent id
Post.removeAllByParentId = function(p_id,  callback) {
    mongodb.open(function (err, db) {
        if (err) { return callback(err); }

        var query = {"p_id": p_id }
        db.collection('posts').remove(query, {w:1}, function (err) {
            mongodb.close();
            if (err) { return callback(err); }
            callback(null);
        });
    });
};
