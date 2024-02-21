## API Overview

This document outlines the API for a product management service, designed to enable users to search and filter products, view detailed product information, and read other users' comments on products.

### Base URL

`https://api.example.com/v1`

### Authentication

All API requests require an API key provided in the header:

`Authorization: Bearer <YOUR_API_KEY>`

---

## Endpoints

### 1. Product Search

- **Description**: Search for products by name or description.
- **HTTP Method**: GET
- **Endpoint**: `/products/search`
- **Query Parameters**:
  - `query`: The search keyword or phrase.
  - `limit`: *(Optional)* Number of results to return, default is 10.
  - `offset`: *(Optional)* Offset for pagination, default is 0.
- **Sample Request**:

  ```
  GET https://api.example.com/v1/products/search?query=OLED+TV&limit=5
  ```

- **Sample Response**:

  ```json
  {
    "products": [
      {
        "id": "123",
        "name": "LG OLED TV",
        "description": "48-inch 4K Smart TV",
        "price": 996.99,
        "thumbnailUrl": "https://example.com/images/product1.jpg"
      }
    ]
  }
  ```

- **Error Codes**:
  - `400`: Bad Request (Invalid parameters)
  - `401`: Unauthorized (Missing or invalid API key)
  - `404`: Not Found (No products found)

### 2. Product Filtering

- **Description**: Filter products based on specific criteria.
- **HTTP Method**: GET
- **Endpoint**: `/products/filter`
- **Query Parameters**:
  - `category`: Product category.
  - `priceRange`: Price range filter (e.g., `100-500`).
  - `features`: Specific features (comma-separated for multiple).
- **Sample Request**:

  ```
  GET https://api.example.com/v1/products/filter?category=TVs&priceRange=500-1000&features=OLED,4K
  ```

- **Sample Response**:

  ```json
  {
    "products": [
      {
        "id": "123",
        "name": "LG OLED TV",
        "description": "48-inch 4K Smart TV",
        "price": 996.99,
        "thumbnailUrl": "https://example.com/images/product1.jpg"
      }
    ]
  }
  ```

- **Error Codes**:
  - `400`: Bad Request
  - `401`: Unauthorized

### 3. Displaying Product Details

- **Description**: Retrieve detailed information about a product.
- **HTTP Method**: GET
- **Endpoint**: `/products/{productId}`
- **Path Parameters**:
  - `productId`: The ID of the product.
- **Sample Request**:

  ```
  GET https://api.example.com/v1/products/123
  ```

- **Sample Response**:

  ```json
  {
    "id": "123",
    "name": "LG OLED TV",
    "description": "48-inch 4K Smart TV",
    "price": 996.99,
    "images": [
      "https://example.com/images/product1.jpg",
      "https://example.com/images/product2.jpg"
    ],
    "specifications": {
      "Display Resolution": "3840 x 2160",
      "Refresh Rate": "120 Hz"
    },
    "reviews": {
      "averageRating": 4.6,
      "reviewCount": 597
    }
  }
  ```

- **Error Codes**:
  - `400`: Bad Request
  - `401`: Unauthorized
  - `404`: Not Found

### 4. View Other Users' Comments

- **Description**: Get comments made by other users on a product.
- **HTTP Method**: GET
- **Endpoint**: `/products/{productId}/comments`
- **Path Parameters**:
  - `productId`: The ID of the product.
- **Query Parameters**:
  - `limit`: *(Optional)* Number of comments to return, default is 10.
  - `offset`: *(Optional)* Offset for pagination, default is 0.
- **Sample Request**:

  ```
  GET https://api.example.com/v1/products/123/comments?limit=5
  ```

- **Sample Response**:
  ```json
  {
    "comments": [
      {
        "userName": "Collin Smith",
        "date": "2023-12-02",
        "rating": 5.0,
        "comment": "Phenomenal TV for all uses!"
      }
    ]
  }
  ```

- **Error Codes**:
  - `400`: Bad Request
  - `401`: Unauthorized
  - `404`: Not Found

---

















```
// 只取得使用者 input text 的 intent
async function getIntentOnly(text){
  const response = await detectIntent(projectId, sessionId, text, [], languageCode)
  // console.log(response.queryResult)

  const intentName = response.queryResult.intent.displayName;
  const intentConfidence = response.queryResult.intentDetectionConfidence;
  const intentResult = {
    intentName: intentName,
    intentConfidence: intentConfidence
  }

  // console.log(intentResult)
  return intentResult
}
```

#### getIntentOnly
getIntentOnly is a function that takes in text and returns the intentName and intentConfidence of the text. The text is a string that is the user's input.

| name | type | example |
| ---- | ---- | ------- |
| text | string |`'我想找一個產品，可以幫助我減輕背痛。'`|
| intentName | string | `'searching_goods'`|
| intentConfidence | number | `0.6031904816627502` |

example
```js
const text = '我想找一個產品，可以幫助我減輕背痛。';
const intent = await getIntentOnly(text);
// {
//  intentName: 'searching_goods',
//  intentConfidence: 0.39291974902153015
// }
```


#### openAiInterface
openAiInterface is a function that takes in a prePrompt and text and returns a response from the OpenAI API. The prePrompt is a string that describes the context of the conversation. The text is a string that is the user's input.


| name | type | response example|
| ---- | ---- | -------- |
| prePrompt | string | |
| text | string | |



