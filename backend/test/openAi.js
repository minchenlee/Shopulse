
require('dotenv').config();
const { Configuration, OpenAIApi } = require("openai");

async function openAiInterface(prePrompt, text){
  try{
    // set up the OpenAI API
    const configuration = new Configuration({
      organization: process.env.ORGANIZATION,
      apiKey: process.env.OPENAI_API_KEY,
    });

    const messages = [
      {"role": "system", "content": prePrompt},
      {role: "user", content: text}
    ];
    
    // fake data
    const data = 'Sure, here are some product that I recommend for you.'
    return {data: data};

    // To really use the API, uncomment the following code
    // const openai = new OpenAIApi(configuration);
    // const completion = await openai.createChatCompletion({
    //   model: "gpt-3.5-turbo",
    //   messages: [
    //     {"role": "system", "content": prePrompt},
    //     {role: "user", content: text}],
    // });
    // console.log(completion.data);
    
    // return {data: completion.data};
  }
  
  catch(error){
    console.log(error);
    return {message: 'error'};
  }
}

const prePrompt = 'You are an customer service agent. You are talking to a customer who is searching for a product. You are trying to help them find the product they are looking for.'
const text = 'I am looking for a product that will help me with my back pain.';

// openAiInterface(prePrompt, text);

module.exports = openAiInterface;