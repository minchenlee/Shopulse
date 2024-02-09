const fs = require('fs');
const puppeteer = require('puppeteer-extra');
const cliProgress = require('cli-progress');
// prevent puppeteer from being detected
const stealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(stealthPlugin())

// url List
const urlList = [
  "https://www.amazon.com/stores/page/6DD5C9BA-9109-4545-91DA-B487307DC238?ingress=2&visitId=7a1051ef-0ece-4c5a-9157-925b41f9bd4f&ref_=ast_bln",
  "https://www.amazon.com/stores/page/874308D2-B053-433C-B796-765128A12534?ingress=2&visitId=7a1051ef-0ece-4c5a-9157-925b41f9bd4f&ref_=ast_bln",
  "https://www.amazon.com/stores/page/748FD795-AF0E-4037-AF39-4FF22DA9DF87?ingress=2&visitId=7a1051ef-0ece-4c5a-9157-925b41f9bd4f&ref_=ast_bln",
  "https://www.amazon.com/stores/page/D8AAB782-5F06-40B1-90CA-68E7D900FAA0?ingress=2&visitId=7a1051ef-0ece-4c5a-9157-925b41f9bd4f&ref_=ast_bln",
  "https://www.amazon.com/stores/page/01C09550-27B9-43B5-BD9B-35AD9B947850?ingress=2&visitId=7a1051ef-0ece-4c5a-9157-925b41f9bd4f&ref_=ast_bln"
]

main("Samsung");


async function main(brand) {
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


    // console.log(productLinkList);

    // save the productLinks to a file
    fs.writeFileSync(`../result/${brand}_bucket_list.json`, JSON.stringify(productLinkList, null, 2));
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

  // 消除重複的連結
  productLinks = Array.from(new Set(productLinks));
  return productLinks;
}

