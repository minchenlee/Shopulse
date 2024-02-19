const fs = require('fs');
const puppeteer = require('puppeteer-extra');
const cliProgress = require('cli-progress');
// prevent puppeteer from being detected
const stealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(stealthPlugin())

// url List
const urlList = [
  "https://www.amazon.com/stores/page/77144CBE-0100-48C9-B5F9-0818E84E685E?ingress=2&visitId=4fc78292-a26c-44be-9374-ada581bdd318&ref_=ast_bln",
  "https://www.amazon.com/stores/page/AD0C7E1A-F18E-4EE7-AA4B-DB183547B72B?ingress=2&visitId=4fc78292-a26c-44be-9374-ada581bdd318&ref_=ast_bln",
  "https://www.amazon.com/stores/page/CB444A9E-7E91-41A0-A02B-8C10F01BAA9D?ingress=2&visitId=4fc78292-a26c-44be-9374-ada581bdd318&ref_=ast_bln",
  "https://www.amazon.com/stores/page/57621242-75F7-4366-AC63-8153662D4902?ingress=2&visitId=4fc78292-a26c-44be-9374-ada581bdd318&ref_=ast_bln"
]

main("Hisense", urlList);


async function main(brand, urlList) {
  // 啟動瀏覽器
  const browser = await puppeteer.launch({
    headless: 'new'
  });

  try {
    // the list that scout return shold be concated to a single list
    const productLinkListPromises = urlList.map(url => scout(url, browser));
    let productLinkList = await Promise.all(productLinkListPromises);

    console.log(productLinkList);

    // concat the list
    productLinkList = productLinkList.flat();

    // remove duplicate links
    productLinkList = Array.from(new Set(productLinkList));

    // save the productLinks to a file
    fs.writeFileSync(`../result/bucketlist/${brand}_bucket_list.json`, JSON.stringify(productLinkList, null, 2));
    await browser.close();

  } catch (error) {
    console.error('An error occurred:', error);
  }
}

// scout 
async function scout(url, browser){
  // 開啟新分頁
  const page = await browser.newPage();
  page.setDefaultTimeout(10000);  // set timeout to 10 seconds
  await page.setViewport({ width: 2560, height: 1664 });  // 把視窗調整成 Mac Book Air 13" 的大小，用來截圖除錯用
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const productList = await page.waitForSelector('div[data-testid="product-grid-container"]');
  let productLinks = await productList.$$eval('a', links => links.map(link => link.href));
  return productLinks;
}

