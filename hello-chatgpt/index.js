const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  apiKey: "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", //process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
const response = openai.createCompletion({
  model: "text-davinci-003",
  prompt: "Say this is a test",
  temperature: 0,
  max_tokens: 7,
});
response
  .then((data) => {
    console.log(data);
  })
  .catch((error) => console.log(error));
// console.log(response);
