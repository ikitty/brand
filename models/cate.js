var mongodb = require('./db')

function Cate(name) {
    this.name = name;
}

module.exports = Cate;

//存储一篇文章及其相关信息
Cate.prototype.save = function(callback) {
    var date = new Date();

    var time = {
        date: date,
        year : date.getFullYear(),
        month : date.getFullYear() + "-" + (date.getMonth() + 1),
        day : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate(),
        minute : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes())
    }

    var D = {
        name: this.name,
        time: time
    };

    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        //读取 posts 集合
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
        if (err) {
            return callback(err);
        }
        db.collection('cate', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            collection.find().toArray((err, docs) => {
                mongodb.close();
                if (err) {
                    return callback(er) ;
                }
                callback(null, docs)
            })
        });
    });
};

Cate.prototype.remove = function(name, callback) {
    mongodb.open(function (err, db) {
        if (err) { return callback(err); }

        db.collection('cate', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }

            collection.findOne({
                "name": name
            }, function (err, doc) {
                if (err) {
                    mongodb.close();
                    return callback(err);
                }

                collection.remove({
                    "name": name
                }, { w: 1 }, function (err) {
                    mongodb.close();
                    if (err) {
                        return callback(err);
                    }
                    callback(null);
                });
            });
        });
    });
};

Cate.prototype.update = function(old_name, name,  callback) {
    mongodb.open(function (err, db) {
        if (err) { return callback(err); }
        db.collection('cate', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }

            collection.updateOne({
                "name": old_name
            }, {
                $set: {name: name}
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
