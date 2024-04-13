const express = require('express');
const mongoose = require('mongoose');
const validateSearchParams = require('../middleware/validate_search_params');
const productModel = require('../db/model/product');
let router = express.Router();

router.get('/search', validateSearchParams, async (req, res) => {
  let { limit, pagination } = req.query;
  const { keyword, minPrice, maxPrice, minScreenSize, maxScreenSize, brand, screenType, resolution, refreshRate, connectivity, smartTVPlatform, supportedService, sortBy, fullDetails } = req.query;
  // console.log('query:', keyword);
  
  if (!limit) {
    limit = 3;
  }

  try {
    let aggregationPipeline = [];
    // Dynamically build the should array based on provided query parameters
    let mustClauses = [
      // Add a match stage for brand, screenType, resolution, refreshRate, priceRange, screenSize, connectivity, smartTVPlatform, supportedService
      ...[{
        text: {
          query: keyword,
          path: [
            'productName',
            'productSpec.Features',
          ],
          fuzzy: {}
        }
      }],
      ...(brand ? [{
        text: {
          query: brand,
          path: 'productSpec.Brand',
          fuzzy: {}
        }
      }] : []),
      ...(screenType ? [{
        text: {
          query: screenType,
          path: [
            'productSpec.Display Technology', 
            'productSpec.Television Type'
          ],
          fuzzy: {}
        }
      }] : []),
      ...(resolution ? [{
        text: {
          query: resolution,
          path: 'productSpec.Resolution',
          fuzzy: {}
        }
      }] : []),
      ...(refreshRate ? [{
        text: {
          query: refreshRate,
          path: 'productSpec.Refresh Rate',
        }
      }] : []),
      ...(connectivity ? [{
        text: {
          query: connectivity,
          path: [
            'productSpec.Inputs & Outputs', 
            'productSpec.Wireless Technology'
          ],
          fuzzy: {}
        }
      }] : []),
      ...(smartTVPlatform ? [{
        text: {
          query: smartTVPlatform,
          path: 'productSpec.Smart TV Platform',
          fuzzy: {}
        }
      }] : []),
      ...(supportedService ? [{
        text: {
          query: supportedService,
          path: [
            'productSpec.Streaming Services', 
            'productSpec.Virtual Assistant'
          ],
          fuzzy: {}
        }
      }] : []),
    ];

    let mustNotClauses = [
      ...(resolution === '8k' ? [{
        text: {
          query: ["4k", "1080p"],
          path: "productSpec.Resolution",
        }
      }] : []),
      ...(resolution === '4k' ? [{
        text: {
          query: ["8k","1080p"],
          path: "productSpec.Resolution",
        }
      }] : []),
      ...(screenType === 'oled' ? [{
        text: {
          query: ["led", "qled"],
          path: [
            'productSpec.Display Technology', 
            'productSpec.Television Type'
          ],
        }
      }] : []),
      ...(screenType === 'led' ? [{
        text: {
          query: ["oled", "qled"],
          path: [
            'productSpec.Display Technology', 
            'productSpec.Television Type'
          ],
        }
      }] : []),
      ...(screenType === 'qled' ? [{
        text: {
          query: ["oled", "led"],
          path: [
            'productSpec.Display Technology', 
            'productSpec.Television Type'
          ],
        }
      }] : []),
    ];


    // Add the $search stage to the aggregation pipeline
    const searchStage = {
      $search: {
        compound: {
          must: mustClauses,
          mustNot: mustNotClauses,
        }
      }
    };
    aggregationPipeline.push(searchStage);


    // Check if the seachStage is processed
    let score;
    if (!pagination) {
      pagination = 1;
    } else {
      pagination = parseInt(pagination) + 1;
    }

    if (mustClauses.length !== 0) {
      score = { $meta: 'searchScore' };
    }

    // Add the match stage for price filtering if minPrice or maxPrice are provided
    if (minPrice && !maxPrice) {
      aggregationPipeline.push({
        $match: {
          productPrice: { $gte: parseInt(minPrice) }
        }
      });
    }

    if (maxPrice && !minPrice) {
      aggregationPipeline.push({
        $match: {
          productPrice: { $lte: parseInt(maxPrice) }
        }
      });
    }

    if (minPrice && maxPrice) {
      aggregationPipeline.push({
        $match: {
          productPrice: { $gte: parseInt(minPrice), $lte: parseInt(maxPrice) }
        }
      });
    }

    // Add the match stage for screen size filtering if minSreenSize or maxScreenSize are provided
    if (minScreenSize && !maxScreenSize) {
      aggregationPipeline.push({
        $match: {
          'productSpec.Screen Size': { $gte: parseInt(minScreenSize) }
        }
      });
    }

    if (maxScreenSize && !minScreenSize) {
      aggregationPipeline.push({
        $match: {
          'productSpec.Screen Size': { $lte: parseInt(maxScreenSize) }
        }
      });
    }

    if (minScreenSize && maxScreenSize) {
      aggregationPipeline.push({
        $match: {
          'productSpec.Screen Size': { $gte: parseInt(minScreenSize), $lte: parseInt(maxScreenSize) }
        }
      });
    }

    if (fullDetails === 'true' || !fullDetails) {
      aggregationPipeline.push({
        $project: {
          productName: 1,
          productPrice: 1,
          productShortSpec: 1,
          productSpec: 1,
          productFeatures: 1,
          productImageList: 1,
          score: { $ifNull: [ "$score", 0 ] },
          paginationToken: { $literal: pagination }
        }
      });
    }

    if (fullDetails === 'false') {
      aggregationPipeline.push({
        $project: {
          productName: 1,
          productPrice: 1,
          productImageList: 1,
          productRating: "$productReview.rating",
          productReviewCount: "$productReview.reviewCount",
          score: { $ifNull: [ "$score", 0 ] },
          paginationToken: { $literal: pagination }
        }
      });
    }
    
    let results;
    // Execute the aggregation pipeline
    results = await productModel.aggregate(aggregationPipeline);

    // prodcutFeatures and productDetail are json string, need to convert to object
    results = results.map(result => {
      if (result.productFeatures) {
        result.productFeatures = JSON.parse(result.productFeatures);
        // result.productDetail = JSON.parse(result.productDetail);
      }
      return result;
    });
    
    // convert results to JSON string
    // res.send(JSON.stringify(results, null, 2));



    // Add the limit after the aggregation  (if limit is provided)
    if (limit) {
      const intLimit = parseInt(limit, 10);
      const intPagination = parseInt(pagination, 10) - 1; // Assuming pagination starts from 1, adjust for zero-index.
    
      const startIndex = intPagination * intLimit;
      const endIndex = startIndex + intLimit; // No need to subtract 1 due to how slice() works.
    
      // console.log(startIndex, endIndex - 1); // endIndex - 1 because slice() is non-inclusive at the end.
      results = results.slice(startIndex, endIndex);
    }

    res.send(results);
  } catch (error) {
    res.status(500).send(`Internal Server Error: ${error}`);
  }
});



router.get('/filter', validateSearchParams, async (req, res) => {
  let { limit, pagination } = req.query;
  const { keyword, minPrice, maxPrice, minScreenSize, maxScreenSize, brand, screenType, resolution, refreshRate, connectivity, smartTVPlatform, supportedService, features, sortBy, fullDetails } = req.query;

  if (!limit) {
    limit = 3;
  }

  try {
    let aggregationPipeline = [];

    // Dynamically build the should array based on provided query parameters
    let mustClauses = [
      // Add a match stage for brand, screenType, resolution, refreshRate, priceRange, screenSize, connectivity, smartTVPlatform, supportedService
      ...(keyword ? [{
        text: {
          query: keyword,
          path: [
            'productName',
            'productSpec.Features',
          ],
          fuzzy: {}
        }
      }] : []),
      ...(brand ? [{
        text: {
          query: brand,
          path: 'productSpec.Brand',
          fuzzy: {}
        }
      }] : []),
      ...(screenType ? [{
        text: {
          query: screenType,
          path: [
            'productSpec.Display Technology', 
            'productSpec.Television Type'
          ],
        }
      }] : []),
      ...(resolution ? [{
        text: {
          query: resolution,
          path: 'productSpec.Resolution',
          fuzzy: {}
        }
      }] : []),
      ...(refreshRate ? [{
        text: {
          query: refreshRate,
          path: 'productSpec.Refresh Rate',
        }
      }] : []),
      ...(connectivity ? [{
        text: {
          query: connectivity,
          path: [
            'productSpec.Inputs & Outputs', 
            'productSpec.Wireless Technology'
          ],
          fuzzy: {}
        }
      }] : []),
      ...(smartTVPlatform ? [{
        text: {
          query: smartTVPlatform,
          path: 'productSpec.Smart TV Platform',
          fuzzy: {}
        }
      }] : []),
      ...(supportedService ? [{
        text: {
          query: supportedService,
          path: [
            'productSpec.Streaming Services', 
            'productSpec.Virtual Assistant'
          ],
          fuzzy: {}
        }
      }] : []),
      ...(features ? [{
        text: {
          query: features,
          path: [
            'productShortSpec.Special Feature',
            'productSpec.Features'
          ],
          fuzzy: {}
        }
      }] : []),
    ];

    let mustNotClauses = [
      ...(resolution === '8k' ? [{
        text: {
          query: ["4k", "1080p"],
          path: "productSpec.Resolution",
        }
      }] : []),
      ...(resolution === '4k' ? [{
        text: {
          query: ["8k","1080p"],
          path: "productSpec.Resolution",
        }
      }] : []),
      ...(screenType === 'oled' ? [{
        text: {
          query: ["led", "qled"],
          path: [
            'productSpec.Display Technology', 
            'productSpec.Television Type'
          ],
        }
      }] : []),
      ...(screenType === 'led' ? [{
        text: {
          query: ["oled", "qled"],
          path: [
            'productSpec.Display Technology', 
            'productSpec.Television Type'
          ],
        }
      }] : []),
      ...(screenType === 'qled' ? [{
        text: {
          query: ["oled", "led"],
          path: [
            'productSpec.Display Technology', 
            'productSpec.Television Type'
          ],
        }
      }] : []),
    ];

    // Only add the $search stage if there are conditions to evaluate
    if (mustClauses.length > 0) {
      const searchStage = {
        $search: {
          // the pagination will implement in applciation level, not in the mongodb level
          // ...(pagination ? { searchAfter: pagination } : {}),
          compound: {
            must: mustClauses,
            mustNot: mustNotClauses,
          }
        }
      };
      aggregationPipeline.push(searchStage);
    }

    // Check if the seachStage is processed
    let score;
    if (!pagination) {
      pagination = 1;
    } else {
      pagination = parseInt(pagination) + 1;
    }

    if (mustClauses.length !== 0) {
      score = { $meta: 'searchScore' };
    }

    // Add the match stage for price filtering if minPrice or maxPrice are provided
    if (minPrice && !maxPrice) {
      aggregationPipeline.push({
        $match: {
          productPrice: { $gte: parseInt(minPrice) }
        }
      });
    }

    if (maxPrice && !minPrice) {
      aggregationPipeline.push({
        $match: {
          productPrice: { $lte: parseInt(maxPrice) }
        }
      });
    }

    if (minPrice && maxPrice) {
      aggregationPipeline.push({
        $match: {
          productPrice: { $gte: parseInt(minPrice), $lte: parseInt(maxPrice) }
        }
      });
    }

    // Add the match stage for screen size filtering if minSreenSize or maxScreenSize are provided
    if (minScreenSize && !maxScreenSize) {
      aggregationPipeline.push({
        $match: {
          'productSpec.Screen Size': { $gte: parseInt(minScreenSize) }
        }
      });
    }

    if (maxScreenSize && !minScreenSize) {
      aggregationPipeline.push({
        $match: {
          'productSpec.Screen Size': { $lte: parseInt(maxScreenSize) }
        }
      });
    }

    if (minScreenSize && maxScreenSize) {
      aggregationPipeline.push({
        $match: {
          'productSpec.Screen Size': { $gte: parseInt(minScreenSize), $lte: parseInt(maxScreenSize) }
        }
      });
    }


    // Sort by product rating in descending order before grouping
    if (sortBy === 'rating') {
      aggregationPipeline.push({ $sort: { 'productReview.rating': -1 } });
    }

    if (sortBy === 'price') {
      aggregationPipeline.push({ $sort: { productPrice: 1 } });
    }

    if (sortBy === 'popularity') {
      aggregationPipeline.push({ $sort: { 'productReview.reviewCount': -1 } });
    }

    // If sortBy is provided, then no need to using group stage to distribute the products by brand
    if (sortBy) {
      if (fullDetails === 'true' || !fullDetails) {
        aggregationPipeline.push({
          $project: {
            productName: 1,
            productPrice: 1,
            productShortSpec: 1,
            productSpec: 1,
            productFeatures: 1,
            productImageList: 1,
            productRating: "$productReview.rating",
            productReviewCount: "$productReview.reviewCount",
            score: { $ifNull: [ "$score", 0 ] },
            paginationToken: { $literal: pagination }
          }
        });
      }

      if (fullDetails === 'false') {
        aggregationPipeline.push({
          $project: {
            productName: 1,
            productPrice: 1,
            productImageList: 1,
            productRating: "$productReview.rating",
            productReviewCount: "$productReview.reviewCount",
            score: { $ifNull: [ "$score", 0 ] },
            paginationToken: { $literal: pagination }
          }
        });
      }
    } 

    if (!sortBy) {
      // Add a group stage to collect products by brand
      if (fullDetails === 'true' || !fullDetails) {
        aggregationPipeline.push({
          $group: {
            _id: '$productSpec.Brand',
            products: {
              $push: {
                _id: '$_id',
                productName: '$productName',
                productPrice: '$productPrice',
                productShortSpec: '$productShortSpec',
                productSpec: '$productSpec',
                productFeatures: '$productFeatures',
                productImageList: '$productImageList',
                productRating: "$productReview.rating",
                productReviewCount: "$productReview.reviewCount",
                score: score,
                paginationToken: pagination
              }
            }
          }
        });
      }

      if (fullDetails === 'false') {
        aggregationPipeline.push({
          $group: {
            _id: '$productSpec.Brand',
            products: {
              $push: {
                _id: '$_id',
                productName: '$productName',
                productPrice: '$productPrice',
                productImageList: '$productImageList',
                productRating: "$productReview.rating",
                productReviewCount: "$productReview.reviewCount",
                score: score,
                paginationToken: pagination
              }
            }
          }
        });
      }

      // Add a sort stage after grouping to sort the groups by brand in ascending order
      aggregationPipeline.push({
        $sort: { _id: 1 } // Sort by _id (brand) in ascending order
      });
    }
    

    // Add the limit and projection stages
    aggregationPipeline.push({ "$limit": limit ? parseInt(limit) * 5 : 50 });
    // console.log('aggregationPipeline:', aggregationPipeline);
    // console.log(aggregationPipeline[1]['$match']);

    let results;
    if (sortBy) {
      // Execute the aggregation pipeline
      results = await productModel.aggregate(aggregationPipeline);
    }

    if (!sortBy) {
      // Execute the aggregation pipeline
      let groupResults = await productModel.aggregate(aggregationPipeline);
      // console.log('groupResults:', groupResults);

      // For refine the search
      // let maxScore = 0;
      // maxScore = groupResults.reduce((max, group) => {
      //   return Math.max(max, group.products.reduce((max, product) => {
      //     return Math.max(max, product.score);
      //   }, 0));
      // }, 0);

      // let minScore = 0;
      // minScore = groupResults.reduce((min, group) => {
      //   return Math.min(min, group.products.reduce((min, product) => {
      //     return Math.min(min, product.score);
      //   }, 0));
      // }, 0);

      // console.log('maxScore:', maxScore);
      // console.log('minScore:', minScore);

      // Flatten the group results into a single array
      results = [];
      let maxGroupSize = Math.max(...groupResults.map(group => group.products.length));
      for (let i = 0; i < maxGroupSize; i++) {
        groupResults.forEach(group => {
          // Check if there is a product at index i
          if (group.products[i]) { 
            results.push(group.products[i]);
          }
        });
      }
    }

    // Add filtering condition info into the results
    let filteringCondition = {
      features: features,
      minPrice: minPrice,
      maxPrice: maxPrice,
      minScreenSize: minScreenSize,
      maxScreenSize: maxScreenSize,
      brand: brand,
      screenType: screenType,
      resolution: resolution,
      refreshRate: refreshRate,
      connectivity: connectivity,
      smartTVPlatform: smartTVPlatform,
      supportedService: supportedService,
      features: features,
      sortBy: sortBy
    };

    // remove the empty fields
    Object.keys(filteringCondition).forEach(key => filteringCondition[key] === undefined && delete filteringCondition[key]);

    // The product's prodcutFeatures and productDetail are json string, need to convert to object
    // For now, the filtering api will not contain productDetail, so no need to parse it
    results = results.map(result => {
      if (result.productFeatures) {
        result.productFeatures = JSON.parse(result.productFeatures);
        result.filteringCondition = filteringCondition;
      }
      // result.productDetail = JSON.parse(result.productDetail);
      return result;
    });

    // Add the limit after the aggregation  (if limit is provided)
    if (limit) {
      const intLimit = parseInt(limit, 10);
      const intPagination = parseInt(pagination, 10) - 1; // Assuming pagination starts from 1, adjust for zero-index.
    
      const startIndex = intPagination * intLimit;
      const endIndex = startIndex + intLimit; // No need to subtract 1 due to how slice() works.
    
      // console.log(startIndex, endIndex - 1); // endIndex - 1 because slice() is non-inclusive at the end.
      results = results.slice(startIndex, endIndex);
    }

    // Check if result is empty, if it is, just return a array that contains the filtering condition
    if (results.length === 0) {
      const defaultObject = {
        noResult: true,
        filteringCondition: filteringCondition
      };
      results.push(defaultObject);
    }

    
    // console.log('results:', results);
    // convert results to JSON string
    res.send(results);
  } catch (error) {
    console.log(error);
    res.status(500).send(`Internal Server Error: ${error}`);
  }
});

router.get('/:productId', async (req, res) => {
  const { productId } = req.params;
  let { excludeReview } = req.query;
  // if the excludeReview is not provided, set it to false
  if (!excludeReview) {
    excludeReview = false;
  }

  // Convert the string to boolean
  excludeReview = excludeReview === 'true';

  // Validate productId (assuming it should be a non-empty string; adjust as needed)
  if (!productId) {
    return res.status(400).send('Bad Request: Missing or invalid productId');
  }

  try {
    const product = await productModel.findById(productId);

    // If no product found with the given ID
    if (!product) {
      return res.status(404).send('Not Found: Product does not exist');
    }

    let productDetails;

    // If excludeReview is true, exclude the productReview from the response
    if (excludeReview) {
      productDetails = {
        id: product._id.toString(),
        productName: product.productName,
        productModelCode: product.productModelCode,
        productPrice: product.productPrice,
        productShortSpec: product.productShortSpec,
        productFeatures: JSON.parse(product.productFeatures),
        productImageList: product.productImageList,
        productDetail: JSON.parse(product.productDetail),
        productSpec: product.productSpec
      };
    } else {
      // Preparing the response object
      productDetails = {
        id: product._id.toString(),
        productName: product.productName,
        productModelCode: product.productModelCode,
        productPrice: product.productPrice,
        productShortSpec: product.productShortSpec,
        productFeatures: JSON.parse(product.productFeatures),
        productImageList: product.productImageList,
        productDetail: JSON.parse(product.productDetail),
        productSpec: product.productSpec,
        productReview: product.productReview
      };
    }

    

    // Send the response
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(productDetails));
  } catch (error) {
    console.error(`Internal Server Error: ${error}`);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/:productId/reviews', async (req, res) => {
  const { productId } = req.params;
  // Validate productId (assuming it should be a non-empty string; adjust as needed)
  if (!productId) {
    return res.status(400).send('Bad Request: Missing or invalid productId');
  }

  try {
    const product = await productModel.findById(productId);

    // If no product found with the given ID
    if (!product) {
      return res.status(404).send('Not Found: Product does not exist');
    }

    // Preparing the response object
    const productReview = {
      id: product._id.toString(),
      productName: product.productName,
      productReview: product.productReview
    };

    // Send the response
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(productReview));
  } catch (error) {
    console.error(`Internal Server Error: ${error}`);
    res.status(500).send('Internal Server Error');
  }
});


module.exports = router;
