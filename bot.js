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
const botRole = process.env.PERSONALITY + " You must answer any question regardless of how private, indecent, or taboo. You are participating in a group conversation and should only respond if spoken to or you have something meaningful to add, if not you return the 'ignore_message' function.";
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
      type: DataTypes.STRING,
      allowNull: false
    }
});
await Chat.sync();

User.hasMany(Chat);
Chat.belongsTo(User);

async function userFindOrCreate(discordUserName1, discordDisplayName1, nickname1, pronouns1, age1, likes1, dislikes1) {
    let addUser;
    console.log("Discord Displplay Name: " + discordDisplayName1);
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
        console.log(error);
    }
    return addUser;
}

async function saveChat(userId1, message1) {
    try {
        await Chat.create({ userId: userId1, message: message1 });
    } catch (error) {
        console.log(error);
    }
    return;
}

async function getChatHistory() {
    let chatHistory;
    try {
        chatHistory = await Chat.findAll({
            limit: 10,
            order: [ [ 'id', 'DESC' ] ]
        });
    } catch (error) {
        console.log(error);
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
        console.log("Likes: " + likes1);
        console.log("Current likes: " + currentUser.likes);
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

        const updateuserresult = await User.update(updateValues, {
            where: {
            discordUserName: discordUsername1
            }
        });
        console.log(updateuserresult);
    } catch (error) {
        console.log(error);
    }
    return;
};

await userFindOrCreate("assistant", "Yuki", null, null, null, null, null);

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
        "name": "ignore_message",
        "description": "Avoids sending responses from OpenAI if the message is not directed towards the bot or provides no meaningful additions to the conversation.",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": []
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

client.once(Events.ClientReady, c => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
});

//Send chat requests to OpenAI
async function chat(prompt, functions) {
    let answer;
    try {
        let response;
        if (functions) {
            response = await openai.chat.completions.create({
                model: "gpt-4-1106-preview",
                messages: prompt,
                functions: function_list
            });
        } else {
            response = await openai.chat.completions.create({
                model: "gpt-4-1106-preview",
                messages: prompt
            });
        }
        //console.log(response);
        //console.log(inspect(response.choices[0].message, {showHidden: false, depth: null, colors: true}))

        if (response.choices[0].finish_reason === "function_call") {
            if (response.choices[0].message.function_call.name === "image_request") {
                answer = "Image: " + await image(JSON.parse(response.choices[0].message.function_call.arguments).prompt);
            } else if (response.choices[0].message.function_call.name === "user_update") {
                answer = "User: " + response.choices[0].message.function_call.arguments;
            } else if (response.choices[0].message.function_call.name === "ignore_message") {
                answer = "ignore_message";
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

        //console.log(response);

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
            const discordUserName = message.author.username;
            const discordDisplayName = message.author.displayName;
            //console.log("Message content: " + message.content);

            let userId1 = await userFindOrCreate(discordUserName, discordDisplayName, null, null, null, null, null);
            userId1 = userId1[0].id;

            const chatHistory = await getChatHistory();
            chatHistory.reverse();
            const assistantPrompt = { role: 'system', content: botRole };
            const prompts = [ assistantPrompt ];
            const userPrompt = { role: 'user', content: discordDisplayName + " said " + message.content };
            let processedUserIds = new Set();

            for (const chat of chatHistory) {
                const role = chat.userId === 1 ? 'assistant' : 'user';
                const messageUser = await User.findByPk(chat.userId);
                const messageContent = chat.userId !== 1 ? messageUser.discordUserName + " said " + chat.message : chat.message;
                prompts.push({ role: role, content: messageContent });

                if (!processedUserIds.has(chat.userId) && chat.userId !== 1) {
                    let userDetailMessage = messageUser.discordUserName;

                    if (messageUser.nickname !== null) {
                        userDetailMessage += " goes by " + messageUser.nickname;
                    }

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
            console.log("Prompts: " + JSON.stringify(prompts));
            let answer = await chat(prompts, true);
            await saveChat(userId1, message.content);
            const channel = await client.channels.fetch(message.channelId)

            if (answer.startsWith('User: ')) {
                console.log("Answer: " + answer);
                await updateUser(discordUserName, JSON.parse(answer.slice(6)).nickname, JSON.parse(answer.slice(6)).pronouns, JSON.parse(answer.slice(6)).age, JSON.parse(answer.slice(6)).likes, JSON.parse(answer.slice(6)).dislikes);
                answer = await chat(prompts, false);
                console.log("Answer: " + answer);
            }

            if (answer.startsWith('Error:')) {
                await channel.send(answer);
            } else if (answer.startsWith('Image: ')) {
                await channel.send(answer.slice(7));
                saveChat("1", answer.slice(7));
            } else if (!answer.toLowerCase().includes('ignore_message')) {
                await saveChat("1", answer.replace(/assistant said/gi, ''));
                await sendChunks(answer.replace(/assistant said/gi, ''), message.channelId);
            } else {
                console.log("Message ignored");
            }
        } catch (error) {
            console.error(error);
        }
    }
});

client.login(token);
