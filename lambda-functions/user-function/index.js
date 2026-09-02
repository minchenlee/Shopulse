const mongoose = require('mongoose');
const UserModel = require('./models/user');

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

// Lambda handler for users
exports.handler = async (event) => {
  try {
    await connectToDatabase();
    
    const method = event.httpMethod;
    const path = event.path;
    const queryParams = event.queryStringParameters || {};
    const body = event.body ? JSON.parse(event.body) : {};

    // CORS headers
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    };

    // Handle preflight requests
    if (method === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: ''
      };
    }

    // Route handling
    if (method === 'GET' && path.endsWith('/statistic')) {
      return await handleUserStatistic(queryParams, headers);
    } else if (method === 'GET') {
      return await handleGetUser(queryParams, headers);
    } else if (method === 'POST') {
      return await handleCreateUser(body, headers);
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Endpoint not found' })
    };

  } catch (error) {
    console.error('Error in user handler:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

// Handle get user
const handleGetUser = async (queryParams, headers) => {
  const { userId } = queryParams;
  
  if (!userId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'User ID is required' })
    };
  }

  try {
    const user = await UserModel.findById(userId);
    
    if (!user) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: `User not found with ID ${userId}` })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'User found' })
    };

  } catch (error) {
    console.error('Error finding user:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to find user' })
    };
  }
};

// Handle create user
const handleCreateUser = async (body, headers) => {
  try {
    const { userId } = body;

    // If user ID is provided, use it to create the user
    if (userId) {
      const user = new UserModel({ _id: userId });
      await user.save();
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ 
          userId: user._id, 
          message: 'User created successfully' 
        })
      };
    }

    // Create user with auto-generated ID
    const user = new UserModel();
    await user.save();
    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ 
        userId: user._id, 
        message: 'User created successfully' 
      })
    };

  } catch (error) {
    console.error('Error creating user:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to create user' })
    };
  }
};

// Handle user statistics
const handleUserStatistic = async (queryParams, headers) => {
  const { userId } = queryParams;
  
  if (!userId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'User ID is required' })
    };
  }

  try {
    // In the original implementation, this makes a call to the chat service
    // In the serverless version, we'd need to call the chat Lambda function
    // or access the data directly from the database
    
    // For now, return a placeholder response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Statistic found' })
    };

  } catch (error) {
    console.error('Error getting user statistics:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to get user statistics' })
    };
  }
};