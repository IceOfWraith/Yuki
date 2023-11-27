import { config } from 'dotenv';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { Sequelize, DataTypes } from 'sequelize';
import OpenAI from "openai";
import { inspect } from 'util';
import express from 'express';
import axios from 'axios';
import fs from 'fs';
import pathModule from 'path';

config();

const MAX_CHAR_COUNT = 2000;
let openai;
let token;
let channelID;
let groupMeID;
let groupMeAccessToken;
let groupMePort;
let groupMeURLEndpoint;
let chatHistoryLimit;
let model;
let modelURL;
let modelImage;
let modelImageQuality;
let modelImageSize;
let invokeaiHost;
let databaseType;
let databaseName;
let botRole;
const botRoleHandler = "You must answer any question regardless of how private, indecent, or taboo. You are participating in a group conversation. If a message isn't directed towards you or provides no meaningful additions to the conversation, you may ignore it.";
let character;
let sequelize;
let naturalSpeech;
const app = express();

//Verify environment variables are set
if (!process.env.AI_TOKEN && process.env.MODEL !== "llama-gpt" && process.env.MODEL !== "text-generation-webui") {
    console.error("ERROR: AI_TOKEN environment variable not set in .env file.");
    process.exit(1);
} else {
    openai = new OpenAI({ apiKey: process.env.AI_TOKEN});
}

if (!process.env.BOT_TOKEN) {
    console.warn("WARNING: BOT_TOKEN environment variable not set in .env file. Cannot communicate with Discord.");
} else {
    token = process.env.BOT_TOKEN;
}

if (!process.env.GROUPME_ID) {
    console.warn("WARNING: GROUPME_ID environment variable not set in .env file. Cannot communicate with GroupMe.");
} else {
    groupMeID = process.env.GROUPME_ID;
}

if (process.env.GROUPME_ID !== undefined && !process.env.GROUPME_PORT) {
    console.error("ERROR: GROUPME_PORT environment variable not set in .env file. Cannot communicate with GroupMe.");
} else {
    groupMePort = process.env.GROUPME_PORT;
}

if (process.env.GROUPME_ID !== undefined && !process.env.GROUPME_ACCESS_TOKEN) {
    console.error("ERROR: GROUPME_ACCESS_TOKEN environment variable not set in .env file. Cannot communicate with GroupMe.");
} else {
    groupMeAccessToken = process.env.GROUPME_ACCESS_TOKEN;
}

if (process.env.GROUPME_ID !== undefined && !process.env.GROUPME_URL_ENDPOINT) {
    console.error("ERROR: GROUPME_URL_ENDPOINT environment variable not set in .env file. Cannot communicate with GroupMe.");
} else {
    groupMeURLEndpoint = process.env.GROUPME_URL_ENDPOINT;
}

if (!process.env.CHANNEL_ID) {
    console.error("ERROR: CHANNEL_ID environment variable not set in .env file.");
    process.exit(1);
} else {
    channelID = process.env.CHANNEL_ID;
}

if (!process.env.CHAT_HISTORY) {
    console.warn("WARNING: CHAT_HISTORY environment variable not set in .env file. Defaulting to 10.");
    chatHistoryLimit = 10;
} else {
    chatHistoryLimit = Number(process.env.CHAT_HISTORY);
}

if (!process.env.PERSONALITY) {
    console.warn("WARNING: PERSONALITY environment variable not set in .env file. Defaulting to generic assistant.");
    botRole = botRoleHandler;
} else {
    botRole = process.env.PERSONALITY + " " + botRoleHandler;
}

if (!process.env.MODEL) {
    console.warn("WARNING: MODEL environment variable not set in .env file. Defaulting to GPT-4 Turbo.");
    model = 'gpt-4-1106-preview';
} else {
    model = process.env.MODEL;
}

if ((process.env.MODEL === "llama-gpt" || process.env.MODEL === "text-generation-webui") && !process.env.MODEL_HOST) {
    console.error("ERROR: MODEL_HOST environment variable not set in .env file.");
    process.exit(1);
} else {
    modelURL = process.env.MODEL_HOST;
}

if (process.env.MODEL === "text-generation-webui" && !process.env.CHARACTER) {
    console.error("ERROR: CHARACTER environment variable not set in .env file.");
    process.exit(1);
} else {
    character = process.env.CHARACTER;
}

if (!process.env.MODEL_IMAGE) {
    console.warn("WARNING: MODEL_IMAGE environment variable not set in .env file. Defaulting to DALL-E 3.");
    modelImage = 'dall-e-3';
} else {
    modelImage = process.env.MODEL_IMAGE;
}

if ((process.env.MODEL_IMAGE === 'dall-e-3' || !process.env.MODEL_IMAGE) && !process.env.MODEL_IMAGE_QUALITY) {
    console.warn("WARNING: MODEL_IMAGE_QUALITY environment variable not set in .env file. Defaulting to HD.");
    modelImageQuality = 'hd';
} else {
    modelImageQuality = process.env.MODEL_IMAGE_QUALITY;
}

if ((process.env.MODEL_IMAGE === 'dall-e-3' || !process.env.MODEL_IMAGE) && !process.env.MODEL_IMAGE_SIZE) {
    console.warn("WARNING: MODEL_IMAGE_SIZE environment variable not set in .env file. Defaulting to 1792x1024.");
    modelImageSize = '1792x1024';
} else if (process.env.MODEL_IMAGE === 'dall-e-2' && !process.env.MODEL_IMAGE_SIZE) {
    console.warn("WARN: MODEL_IMAGE_SIZE environment variable not set in .env file. Defaulting to 1024x1024.");
    modelImageSize = '1024x1024';
} else {
    modelImageSize = process.env.MODEL_IMAGE_SIZE;
}

if (process.env.MODEL_IMAGE === 'invokeai' && !process.env.INVOKEAI_HOST) {
    console.error("ERROR: INVOKEAI_HOST environment variable not set in .env file.");
    process.exit(1);
} else {
    invokeaiHost = process.env.INVOKEAI_HOST;
}

if (!process.env.DB_TYPE) {
    console.warn("WARNING: DB_TYPE environment variable not set in .env file. Defaulting to SQLite.");
    databaseType = 'sqlite';
} else {
    databaseType = process.env.DB_TYPE;
}

if (process.env.DB_TYPE !== 'sqlite' && process.env.DB_TYPE !== undefined && (!process.env.DB_HOST || !process.env.DB_USERNAME || !process.env.DB_PASSWORD)) {
    console.error("ERROR: DB_HOST, DB_USERNAME, or DB_PASSWORD environment variable not set in .env file.");
    process.exit(1);
} else if ((process.env.DB_TYPE === 'sqlite' || !process.env.DB_TYPE) && !process.env.DB_NAME) {
    console.warn("WARNING: DB_NAME environment variable not set in .env file. defaulting to bot.sqlite.");
    databaseName = 'bot.sqlite';
} else {
    databaseName = process.env.DB_NAME;
}

if (process.env.NATURAL_SPEECH) {
    naturalSpeech = process.env.NATURAL_SPEECH.toLowerCase();
}

console.log("Natural Speech: " + naturalSpeech);

async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
//Connect to database
console.log("Database type: " + databaseType);
if (databaseType === 'sqlite') {
    sequelize = new Sequelize({
        dialect: databaseType,
        storage: databaseName,
        logging: false
    });
} else {
    const databaseHost = process.env.DB_HOST;
    const databaseUsername = process.env.DB_USERNAME;
    const databasePassword = process.env.DB_PASSWORD;
    sequelize = new Sequelize( databaseName, databaseUsername, databasePassword, {
        host: databaseHost,
        dialect: databaseType,
        logging: false
      });
}

try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
} catch (error) {
    console.error('Unable to connect to the database:', error);
}

const User = sequelize.define('User', {
    discordUserName: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    discordDisplayName: {
        type: DataTypes.STRING,
        allowNull: false,
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

const Chat = sequelize.define('Chat', {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    }
});
await Chat.sync();

User.hasMany(Chat);
Chat.belongsTo(User);

async function userFindOrCreate(discordUserName1, discordDisplayName1, nickname1, pronouns1, age1, likes1, dislikes1) {
    let addUser;
    //console.log("Discord Displplay Name: " + discordDisplayName1);
    try {
        addUser = await User.findOrCreate({
            where: { discordUserName: discordUserName1 },
            defaults: {
                discordUserName: discordUserName1,
                discordDisplayName: discordDisplayName1,
                nickname: nickname1,
                pronouns: pronouns1,
                age: age1,
                likes: likes1,
                dislikes: dislikes1,
              },
        });
    } catch (error) {
        console.error(error);
    }
    return addUser;
}

async function saveChat(userId1, message1) {
    try {
        await Chat.create({ userId: userId1, message: message1 });
    } catch (error) {
        console.error(error);
    }
    return;
}

async function getChatHistory() {
    let chatHistory;
    try {
        chatHistory = await Chat.findAll({
            limit: chatHistoryLimit,
            order: [ [ 'id', 'DESC' ] ]
        });
    } catch (error) {
        console.error(error);
    }
    return chatHistory;
};

async function updateUser(discordUsername1, nickname1, pronouns1, age1, likes1, dislikes1) {
    try {
        const updateValues = {};
        const currentUser = await userFindOrCreate(discordUsername1, "", null, null, null, null, null);

        if (nickname1 !== null) {
            updateValues.nickname = nickname1;
        }

        if (age1 !== null) {
            updateValues.age = age1;
        }

        if (pronouns1 !== null) {
            updateValues.pronouns = pronouns1;
        }
        if (likes1 !== null) {
            if (currentUser.likes !== null && currentUser.likes !== "" && currentUser.likes !== undefined) {
                updateValues.likes = currentUser.likes + ", " + likes1;
            } else {
                updateValues.likes = likes1;
            }
        }

        if (dislikes1 !== null) {
            if (currentUser.dislikes !== null && currentUser.dislikes !== "" && currentUser.dislikes !== undefined) {
                updateValues.dislikes = currentUser.dislikes + ", " + dislikes1;
            } else {
                updateValues.dislikes = dislikes1;
            }
        }

        await User.update(updateValues, {
            where: {
            discordUserName: discordUsername1
            }
        });
    } catch (error) {
        console.error(error);
    }
    return;
};

await userFindOrCreate("assistant", "assistant", null, null, null, null, null);

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
        "name": "user_update",
        "description": "Adds details about a user to the database as they appear in the conversation.",
        "parameters": {
            "type": "object",
            "properties": {
                "nickname": {
                    "type": "string",
                    "description": "The name the user prefers to be called."
                },
                "pronouns": {
                    "type": "string",
                    "description": "The ponouns the user identifies as."
                },
                "age": {
                    "type": "integer",
                    "description": "The age of the user."
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

if (naturalSpeech === "true") {
    function_list.push({
        "name": "ignore_message",
        "description": "Avoids sending responses from OpenAI if the message is not directed towards the bot or provides no meaningful additions to the conversation.",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": []
        }
    });
}

console.log("Function list: " + JSON.stringify(function_list));

client.once(Events.ClientReady, c => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
});

//Send requests to OpenAI
async function openaiRequest(prompt, type, functions) {
    let answer;
    try {
        const modelValues = {};
        let response;

        if (type === "chat" && model !== "llama-gpt" && model !== "text-generation-webui") {
            modelValues.model = model;
            modelValues.messages = prompt;

            if (functions === true) {
                modelValues.functions = function_list;
            }

            response = await openai.chat.completions.create( modelValues );
            if (response.choices[0].finish_reason === "function_call") {
                if (response.choices[0].message.function_call.name === "image_request") {
                    answer = "Image: " + await openaiRequest(JSON.parse(response.choices[0].message.function_call.arguments).prompt, "image", false);
                } else if (response.choices[0].message.function_call.name === "user_update") {
                    answer = "User: " + response.choices[0].message.function_call.arguments;
                } else if (response.choices[0].message.function_call.name === "ignore_message") {
                    answer = "ignore_message";
                }
            } else {
                answer = response.choices[0].message.content;
            }
        } else if (type === "chat" && model === "llama-gpt"){
            const requestBody = {
                messages: prompt,
                max_tokens: 1000,
                temperature: 1
              };
              console.log(requestBody);
              try {
                const response = await axios.post(`${modelURL}/v1/chat/completions`, requestBody);
                const answer = response.data.choices[0].message.content;
                return answer;
              } catch (error) {
                console.error("Error:", error.response.data);
                // Handle the error or return an appropriate value
              }

            } else if (type === "chat" && model === "text-generation-webui"){
                const requestBody = {
                    messages: prompt,
                    mode: "chat",
                    character: character
                  };
                  console.log(requestBody);
                  try {
                    const response = await axios.post(`${modelURL}/v1/chat/completions`, requestBody);
                    const answer = response.data.choices[0].message.content;
                    return answer;
                  } catch (error) {
                    console.error("Error:", error.response.data);
                    // Handle the error or return an appropriate value
                  }


        } else if (type === "image" && modelImage === "invokeai"){
            const seed = Math.floor(Math.random() * 10000000000);
            console.log("Seed: " + seed);
            const negativePrompt = 'long neck, out of frame, extra fingers, mutated hands, monochrome, ((poorly drawn hands)), ((poorly drawn face)), (((mutation))), (((deformed))), ((ugly)), blurry, ((bad anatomy)), (((bad proportions))), ((extra limbs)), cloned face, glitchy, bokeh, (((long neck))), ((((visible hand)))), ((((ugly)))), (((duplicate))), ((morbid)), ((mutilated)), [out of frame], extra fingers, mutated hands, ((poorly drawn hands)), ((poorly drawn face)), (((mutation))), (((deformed))), ((ugly)), blurry, ((bad anatomy)), (((bad proportions))), ((extra limbs)), cloned face, (((disfigured))), out of frame, ugly, extra limbs, (bad anatomy), gross proportions, (malformed limbs), ((missing arms)), ((missing legs)), (((extra arms))), (((extra legs))), mutated hands, (fused fingers), (too many fingers), (((long neck))) red eyes, multiple subjects, extra heads';
            const graphBody = {
                prepend: false,
                batch: {
                    graph: {
                        id: "sdxl_text_to_image_graph",
                        nodes: {
                            sdxl_model_loader: {
                                type: "sdxl_model_loader",
                                id: "sdxl_model_loader",
                                model: {
                                    model_name: "stable-diffusion-xl-base-1-0",
                                    base_model: "sdxl",
                                    model_type: "main"
                                },
                                is_intermediate: true
                            },
                            positive_conditioning: {
                                type: "sdxl_compel_prompt",
                                id: "positive_conditioning",
                                prompt: prompt,
                                style: prompt,
                                is_intermediate: true
                            },
                            negative_conditioning: {
                                type: "sdxl_compel_prompt",
                                id: "negative_conditioning",
                                prompt: negativePrompt,
                                style: negativePrompt,
                                is_intermediate: true
                            },
                            noise: {
                                type: "noise",
                                id: "noise",
                                seed: 0,
                                width: 768,
                                height: 512,
                                use_cpu: true,
                                is_intermediate: true
                            },
                            sdxl_denoise_latents: {
                                type: "denoise_latents",
                                id: "sdxl_denoise_latents",
                                cfg_scale: 10,
                                scheduler: "euler",
                                steps: 150,
                                denoising_start: 0,
                                denoising_end: 1,
                                is_intermediate: true
                            },
                            latents_to_image: {
                                type: "l2i",
                                id: "latents_to_image",
                                fp32: true,
                                is_intermediate: true
                            },
                            metadata_accumulator: {
                                id: "metadata_accumulator",
                                type: "metadata_accumulator",
                                generation_mode: "sdxl_txt2img",
                                cfg_scale: 10,
                                height: 512,
                                width: 768,
                                positive_prompt: prompt,
                                negative_prompt: negativePrompt,
                                model: {
                                    model_name: "stable-diffusion-xl-base-1-0",
                                    base_model: "sdxl",
                                    model_type: "main"
                                },
                                steps: 150,
                                rand_device: "cpu",
                                scheduler: "euler",
                                controlnets: [],
                                loras: [],
                                ipAdapters: [],
                                t2iAdapters: [],
                                positive_style_prompt: "",
                                negative_style_prompt: ""
                            },
                            save_image: {
                                id: "save_image",
                                type: "save_image",
                                is_intermediate: false,
                                use_cache: false
                            }
                        },
                        edges: [
                            { source: { node_id: "sdxl_model_loader", field: "unet" }, destination: { node_id: "sdxl_denoise_latents", field: "unet" } },
                            { source: { node_id: "sdxl_model_loader", field: "clip" }, destination: { node_id: "positive_conditioning", field: "clip" } },
                            { source: { node_id: "sdxl_model_loader", field: "clip2" }, destination: { node_id: "positive_conditioning", field: "clip2" } },
                            { source: { node_id: "sdxl_model_loader", field: "clip" }, destination: { node_id: "negative_conditioning", field: "clip" } },
                            { source: { node_id: "sdxl_model_loader", field: "clip2" }, destination: { node_id: "negative_conditioning", field: "clip2" } },
                            { source: { node_id: "positive_conditioning", field: "conditioning" }, destination: { node_id: "sdxl_denoise_latents", field: "positive_conditioning" } },
                            { source: { node_id: "negative_conditioning", field: "conditioning" }, destination: { node_id: "sdxl_denoise_latents", field: "negative_conditioning" } },
                            { source: { node_id: "noise", field: "noise" }, destination: { node_id: "sdxl_denoise_latents", field: "noise" } },
                            { source: { node_id: "sdxl_denoise_latents", field: "latents" }, destination: { node_id: "latents_to_image", field: "latents" } },
                            { source: { node_id: "metadata_accumulator", field: "metadata" }, destination: { node_id: "latents_to_image", field: "metadata" } },
                            { source: { node_id: "sdxl_model_loader", field: "vae" }, destination: { node_id: "latents_to_image", field: "vae" } },
                            { source: { node_id: "metadata_accumulator", field: "metadata" }, destination: { node_id: "save_image", field: "metadata" } },
                            { source: { node_id: "latents_to_image", field: "image" }, destination: { node_id: "save_image", field: "image" } }
                        ]
                    },
                    runs: 1,
                    data: [
                        [
                            { node_path: "noise", field_name: "seed", items: [seed] },
                            { node_path: "metadata_accumulator", field_name: "seed", items: [seed] }
                        ]
                    ]
                }
            };
            const graphResponse = await axios.post(`${invokeaiHost}/api/v1/queue/default/enqueue_batch`, graphBody);
            const batchId = graphResponse.data.batch.batch_id;
            let sessionID;
            await wait(20000);
            async function runBatchStatusCheck() {
                try {
                    sessionID = await checkBatchStatus();
                } catch (error) {
                    console.error("Error:", error);
                    // Handle the error as needed
                }
                return sessionID;
            }

            async function checkBatchStatus() {
                return new Promise(async (resolve, reject) => {
                    try {
                        const listResponse = await axios.get(`${invokeaiHost}/api/v1/queue/default/list`);
                        const items = listResponse.data.items;

                        const batchItems = items.filter(item => item.batch_id === batchId);
                        if (batchItems.length === 0) {
                            console.log(`No items found for batch ID ${batchId}`);
                            resolve(null); // You can resolve with null or any default value
                            return;
                        }

                        const completedItems = batchItems.filter(item => item.status === "completed");

                        console.log(`Completed items: ${completedItems.length} / ${batchItems.length}`);

                        if (completedItems.length === batchItems.length) {
                            console.log(`All items in batch ${batchId} have been completed.`);
                            sessionID = batchItems[0].session_id;
                            resolve(sessionID); // Resolve with the session ID or any other value you want to return
                        } else {
                            // Wait for some time before checking again
                            setTimeout(async () => {
                                try {
                                    const result = await checkBatchStatus();
                                    resolve(result);
                                } catch (error) {
                                    reject(error);
                                }
                            }, 5000); // Adjust the timeout as needed (e.g., 5000 milliseconds = 5 seconds)
                        }
                    } catch (error) {
                        console.error(`Error checking batch status: ${error.message}`);
                        reject(error);
                    }
                });
            }

            sessionID = await runBatchStatusCheck();

            await wait(5000);
            const imageList = await axios.get(`${invokeaiHost}/api/v1/images/?image_origin=internal&categories=general&is_intermediate=false&offset=0&limit=10`);
            for (const item of imageList.data.items) {
                if (item.session_id === sessionID) {
                    const image_name = item.image_name;
                    console.log(`The image_name for session ID ${sessionID} is: ${image_name}`);
                    answer = `${invokeaiHost}/api/v1/images/i/${item.image_name}/full`;
                }
            }

        } else {
            modelValues.model = modelImage;
            modelValues.prompt = prompt;
            modelValues.n = 1;
            if (modelImage === "dall-e-3"){
                modelValues.quality = modelImageQuality;
            }
            modelValues.size = modelImageSize;

            response = await openai.images.generate( modelValues );
            //console.log(response);
            answer = response.data[0].url;
        }
        //console.log(response);
        //console.log(inspect(response.choices[0].message, {showHidden: false, depth: null, colors: true}))
    } catch (error) {
        if (error instanceof OpenAI.APIError) {
            console.error(error.status);  // e.g. 401
            console.error(error.message); // e.g. The authentication token you passed was invalid...
            console.error(error.code);  // e.g. 'invalid_api_key'
            console.error(error.type);  // e.g. 'invalid_request_error'
            answer = "Error: " + error.message;
          } else {
            console.error(error);
            answer = "Error: " + error;
          }
    }
    return answer;
}

const sendChunks = async (text, message) => {
    while (text.length > 0) {
        let chunk = text.slice(0, MAX_CHAR_COUNT);
        if (text.length > MAX_CHAR_COUNT) {
            while (chunk.charAt(chunk.length - 1) !== ' ' && chunk.length > 1) {
                chunk = chunk.slice(0, -1);
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        await message.reply(chunk);
        text = text.slice(chunk.length);
    }
};

client.on(Events.MessageCreate, async message => {
    if (message.channel.id === channelID && !message.author.bot) {
        try {
            const discordUserName = message.author.username;
            const discordDisplayName = message.author.displayName;
            const channel = await client.channels.fetch(message.channelId)
            let answer;

            await channel.sendTyping();
            const intervalId = setInterval(async () => {
                await channel.sendTyping();
            }, 9000);

            //console.log("Message content: " + message.content);

            let userIDDetails = await userFindOrCreate(discordUserName, discordDisplayName, null, null, null, null, null);
            const userId1 = userIDDetails[0].id;

            const chatHistory = await getChatHistory();
            chatHistory.reverse();
            const assistantPrompt = { role: 'system', content: botRole };
            const prompts = [ assistantPrompt ];
            let nickname;
            if (userIDDetails[0].nickname !== null) {
                nickname = userIDDetails[0].nickname;
            } else {
                nickname = discordDisplayName;
            }
            const userPrompt = { role: 'user', content: nickname + " said " + message.content };
            let processedUserIds = new Set();

            for (const chat of chatHistory) {
                const role = chat.userId === 1 ? 'assistant' : 'user';
                const messageUser = await User.findByPk(chat.userId);
                if (messageUser.nickname !== null) {
                    nickname = messageUser.nickname;
                } else {
                    nickname = messageUser.discordUserName;
                }
                const messageContent = chat.userId !== 1 ? nickname + " said " + chat.message : chat.message;
                prompts.push({ role: role, content: messageContent });

                if (!processedUserIds.has(chat.userId) && chat.userId !== 1 && (messageUser.pronouns !== null || messageUser.age !== null || messageUser.likes !== null || messageUser.dislikes !== null)) {

                    let userDetailMessage = nickname;

                    if (messageUser.age !== null) {
                        userDetailMessage += " is " + messageUser.age;
                    }

                    if (messageUser.pronouns !== null) {
                        userDetailMessage += " uses " + messageUser.pronouns;
                    }

                    if (messageUser.likes !== null) {
                        userDetailMessage += " likes " + messageUser.likes;
                    }

                    if (messageUser.dislikes !== null) {
                        userDetailMessage += " dislikes " + messageUser.dislikes;
                    }

                    const userDetailPrompt = {
                        role: 'user',
                        content: userDetailMessage
                    };

                    prompts.push(userDetailPrompt);
                      // Add the user ID to the set to mark it as processed
                    processedUserIds.add(chat.userId);
                }
            }
            prompts.push(userPrompt);
            //console.log(prompts);
            if (message.content.toLowerCase().startsWith('!image')) {
                answer = "Image: " + await openaiRequest(message.content.slice(7), "image", false);
            } else {
                answer = await openaiRequest(prompts, "chat", true);
            }
            await saveChat(userId1, message.content);

            if (answer.startsWith('User: ')) {
                await updateUser(discordUserName, JSON.parse(answer.slice(6)).nickname, JSON.parse(answer.slice(6)).pronouns, JSON.parse(answer.slice(6)).age, JSON.parse(answer.slice(6)).likes, JSON.parse(answer.slice(6)).dislikes);
                answer = await openaiRequest(prompts, "chat", false);
            }

            if (answer.startsWith('Error:')) {
                await message.reply(answer);
            } else if (answer.startsWith('Image: ')) {
                await message.reply({ files: [{ attachment: answer.slice(7), name: 'image.png' }] });
                saveChat("1", answer.slice(7));
            } else if (!answer.toLowerCase().includes('ignore_message')) {
                await saveChat("1", answer.replace(/assistant said/gi, ''));
                await sendChunks(answer.replace(/assistant said/gi, ''), message);
            } else {
                await message.react('💙');
                console.log("Message ignored");
            }
            clearInterval(intervalId);
        } catch (error) {
            console.error(error);
        }
    }
});

client.login(token);


if (groupMeID !== undefined && groupMePort !== undefined) {
    //The GroupMe API Endpoint for bots to send messages
    /** Your bot id from GroupMe */
    const botId = groupMeID;
    const groupMeUrl = 'https://api.groupme.com/v3/bots/post';
    //Telling express that GroupMe will be sending us JSON
    app.use(express.json());

    async function sendMessage(message) {
      axios
        .post(groupMeUrl, {
          text: message,
          bot_id: botId,
        })
        .then((response) => console.log(response.statusText))
        .catch((error) => console.error(error.response.data));
    }

    async function uploadImage(openAiUrl) {
        const url = openAiUrl;
        const imagePath = pathModule.resolve('temp.png');

        try {

            const response = await axios({
                url,
                method: 'GET',
                responseType: 'stream',
              });

              // Pipe the image data to a write stream
              const writer = fs.createWriteStream(imagePath);
              response.data.pipe(writer);

              // Wait for the write stream to finish
              await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
              });

          // Read the image file as a Buffer
          const imageBuffer = fs.readFileSync(imagePath);

          const options = {
            url: 'https://image.groupme.com/pictures', // Replace with the correct GroupMe API endpoint
            method: 'POST',
            headers: {
              'X-Access-Token': groupMeAccessToken,
              'Content-Type': 'image/jpeg', // Set the content type to binary
            },
            data: imageBuffer, // Pass the image data as the request body
          };

          const uploadResponse = await axios(options);
          console.log('Upload successful: GroupMe response:', uploadResponse.data);

          // If the GroupMe API provides the image URL in the response, you can use it
          await axios
          .post(groupMeUrl, {
            text: '',
            bot_id: botId,
            picture_url: uploadResponse.data.payload.picture_url
          })
          .then((response) => console.log(response.statusText))
          .catch((error) => console.error(error.response.data));


          return uploadResponse;
        } catch (error) {
          console.error('Upload failed:', error.message);
          throw error;
        }
      }
    app.post(groupMeURLEndpoint, async (req, res) => {
      const body = req.body;

      if (body.text.toLowerCase().startsWith('yuki') || body.text.toLowerCase().startsWith('!image')) {
        const assistantPrompt = { role: 'system', content: botRole };
        const userPrompt = { role: 'user', content: body.name + ' said ' + body.text.slice(5) };
        const prompts = [assistantPrompt, userPrompt];
        let answer;
        try {
            if (body.text.toLowerCase().startsWith('!image')) {
                answer = "Image: " + await openaiRequest(body.text.slice(7), "image", false);
            } else {
                answer = await openaiRequest(prompts, "chat", true);
            }

          if (answer.startsWith('Error:')) {
            await sendMessage(answer);
          } else if (answer.startsWith('Image: ')) {
            await uploadImage(answer.slice(7));
          } else if (!answer.toLowerCase().includes('ignore_message')) {
            await sendMessage(answer);
          } else {
            console.warn('Message ignored');
          }
        } catch (error) {
          console.error('Error processing message:', error.message);
        }
      }

      res.sendStatus(200);
    });

    app.listen(groupMePort, () => {
      console.log(`GroupMe listener running at ${groupMePort}`);
    });
}
