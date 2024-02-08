// Imports the Dialogflow library
const dialogflow = require('@google-cloud/dialogflow');

// Instantiates a session client
const sessionClient = new dialogflow.SessionsClient();

// dialog flow configurations
const projectId = 'chatbot-testing-395504'
const sessionId = '12389034'
const languageCode = 'zh-TW';

// user input text
const queries = [
  '我好想要吃水餃！'
]


// Google 範例程式碼
async function detectIntent(
  projectId,
  sessionId,
  query,
  contexts,
  languageCode
) {
  // The path to identify the agent that owns the created intent.
  const sessionPath = sessionClient.projectAgentSessionPath(
    projectId,
    sessionId
  );

  // The text query request.
  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: query,
        languageCode: languageCode,
      },
    },
  };

  if (contexts && contexts.length > 0) {
    request.queryParams = {
      contexts: contexts,
    };
  }

  const responses = await sessionClient.detectIntent(request);
  return responses[0];
}


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

// getIntentOnly(queries[0]);


//  Google 範例程式碼，執行多個 query。
async function executeQueries(projectId, sessionId, queries, languageCode) {
  // Keeping the context across queries let's us simulate an ongoing conversation with the bot
  let context;
  let intentResponse;
  for (const query of queries) {
    try {
      console.log(`Sending Query: ${query}`);
      intentResponse = await detectIntent(
        projectId,
        sessionId,
        query,
        context,
        languageCode
      );
      console.log('Detected intent');
      console.log(
        `Fulfillment Text: ${intentResponse.queryResult.fulfillmentText}`
      );
      console.log(intentResponse.queryResult)

      // Use the context from this response for next queries
      context = intentResponse.queryResult.outputContexts;
    } catch (error) {
      console.log(error);
    }
  }
}

module.exports = {
  getIntentOnly: getIntentOnly
}

// detectIntent(projectId, sessionId, queries[0], [], languageCode)
// executeQueries(projectId, sessionId, queries, languageCode);