/**
 * 爲 endpoint '/search' 的 query parameters 做 validation
 * @param {Object} params - The query parameters object from the request.
 * @returns {Object} - An object containing a boolean 'isValid' flag and an 'errorMessage' string.
 */

function validateSearchParams(req, res, next) {
  const params = req.query;
  const forFilter = req.path.includes('/filter'); // Automatically determine if this is for filter based on the path

  // Perform your existing validations here
  // Adjusted to use req.query directly and structured for middleware usage
  const { keyword, limit, minPrice, maxPrice, minScreenSize, maxScreenSize, brand, screenType, resolution, refreshRate, connectivity, smartTVPlatform, supportedService, sortBy, fullDetails } = params;

  if (!keyword && !forFilter) {
    return res.status(400).send({ error: 'Missing parameter: keyword is required.' });
  }

  // limit validation
  if (limit && isNaN(parseInt(limit))) {
    return res.status(400).send({ error: 'Invalid parameter: limit must be a number.' });
  }

  // limit must be less than or equal to 30
  if (limit > 30) {
    return res.status(400).send({ error: 'Invalid parameter: limit must be less than or equal to 30.' });
  }

  // minPrice and maxPrice validation
  if ((minPrice && isNaN(parseFloat(minPrice))) || (maxPrice && isNaN(parseFloat(maxPrice)))) {
    return res.status(400).send({ error: 'Invalid parameter: minPrice and maxPrice must be numbers.' });
  }
  
  // minPrice must be less than or equal to maxPrice
  if (parseInt(minPrice) > parseInt(maxPrice)) {
    return res.status(400).send({ error: 'Invalid parameter: minPrice must be less than or equal to maxPrice.' });
  }

  // minSreenSize and maxScreenSize validation
  if ((minScreenSize && isNaN(parseInt(minScreenSize))) || (maxScreenSize && isNaN(parseInt(maxScreenSize)))) {
    return res.status(400).send({ error: 'Invalid parameter: minScreenSize and maxScreenSize must be numbers.' });
  } 

  // minScreenSize must be less than or equal to maxScreenSize
  if (parseInt(minScreenSize) > parseInt(maxScreenSize)) {
    return res.status(400).send({ error: 'Invalid parameter: minScreenSize must be less than or equal to maxScreenSize.' });
  }

  // sortBy validation
  if (sortBy && !['price', 'rating', 'popularity'].includes(sortBy)) {
    return res.status(400).send({ error: 'Invalid parameter: sortBy must be one of "price", "rating", or "popularity".' });
  }

  // fullDetails validation
  if (fullDetails && fullDetails !== 'true' && fullDetails !== 'false') {
    return res.status(400).send({ error: 'Invalid parameter: fullDetails must be a boolean.' });
  }

  // filter parameters validation
  // brand, screenType, resolution, refreshRate, screenSize, connectivity, smartTVPlatform, supportedService validation
  const supportedFilterParams = ['brand', 'screenType', 'resolution', 'refreshRate', 'connectivity', 'smartTVPlatform', 'supportedService', 'features'];
  for (let param of supportedFilterParams) {
    if (params[param] && typeof params[param] !== 'string') {
      return res.status(400).send({ error: `Invalid parameter: ${param} must be a string.` });
    }
  }

  // when forFilter is true, check if at least one filter parameter is provided
  if (params.length === 0 && forFilter) {
    return res.status(400).send({ error: `Invalid parameter: at least one filter parameter is required.` });
  }

  // Unsupported parameters validation
  const supportedParams = ['userId', 'pagination', 'keyword', 'limit', 'minPrice', 'maxPrice', 'minScreenSize', 'maxScreenSize', 'sortBy', 'fullDetails', ...supportedFilterParams];
  const unsupportedParams = Object.keys(params).filter(param => !supportedParams.includes(param));
  if (unsupportedParams.length > 0) {
    return res.status(400).send({ error: `Unsupported parameter(s): ${unsupportedParams.join(', ')}.` });
  }

  // When handling the multiple query value from the same key, should convert the string into array
  // ex. brand=sony,samsung => brand=['sony', 'samsung']
  // Iterate all the query string and convert them into array
  for (let key in params) {
    params[key] = string2array(params[key]);
  }

  // change the query object to the modified one
  req.query = params;

  // If all validations pass
  next();
}


// Will convert to the array if the query string has multiple values
function string2array(queryString) {
  // check if the queryString has multiple values
  if (queryString.includes(',')) {
    queryString = queryString.split(',');
  }

  return queryString;
}


module.exports = validateSearchParams;
