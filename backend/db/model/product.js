const mongoose = require('mongoose');
const { productSchema } = require('../schema/product');

// Create a model
const productModel = mongoose.model('Product', productSchema);

module.exports = productModel

