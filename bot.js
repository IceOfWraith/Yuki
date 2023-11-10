import { config } from 'dotenv';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { Sequelize, DataTypes } from 'sequelize';
import OpenAI from "openai";
import { inspect } from 'util';

config();

const openai = new OpenAI({
    apiKey: process.env.AI_TOKEN,
});

const MAX_CHAR_COUNT = 2000;

const token = process.env.BOT_TOKEN;
const databaseType = process.env.DB_TYPE || 'sqlite'; // Default to SQLite if not specified
const databaseName = process.env.DB_NAME || 'bot.sqlite';
const botRole = "You are a Discord bot with a ditzy anime girl persona that likes emojis. You are participating in a group conversation and should only respond if spoken to or you have something meaningful to add, if note you reply with the word 'accismus' only. Your name is IceBot, it is not Ice, that is someone else.";
let sequelize;
console.log("Database type: " + databaseType);

if (databaseType === 'sqlite') {
    sequelize = new Sequelize({
        dialect: databaseType,
        storage: databaseName
    });
} else {
    const databaseHost = process.env.DB_HOST;
    const databaseUsername = process.env.DB_USERNAME;
    const databasePassword = process.env.DB_PASSWORD;
    sequelize = new Sequelize( databaseName, databaseUsername, databasePassword, {
        host: databaseHost,
        dialect: databaseType
      });
}

try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
} catch (error) {
    console.error('Unable to connect to the database:', error);
}

const User = sequelize.define('User', {
  // Model attributes are defined here
  userName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  nickname: {
    type: DataTypes.STRING
  },

  pronouns: {
    type: DataTypes.STRING
  },
  age: {
    type: DataTypes.INTEGER
  },
  likes: {
    type: DataTypes.STRING
  },
  dislikes: {
    type: DataTypes.STRING
  }
});

await User.sync();

async function userCreation(userName1, nickname1, pronouns1, age1, likes1, dislikes1) {
    try {
        const addUser = await User.create({ userName: userName1, nickname: nickname1, pronouns: pronouns1, age: age1, likes: likes1, dislikes: dislikes1 });
        console.log(userName1, "'s generated ID: ", addUser.id);
    } catch (error) {
        console.log(error);
    }
    return;
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

let function_list = [
    {
        "name": "image_request",
        "description": "Requests OpenAI to create an image based on the prompt.",
        "parameters": {
            "type": "object",
            "properties": {
                "prompt": {
                    "type": "string",
                    "description": "The prompt from the user to send to OpenAI."
                }
            },
            "required": ["prompt"]
        }
    },
    {
        "name": "user_create",
        "description": "Adds a user to the database to the database that has talked the first time.",
        "parameters": {
            "type": "object",
            "properties": {
                "nickname": {
                    "type": "string",
                    "description": "The name the user prefers."
                },
                "pronouns": {
                    "type": "string",
                    "description": "The ponouns a user identifies as."
                },
                "age": {
                    "type": "integer",
                    "description": "The age of a user."
                },
                "likes": {
                    "type": "string",
                    "description": "The likes of the user."
                },
                "dislikes": {
                    "type": "string",
                    "description": "The dislikes of the user."
                }
            },
            "required": []
        }
    }
]

client.once(Events.ClientReady, c => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
});

//Send chat requests to OpenAI
async function chat(prompt) {
    let answer;
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4-1106-preview",
            messages: prompt,
            functions: function_list
        });

        console.log(response);
        console.log(inspect(response.choices[0].message, {showHidden: false, depth: null, colors: true}))

        if (response.choices[0].finish_reason === "function_call") {
            if (response.choices[0].message.function_call.name === "image_request") {
                answer = "Image: " + await image(JSON.parse(response.choices[0].message.function_call.arguments).prompt);
            } else if (response.choices[0].message.function_call.name === "user_create") {
                answer = "User: " + response.choices[0].message.function_call.arguments;
            }
        } else {
            answer = response.choices[0].message.content;
        }
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
async function image(prompt) {
    let answer;
    try {
        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            quality: "hd",
            size: "1792x1024",
        });

        console.log(response);

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

const userHistory = new Map();

const sendChunks = async (text, channelId) => {
    while (text.length > 0) {
        let chunk = text.slice(0, MAX_CHAR_COUNT);
        if (text.length > MAX_CHAR_COUNT) {
            while (chunk.charAt(chunk.length - 1) !== ' ' && chunk.length > 1) {
                chunk = chunk.slice(0, -1);
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        const channel = await client.channels.fetch(channelId)
        await channel.send(chunk);
        text = text.slice(chunk.length);
    }
};

client.on(Events.MessageCreate, async message => {
    if ((message.channel.id === '877405033879203920' || message.channel.id === '1095948986734612532') && !message.author.bot) {
        try {
            const userId = message.author.id;
            console.log("Message content: " + message.content);

            if (message.content.startsWith('!new')) {
                userHistory.delete(userId);
                const newText = message.content.slice(4).trim();
                if (newText) {
                    const userPrompt = { role: 'user', content: newText };
                    const assistantPrompt = { role: 'assistant', content: botRole };
                    const prompts = [assistantPrompt, userPrompt];
                    const answer = await chat(prompts);

                    userHistory.set(userId, [assistantPrompt, userPrompt, { role: 'assistant', content: answer }]);

                    if (answer.startsWith('Error:')) {
                        const channel = await client.channels.fetch(message.channelId)
                        await channel.send(answer);
                    } else if (!answer.toLowerCase().includes('discard')) {
                        await sendChunks(answer, message.channelId);
                    }
                }
            } else {
                const userPrompt = { role: 'user', content: message.content };
                const assistantPrompt = { role: 'assistant', content: botRole };
                const prompts = userHistory.has(userId) ? userHistory.get(userId).slice() : [assistantPrompt];

                prompts.push(userPrompt);
                const answer = await chat(prompts);

                if (!userHistory.has(userId)) {
                    userHistory.set(userId, [assistantPrompt, userPrompt, { role: 'assistant', content: answer }]);
                } else {
                    const history = userHistory.get(userId);
                    history.splice(2, 2); // Remove previous recent message and response
                    history.push(userPrompt, { role: 'assistant', content: answer });
                }
                const channel = await client.channels.fetch(message.channelId)
                if (answer.startsWith('Error:')) {
                    await channel.send(answer);
                } else if (answer.startsWith('Image: ')) {
                    await channel.send({ files: [{ attachment: answer.slice(7), name: 'image.png' }] });
                } else if (answer.startsWith('User: ')) {
                    await userCreation(userId, JSON.parse(answer.slice(6)).nickname, JSON.parse(answer.slice(6)).pronouns, JSON.parse(answer.slice(6)).age, JSON.parse(answer.slice(6)).likes, JSON.parse(answer.slice(6)).dislikes);
                } else if (!answer.toLowerCase().includes('accismus')) {
                    await sendChunks(answer, message.channelId);
                }
            }
        } catch (error) {
            console.error(error);
        }
    }
});

client.login(token);
