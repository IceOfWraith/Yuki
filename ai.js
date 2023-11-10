import { config } from 'dotenv';
import OpenAI from "openai";

config();

const openai = new OpenAI({
    apiKey: process.env.AI_TOKEN,
});

//Send chat requests to OpenAI
export async function chat(prompt) {
    let answer;
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4-1106-preview",
            messages: prompt,
        });
        answer = response.choices[0].message.content;
    } catch (error) {
        if (error instanceof OpenAI.APIError) {
            console.error(error.status);  // e.g. 401
            console.error(error.message); // e.g. The authentication token you passed was invalid...
            console.error(error.code);  // e.g. 'invalid_api_key'
            console.error(error.type);  // e.g. 'invalid_request_error'
            answer = "Error: " + error.message;
          } else {
            console.log(error);
            answer = "Error: " + error;
          }
    }
    return answer;
}

//Send image requests to OpenAI
export async function image(prompt) {
    let answer;
    try {
        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            quality: "hd",
            size: "1792x1024",
        });
        answer = response.data[0].url;
    } catch (error) {
        if (error instanceof OpenAI.APIError) {
            console.error(error.status);  // e.g. 401
            console.error(error.message); // e.g. The authentication token you passed was invalid...
            console.error(error.code);  // e.g. 'invalid_api_key'
            console.error(error.type);  // e.g. 'invalid_request_error'
            answer = "Error: " + error.message;
          } else {
            console.log(error);
            answer = "Error: " + error;
          }
    }
    return answer;
}
