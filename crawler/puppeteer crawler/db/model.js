const mongoose = require('mongoose');
const { productSchema } = require('./schema');

// Create a model
const productModel = mongoose.model('Product', productSchema);

module.exports = {
  productModel: productModel,
}

