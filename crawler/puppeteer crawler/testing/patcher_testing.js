const fs = require('fs');
const UserAgent = require('user-agents');
const cliProgress = require('cli-progress');
// prevent puppeteer from being detected
const puppeteer = require('puppeteer-extra'); 
const stealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(stealthPlugin())
const { createCursor } = require("ghost-cursor");
const warmatURL = "https://www.walmart.com/search?q="

// 載入 worker 的動作 function
const { 
  getTextContent, getChildrenTextContent, 
  getModelCodes, getProductPrice, 
  getProductShortSpec, getProductImageList, 
  getReview, getProductDetailAndSpec, 
  getProductDetail, getProductSpec,
  addObjectToFile , getRandomUserAgent,
  checkBlocked
} = require('../utils/actions.js');
const { formatJsonData, formatProductDetail } = require('../utils/formatting.js');



// 讀取 productInfo.json
const productInfo = fs.readFileSync('../result/productInfo.json', 'utf8');
const productInfoDict = JSON.parse(productInfo);

patcher(productInfoDict);


// patcher
async function patcher(productInfoDict) {
  // 先取得所有 main key
  const productMainKeys = Object.keys(productInfoDict);

  // product info key list
  const productInfoKeyList = [
    "amazonUrl", "productName",
    "productModelCode", "productPrice",
    "productShortSpec", "productFeactures",
    "productImageList", "productDetail",
    "productSpec", "productReview"
  ]

  let totalEmptyKeyCount = 0;
  for (const mainKey of productMainKeys) {
    // 用來紀錄有哪些 key 是空的
    let missingKeyList = [];

    // 一一檢查是否有空的 key，記錄到 missingKeyList 之中
    for (const key of productInfoKeyList) {
      let isKeyEmpty = false;
      !productInfoDict[mainKey][key] && (isKeyEmpty = true);

      // 如果是 productDetail 或 productSpec，則要檢查是否是空的 dict
      const checkList = ['productDetail', 'productSpec'];
      if (checkList.includes(key) && Object.keys(productInfoDict[mainKey][key]).length === 0) {
        isKeyEmpty = true;
      }

      // 如果是 prodictReview，檢查裡面 ratingDistributionList 是否是空的
      if (key === 'productReview' && productInfoDict[mainKey][key].ratingDistributionList.length === 0) {
        isKeyEmpty = true;
      }

      if (isKeyEmpty) {
        console.log("===================================");
        console.log(`${mainKey}`);
        console.log(`Missing key: ${key}`);
        console.log("Start patching...");
        missingKeyList.push(key);
        totalEmptyKeyCount++;

        // 啟動瀏覽器
        const browser = await puppeteer.launch({
          headless: 'new',
        });

        // 前往商品頁面
        const page = await browser.newPage();
        page.setDefaultTimeout(10000);  // set timeout to 10 seconds
        //Randomize viewport size
        await page.setViewport({
          width: 1920 + Math.floor(Math.random() * 300),
          height: 1200 + Math.floor(Math.random() * 300),
          deviceScaleFactor: 1,
          hasTouch: false,
          isLandscape: false,
          isMobile: false,
        });
        const userAgent = new UserAgent({ deviceCategory: 'desktop' });
        await page.setUserAgent(userAgent.toString());

        // patch missing key
        await patchMissingKey(page, mainKey, key, productInfoDict);
        await browser.close();
      }
    }
  }
  // if (missingKeyList.length > 0) {
  //   console.log('===============================');
  //   console.log(`${mainKey} \n has missing key: \n${missingKeyList}`);
  // }

  console.log('Patching completed!');
  console.log(`Total empty key: ${totalEmptyKeyCount}`); 
}


// save the patched data
function savePatchedData(productInfoDict) {
  const patchedData = JSON.stringify(productInfoDict, null, 2);
  try {
    fs.writeFileSync('../result/patchedProductInfo.json', patchedData);
    // console.log('Updated data has been saved to result/patchedProductInfo.json');
  } catch (error) {
    console.error(error);
  }
}


// Function to patch missing key
async function patchMissingKey(page, mainKey, key, productInfoDict) {
  let retryCount = 0;
  const productModelCode = productInfoDict[mainKey]['productModelCode'];

  while (retryCount < 3) {
    let isBlocked = true;
    let retryCount = 0;
    let isChanged = false;

    try {
      while (isBlocked && retryCount < 3) {
        // console.log(`Patching ${key}...`);
        if (key === 'productPrice') {
          await page.goto(mainKey, { waitUntil: 'domcontentloaded' });
          isBlocked = await checkBlocked(page);

          if (isBlocked) {
            continue;
          }
          productInfoDict[mainKey][key] = await getProductPrice(page);
          isChanged = true;
        }
        
        if (key === 'productImageList') {
          await page.goto(mainKey, { waitUntil: 'domcontentloaded' });
          isBlocked = await checkBlocked(page);

          if (isBlocked) {
            continue;
          }
          const result = await getProductImageList(page);
          console.log(result);

          productInfoDict[mainKey][key] = result;
          isChanged = true;
        }
        
        if (key === 'productReview') {
          await page.goto(mainKey, { waitUntil: 'domcontentloaded' });
          isBlocked = await checkBlocked(page);

          if (isBlocked) {
            continue;
          }

          const result = await getReview(page, debug = false);
          console.log(result);
          productInfoDict[mainKey][key] = result;
          isChanged = true;
        }

        if (key === 'productDetail') {
          break;
          // 使用 product features 來作為 product detail
          productInfoDict[mainKey][key] = productInfoDict[mainKey]['productFeactures'];
          isChanged = true;

          // await page.goto(warmatURL + productModelCode, { waitUntil: 'domcontentloaded' });
          // isBlocked = await checkBlocked(page);
          
          // if (isBlocked) {
          //   continue;
          // }
          // const result = await getProductDetail(page);
          // console.log(result);
          // productInfoDict[mainKey][key] = result;
          // productInfoDict[mainKey][key] = formatProductDetail(productInfoDict[mainKey][key]);
          // isChanged = true;
        }

        if (key === 'productSpec') {
          await page.goto(warmatURL + productModelCode, { waitUntil: 'domcontentloaded' });
          isBlocked = await checkBlocked(page);

          if (isBlocked) {
            continue;
          }
          productInfoDict[mainKey][key] = await getProductSpec(page);
          isChanged = true;
        }
      }

      isChanged && savePatchedData(productInfoDict);
      break;

    } catch (error) {
      console.log(`Can not get the ${key}, retrying...`);
      console.error(error);
      await page.screenshot({ path: '../screen_shot/patcher/live.png' });
      retryCount++;
    }
  }
}

