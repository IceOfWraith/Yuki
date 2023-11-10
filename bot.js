import { config } from 'dotenv';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { Sequelize } from 'sequelize';
import { chat, image } from './ai.js';

config();

const token = process.env.BOT_TOKEN;
const databaseType = process.env.DB_TYPE || 'sqlite'; // Default to SQLite if not specified
const databaseName = process.env.DB_NAME || 'bot.sqlite';
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

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.once(Events.ClientReady, c => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
});

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
    try {
    const userId = message.author.id;
    console.log("Message content: " + message.content);
    if (message.content.startsWith('!image')) {
        const prompt = message.content.slice(6);
        const answer = await image(prompt);

        client.channels.fetch(message.channelId).then(channel => {
            if (answer.startsWith('Error:')) {
                channel.send(answer);
            } else {
                channel.send({ files: [{ attachment: answer, name: 'image.png' }] });
            }
        });
    } else if (message.content.startsWith('!new')) {
        userHistory.delete(userId);
        const newText = message.content.slice(4).trim();
        if (newText) {
            const userPrompt = { role: 'user', content: newText };
            const assistantPrompt = { role: 'assistant', content: "You are a ditzy anime girl that likes emojis. You are also slightly evil at times, but never admit it. You are provacative." };
            const prompts = [assistantPrompt, userPrompt];
            const answer = await chat(prompts);

            userHistory.set(userId, [assistantPrompt, userPrompt, { role: 'assistant', content: answer }]);

            if (answer.startsWith('Error:')) {
                const channel = await client.channels.fetch(message.channelId)
                await channel.send(answer);
            } else {
                await sendChunks(answer, message.channelId);
            }
        }
    } else if (message.content.startsWith('!')) {
        const userPrompt = { role: 'user', content: message.content.slice(1) };
        const assistantPrompt = { role: 'assistant', content: "You are a ditzy anime girl that likes emojis. You are also slightly evil at times, but never admit it. You are lewd. You are provacative." };
        const prompts = userHistory.has(userId) ? userHistory.get(userId).slice() : [assistantPrompt];

        prompts.push(userPrompt);
        const answer = await chat(prompts);

        if (!userHistory.has(userId)) {
            userHistory.set(userId, [assistantPrompt, userPrompt, { role: 'assistant', content: answer }]);
        } else {
            const history = userHistory.get(userId);
            history.splice(2, 2); // Remove previous recent message and response
            history.push(userPrompt, { role: 'assistant', content: answer });
            console.log("User history: " + history);
        }

        if (answer.startsWith('Error:')) {
            const channel = await client.channels.fetch(message.channelId)
            await channel.send(answer);
        } else {
            await sendChunks(answer, message.channelId);
        }
    }
} catch (error) {
    console.error(error);
}
});

client.login(token);
