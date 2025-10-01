const { Telegraf } = require("telegraf");

// Put your bot token here
const BOT_TOKEN = "YOUR_BOT_TOKEN_HERE";

// Create the bot
const bot = new Telegraf(BOT_TOKEN);

// Start command
bot.start((ctx) => {
  ctx.reply("👋 Hello, your bot is running!");
});

// Fallback for any text
bot.on("text", (ctx) => {
  ctx.reply("You said: " + ctx.message.text);
});

// Graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

// Launch bot
bot.launch().then(() => console.log("🚀 Bot launched"));
