const express = require('express');
const mongoose = require('mongoose');
const validateSearchParams = require('../middleware/validate_search_params');
const productModel = require('../db/model/product');
let router = express.Router();

router.get('/search', validateSearchParams, async (req, res) => {
  const { keyword, limit, pagination, minPrice, maxPrice, brand, screenType, resolution, refreshRate, screenSize, connectivity, smartTVPlatform, supportedService } = req.query;
  // console.log('query:', keyword);

  try {
    let results = await productModel.aggregate([
      {
        $search: {
          searchAfter: pagination ? pagination : null,
          compound: {
            must: [
              {
                text: {
                  query: keyword,
                  path: [
                    'productName', 
                    'productShortSpec', 
                    'productFeatures', 
                    'productDetail'
                  ],
                }
              },
            ],
            should: [
              // Add a match stage for brand, screenType, resolution, refreshRate, priceRange, screenSize, connectivity, smartTVPlatform, supportedService
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
                  path: 'productSpec.RefreshRate',
                  fuzzy: {}
                }
              }] : []),
              ...(screenSize ? [{
                text: {
                  query: screenSize,
                  path: 'productSpec.Screen Size',
                  fuzzy: {}
                }
              }] : []),
              ...(connectivity ? [{
                text: {
                  query: connectivity,
                  path: [
                    'productSpec.Inputs & Outputs', 
                    'productSpec.Features', 
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
            ]
          }
        }
      }, 
      // Add a match stage for price filtering (if minPrice and maxPrice are provided)
      ...(minPrice || maxPrice ? [{
        $match: {
          ...(minPrice && { productPrice: { $gte: parseInt(minPrice) } }),
          ...(maxPrice && { productPrice: { $lte: parseInt(maxPrice) } }),
        }
      }] : []),
      {
        "$limit": limit ? parseInt(limit) : 10
      },
      {
        $project: {
          productName: 1,
          productPrice: 1,
          productShortSpec: 1,
          productSpec: 1,
          productFeatures: 1,
          productImageList: 1,
          score: { $meta: 'searchScore' },
          paginationToken: { $meta : 'searchSequenceToken' }
        }
      }
    ]);

    // prodcutFeatures and productDetail are json string, need to convert to object
    results = results.map(result => {
      result.productFeatures = JSON.parse(result.productFeatures);
      // result.productDetail = JSON.parse(result.productDetail);
      return result;
    });
    
    // convert results to JSON string
    // res.send(JSON.stringify(results, null, 2));
    res.send(results);
  } catch (error) {
    res.status(500).send(`Internal Server Error: ${error}`);
  }
});

router.get('/filter', validateSearchParams, async (req, res) => {
  let { limit, pagination } = req.query;
  const { minPrice, maxPrice, brand, screenType, resolution, refreshRate, screenSize, connectivity, smartTVPlatform, supportedService, features, sortBy } = req.query;

  if (!limit) {
    limit = 3;
  }

  try {
    let aggregationPipeline = [];

    // Dynamically build the should array based on provided query parameters
    let shouldClauses = [
      // Add a match stage for brand, screenType, resolution, refreshRate, priceRange, screenSize, connectivity, smartTVPlatform, supportedService  
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
          fuzzy: {}
        }
      }] : []),
      ...(screenSize ? [{
        text: {
          query: screenSize,
          path: 'productSpec.Screen Size',
          fuzzy: {}
        }
      }] : []),
      ...(connectivity ? [{
        text: {
          query: connectivity,
          path: [
            'productSpec.Inputs & Outputs', 
            'productSpec.Features', 
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
            'productFeatures',
            'productSpec.Features'
          ],
          fuzzy: {}
        }
      }] : []),
    ];

    // Only add the $search stage if there are conditions to evaluate
    if (shouldClauses.length > 0) {
      const searchStage = {
        $search: {
          // the pagination will implement in applciation level, not in the mongodb level
          // ...(pagination ? { searchAfter: pagination } : {}),
          compound: {
            should: shouldClauses
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

    if (shouldClauses.length !== 0 && sortBy) {
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

    if (!sortBy) {
      // Add a group stage to collect products by brand
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
              score: score,
              paginationToken: pagination
            }
          }
        }
      });

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

      // Flatten the group results into a single array
      results = [];
      let maxGroupSize = Math.max(...groupResults.map(group => group.products.length));
      for (let i = 0; i < maxGroupSize; i++) {
        groupResults.forEach(group => {
          if (group.products[i]) { // Check if there is a product at index i
            results.push(group.products[i]);
          }
        });
      }
    }

    // Remove the result before the pagination token
    if (pagination) {
      results = results.slice(parseInt(pagination));
    }

    // The product's prodcutFeatures and productDetail are json string, need to convert to object
    // For now, the filtering api will not contain productDetail, so no need to parse it
    results = results.map(result => {
      result.productFeatures = JSON.parse(result.productFeatures);
      // result.productDetail = JSON.parse(result.productDetail);
      return result;
    });

    // May reconsider the following logic, cause the threshold is differ from each search
    // Filter out those score is under 0.05, if the search stage is processed
    // if (shouldClauses.length !== 0) {
    //   results = results.filter(result => result.score > 0.5);
    // }

    // Add the limit after the aggregation  (if limit is provided)
    if (limit) {
      // console.log(pagination, pagination + parseInt(limit));
      results = results.slice(pagination, pagination + parseInt(limit));
    }

    // console.log('results:', results);

    // convert results to JSON string
    res.send(results);
  } catch (error) {
    res.status(500).send(`Internal Server Error: ${error}`);
  }
});

router.get('/:productId', async (req, res) => {
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
    const productDetails = {
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

    // Send the response
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(productDetails));
  } catch (error) {
    console.error(`Internal Server Error: ${error}`);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
