//In ai.js
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
    apiKey: "API_KEY_HERE",
});
const openai = new OpenAIApi(configuration);
async function chat(prompt) {
    let answer;
    try {
        const response = await openai.createChatCompletion({
            model: "gpt-4",
            messages: prompt,
        });
        answer = response.data.choices[0].message.content;
    } catch (error) {
        answer = "Error: " + error.response.data.error.message;
    }

    return answer;
}

async function image(prompt) {
    let answer;
    try {
        const response = await openai.createImage({
            prompt: prompt,
            n: 1,
            size: "1024x1024",
        });
        answer = response.data.data[0].url;
    } catch (error) {
        answer = "Error: " + error.response.data.error.message;
    }

    return answer;
}

//Export the "chat" function
module.exports = {
    chat, image
};