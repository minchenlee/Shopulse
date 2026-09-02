const awslambda = require('@aws-lambda-runtime/awslambda');
const mongoose = require('mongoose');
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");

// Import MongoDB models
const UserModel = require('./models/user');
const ThreadModel = require('./models/thread');

// Import OpenAI
const OpenAI = require('openai');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// DynamoDB setup
const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

// MongoDB connection
let isConnected = false;
const connectToDatabase = async () => {
  if (isConnected) {
    return Promise.resolve();
  }

  try {
    await mongoose.connect(process.env.MONGODB_URL);
    isConnected = true;
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// SSE Chat Stream Handler
const chatStreamHandler = awslambda.streamifyResponse(
  async (event, responseStream, context) => {
    try {
      await connectToDatabase();

      const queryParams = event.queryStringParameters || {};
      const threadId = queryParams.threadId;
      
      if (!threadId) {
        responseStream.write(`data: ${JSON.stringify({ error: 'Thread ID is required' })}\n\n`);
        responseStream.end();
        return;
      }

      // Set SSE headers
      responseStream.setContentType("text/event-stream");

      // Get initial messages
      try {
        const data = await getMessages(threadId);
        const confirmationMessage = { type: 'confirmation', data: data };
        responseStream.write(`data: ${JSON.stringify(confirmationMessage)}\n\n`);
      } catch (error) {
        console.error('Failed to retrieve messages:', error);
        responseStream.write(`data: ${JSON.stringify({ error: 'Please refresh the page and try again' })}\n\n`);
        responseStream.end();
        return;
      }

      // Store connection in DynamoDB
      await storeConnection(threadId, context.awsRequestId);

      // Keep-alive mechanism with timeout handling
      const keepAliveInterval = 20000; // 20 seconds
      const maxDuration = 14 * 60 * 1000; // 14 minutes (leave 1 minute buffer)
      const startTime = Date.now();

      const keepAliveTimer = setInterval(() => {
        if (Date.now() - startTime > maxDuration) {
          clearInterval(keepAliveTimer);
          responseStream.write(`data: ${JSON.stringify({ type: 'timeout', message: 'Connection will close, please reconnect' })}\n\n`);
          responseStream.end();
          return;
        }
        
        responseStream.write(': keep-alive\n\n');
      }, keepAliveInterval);

      // Set up message polling for this thread
      // In a real implementation, you'd use DynamoDB Streams or EventBridge
      // For now, we'll implement a simple polling mechanism
      const pollForMessages = async () => {
        try {
          const messages = await checkForNewMessages(threadId);
          if (messages && messages.length > 0) {
            messages.forEach(message => {
              responseStream.write(`data: ${JSON.stringify(message)}\n\n`);
            });
          }
        } catch (error) {
          console.error('Error polling for messages:', error);
        }
      };

      const pollInterval = setInterval(pollForMessages, 2000); // Poll every 2 seconds

      // Handle cleanup - this will run when Lambda function times out
      const cleanup = () => {
        clearInterval(keepAliveTimer);
        clearInterval(pollInterval);
        cleanupConnection(threadId, context.awsRequestId);
      };

      // Set cleanup for Lambda timeout
      setTimeout(cleanup, maxDuration);

    } catch (error) {
      console.error('Error in chat stream handler:', error);
      responseStream.write(`data: ${JSON.stringify({ error: 'Internal server error' })}\n\n`);
      responseStream.end();
    }
  }
);

// Standard Lambda handlers for non-streaming endpoints
const threadsHandler = async (event) => {
  try {
    await connectToDatabase();
    
    const method = event.httpMethod;
    const path = event.path;
    const queryParams = event.queryStringParameters || {};
    const body = event.body ? JSON.parse(event.body) : {};

    if (method === 'GET' && path.endsWith('/threads')) {
      return await handleGetThreads(queryParams);
    } else if (method === 'POST' && path.endsWith('/threads')) {
      return await handleCreateThread(body);
    } else if (method === 'GET' && path.endsWith('/threads/messages')) {
      return await handleGetMessages(queryParams);
    } else if (method === 'GET' && path.endsWith('/threads/statistics')) {
      return await handleGetStatistics(queryParams);
    } else if (method === 'POST' && path.endsWith('/messages')) {
      return await handlePostMessage(body);
    }

    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Endpoint not found' })
    };

  } catch (error) {
    console.error('Error in threads handler:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

// Helper function to store connection in DynamoDB
const storeConnection = async (threadId, connectionId) => {
  const params = {
    TableName: process.env.CONNECTIONS_TABLE,
    Item: {
      threadId: threadId,
      connectionId: connectionId,
      timestamp: Date.now(),
      ttl: Math.floor(Date.now() / 1000) + 900 // 15 minutes TTL
    }
  };

  try {
    await dynamodb.send(new PutCommand(params));
  } catch (error) {
    console.error('Error storing connection:', error);
  }
};

// Helper function to cleanup connection
const cleanupConnection = async (threadId, connectionId) => {
  const params = {
    TableName: process.env.CONNECTIONS_TABLE,
    Key: {
      threadId: threadId,
      connectionId: connectionId
    }
  };

  try {
    await dynamodb.send(new DeleteCommand(params));
  } catch (error) {
    console.error('Error cleaning up connection:', error);
  }
};

// Helper function to send message update to connected clients
const sendMessageUpdateToUser = async (threadId, messageData) => {
  // In a full implementation, you'd query DynamoDB for active connections
  // and use API Gateway WebSocket API to send messages
  // For now, we'll store the message in DynamoDB for polling
  const params = {
    TableName: process.env.MESSAGES_TABLE,
    Item: {
      threadId: threadId,
      messageId: Date.now().toString(),
      data: messageData,
      timestamp: Date.now(),
      ttl: Math.floor(Date.now() / 1000) + 3600 // 1 hour TTL
    }
  };

  try {
    await dynamodb.send(new PutCommand(params));
  } catch (error) {
    console.error('Error sending message update:', error);
  }
};

// Helper function to check for new messages
const checkForNewMessages = async (threadId) => {
  const params = {
    TableName: process.env.MESSAGES_TABLE,
    KeyConditionExpression: 'threadId = :threadId',
    ExpressionAttributeValues: {
      ':threadId': threadId
    },
    ScanIndexForward: true
  };

  try {
    const result = await dynamodb.send(new QueryCommand(params));
    return result.Items?.map(item => item.data) || [];
  } catch (error) {
    console.error('Error checking for new messages:', error);
    return [];
  }
};

// Import helper functions from original chat.js
// (These would need to be extracted and adapted)
const getMessages = async (threadId) => {
  try {
    const response = await openai.beta.threads.messages.list(threadId);
    return response;
  } catch (error) {
    console.error('Error getting messages:', error);
    throw error;
  }
};

// Handler route logic (extracted from original Express routes)
const handleGetThreads = async (queryParams) => {
  const { userId } = queryParams;
  
  if (!userId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'User ID is required' })
    };
  }

  try {
    const threads = await getThreadIdForUser(userId);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ threads })
    };
  } catch (error) {
    if (error.message === `Thread not found for user ${userId}`) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: error.message })
      };
    }

    console.error('Failed to retrieve chat threads:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: `Internal Server Error: ${error}` })
    };
  }
};

// Additional handler functions would be implemented here...
// (handleCreateThread, handleGetMessages, handleGetStatistics, handlePostMessage)

// Helper functions from original chat.js (need to be extracted)
const getThreadIdForUser = async (userId) => {
  try {
    const user = await UserModel.findOne({ userId: userId });
    if (!user || !user.threadList || user.threadList.length === 0) {
      throw new Error(`Thread not found for user ${userId}`);
    }
    return user.threadList;
  } catch (error) {
    throw error;
  }
};

// Export handlers
exports.chatStream = chatStreamHandler;
exports.threads = threadsHandler;