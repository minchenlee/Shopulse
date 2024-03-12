const mongoose = require('mongoose');
const userSchema = require('../schema/user');

// Create a model
const UserModel = mongoose.model('User', userSchema);

module.exports = UserModel

