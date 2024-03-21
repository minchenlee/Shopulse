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
  productFeatures: String,
  productImageList: [String],
  productDetail: String,
  productSpec: {
    type: Map,
    of: Schema.Types.Mixed
  },
  productReview: productReviewSummarySchema
});

module.exports = productSchema;
