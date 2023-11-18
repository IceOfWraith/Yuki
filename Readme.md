This bot has been contributed to by GameW1izard and his HatBot as well as OpenAI.

The bot is under constant development to add new functionality over time. Currently, it can chat with Discord users and generate images using GPT-4 Turbo and DALL-E 3 HD by default. I'd recommend setting it lower to save costs for most use-cases.

To use the bot, create a file called `.env` and inside place the following:
```
AI_TOKEN=<your openai token here>
BOT_TOKEN=<your discord bot token here>
GROUPME_ID=<your groupme bot id here>
GROUPME_PORT=<callback URL listening port>
CHANNEL_ID=<id of the channel where the bot should speak freely>
CHAT_HISTORY=<the amount of history to send to openai. WARNING! This exponentially increases costs for requests! (default: 10)>
PERSONALITY=details of how the bot should behave. ex: You are roleplaying as a ditzy anime girl that likes emojis. Never break character. You behave like a human and show emotion the same. Your name is Yuki.
MODEL=<openai model to use: gpt-4-1106-preview (default), gpt-4, gpt-4-32k, gpt-3.5-turbo-1106>
MODEL_IMAGE=<openai image model to use: dall-e-3 (default), dall-e-2, invokeai>
MODEL_IMAGE_QUALITY=<quality of the image: hd (defaul), standard> dall-e-3 only
MODEL_IMAGE_SIZE=<resolution of the image: 256x256 (dall-e-2 only), 512x512 (dall-e-2 only), 1024x1024 (dall-e-2 or dall-e-3), 1024x1792 (dall-e-3 only), 1792x1024 (default - dall-e-3 only)>
INVOKEAI_HOST=<http://ip:port of the invokeai server>
DB_TYPE=mysql | postgres | sqlite | mariadb | mssql | snowflake | oracle (only tested on sqlite!)
DB_NAME=sqlite db filename | db name for all other types
DB_HOST=localhost or URL/IP:Port of db (unused for sqlite)
DB_USERNAME=username to access db (unused for sqlite)
DB_PASSWORD=password to access db (unused for sqlite)
```
Then run `npm install` to install the dependencies and `npm start` to start the bot.

![Yuki-Avatar](https://github.com/IceOfWraith/IceBot/assets/96364530/fe0a077e-aa4a-4a78-b091-a2090d64cee5)
