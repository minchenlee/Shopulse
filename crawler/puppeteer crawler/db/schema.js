const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const productReviewSchema = new Schema({
  userName: String,
  reviewTitle: String,
  reviewDate: String,
  rating: String,
  review: String
});

const ratingDistributionSchema = new Schema({
  rating: String,
  count: String
});

const productReviewSummarySchema = new Schema({
  rating: Number,
  reviewCount: Number,
  ratingDistributionList: [ratingDistributionSchema],
  reviewList: [productReviewSchema]
});

const productSchema = new Schema({
  amazonUrl: String,
  productName: String,
  productModelCode: String,
  productPrice: Number,
  productShortSpec: {
    type: Map,
    of: String // Assuming all values in this Map are strings
  },
  productFeatures: {
    type: Map,
    of: String // Adjust the type based on expected values
  },
  productImageList: [String],
  productDetail: {
    type: Map,
    of: String // This can be adjusted if the values are not always strings
  },
  productSpec: {
    type: Map,
    of: String // Or a more specific type/schema if applicable
  },
  productReview: productReviewSummarySchema
});

module.exports = {
  productSchema: productSchema,
}
