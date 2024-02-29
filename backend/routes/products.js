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
  const { limit, pagination, minPrice, maxPrice, brand, screenType, resolution, refreshRate, screenSize, connectivity, smartTVPlatform, supportedService } = req.query;

  try {
    let results = await productModel.aggregate([
      {
        $search: {
          searchAfter: pagination ? pagination : null,
          compound: {
            should : [
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

    // product 的 prodcutFeatures 和 productDetail 是 json string，要轉成 object
    results = results.map(result => {
      result.productFeatures = JSON.parse(result.productFeatures);
      // result.productDetail = JSON.parse(result.productDetail);
      return result;
    });

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
