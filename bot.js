//in bot.js

const { chat, image } = require("./ai.js"); //import the "ask" function from the "ai.js" file
const { Client, Events, GatewayIntentBits } = require('discord.js'); //v14.6.0
const token = "YOUR-TOKEN-HERE";
const MAX_CHAR_COUNT = 2000; // set maximum number of characters per message

// Create a new client instance
const client = new Client({
    intents:
        [GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent]
});

client.once(Events.ClientReady, c => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.on(Events.MessageCreate, async message => {
    if (message.content.substring(0, 6) === "!image") {
        const prompt = message.content.substring(6); //remove the exclamation mark from the message
        var answer = await image(prompt); //prompt GPT-3
        if (answer.substring(0, 6) == "Error:") {
            client.channels.fetch(message.channelId).then(channel => channel.send(answer));
        }
        else {
            client.channels.fetch(message.channelId).then(channel => channel.send({ files: [{ attachment: answer, name: 'image.png' }] }));
        }
    }
    else if (message.content.substring(0, 1) === "!") {
        const prompt = [{ role: "user", content: message.content.substring(1) }]; //remove the exclamation mark from the message
        var answer = await chat(prompt); //prompt GPT-3


        if (answer.substring(0, 6) == "Error:") {
            client.channels.fetch(message.channelId).then(channel => channel.send(answer));
        }
        else {

            // split the answer into chunks of MAX_CHAR_COUNT characters or less
            while (answer.length > 0) {
                let chunk = answer.substring(0, MAX_CHAR_COUNT); // get a chunk of MAX_CHAR_COUNT characters or less
                // find the last full word within the chunk
                if (answer.length > MAX_CHAR_COUNT) {

                    while (chunk.charAt(chunk.length - 1) !== " " && chunk.length > 1) {
                        chunk = chunk.substring(0, chunk.length - 1);
                    }

                    client.channels.fetch(message.channelId).then(channel => channel.send(chunk));
                    answer = answer.substring(chunk.length); // remove the sent chunk from the answer

                    await new Promise(resolve => setTimeout(resolve, 1000)); // wait for 1 second
                }
                else {
                    client.channels.fetch(message.channelId).then(channel => channel.send(answer));
                    await new Promise(resolve => setTimeout(resolve, 3000)); // wait for 1 second
                    answer = "";
                }
            }
        }
    }
});

// Log in to Discord with your client's token
client.login(token);