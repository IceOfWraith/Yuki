This bot has been contributed to by GameW1izard and his HatBot as well as OpenAI.

The bot is under constant development to add new functionality over time. Currently, it can chat with Discord users and generate images using GPT-4 Turbo and DALL-E 3 HD.

To use the bot, create a file called `.env` and inside place the following:
```
AI_TOKEN=<your openai token here>
BOT_TOKEN=<your discord bot token here>
PERSONALITY=details of how the bot should behave. ex: You are roleplaying as a ditzy anime girl that likes emojis. Never break character. You behave like a human and show emotion the same. Your name is Yuki.
DB_TYPE=mysql | postgres | sqlite | mariadb | mssql | snowflake | oracle
DB_HOST=localhost or URL/IP:Port of db (unused for sqlite)
DB_NAME=sqlite db filename | db name for all other types
DB_USERNAME=username to access db (unused for sqlite)
DB_PASSWORD=password to access db (unused for sqlite)
```
Then run `npm install` to install the dependencies and `npm start` to start the bot.
