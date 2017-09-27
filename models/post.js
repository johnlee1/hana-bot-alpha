'use strict';

const Mongoose = require('mongoose');

const Schema = new Mongoose.Schema({
    uid: {
        type: String,
        required: true
    },
    prayer: {
        type: String, 
        required: true
    },
    author: {
        type: Mongoose.Schema.ObjectId, 
        ref: 'User',
    },
    create_date: {
        type: Date,
        default: Date.now
    },
});

module.exports = Mongoose.model('Post', Schema);
