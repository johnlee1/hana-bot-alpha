'use strict';

const Mongoose = require('mongoose');
const Post = require('./posts-model');

const Schema = new Mongoose.Schema({
    uid: {
        type: String,
        unique: true,
        required: true
    },
    queue: {
        type: [Post.schema],
        default: []
    },
    list: {
        type: [Post.schema],
        default: []
    },
});

module.exports = Mongoose.model('User', Schema);
