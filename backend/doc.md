

```
// 只取得使用者 input text 的 intent
async function getIntentOnly(text){
  const response = await detectIntent(projectId, sessionId, text, [], languageCode)
  // console.log(response.queryResult)

  const intentName = response.queryResult.intent.displayName;
  const intentConfidence = response.queryResult.intentDetectionConfidence;
  const intentResult = {
    intentName: intentName,
    intentConfidence: intentConfidence
  }

  // console.log(intentResult)
  return intentResult
}
```

#### getIntentOnly
getIntentOnly is a function that takes in text and returns the intentName and intentConfidence of the text. The text is a string that is the user's input.

| name | type | example |
| ---- | ---- | ------- |
| text | string |`'我想找一個產品，可以幫助我減輕背痛。'`|
| intentName | string | `'searching_goods'`|
| intentConfidence | number | `0.6031904816627502` |

example
```js
const text = '我想找一個產品，可以幫助我減輕背痛。';
const intent = await getIntentOnly(text);
// {
//  intentName: 'searching_goods',
//  intentConfidence: 0.39291974902153015
// }
```


#### openAiInterface
openAiInterface is a function that takes in a prePrompt and text and returns a response from the OpenAI API. The prePrompt is a string that describes the context of the conversation. The text is a string that is the user's input.


| name | type | response example|
| ---- | ---- | -------- |
| prePrompt | string | |
| text | string | |



