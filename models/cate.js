var mongodb = require('./db')
var Oid = require('mongodb').ObjectID 
var Cate = {};

module.exports = Cate;

Cate.save = function(data, callback) {
    var date = +new Date();

    data.created = date
    data.updated = date

    mongodb.open(function (err, db) {
        if (err) { return callback(err); }
        db.collection('cate').insert(data, {
            safe: true
        }, function (err) {
            mongodb.close();
            if (err) { return callback(err); }
            callback(null);
        });
    });
};

Cate.getAll = function(callback) {
    mongodb.open(function (err, db) {
        if (err) { return callback(err); }
        db.collection('cate').find().toArray((err, docs) => {
            mongodb.close();
            if (err) { return callback(er) ; }
            callback(null, docs)
        })
    });
};
Cate.getOne = function(query, callback) {
    mongodb.open(function (err, db) {
        if (err) { return callback(err); }
        if (query['id']) {
            query['_id'] = Oid(query['id'])
            delete query.id
        }
        db.collection('cate').findOne(query, function (err, doc) {
            mongodb.close();
            if (err) { return callback(err); }
            callback(null, doc);
        });
    });
};
Cate.update = function(id, data, callback) {
    mongodb.open(function (err, db) {
        if (err) { return callback(err); }

        data.updated = + new Date()

        db.collection('cate').updateOne({
            "_id": Oid(id)
        }, {
            $set: data
        }, function (err) {
            mongodb.close();
            if (err) { return callback(err); }
            callback(null);
        });
    });
};

Cate.remove = function(id, callback) {
    mongodb.open(function (err, db) {
        if (err) { return callback(err); }

        db.collection('cate').findOne({'_id': Oid(id)}, function (err, doc) {
            if (err) { mongodb.close();  return callback(err); }

            db.collection('cate').remove({
                "_id": Oid(id)
            }, { w: 1 }, function (err) {
                mongodb.close();
                if (err) { return callback(err); }
                callback(null, doc);
            });
        })
    });
};

