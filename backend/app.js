let createError = require('http-errors');
let express = require('express');
let cors = require('cors');
let path = require('path');
let cookieParser = require('cookie-parser');
const morgan = require('morgan');
const { consoleLogger, fileLogger } = require('./middleware/logger');

let dbConnection = require('./db/connection');
let indexRouter = require('./routes/index');
let productRouter = require('./routes/products');
let chatRouter = require('./routes/chat');
let userRouter = require('./routes/user');

let app = express();

// cors
const corsOptions = {
  origin: ['http://shopulse.com.s3-website-ap-northeast-1.amazonaws.com', 'http://localhost:5173', 'https://www.shopulse.shop'],
};
app.use(cors(corsOptions));

// connect to MongoDB
dbConnection();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// log to the console and to a file
app.use(consoleLogger);  // log to the console
app.use(fileLogger);    // log to a file
// app.use(morgan('dev'));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/chat', chatRouter);
app.use('/products', productRouter);
app.use('/user', userRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
