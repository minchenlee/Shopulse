let express = require('express');
let router = express.Router();
require('dotenv').config();

// Import the User Validation middleware
const validateUserId = require('../middleware/validate_user_id');

// Import the User model and the Thread model
const UserModel = require('../db/model/user');
const ThreadModel = require('../db/model/thread');

// Import the OpenAI package
const openAI = require('openai'); 
const { pre } = require('../db/schema/product');
const openai = new openAI({
  apiKey: process.env.OPENAI_API_KEY,
});


// GET /chat
// Establish a connection to a chat thread
router.get('/', async (req, res) => {
  const threadId = req.query.threadId || req.get('threadId');
  if (!threadId) {
    return res.status(400).send({ error: 'Thread ID is required' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const confirmationMessage = { type: 'confirmation', data: { message: `Connected to thread ${threadId}` }};
  res.write(`data: ${JSON.stringify(confirmationMessage)}\n\n`);

  const keepAlive = setInterval(() => res.write(': keep-alive\n\n'), 20000);
  
  // Assuming addConnection maps a thread ID to an SSE connection
  addConnection(threadId, res);

  // Cleanup on connection close
  req.on('close', () => {
    clearInterval(keepAlive);
    // Assuming cleanupConnection removes the mapping and any other cleanup logic
    cleanupConnection(threadId);
  });
});


// GET /chat/threads
// List all threads for a user
router.get('/threads', validateUserId, async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).send({ error: 'User ID is required' });
  }

  try {
    const threads = await getThreadIdForUser(userId);
    res.json({ threads });
  } catch (error) {
    // if the thread is not found
    if (error.message === `Thread not found for user ${userId}`) {
      return res.status(404).send({ error: error.message });
    }

    console.error('Failed to retrieve chat threads:', error);
    res.status(500).send(`Internal Server Error: ${error}`);
  }
});


// POST /chat/threads
// Create a new thread for a user
router.post('/threads', validateUserId, async (req, res) => {
  const userId = req.body.userId;
  if (!userId) {
    return res.status(400).send({ error: 'User ID is required' });
  }

  try {
    // check the therads count before creating a new thread
    const threads = await getThreadIdForUser(userId);
    if (threads.length === 3) {
      return res.status(400).send({ error: 'Maximum number of threads reached: max 3 threads per user' });
    }

    const threadId = await createThreadIdForUser(userId);
    res.status(200).send({ threadId: `${threadId}` });
  } catch (error) {
    console.error('Failed to create or retrieve thread:', error);
    res.status(500).send({ error: 'Failed to process request' });
  }
});


// POST /chat/messages
// Process a message and return the updated thread
router.post('/messages', async (req, res) => {
  const { threadId, message } = req.body;

  if (!threadId || !message) {
    return res.status(400).send({ error: 'Missing threadId or message' });
  }

  try {
    await addMessageToThread(threadId, message);
    let run = await runMessage(threadId);
    // Assuming sendMessageUpdateToUser now handles sending SSE updates efficiently
    sendMessageUpdateToUser(threadId, { type: 'runStatus', data: run });

    // Initialize polling control variables
    const maxAttempts = 5; // Maximum number of polling attempts
    let attempts = 0; // Current attempt count

    // Polling with timeout and max attempts
    let previousStatus = run.status;

    // Temporary save the action result
    // action result will be provided to the frontend 
    let actionResult = null;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // 3-second delay
      try {
        run = await checkRunStatus(threadId, run.id);
        // console.log(run.status);

        if (run.status !== previousStatus) {
          sendMessageUpdateToUser(threadId, { type: 'runStatus', data: run });
          previousStatus = run.status;
        }

        if (run.status === 'completed' || run.status === 'failed') {
          break;
        }

        if (run.status === 'requires_action') {
          const toolCalls = run.required_action.submit_tool_outputs.tool_calls;
          let result_list = await actions(toolCalls);
          // The result.output is a JSON string, parse to JSON object
          // so that the frontend can easily access the data
          // Action result contain asked by different toolCalls
          actionResult = structuredClone(result_list);
          actionResult = actionResult.map(result => {
            result.output = JSON.parse(result.output);
            return result;
          });
          // console.log(actionResult[0].output)

          // Before submitting the tool outputs, iterate through the result_list and
          // delete productImageList from the result
          // so that the asssistant's reponse will not contain the image URLs
          result_list = result_list.map(result => {
            result.output = JSON.parse(result.output);
            // if the tool call is for the filter_products
            // the output will be an array of products
            if (result.tool_call_name === 'filter_products') {
              delete result.tool_call_name;
              result.output = result.output.map(output => {
                if (output.productImageList) {
                  delete output.productImageList;
                }
                return output;
              });
            }
            // if the tool call is for the get_product_details
            // the output will be a single product
            if (result.tool_call_name === 'get_product_details') {
              delete result.tool_call_name;
              if (result.output.productImageList) {
                delete result.output.productImageList;
                // console.log('deleted productImageList');
              }
            }

            result.output = JSON.stringify(result.output);
            return result;
          });
          
          await submitToolOutputs(threadId, run.id, result_list);
          previousStatus = run.status;
        }
        
      } catch (error) {
        console.error(`Error checking run status for thread ${threadId}:`, error);
        // Decide whether to break or continue; for now, let's log and attempt to continue
        attempts++;
      }
    }

    if (run.status === 'completed') {
      let messages = await getMessages(threadId);
      // add new key to the messages object
      if (actionResult !== null) {
        await Promise.all(actionResult.map(async (result) => {
          // if the tool call is for the filter_products or get_product_details
          // modify the message to include the productImageList
          const isProductToolCall = ["filter_products", "get_product_details"].includes(result.tool_call_name);
          if (isProductToolCall) {
            let productImageList = null;

            // if the tool call is for the filter_products
            // there contains multiple products in the output
            if (result.tool_call_name === 'filter_products') {
              productImageList = result.output.map(product => product.productImageList[0]);
            }

            // if the tool call is for the get_product_details
            // there only contains a single product in the output
            if (result.tool_call_name === 'get_product_details') {
              productImageList = result.output.productImageList;
            }

            // the process will be the same for both filter_products and get_product_details
            if (productImageList) {
              // imageList may be too long, split every 5 images under a single key
              let imageList = [];
              for (let i = 0; i < productImageList.length; i += 5) {
                imageList.push(productImageList.slice(i, i + 5));
              }

              // create image Dict, with the image batch name img_list_1, 2... as the key
              // and the sub-image list as the value
              let metaData = {};
              imageList.map((imgSubList, index) => {
                metaData[`img_list_${index + 1}`] = JSON.stringify(imgSubList);
              });

              // add the tool call name to the metaData
              metaData.tool_call_name = result.tool_call_name;

              // add the product name list to the metaData
              if (result.tool_call_name === 'filter_products') {
                metaData.product_name_list = JSON.stringify(result.output.map(product => product.productName));
              }

              if (result.tool_call_name === 'get_product_details') {
                metaData.product_name_list = JSON.stringify([result.output.productName]);
              }

              console.log(metaData);

              // modify the message
              const messageId = messages.data[0].id;
              await modifyMessage(threadId, messageId, metaData);
            }
          }
          
          result.run_id = run.id;
          return result;
        }));
      }

      messages = await getMessages(threadId);
      messages.addtionalData = actionResult;
      sendMessageUpdateToUser(threadId, { type: 'messages', data: messages });
      res.status(200).send({ success: true, message: 'Message processed successfully' });
    } else {
      // Handle non-completion (either failed or max attempts reached)
      throw new Error(`Processing incomplete for thread ${threadId}: Status ${run.status}`);
    }
  } catch (error) {
    console.error('Failed to process message:', error);
    res.status(500).send({ error: 'Failed to process message' });
  }
});


// Delete /chat/threads
// Delete a thread for a user
router.delete('/threads', validateUserId, async (req, res) => {
  const { userId, threadId } = req.query;

  if (!userId || !threadId) {
    return res.status(400).send({ error: 'Missing userId or threadId' });
  }

  try {
    await ThreadModel.deleteOne({ userId: userId, threadId: threadId });
    await openai.beta.threads.del(threadId);
    res.status(200).send({ success: true, message: `Thread ${threadId} deleted successfully` });
  } catch (error) {
    console.error('Failed to delete thread:', error);
    res.status(500).send({ error: 'Failed to delete thread' });
  }
});


/* Utility functions for managing chat threads */
// handle the connection
const activeConnections = new Map();

// Utility function for adding a connection
function addConnection(threadId, response) {
  activeConnections.set(threadId, response);
  // Additional logic for managing multiple subscribers to the same thread could be added here
}

// Utility function for removing a connection
function removeConnection(threadId) {
  activeConnections.delete(threadId);
}

// Enhanced cleanup to prevent memory leaks
function cleanupConnection(threadId, keepAlive) {
  clearInterval(keepAlive);
  removeConnection(threadId);
  // Ensure proper cleanup of event listeners if any were added
}

// Send the message to the corresponding user
function sendMessageUpdateToUser(threadId, messageData) {
  const connection = activeConnections.get(threadId);
  if (connection) {
    const message = {
      type: messageData.type,
      data: messageData.data,
    };

    // console.log(message);
    connection.write(`data: ${JSON.stringify(message)}\n\n`);
  }
};


/* Utility functions for retrieving and creating chat threads with DB */
// create a thread for the user
async function createThreadIdForUser(userId) {
  // create a new thread for the user
  const thread = await openai.beta.threads.create();
  const newThread = await ThreadModel.create({ userId: userId, threadId: thread.id });

  return newThread.threadId;
};

// get the thread ID for the user
async function getThreadIdForUser(userId) {
  // retrieve the thread ID for the user
  const thread = await ThreadModel.find({ userId: userId });
  if (!thread) {
    throw new Error(`Thread not found for user ${userId}`);
  }

  return thread
};


/* Utility functions for interacting with OpenAI Assitant API */
// add message to the thread
async function addMessageToThread(threadId, textContent) {
  const message = await openai.beta.threads.messages.create(
    threadId,
    {
      role: "user",
      content: textContent,
    }
  );

  if (!message) {
    throw new Error(`Failed to add message to thread, ${threadId}`)
  }
}

// run the message
async function runMessage(threadId) {
  const run = await openai.beta.threads.runs.create(
    threadId,
    { assistant_id: process.env.OPENAI_ASSISTANT_ID }
  );
  
  if (!run) {
    throw new Error(`Failed to run message for thread ${threadId}`);
  }

  return run;
}

// submit tool outputs to run
async function submitToolOutputs(threadId, runId, result_list) {
  const requestBody = {
    tool_outputs: result_list
  };

  const run = await openai.beta.threads.runs.submitToolOutputs(
    threadId,
    runId,
    requestBody
  );

  if (!run) {
    throw new Error(`Failed to submit tool outputs for thread ${threadId}`);
  }

  return run;
}

// modify the message
async function modifyMessage(threadId, messageId, textContent) {
  const message = await openai.beta.threads.messages.update(
    threadId,
    messageId,
    { metadata: textContent }
  );

  if (!message) {
    throw new Error(`Failed to modify message for thread ${threadId}`);
  }

  return message;
}


// check the run steps
async function checkRunSteps(threadId, runId) {
  const runSteps = await openai.beta.threads.runs.steps.list(threadId, runId);
  return runSteps;
}

// check the run status
async function checkRunStatus(threadId, runId) {
  const run = await openai.beta.threads.runs.retrieve(threadId, runId);
  return run;
}

// get the messages
async function getMessages(threadId) {
  const messages = await openai.beta.threads.messages.list(threadId);
  return messages;
}


/* Utility functions for retriving information from the DB */
async function actions(tool_calls) {
  const results_list = [];
  // literate tool_calls and call the corresponding API
  for (let tool_call of tool_calls) {
    if (tool_call.type === 'function') {
      const output = await callProductAPI(tool_call.function);
      let result = {}
      result.tool_call_id = tool_call.id;
      result.tool_call_name = tool_call.function.name;
      result.output = JSON.stringify(output);
      results_list.push(result);
    }
  }

  // console.log(results_list);
  return results_list;
}

async function callProductAPI(function_call) {
  const function_name = function_call.name;
  const function_args = JSON.parse(function_call.arguments);
  
  // call the corresponding function
  if (function_name === 'filter_products') {
    let request_url = `http://localhost:${process.env.PORT || 3000}/products/filter?`;

    // get the keys from the arguments
    const keys = Object.keys(function_args);
    for (let key of keys) {
      // last key should not have the & at the end
      if (key === keys[keys.length - 1]) {
        request_url += `${key}=${function_args[key]}`;
        request_url += `&limit=3`
        break;
      }

      request_url += `${key}=${function_args[key]}&`;
    }
    // console.log(request_url);

    // call the API
    const response = await fetch(request_url);
    const data = await response.json();
  
    return data;
  }

  if (function_name === 'get_product_details') {
    let request_url = `http://localhost:${process.env.PORT || 3000}/products/${function_args.productId}`;
    // console.log(request_url);

    // call the API
    const response = await fetch(request_url);
    const data = await response.json();
  
    return data;
  }
}

module.exports = router;
