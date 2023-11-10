import { config } from 'dotenv';
import { chat, image } from './ai.js';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import sqlite3 from 'sqlite3';

config();

const token = process.env.BOT_TOKEN;

const MAX_CHAR_COUNT = 2000;
let sql;
let sql2;
let sql3;


const db = new sqlite3.Database('./bot.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {return console.error(err.message);}
});

sql = `CREATE TABLE IF NOT EXISTS users (user_id INTEGER PRIMARY KEY, user_name TEXT PRIMARY KEY)`;
db.run(sql);

sql2 = 'INSERT OR IGNORE INTO users (user_name) VALUES (?)';
db.run(sql2, ['iceofwraith2'], (err) => {
    if (err) {return console.error(err.message);}
});

sql3 = 'SELECT * FROM users';
db.all(sql3, [], (err, rows) => {
    if (err) {throw err;}
    rows.forEach((row) => {
        console.log(row.user_id, row.user_name);
    });
});


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
        await client.channels.fetch(channelId).then(channel => channel.send(chunk));
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
                await client.channels.fetch(message.channelId).then(channel => channel.send(answer));
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
            await client.channels.fetch(message.channelId).then(channel => channel.send(answer));
        } else {
            await sendChunks(answer, message.channelId);
        }
    }
} catch (error) {
    console.error(error);
}
});

client.login(token);
