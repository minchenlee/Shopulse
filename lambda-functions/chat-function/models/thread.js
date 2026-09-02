const mongoose = require('mongoose');
const { Schema } = mongoose;

// Define the schema for a chat thread without a User collection reference
const threadSchema = new Schema({
  userId: { type: String, ref: 'User', required: true },
  threadId: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Create and export the model
const ThreadModel = mongoose.model('Thread', threadSchema);
module.exports = ThreadModel;