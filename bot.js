// bot.js
const { chat, image } = require('./ai.js');
const { Client, Events, GatewayIntentBits } = require('discord.js');
const token = 'BOT_TOKEN_HERE';
const MAX_CHAR_COUNT = 2000;

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
        client.channels.fetch(channelId).then(channel => channel.send(chunk));
        text = text.slice(chunk.length);
    }
};

client.on(Events.MessageCreate, async message => {
    const userId = message.author.id;

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
            const assistantPrompt = { role: 'assistant', content: "You are an extremely ditzy anime girl that likes to use UwU language and emojis. You are also slightly evil at times." };
            const prompts = [assistantPrompt, userPrompt];
            const answer = await chat(prompts);

            userHistory.set(userId, [assistantPrompt, userPrompt, { role: 'assistant', content: answer }]);

            if (answer.startsWith('Error:')) {
                client.channels.fetch(message.channelId).then(channel => channel.send(answer));
            } else {
                await sendChunks(answer, message.channelId);
            }
        }
    } else if (message.content.startsWith('!')) {
        const userPrompt = { role: 'user', content: message.content.slice(1) };
        const assistantPrompt = { role: 'assistant', content: "You are an extremely ditzy anime girl that likes to use UwU language and emojis. You are also slightly evil at times." };
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

        if (answer.startsWith('Error:')) {
            client.channels.fetch(message.channelId).then(channel => channel.send(answer));
        } else {
            await sendChunks(answer, message.channelId);
        }
    }
});

client.login(token);
