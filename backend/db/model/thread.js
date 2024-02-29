const mongoose = require('mongoose');
const threadSchema = require('../schema/thread');

// Create a model
const ThreadModel = mongoose.model('Thread', threadSchema);

module.exports = ThreadModel
