/*
#############################
Formatting Functions
#############################
*/
// 移除字串中的多餘空白
function removeTwoWhiteSpaces(str) {
  return str.replace(/\s{2,}/g, '');
}

// 把 list 轉成 dict
function convertListToDict(list) {
  return Object.fromEntries(list.map((item) => {
    return [item.split(':')[0], item.split(':')[1]];
  }));
}


// product short spec formatting
function formatProductShortSpec(shortSpecList) {

  shortSpecList = shortSpecList.map((item) => {
    item = item.replace(/\t\n/g, '\t');
    item = item.replace(/\t/g, ':');
    if (item.includes('\n')) {
      const itemsList = item.split('\n');
      item = itemsList[0]
    }
    return item
  });
  
  return convertListToDict(shortSpecList);
}

// product feactures formatting
function formatProductFeactures(featuresList, productName) {
  const brandName = productName.split(' ')[0];

  featuresList = featuresList.map((item) => {
    // Sony 特殊處理
    if (brandName === 'Sony') {
      item = item.replace('– ', ':');
      item = item.replace('- ', ':');
    }

    return item
  });

  let featuresDict = convertListToDict(featuresList);
  // 一個個檢查 dict 裡的 key，如果有包含 "amazon" 就刪掉
  for (const key in featuresDict) {
    if (key.toLowerCase().includes('amazon')) {
      delete featuresDict[key];
    }
  }

  return featuresDict;
}


// product detail formatting
function formatProductDetail(detailList) {
  // 一個個讀出 item，把 "– " 換成 ":"
  detailList = detailList.map((item) => {
    item = item.replace('– ', ':');
    item = item.replace('- ', ':');
    item = item.split('\n')[0];
    return item
  });

  let detailDict = convertListToDict(detailList);
  // 一個個檢查 dict 裡的 key，如果有包含 "walmart" 就刪掉
  for (const key in detailDict) {
    if (key.toLowerCase().includes('walmart')) {
      delete detailDict[key];
    }
  }

  return detailDict;
}


// product spec formatting
function formatProductSpec(specList) {
  // 把 specList 兩兩一組轉成 dict
  // let specDict = {};
  // for (let i = 0; i < specList.length; i += 2) {
  //   specDict[specList[i]] = specList[i + 1];
  // }
  return specList;
}



// 對 JSON data 做 formatting
function formatJsonData(data) {
  for (const key in data) {
    // productName 處理
    if (key === 'productName') {
      data[key] = removeTwoWhiteSpaces(data[key]);
    }

    // // productShortSpec 處理
    // if (key === 'productShortSpec') {
    //   data[key] = formatProductShortSpec(data[key]);
    // }

    // // productFeatures 處理
    // if (key === 'productFeactures') {
    //   data[key] = formatProductFeactures(data[key], data['productName']);
    // }

    // productDetail 處理
    if (key === 'productDetail') {
      data[key] = formatProductDetail(data[key]);
    }

    // productSpec 處理
    if (key === 'productSpec') {
      data[key] = formatProductSpec(data[key]);
    }
  }
}


module.exports = {
  formatJsonData: formatJsonData,
  formatProductFeactures: formatProductFeactures,
  formatProductShortSpec: formatProductShortSpec,
  formatProductDetail: formatProductDetail,
  formatProductSpec: formatProductSpec,
  removeTwoWhiteSpaces: removeTwoWhiteSpaces,
  convertListToDict: convertListToDict
}
