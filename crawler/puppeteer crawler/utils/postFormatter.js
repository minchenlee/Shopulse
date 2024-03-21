const fs = require('fs');
const filePath = '../result/patchedProductInfo.json';
const savingFilePath = '../result/0321formattedProductInfo.json';


try {
  main();
} catch (error) {
  console.log(error);
}


// main
function main(){
  // 讀取 json file
  const jsonData = readJsonFile(filePath);
  const mainKeysList = Object.keys(jsonData);
  for (const mainKey of mainKeysList) {
    const productInfo = jsonData[mainKey];
    productInfo['productPrice'] = formatProductPrice(productInfo['productPrice']);
    productInfo['productShortSpec'] = formatProductShortSpec(productInfo['productShortSpec']);
    productInfo['productFeatures'] = formatProductFeatures(productInfo['productFeatures']);
    productInfo['productDetail'] = formatProductDetail(productInfo['productDetail']);
    productInfo['productReview'] = formatProductReview(productInfo['productReview']);
    productInfo['productSpec'] = formatProductSpec(productInfo['productSpec']);
  }

  // 存檔
  saveJsonFile(savingFilePath, jsonData);
}


// price formatting
function formatProductPrice(price) {
  // 去除千位分割符號，1,676.99 => 1676.99
  price = price.replace(/,/g, '');
  return parseFloat(price);
}


// short spec formatting
function formatProductShortSpec(shortSpec) {
  shortSpec['Screen Size'] = Math.round(parseFloat(shortSpec['Screen Size'].replace(' Inches', ''))) + ' Inches';
  return shortSpec;
}


// spec formatting
function formatProductSpec(spec) {
  spec['Screen Size'] = Math.round(parseFloat(spec['Screen Size'].replace(/[^\d.]/g, '')));
  return spec;
}


// features formatting
function formatProductFeatures(features) {
  const keysList = Object.keys(features);
  for (const key of keysList) {
    // 如果 key 包含 '.' 把 '.' 換成 ','
    if (key.includes('.')) {
      const newKey = key.replaceAll('.', ',');
      features[newKey] = features[key];
      delete features[key];
    }
  }
  return features;
}


// detail formatting
function formatProductDetail(detail) {
  const keysList = Object.keys(detail);
  for (const key of keysList) {
    // 如果 key 包含 '.' 把 '.' 換成 ','
    if (key.includes('.')) {
      const newKey = key.replaceAll('.', ',');
      detail[newKey] = detail[key];
      delete detail[key];
    }
  }
  return detail;
}


// review formatting
function formatProductReview(review) {
  review['rating'] = parseFloat(review['rating']);

  // 去除千位分割符號，並轉成數字
  review['reviewCount'] = parseInt(review['reviewCount'].replace(/,/g, ''));
  return review;
}


// 讀取 json file
function readJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading the JSON file:", error);
    return [];
  }
}

function saveJsonFile(savingFilePath, jsonData) {
  try {
    fs.writeFileSync(savingFilePath, JSON.stringify(jsonData, null, 2));
    console.log("File has been saved.");
  } catch (error) {
    console.error("Error writing the JSON file:", error);
  }
}
