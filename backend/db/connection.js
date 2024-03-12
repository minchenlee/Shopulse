const mongoose = require('mongoose');

async function dbConnection() {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URL);
    // console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`MongoDB Connected`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    // process.exit(1); // Exit application on error
  }
};

module.exports = dbConnection;
