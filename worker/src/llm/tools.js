// Chat Completions tool definitions for the Shopulse TV-shopping assistant.
//
// Source of truth: retrieved 2026-06-03 VERBATIM from the legacy OpenAI Assistant
// (asst_AZhXc7RUq6EnxtL9nCNkfe4q) via openai.beta.assistants.retrieve(...).tools.
// The Assistant already stored these in the Chat Completions NESTED shape
// ({ type:'function', function:{ name, description, parameters } }) — the same shape
// Chat Completions expects — so they copy across unchanged.
//
// GROQ GOTCHA (verified by live probe 2026-06-03): Groq's tool-use validator returns
// HTTP 400 "Failed to call a function" when a param uses JSON-schema `enum`. These defs
// describe allowed values in `description` text instead of `enum` — keep it that way.
//
// Param names match data/src/products.js buildParams() (keyword, brand, screenType,
// resolution, refreshRate, minPrice/maxPrice, minScreenSize/maxScreenSize, connectivity,
// smartTVPlatform, supportedService, features, sortBy). The tool runner maps these to the
// search_products RPC. Do NOT rename params — the model + data layer agree on these keys.
export const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_product_details',
      description:
        'Retrieve detailed information about a specific product by its product ID, including technical specifications, pricing, and availability.',
      parameters: {
        type: 'object',
        properties: {
          productId: {
            type: 'string',
            description: 'The unique ID of the product for which detailed information is requested.',
          },
        },
        required: ['productId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'filter_products',
      description:
        'Filter televisions based on specific criteria such as brand, screen type, resolution, refresh rate, screen size, connectivity, smart TV platform, supported services, price range, and sort by top rating, best seller, or price.  When place user\'s query into function parameters be sure it is logical to place, if not, use the search products function instead. for example, the HDR should not place in resolution.',
      parameters: {
        type: 'object',
        properties: {
          features: {
            type: 'string',
            description: '(Optional) Specify one special feature at a time (e.g., HDR, Smart Home integration, Gaming mode).',
          },
          brand: {
            type: 'string',
            description: '(Optional) Brand of the product.',
          },
          screenType: {
            type: 'string',
            description: '(Optional) Type of screen (e.g., LED, OLED).',
          },
          resolution: {
            type: 'string',
            description: '(Optional) Screen resolution (e.g., 1080p, 4K). `HDR` should not put here.',
          },
          refreshRate: {
            type: 'string',
            description: '(Optional) Refresh rate (e.g., 60Hz, 120Hz).',
          },
          connectivity: {
            type: 'string',
            description: '(Optional) Connectivity options (e.g., HDMI, Bluetooth).',
          },
          smartTVPlatform: {
            type: 'string',
            description: '(Optional) Smart TV platform (e.g., Android TV, Roku).',
          },
          supportedService: {
            type: 'string',
            description: '(Optional) Supported streaming services (e.g., Netflix, Amazon Prime).',
          },
          minPrice: {
            type: 'number',
            description: 'Minimum price. Use this in conjunction with maxPrice to define a price range.',
          },
          maxPrice: {
            type: 'number',
            description: 'Maximum price. Always use this parameter together with minPrice to specify the full price range.',
          },
          minScreenSize: {
            type: 'number',
            description: 'Minimum screen size. Use this in conjunction with maxScreenSize to define the range of screen sizes you are interested in.',
          },
          maxScreenSize: {
            type: 'number',
            description: 'Maximum screen size. Always use this parameter together with minScreenSize to specify the full range of screen sizes.',
          },
          sortBy: {
            type: 'string',
            description: '(Optional) Criterion for sorting the results. Prefer not using this. Acceptable values include `rating` for top-rated products, `popularity` for best-selling products, and `price` for sorting by price in ascending order.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_product_reviews',
      description: 'Retrieve all reviews and ratings of a specified product by its product ID.',
      parameters: {
        type: 'object',
        properties: {
          productId: {
            type: 'string',
            description: 'The unique identifier of the product for which to retrieve reviews and ratings.',
          },
        },
        required: ['productId'],
      },
    },
  },
];
