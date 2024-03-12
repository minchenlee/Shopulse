const mongoose = require('mongoose');
const { Schema } = mongoose;
const ShortUniqueId = require('short-unique-id');
const { randomUUID } = new ShortUniqueId({ length: 8 });

const userSchema = new Schema({
  _id: { 
    type: String, 
    default: () => randomUUID()
  },
}, { timestamps: true });

module.exports = userSchema;
