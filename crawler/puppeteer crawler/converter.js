const fs = require('fs');
const filePath = './result/productInfo.json';


// 讀取檔案內容
let data = fs.readFileSync(filePath, 'utf8');
let json = {};

json = JSON.parse(data); // Parse the JSON string into an object

const result = {};
for (const key in json) {
    if (json.hasOwnProperty(key)) {
        const amazonUrl = json[key].amazonUrl;
        result[amazonUrl] = { ...json[key] };
    }
}

// 把更新後的 JSON string 寫回檔案
const updatedJson = JSON.stringify(result, null, 2); // null and 2 are for formatting

// 寫回檔案
fs.writeFileSync(filePath, updatedJson, 'utf8');
