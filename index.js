const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  console.log("Tu CHAT_ID es:", chatId);
  bot.sendMessage(chatId, `Tu chat ID es: ${chatId}`);
});