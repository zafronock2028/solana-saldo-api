import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  console.log("Tu CHAT_ID es:", chatId);
  bot.sendMessage(chatId, `¡Hola! Tu CHAT_ID es: ${chatId}`);
});