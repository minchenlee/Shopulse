const morgan = require('morgan');
const fs = require('fs');
const rfs = require('rotating-file-stream');
const path = require('path');

// Custom token for status codes with color
morgan.token('status', (req, res) => {
  const status = res.statusCode;
  if (status >= 500) {
    return `\x1b[31m${status}\x1b[0m`; // Red color for 5xx status codes
  } else if (status >= 400) {
    return `\x1b[33m${status}\x1b[0m`; // Yellow color for 4xx status codes
  } else if (status >= 300) {
    return `\x1b[36m${status}\x1b[0m`; // Cyan color for 3xx status codes
  } else {
    return `\x1b[32m${status}\x1b[0m`; // Green color for 2xx status codes
  }
});

// None color status code
morgan.token('status-colorless', (req, res) => {
  return res.statusCode;
});

// Custom token for the timestamp
morgan.token('date', (req, res) => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
});

// Custom token for the user ID
morgan.token('user-id', (req, res) => {
  return req.query ? req.query.userId : 'anonymous';
});

// Define a custom log format
const logFormat = ':date[iso] :method :url :status :response-time ms - :res[content-length] - :user-id';

// Create the Morgan middleware configured with your custom format
const consoleLogger = morgan(logFormat, {
  // skip: function (req, res) {
  //   // Skip logging if the userId is 'anonymous' or not present
  //   const userId = req.query ? req.query.userId : 'anonymous';
  //   return userId === 'anonymous' || !userId;
  // }
});


// Create a write stream (in append mode)
const accessLogStream = rfs.createStream('access.log', {
  interval: '6h', // rotate daily
  path: path.join(__dirname, '..', 'logs'), // Log directory path in the parent folder
});

// Setup Morgan for file logging in JSON format
const fileLogger = morgan((tokens, req, res) => {
  const logObject = {
    timestamp: tokens.date(req, res, 'iso'),
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: tokens['status-colorless'](req, res),
    responseTime: tokens['response-time'](req, res) + ' ms',
    contentLength: tokens.res(req, res, 'content-length'),
    userId: tokens['user-id'](req, res)
  };
  
  return JSON.stringify(logObject);
}, { stream: accessLogStream });



module.exports = { consoleLogger, fileLogger };
