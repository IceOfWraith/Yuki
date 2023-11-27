This bot has been contributed to by GameW1izard and his HatBot as well as OpenAI.

The bot is under constant development to add new functionality over time. Currently, it can chat with Discord and GroupMe users and generate images using GPT-4 Turbo and DALL-E 3 HD by default. I'd recommend setting it lower to save costs for most use-cases. It can also be self-hosted fully by using [llama-gpt](https://github.com/getumbrel/llama-gpt) or [text-generation-webui](https://github.com/oobabooga/text-generation-webui) for the chat models and [InvokeAI](https://github.com/invoke-ai) for image generation. I'll share my suggested settings at the end of this guide.

To use the bot, create a file called `.env` and inside place the following:

```
AI_TOKEN=<your openai token here>
BOT_TOKEN=<your discord bot token here>
GROUPME_ID=<your groupme bot id here>
GROUPME_PORT=<callback URL listening port>
CHANNEL_ID=<id of the channel where the bot should speak freely>
CHAT_HISTORY=<the amount of history to send to openai. WARNING! This exponentially increases costs for requests! (default: 10)>
PERSONALITY=details of how the bot should behave. if using text-generation-webui you should configure a character in the gui and use the character setting below. ex: You are roleplaying as a ditzy anime girl that likes emojis. Never break character. You behave like a human and show emotion the same. Your name is Yuki.
CHARACTER=<name of character when using text-generation-webui>
MODEL=<openai model to use: gpt-4-1106-preview (default), gpt-4, gpt-4-32k, gpt-3.5-turbo-1106, llama-gpt, text-generation-webui>
MODEL_IMAGE=<openai image model to use: dall-e-3 (default), dall-e-2, invokeai>
MODEL_IMAGE_QUALITY=<quality of the image: hd (defaul), standard> dall-e-3 only
MODEL_IMAGE_SIZE=<resolution of the image: 256x256 (dall-e-2 only), 512x512 (dall-e-2 only), 1024x1024 (dall-e-2 or dall-e-3), 1024x1792 (dall-e-3 only), 1792x1024 (default - dall-e-3 only)>
MODEL_HOST=<http://ip:port of the llama-gpt or text-generation-webui host>
INVOKEAI_HOST=<http://ip:port of the invokeai server>
DB_TYPE=mysql | postgres | sqlite | mariadb | mssql | snowflake | oracle (only tested on sqlite!)
DB_NAME=sqlite db filename | db name for all other types
DB_HOST=localhost or URL/IP:Port of db (unused for sqlite)
DB_USERNAME=username to access db (unused for sqlite)
DB_PASSWORD=password to access db (unused for sqlite)
NATURAL_SPEECH=<true/false, openai only, the bot will attempt to only speak when spoken to automatically>
```
Then run `npm install` to install the dependencies and `npm start` to start the bot.

![Yuki-Avatar](https://github.com/IceOfWraith/IceBot/assets/96364530/fe0a077e-aa4a-4a78-b091-a2090d64cee5)

My recommended setup (changes every week)
-

Chat: text-generation-webui using [Llama-2-7b-chat-hf](https://huggingface.co/meta-llama/Llama-2-7b-chat-hf) (requires filling out a Meta form, but instantly approves)

Inside the CMD_FLAGS.txt - `--listen --api --api-port 4000 --model llama-2-7B --character Yuki --verbose --auto-devices --load-in-4bit --use_double_quant --compute_dtype bfloat16 --quant_type fp4`

This results in roughly 20 second responses using a 4070 ti

Image: InvokeAI

Currently, this is not configurable and uses settings defined in the bot.js code.
