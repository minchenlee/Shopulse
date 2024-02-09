const fs = require('fs');
const UserAgent = require('user-agents');
const {resolve} = require('path');
const puppeteer = require('puppeteer-extra');
const { createCursor } = require("ghost-cursor");
const warmatURL = "https://www.walmart.com/search?q="

// prevent puppeteer from being detected
const stealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(stealthPlugin())


// Amazon 取得商品 model code
function getModelCodes(description, debug = false) {
  // 用來找出 model code 的 regex pattern
  const pattern = /\b([A-Z0-9]+[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)?)\b/g;

  // 用來存放找到的 model code
  let modelCodesCandidate = [];
  let match;

  // 
  while ((match = pattern.exec(description)) !== null) {
    // 除錯用 output
    debug && console.log(match)

    // 如果 model code 長度大於 2 且有數字，就加入 modelCodesCandidate list 
    if (match[1].length > 2 && /[0-9]/.test(match[1])) {
      modelCodesCandidate.push(match[1]);
    }
  }

  // 假定最後一個 model code 是正確的
  return modelCodesCandidate.length > 0 ? modelCodesCandidate[modelCodesCandidate.length - 1] : null;
}


// Amazon 取得商品價格
async function getProductPrice(page, debug = false) {
  // debug && console.log('Start to get product price...');
  let prodcutPrice = '';
  let isSuccess = false;

  while (!isSuccess) {
    // 切換運送地區到洛杉磯
    // 點擊「交貨到」按鈕
    debug && await page.screenshot({ path: 'screen_shot/check1.png' });
    await page.waitForSelector('#nav-global-location-popover-link');
    await page.click('#nav-global-location-popover-link');

    // 輸入洛杉磯的郵遞區號
    debug && await page.screenshot({ path: 'screen_shot/check2.png' });
    await page.waitForSelector('#GLUXZipUpdateInput');
    await page.click('#GLUXZipUpdateInput');
    await page.type('#GLUXZipUpdateInput', '90001', {delay: 1500});

    // 鍵盤敲 "Enter" 來 apply
    await page.waitForSelector('#GLUXZipUpdate > span > input')
    await page.keyboard.press('Enter')
    debug && await page.screenshot({ path: 'screen_shot/check3.png' });

    await page.waitForSelector('#GLUXConfirmClose')
    await delay(3000)
    await page.keyboard.press('Enter')
    debug && await page.screenshot({ path: 'screen_shot/check4.png' });

    await delay(3000)
    debug && await page.screenshot({ path: 'screen_shot/check5.png' });

    try {
      const productPriceWhole = await getTextContent(page, '#corePriceDisplay_desktop_feature_div > div.a-section.a-spacing-none.aok-align-center > span.a-price.aok-align-center.reinventPricePriceToPayMargin.priceToPay > span:nth-child(2) > span.a-price-whole');
      const productPriceFraction = await getTextContent(page, '#corePriceDisplay_desktop_feature_div > div.a-section.a-spacing-none.aok-align-center > span.a-price.aok-align-center.reinventPricePriceToPayMargin.priceToPay > span:nth-child(2) > span.a-price-fraction');
      const productPrice = productPriceWhole.replace('\n','') + productPriceFraction;
      prodcutPrice = productPrice;
      isSuccess = true;
    } catch (error) {
      console.log('error:', error);
      console.log('performing a retry...');
    }
  }

  return prodcutPrice;
}


// Amazon 取得商品規格簡介
async function getProductShortSpec(page, debug = false) {
  debug && console.log('Start to get product short spec...');

  // click "see more" button
  const seeMoreButton = await page.waitForSelector("#poToggleButton > a");
  await seeMoreButton.click();
  const productShortSpec = await getChildrenTextContent(page,'#poExpander > div.a-expander-content.a-expander-partial-collapse-content.a-expander-content-expanded > div > table > tbody','tr');
  return productShortSpec;
}


// Amazon 取得商品圖片連結 List
async function getProductImageList(page, debug = false) {
  const imageSelector = await page.waitForSelector('#imgTagWrapperId')
  await imageSelector.click();

  // 取得 pop up window
  const popUpWindowSelector = await page.waitForSelector('#ivThumbs')
  // 計算有多少圖片
  const imageCount = await page.evaluate((popUpWindowSelector) => {
    return popUpWindowSelector.querySelectorAll('div.ivThumb').length - 1;
  }, popUpWindowSelector);

  debug && await page.screenshot({ path: 'screen_shot/check6.png' });
  debug && console.log(`Start to get ${imageCount} images`);

  // 根據圖片數量一一點擊
  let productImageList = [];
  for (let i = 0; i < imageCount; i++) {
    const imageThumb = await page.waitForSelector(`#ivImage_${i}`);
    await imageThumb.click();

    // 如果圖片還沒出現，就等待 1 秒再重新抓取
    let imageSrc = '';
    while (imageSrc === '' || imageSrc === 'https://m.media-amazon.com/images/G/01/ui/loadIndicators/loading-large_labeled._CB485921664_.gif') {      
      await delay(500);
      const image = await page.waitForSelector('#ivLargeImage > img');
      imageSrc = await image.evaluate((image) => {
        return image.getAttribute('src');
      });
    }

    debug && console.log(`image ${i} src: ${imageSrc}`);
    debug && await page.screenshot({ path: `screen_shot/check${10 + i}.png` });
    productImageList.push(imageSrc);
  }

  await delay(1000);
  // await page.screenshot({ path: 'screen_shot/check20.png' });
  const closeButton = await page.waitForSelector('body > div.a-modal-scroller.a-declarative > div > div > header > button');
  await closeButton.click();
  return productImageList;
}


// Amazon 取得商品評論
async function getReview(page, debug = false) {
  debug && await page.screenshot({ path: 'screen_shot/check30.png' });

  // 滑動一下頁面
  await page.evaluate(() => {
    // scroll untill the "see all reviews" button is visible
    window.scrollBy(0, window.innerHeight*7);
  });

  await delay(1000);
  debug && await page.screenshot({ path: 'screen_shot/check31.png' });

  // 前往商品評論頁面
  while (true) {
    try {
      const productReviewLink = await page.waitForSelector('#reviews-medley-footer > div.a-row.a-spacing-medium > a');

      // get the browser url
      const url = page.url();
      if (url.includes('product-reviews')) {
        break;
      }

      await productReviewLink.click();
      break;
    }
    catch (error) {
      // console.log('error:', error);
      await delay(1000);
    }
  }
  
  debug && await page.screenshot({ path: 'screen_shot/check32.png' });

  // 取得商品評分
  const ratingSelector = await page.waitForSelector('#cm_cr-product_info > div > div.a-text-left.a-fixed-left-grid-col.reviewNumericalSummary.celwidget.a-col-left > div.a-row.a-spacing-small.averageStarRatingIconAndCount > div > div > div.a-fixed-left-grid-col.aok-align-center.a-col-right > div');
  const rating = await ratingSelector.evaluate(el => el.innerText.split(' ')[0]);

  debug && console.log(`Rating: ${rating}`);

  // 取得商品評論數
  const reviewCountSelector = await page.waitForSelector('#cm_cr-product_info > div > div.a-text-left.a-fixed-left-grid-col.reviewNumericalSummary.celwidget.a-col-left > div.a-row.a-spacing-medium.averageStarRatingNumerical');
  const reviewCount = await reviewCountSelector.evaluate(el => el.innerText.split(' ')[0]);
  debug && console.log('reviewCount:', reviewCount);

  // 取得商品評分分佈
  const ratingDistribution = await page.waitForSelector('#cm_cr-product_info > div > div.a-text-left.a-fixed-left-grid-col.reviewNumericalSummary.celwidget.a-col-left > div:nth-child(4)');

  // 從 #histogramTable 裡面取得評分分佈
  const ratingDistributionList = await ratingDistribution.evaluate((ratingDistribution) => {
    const ratingDistributionList = [];
    const ratingDistributionRows = ratingDistribution.querySelectorAll('tr');
    console.log('ratingDistributionRows:', ratingDistributionRows);
    for (const row of ratingDistributionRows) {
      const rating = row.querySelector('td.aok-nowrap').innerText;
      const count = row.querySelector('td.a-text-right').innerText;
      ratingDistributionList.push({rating, count});
    }
    return ratingDistributionList;
  }, ratingDistribution);
  debug && console.log('ratingDistributionList:', ratingDistributionList);

  // 取得商品評論
  // 取得 30 則評論
  let reviewList = [];
  for (let i = 0; i < 2; i++) {
    i !== 0 && await delay(2000);
    debug && await page.screenshot({ path: `screen_shot/check${33 + i}.png` });

    const reviewSectionSelector = await page.waitForSelector('#cm_cr-review_list');
    const reviewListBatch = await reviewSectionSelector.evaluate((reviewSectionSelector) => {
      const reviewList = [];
      const reviewItems = reviewSectionSelector.querySelectorAll('div.a-section.review.aok-relative');
      for (const reviewItem of reviewItems) {
        const userName = reviewItem.querySelector('span.a-profile-name').innerText;
        const reviewTitle = reviewItem.querySelector('a.review-title > span:nth-child(3)').innerText;
        const reviewDate = reviewItem.querySelector('span.review-date').innerText;
        const rating = reviewItem.querySelector('i.review-rating > span').innerText.split(' ')[0];
        const review = reviewItem.querySelector('span.review-text-content').innerText;
        reviewList.push({userName, reviewTitle, reviewDate, rating, review});
      }
      return reviewList;
    }, reviewSectionSelector);
    reviewList = reviewList.concat(reviewListBatch);

    // try three time if the next page button is not clickable
    let attempt = 0;
    while (attempt < 3) {
      try {
        const nextPageButton = await page.waitForSelector('#cm_cr-pagination_bar > ul > li.a-last > a');
        await nextPageButton.click();
      } catch (error) {
        attempt += 1;
        page.reload();
      }
    }
  }

  // debug && console.log('reviewList:', reviewList);
  return {rating, reviewCount, ratingDistributionList, reviewList};
};


// 去 Walmart 取得商品的 detail 和 specification
async function getProductDetailAndSpec(page, productModelCode, debug = false) {
  // 去到 Walmart 網站
  await page.goto(warmatURL + productModelCode, { waitUntil: 'domcontentloaded' });
  debug && await page.screenshot({ path: 'screen_shot/check40.png' });

  // 選擇搜尋結果的第一個商品
  const ResultSelector = await page.waitForSelector('#maincontent > main > div > div:nth-child(2) > div > div > div.w-100.relative-m.pl4.pr4.flex.pt2 > div.relative.w-80 > div > section > div');

  // 一個一個搜尋，直到找到沒有 "Sponsored" 的商品
  const resultList = await ResultSelector.$$('div.mb0.ph1.ph0-xl.pt0-xl.pb3-m.bb.b--near-white.w-25');
  let productLink = '';
  for (const result of resultList) {
    const text = await result.evaluate(el => el.innerText);
    if (!text.includes('Sponsored')) {
      productLink = await result.$eval('a', el => el.getAttribute('href'));
      productLink = productLink.split('?')[0];
      break;
    }
  }
  debug && console.log('productLink:', productLink);

  // 新開一個瀏覽器，以繞過
  const tempBrowser = await puppeteer.launch({
    // headless: 'new',
    headless: 'false',
    // executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });

  // 開啟新分頁，
  const tempPage = await tempBrowser.newPage();
  // // 把 image 和 video request block 掉
  // await tempPage.setRequestInterception(true);
  // tempPage.on('request', request => {
  //   // if (request.resourceType() === 'image' || request.resourceType() === 'media') {
  //   if (request.resourceType() === 'media') {
  //     request.abort();
  //   } else {
  //     request.continue();
  //   }
  // });

  // 等待商品頁面載入
  const cursor = createCursor(tempPage);
  await tempPage.setViewport({ width: 2560, height: 1664 });  // 把視窗調整成 Mac Book Air 13" 的大小，用來截圖除錯用
  await tempPage.setDefaultTimeout(20000);  // set timeout to 20 seconds
  const userAgent = new UserAgent({ deviceCategory: 'desktop' });
  await tempPage.setUserAgent(userAgent.toString());
  await tempPage.goto('https://www.walmart.com' + productLink, { waitUntil: 'domcontentloaded' });
  debug && await tempPage.screenshot({ path: 'screen_shot/check41.png' });
  

  // 取得商品 detail
  const productDetailSelector = await tempPage.waitForSelector('section[data-testid="product-description"]');
  const productDetailList = await tempPage.evaluate((productDetailSelector) => {
    const productDetailList = [];
    const productDetailItems = productDetailSelector.querySelectorAll('li');
    for (const item of productDetailItems) {
      productDetailList.push(item.innerText);
    }
    return productDetailList;
  }, productDetailSelector);

  debug && await tempPage.screenshot({ path: 'screen_shot/check42.png' });
  debug && console.log('productDetail:', productDetailList);

  // 取得商品 specification
  // 點擊 more detail button
  const moreDetailButton = await tempPage.waitForSelector('button[aria-label="More details"]');
  await cursor.click(moreDetailButton);

  // 檢查 modal 是否已經打開，如果沒有就一直點擊
  let modalOpen = false;
  let retryCount = 0;
  while (!modalOpen) {
    debug && await tempPage.screenshot({ path: `screen_shot/check${43 + retryCount}.png` });
    retryCount += 1;
    modalOpen = await tempPage.evaluate(() => {
      const modal = document.querySelector('div.w_dUbF');
      return modal !== null;
    });
    if (!modalOpen) {
      await delay(1000);
      await cursor.click(moreDetailButton);
    }
  }

  // 取得商品規格
  // let productSpecList = await getTextContent(tempPage, 'div.w_dUbF');
  // productSpecList = productSpecList.split('\n')
  let productSpecDict = {};
  let specTitleList = await getChildrenTextContent(tempPage, 'div.w_dUbF', 'div.pb2 > h3');
  let specContentList = await getChildrenTextContent(tempPage, 'div.w_dUbF', 'div.pb2 > div');

  // 過一遍 specContentList，如果包含多個項目（以 "\n" 分隔），就用 ", " 取代
  for (let i = 0; i < specContentList.length; i++) {
    if (specContentList[i].includes('\n')) {
      specContentList[i] = specContentList[i].replace(/\n/g, ', ');
    }
  }

  // 把 specTitleList 和 specContentList 合併成一個 dict
  for (let i = 0; i < specTitleList.length; i++) {
    productSpecDict[specTitleList[i]] = specContentList[i];
  }

  debug && await tempPage.screenshot({ path: 'screen_shot/check48.png' });
  debug && console.log('productSpecList:', productSpecDict);

  await tempBrowser.close()
  return {
    productDetail: productDetailList, 
    productSpec: productSpecDict
  }
}



/*
#############################
Content Scraping Functions
#############################
*/

// 取得指定 selector 的 text content
async function getTextContent(page, selector) {
  try {
    const element = await page.waitForSelector(selector);
    return await element?.evaluate(el => el.innerText);
  } 
  catch (error) {
    console.log('error:', error);
    return '';
  }
};

// 取得指定 selector 的 child element 的 text content
async function getChildrenTextContent(page, selector, childrenSelector) {
  try {
    const parent = await page.waitForSelector(selector);
    const childrenTextContents = await parent.$$eval(childrenSelector, children => 
      children.map(child => child.innerText)
    );
    return childrenTextContents;
  }
  catch (error) {
    console.log('error:', error);
    return '';
  }
};


// 暫停一段時間
function delay(time) {
  return new Promise(function(resolve) { 
      setTimeout(resolve, time)
  });
}


// 隨機暫停一段時間
function randomDelay(min, max) {
  return new Promise(function(resolve) {
    setTimeout(resolve, Math.random() * (max - min) + min);
  });
}


// 隨機取得 user agent
async function getRandomUserAgent(filePath) {
  try {
    // Read the content of the file
    const data = fs.readFileSync(filePath, 'utf8');
    
    // Split the content by new line to get an array of user agents
    const userAgents = data.split('\n').filter(Boolean); // filter(Boolean) removes any empty lines
    
    // Select a random user agent
    const randomIndex = Math.floor(Math.random() * userAgents.length);
    return userAgents[randomIndex];
  } catch (error) {
      console.error('Failed to read user agents from file:', error);
      return null;
    }
  }
  
  
// 把 json object 寫入檔案
async function addObjectToFile(filePath, newObject) {
  filePath = resolve(filePath);

  try {
    // 檢查檔案是否存在，沒有就建立一個空的
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, '{}', 'utf8');
    }

    // 讀取檔案內容
    let data = fs.readFileSync(filePath, 'utf8');
    let json = {};
    try {
      json = JSON.parse(data); // Parse the JSON string into an object
    } catch (error) {
      console.warn('Failed to parse existing JSON. Starting with an empty object.');
    }

    // 把 newObject 的 amazonUrl 作為 key
    const key = newObject.amazonUrl;
    if (!key) {
      throw new Error('The new object does not have a amazonUrl.');
    }

    // 如果已經有相同 key 的 object，就更新它
    json[key] = newObject;

    // 把更新後的 JSON string 寫回檔案
    const updatedJson = JSON.stringify(json, null, 2); // null and 2 are for formatting

    // 寫回檔案
    fs.writeFileSync(filePath, updatedJson, 'utf8');

    console.log('The file has been updated successfully.');
  } catch (error) {
    console.error('Error updating the file:', error);
  }
}

module.exports = {
  getModelCodes: getModelCodes,
  getProductPrice: getProductPrice,
  getProductShortSpec: getProductShortSpec,
  getProductImageList: getProductImageList,
  getReview: getReview,
  getProductDetailAndSpec: getProductDetailAndSpec,
  getTextContent: getTextContent,
  getChildrenTextContent: getChildrenTextContent,
  delay: delay,
  randomDelay: randomDelay,
  getRandomUserAgent: getRandomUserAgent,
  addObjectToFile: addObjectToFile
}
