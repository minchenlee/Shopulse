const fs = require('fs');
const {formatProductDetail} = require('../formatting.js');

// const result = formatProductDetail([
//     "Visit the LG Brand Showcase at Walmart.com to learn more about LG's full list of products at Walmart https://www.walmart.com/cp/lg/1589293",
//     'web0S22 - Customize your viewing experience with separate accounts and personalized recommendations for every member of your family.',
//     'Ultimate Streaming - Find your favorites fast with built-in access to Netflix, the Apple TV app, Disney+, HBO Max* and instant access to over 300+ free LG Channels** with everything from comedy to movies to sports.',
//     'α5 Gen5 AI Processor - Enhance your picture and sound with AI from the a5 Gen 5 AI Processor 4K.',
//     'LG Channels - Discover something new or find your favorites with free access to programming on over 300+ LG Channels**.',
//     'Game-Changing Specs - Enjoy high-speed HDR gaming with the latest gaming specifications, including ALLM, eARC and HGiG. An enhanced audio system helps you become even more immersed in the game.',
//     'Game Optimizer & Dashboard - Make it the best gaming experience by quickly adjusting all your game settings in one location.',
//     'Real 4K UHD TV - Everything you need to bring your favorite content to life with the power of 4K and the extras you crave.',
//     'Active HDR (HDR10 Pro) - Enjoy scene-by-scene picture adjustment to automatically adjust the quality of what you’re watching.',
//     'Sports Alert - Never miss a moment with real-time updates from your favorite teams and most important matches.\n' +
//       '\n'
//   ]
// )

// console.log(result);


// open productInfo.json
const productInfo = fs.readFileSync('result/productInfo.json', 'utf8');



console.log(productInfo);

