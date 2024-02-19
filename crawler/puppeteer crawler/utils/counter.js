const fs = require('fs');

// 讀取 productInfo.json
// const productInfo = fs.readFileSync('../result/productInfo.json', 'utf8');
const productInfo = fs.readFileSync('../result/patchedProductInfo.json', 'utf8');
const productInfoDict = JSON.parse(productInfo);
const statistics = getStatistics(productInfoDict);
console.log(statistics);

// 統計
function getStatistics(productInfoDict) {
  // 遍歷 productInfo.json 中的所有商品
  // 先取得所有 key
  const productMainKeys = Object.keys(productInfoDict);

  // product info key list
  const productInfoKeyList = [
    "amazonUrl", "productName",
    "productModelCode", "productPrice",
    "productShortSpec", "productFeactures",
    "productImageList", "productDetail",
    "productSpec", "productReview"
  ]

  // 初始化統計
  let statistics = {};
  for (const key of productInfoKeyList) {
    statistics[key] = 0;
  }

  // 遍歷所有商品
  for (const product of productMainKeys) {
    for (const key of productInfoKeyList) {
      let isKeyEmpty = false;
      !productInfoDict[product][key] && (isKeyEmpty = true);

      // 如果是 productDetail 或 productSpec，則要檢查是否是空的 dict
      const checkList = ['productDetail', 'productSpec', 'productFeactures'];
      if (checkList.includes(key) && Object.keys(productInfoDict[product][key]).length === 0) {
        isKeyEmpty = true;
      }

      // 如果是 prodictReview，檢查裡面 ratingDistributionList 是否是空的
      if (key === 'productReview' && productInfoDict[product][key].ratingDistributionList.length === 0) {
        isKeyEmpty = true;
      }

      // 如果 key 不是空的，則統計 +1
      if (!isKeyEmpty) {
        statistics[key]++;
      }
    }
  }

  return statistics;
}
