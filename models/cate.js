var mongodb = require('./db')
var Oid = require('mongodb').ObjectID 

function Cate(name, img) {
    this.name = name;
    this.img = img;
}

module.exports = Cate;

Cate.prototype.save = function(callback) {
    var date = new Date();
    var time = {
        date: +date,
        day : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate(),
        minute : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes())
    }

    var D = {
        name: this.name,
        time: time,
        img: this.img
    };

    mongodb.open(function (err, db) {
        if (err) { return callback(err); }
        db.collection('cate', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            collection.insert(D, {
                safe: true
            }, function (err) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
        });
    });
};

Cate.prototype.getAll = function(callback) {
    mongodb.open(function (err, db) {
        if (err) { return callback(err); }
        db.collection('cate', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            collection.find().toArray((err, docs) => {
                mongodb.close();
                if (err) { return callback(er) ; }
                callback(null, docs)
            })
        });
    });
};
Cate.prototype.getOne = function(id, callback) {
    mongodb.open(function (err, db) {
        if (err) { return callback(err); }
        db.collection('cate', function (err, collection) {
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
Cate.prototype.update = function(id, name, img,  callback) {
    mongodb.open(function (err, db) {
        if (err) { return callback(err); }
        db.collection('cate', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            var modify = {}
            modify.name = name 
            img && ( modify.img = img )

            collection.updateOne({
                "_id": Oid(id)
            }, {
                $set: modify
            }, function (err) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
        });
    });
};

Cate.prototype.remove = function(id, callback) {
    mongodb.open(function (err, db) {
        if (err) { return callback(err); }

        db.collection('cate', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }

            collection.remove({
                "_id": Oid(id)
            }, { w: 1 }, function (err) {
                mongodb.close();
                if (err) { return callback(err); }
                callback(null);
            });
        });
    });
};

