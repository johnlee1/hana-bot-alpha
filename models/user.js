'use strict';

const Mongoose = require('mongoose');

const Schema = new Mongoose.Schema({
    uid: {
        type: String,
        unique: true,
        required: true
    },
    name: {
        type: String,
    },
    queue: {
        type: [{ type: Mongoose.Schema.ObjectId, ref: 'Post' }],
        default: []
    },
    list: {
        type: [{ type: Mongoose.Schema.ObjectId, ref: 'Post' }],
        default: []
    },
});

module.exports = Mongoose.model('User', Schema);
