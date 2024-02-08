let express = require('express');
let router = express.Router();
require('dotenv').config();


const openAiInterface = require('../model/openAi');
const { getIntentOnly } = require('../model/dialogflow');



/* GET users listing. */
router.get('/', async function(req, res, next) {

  // using dialogflow to get the intention of the user
  const text = '我想找一款能在海邊使用的帳篷。';
  const intent = await getIntentOnly(text);
  console.log(intent)

  // forward to the corressponding engine
  const prePrompt =  '你是一個客服人員。你正在與一位正在尋找產品的客戶交談。你正在試圖幫助他們找到他們正在尋找的產品。'
  const data = await openAiInterface(prePrompt, text);
  res.send(data);
});

module.exports = router;
