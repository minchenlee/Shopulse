const mongoose = require('mongoose');
const productModel = require('./models/product');

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

// Helper function to validate search parameters
const validateSearchParams = (queryParams) => {
  const { keyword } = queryParams;
  if (!keyword) {
    return { valid: false, error: 'Keyword is required' };
  }
  return { valid: true };
};

// Lambda handler for products
exports.handler = async (event) => {
  try {
    await connectToDatabase();
    
    const method = event.httpMethod;
    const path = event.path;
    const pathParameters = event.pathParameters || {};
    const queryParams = event.queryStringParameters || {};

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
    if (method === 'GET' && path.endsWith('/search')) {
      return await handleProductSearch(queryParams, headers);
    } else if (method === 'GET' && path.endsWith('/filter')) {
      return await handleProductFilter(queryParams, headers);
    } else if (method === 'GET' && pathParameters.productId && path.endsWith('/reviews')) {
      return await handleProductReviews(pathParameters.productId, headers);
    } else if (method === 'GET' && pathParameters.productId) {
      return await handleProductDetail(pathParameters.productId, headers);
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Endpoint not found' })
    };

  } catch (error) {
    console.error('Error in products handler:', error);
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

// Handle product search
const handleProductSearch = async (queryParams, headers) => {
  const validation = validateSearchParams(queryParams);
  if (!validation.valid) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: validation.error })
    };
  }

  let { limit = 3, pagination } = queryParams;
  const { 
    keyword, minPrice, maxPrice, minScreenSize, maxScreenSize, 
    brand, screenType, resolution, refreshRate, connectivity, 
    smartTVPlatform, supportedService, sortBy, fullDetails 
  } = queryParams;

  try {
    let aggregationPipeline = [];
    
    // Build search clauses dynamically
    let mustClauses = [
      {
        text: {
          query: keyword,
          path: ['productName', 'productSpec.Features'],
          fuzzy: {}
        }
      }
    ];

    // Add optional filters
    if (brand) {
      mustClauses.push({
        text: {
          query: brand,
          path: 'productSpec.Brand',
          fuzzy: {}
        }
      });
    }

    if (screenType) {
      mustClauses.push({
        text: {
          query: screenType,
          path: ['productSpec.Display Technology', 'productSpec.Television Type'],
          fuzzy: {}
        }
      });
    }

    if (resolution) {
      mustClauses.push({
        text: {
          query: resolution,
          path: 'productSpec.Resolution',
          fuzzy: {}
        }
      });
    }

    if (refreshRate) {
      mustClauses.push({
        text: {
          query: refreshRate,
          path: 'productSpec.Refresh Rate'
        }
      });
    }

    if (connectivity) {
      mustClauses.push({
        text: {
          query: connectivity,
          path: ['productSpec.Inputs & Outputs', 'productSpec.Wireless Technology'],
          fuzzy: {}
        }
      });
    }

    if (smartTVPlatform) {
      mustClauses.push({
        text: {
          query: smartTVPlatform,
          path: 'productSpec.Smart TV Platform',
          fuzzy: {}
        }
      });
    }

    if (supportedService) {
      mustClauses.push({
        text: {
          query: supportedService,
          path: ['productSpec.Streaming Services', 'productSpec.Virtual Assistant'],
          fuzzy: {}
        }
      });
    }

    // Build must not clauses for resolution filtering
    let mustNotClauses = [];
    if (resolution === '8k') {
      mustNotClauses.push({
        text: {
          query: ["4k", "1080p"],
          path: "productSpec.Resolution"
        }
      });
    } else if (resolution === '4k') {
      mustNotClauses.push({
        text: {
          query: ["8k", "1080p"],
          path: "productSpec.Resolution"
        }
      });
    } else if (resolution === '1080p') {
      mustNotClauses.push({
        text: {
          query: ["8k", "4k"],
          path: "productSpec.Resolution"
        }
      });
    }

    // Build aggregation pipeline
    const searchStage = {
      $search: {
        index: "default",
        compound: {
          must: mustClauses,
          ...(mustNotClauses.length > 0 && { mustNot: mustNotClauses })
        }
      }
    };

    aggregationPipeline.push(searchStage);

    // Add price filtering if specified
    if (minPrice || maxPrice) {
      const priceMatch = {};
      if (minPrice) priceMatch.$gte = parseFloat(minPrice);
      if (maxPrice) priceMatch.$lte = parseFloat(maxPrice);
      
      aggregationPipeline.push({
        $match: {
          productPrice: priceMatch
        }
      });
    }

    // Add screen size filtering if specified
    if (minScreenSize || maxScreenSize) {
      const screenSizeMatch = {};
      if (minScreenSize) screenSizeMatch.$gte = parseFloat(minScreenSize);
      if (maxScreenSize) screenSizeMatch.$lte = parseFloat(maxScreenSize);
      
      aggregationPipeline.push({
        $match: {
          "productSpec.Screen Size": screenSizeMatch
        }
      });
    }

    // Add sorting
    if (sortBy) {
      const sortStage = {};
      switch (sortBy) {
        case 'price_asc':
          sortStage.productPrice = 1;
          break;
        case 'price_desc':
          sortStage.productPrice = -1;
          break;
        case 'rating_desc':
          sortStage['productReview.rating'] = -1;
          break;
        default:
          sortStage.score = { $meta: "searchScore" };
      }
      aggregationPipeline.push({ $sort: sortStage });
    } else {
      aggregationPipeline.push({ $sort: { score: { $meta: "searchScore" } } });
    }

    // Add pagination
    if (pagination && parseInt(pagination) > 1) {
      const skip = (parseInt(pagination) - 1) * parseInt(limit);
      aggregationPipeline.push({ $skip: skip });
    }

    aggregationPipeline.push({ $limit: parseInt(limit) });

    // Add projection for response
    if (!fullDetails) {
      aggregationPipeline.push({
        $project: {
          productId: 1,
          productName: 1,
          productPrice: 1,
          productImageList: { $slice: ['$productImageList', 1] },
          productReview: {
            rating: '$productReview.rating',
            reviewCount: '$productReview.reviewCount'
          },
          productSpec: {
            Brand: '$productSpec.Brand',
            'Screen Size': '$productSpec.Screen Size',
            Resolution: '$productSpec.Resolution'
          }
        }
      });
    }

    const results = await productModel.aggregate(aggregationPipeline);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ products: results })
    };

  } catch (error) {
    console.error('Product search error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to search products' })
    };
  }
};

// Handle product filter (similar to search but with different logic)
const handleProductFilter = async (queryParams, headers) => {
  // Implementation similar to search but for filtering
  return await handleProductSearch(queryParams, headers);
};

// Handle individual product details
const handleProductDetail = async (productId, headers) => {
  try {
    const product = await productModel.findOne({ productId: productId });
    
    if (!product) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Product not found' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(product)
    };

  } catch (error) {
    console.error('Product detail error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch product details' })
    };
  }
};

// Handle product reviews
const handleProductReviews = async (productId, headers) => {
  try {
    const product = await productModel.findOne(
      { productId: productId },
      { productReview: 1 }
    );
    
    if (!product) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Product not found' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(product.productReview || {})
    };

  } catch (error) {
    console.error('Product reviews error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch product reviews' })
    };
  }
};