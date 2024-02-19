const fs = require('fs');
require('dotenv').config({path: '../.env'})
const mongoose = require('mongoose');
const { productModel } = require('./model');

const filePath = '../result/formattedProductInfo.json';

try {
  main();
} catch (error) {
  console.log(error);
}

async function main() {
  try {
    const jsonData = readJsonFile(filePath);
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("Connected to MongoDB.");

    // Save all products to MongoDB
    const productInfoJsonList = Object.values(jsonData);
    for (const product of productInfoJsonList) {
      const newProduct = new productModel(product);
      await newProduct.save();
    }
    console.log("All products have been saved to MongoDB.");

    // Optional: Close the mongoose connection
    mongoose.connection.close();
  } catch (error) {
    console.error("Error during database operation:", error);
  }
}

async function deleteAllProducts() {
  try {
    await productModel.deleteMany();
    console.log("All products have been deleted.");
  } catch (error) {
    console.error("Error deleting all products:", error);
  }
}


// Improved function to read json file
function readJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading the JSON file:", error);
    return [];
  }
}

