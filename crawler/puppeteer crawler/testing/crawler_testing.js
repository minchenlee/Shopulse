/*
#############################
Dependencies
#############################
*/
const puppeteer = require('puppeteer-extra');
const cliProgress = require('cli-progress');
// prevent puppeteer from being detected
const stealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(stealthPlugin())

// 載入 worker 的動作 function
const worker = require('../utils/worker.js');

const url = "https://www.amazon.com/LG-UHD-UQ75-75UQ7590PUB-2022/dp/B09RRKSZ29/ref=sr_1_1?keywords=UQ7590%2BSeries&qid=1707043095&s=tv&sr=1-1-catcorr&th=1"

// const url = "https://www.amazon.com/dp/B0BYPLCFDS/ref=sspa_dk_detail_2?psc=1&pd_rd_i=B0BYPLCFDS&pd_rd_w=S11wo&content-id=amzn1.sym.eb7c1ac5-7c51-4df5-ba34-ca810f1f119a&pf_rd_p=eb7c1ac5-7c51-4df5-ba34-ca810f1f119a&pf_rd_r=NR4WQG6X9GMCEGJJZYB5&pd_rd_wg=7ASaQ&pd_rd_r=f835adb8-45b8-4870-88b6-a77dce29c8f1&s=tv&sp_csd=d2lkZ2V0TmFtZT1zcF9kZXRhaWw"

// const url = "https://www.amazon.com/sspa/click?ie=UTF8&spc=MTo2Njc5NjkwOTU3NTE3MDM2OjE3MDcxODcwMzQ6c3BfZGV0YWlsX3RoZW1hdGljOjMwMDAwNTUwOTcxMzMwMjo6Ojo&url=%2Fdp%2FB0C1J6PP81%2Fref%3Dsspa_dk_detail_1%3Fpsc%3D1%26pf_rd_p%3D08ba9b95-1385-44b0-b652-c46acdff309c%26pf_rd_r%3DNR4WQG6X9GMCEGJJZYB5%26pd_rd_wg%3D7ASaQ%26pd_rd_w%3DKMfL7%26content-id%3Damzn1.sym.08ba9b95-1385-44b0-b652-c46acdff309c%26pd_rd_r%3Df835adb8-45b8-4870-88b6-a77dce29c8f1%26s%3Dtv%26sp_csd%3Dd2lkZ2V0TmFtZT1zcF9kZXRhaWxfdGhlbWF0aWM"

// 啟動 worker
worker(url, showProgress = false, checkStealth = false, debug = false);

