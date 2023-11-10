import { config } from 'dotenv';
import { Configuration, OpenAIApi } from "openai";

config();

const token = process.env.AI_TOKEN;

const configuration = new Configuration({
    apiKey: token,
});
const openai = new OpenAIApi(configuration);

export async function chat(prompt) {
    let answer;
    try {
        const response = await openai.createChatCompletion({
            model: "gpt-4-1106-preview",
            messages: prompt,
        });
        answer = response.data.choices[0].message.content;
    } catch (error) {
        answer = "Error: " + error.response.data.error.message;
    }

    return answer;
}

export async function image(prompt) {
    let answer;
    try {
        const response = await openai.createImage({
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            quality: "hd",
            size: "1792x1024",
        });
        answer = response.data.data[0].url;
    } catch (error) {
        answer = "Error: " + error.response.data.error.message;
    }

    return answer;
}
