/*
#############################
Dependencies
#############################
*/
const fs = require('fs');
const UserAgent = require('user-agents');
const cliProgress = require('cli-progress');
// prevent puppeteer from being detected
const puppeteer = require('puppeteer-extra'); 
const stealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(stealthPlugin())
const { createCursor } = require("ghost-cursor");

// 載入 worker 的動作 function
const { 
    getTextContent, getChildrenTextContent, getModelCodes, 
    getProductPrice, getProductShortSpec, getProductImageList, 
    getReview, getProductDetailAndSpec, addObjectToFile , getRandomUserAgent
  } = require('../utils/actions.js');
const { formatJsonData } = require('../utils/formatting.js');


// worker("https://www.amazon.com/LG-42-Inch-Refresh-AI-Powered-OLED42C2PUA/dp/B09RMFZZPX?ref_=ast_sto_dp&th=1&psc=1", showProgress = false, checkStealth = false, "result/productInfo.json");

async function worker(url, showProgress = false, checkStealth = false, saveTo) {
    // 啟動瀏覽器
    const browser = await puppeteer.launch({
      headless: 'new',
    });  

  // Progress Bar and Performance Timer 啟動
  console.log(`Crawling data from ${url}`);
  const start = performance.now();
  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.rect);
  showProgress && progressBar.start(160, 0);

  // 檢查 stealth 狀態
  if (checkStealth) {
    console.log('Running tests..')
    const page = await browser.newPage()
    const userAgent = new UserAgent({ deviceCategory: 'desktop' });
    await page.setUserAgent(userAgent.toString());
    await page.goto('https://bot.sannysoft.com')
    await page.waitForTimeout(5000)
    await page.screenshot({ path: 'screen_shot/stealth/testresult.png'})
    await browser.close()
    console.log(`All done, check the screenshot. ✨`)
    return;
  }

  // 開啟新分頁
  let page;
  let isBlocked = true;
  while (isBlocked) {
    page = await browser.newPage();
    page.setDefaultTimeout(10000);  // set timeout to 10 seconds
    // await page.setViewport({ width: 2560, height: 1664 });  // 把視窗調整成 Mac Book Air 13" 的大小，用來截圖除錯用
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

    await retry(async () => {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.screenshot({ path: 'screen_shot/stealth/live.png'});
    });

    // check if the page is blocked
    const checkBlock = await page.evaluate(() => {
      return document.querySelector('body').innerText.includes('Sorry, we just need to make sure you\'re not a robot');
    });

    checkBlock ? console.log('Blocked by Amazon!') : console.log('Not blocked by Amazon!');
    isBlocked = checkBlock;
  }

  let productName = '';
  let productModelCode = '';
  let productPrice = '';
  let productShortSpec = '';
  let productFeactures = '';
  let productImageList = [];
  let productReview = {};

  productName = await retry(() => getTextContent(page, '#productTitle'), 3, 'Get product name', url);
  await page.screenshot({ path: 'screen_shot/stealth/live.png'});
  showProgress && progressBar.update(20);

  productModelCode = await retry(() => getModelCodes(productName), 3, 'Get model code', url);
  await page.screenshot({ path: 'screen_shot/stealth/live.png'});
  showProgress && progressBar.update(40);

  productPrice = await retry(() => getProductPrice(page), 3, 'Get product price', url);
  await page.screenshot({ path: 'screen_shot/stealth/live.png'});
  showProgress && progressBar.update(60);

  productShortSpec = await retry(() => getProductShortSpec(page), 3, 'Get product short spec', url);
  await page.screenshot({ path: 'screen_shot/stealth/live.png'});
  showProgress && progressBar.update(80);

  productFeactures = await retry(() => getChildrenTextContent(page, '#feature-bullets > ul', 'li'), 3, 'Get product features', url);
  await page.screenshot({ path: 'screen_shot/stealth/live.png'});
  showProgress && progressBar.update(100);

  productImageList = await retry(() => getProductImageList(page), 3, 'Get product image list', url);
  await page.screenshot({ path: 'screen_shot/stealth/live.png'});
  showProgress && progressBar.update(120);

  productReview = await retry(() => getReview(page), 3, 'Get product review', url);
  await page.screenshot({ path: 'screen_shot/stealth/live.png'});
  showProgress && progressBar.update(140);

  const {productDetail, productSpec} = await retry(() => getProductDetailAndSpec(page, productModelCode), 3, 'Get product detail and spec', url);
  await page.screenshot({ path: 'screen_shot/stealth/live.png'});
  showProgress && progressBar.update(160);

  // format info to json
  let productInfo = {
    "amazonUrl": url,
    "productName": productName,
    "productModelCode": productModelCode,
    "productPrice": productPrice,
    "productShortSpec": productShortSpec,
    "productFeactures": productFeactures,
    "productImageList": productImageList,
    "productDetail": productDetail,
    "productSpec": productSpec,
    "productReview": productReview,
  };

  formatJsonData(productInfo);
  
  // 關閉分頁
  try {
    // await page.close();
    await browser.close();
  } catch (error) {
    console.error("Failed to close the page:", error);
  }

  // save as json file
  console.log('===============================');
  await addObjectToFile(saveTo, productInfo);

  // Progress Bar and Performance Timer 停止
  showProgress && progressBar.stop();
  const end = performance.now();

  // console.log(productInfo);
  console.log(`task completed in ${end - start} ms`);
  // console.log('Stop 90 sec to prevent being detected');
  // await delay(90000);
  console.log('Continue to next task');
};


// retry function
const errorLogPath = 'result/error.json';
async function retry(action, maxAttempts = 3, stepName = '', url = '') {
  let attempts = 0;
  while (attempts < maxAttempts) {
    try {
      return await action();
    } catch (error) {
      attempts++;
      console.log(`${stepName} failed, retrying...`);
      console.error(error);

      if (attempts >= maxAttempts) {
        console.log(`${stepName} failed after ${maxAttempts} attempts: `);

        // read error json first
        let errorLog = {};
        try {
          errorLog = JSON.parse(fs.readFileSync(errorLogPath, 'utf8'));
        } catch (error) {
          console.error('Failed to read error log:', error.message);
        }

        // add error message to error json
        errorLog[url] = error.message;
        fs.writeFileSync(errorLogPath, JSON.stringify(errorLog, null, 2));
      }
    }
  }
}


// 暫停一段時間
function delay(time) {
  return new Promise(function(resolve) { 
      setTimeout(resolve, time)
  });
}




module.exports = worker;
