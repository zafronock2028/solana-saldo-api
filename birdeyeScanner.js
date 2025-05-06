// birdeyeScanner.js
import fetch from "node-fetch";
import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

export const escanearBirdeye = async (bot, chatId) => {
  console.log(`[${new Date().toLocaleTimeString()}] Escaneando en Birdeye...`);
  try {
    const res = await fetch("https://public-api.birdeye.so/defi/tokenlist?chain=solana");
    const json = await res.json();
    const tokens = json?.data || [];

    const joyas = tokens.filter((t) => {
      const lp = t.liquidity || 0;
      const vol = t.volume_24h || 0;
      const age = t.age_minutes || 9999;
      const mc = t.market_cap_usd || 0;

      return (
        lp >= 3000 &&
        lp <= 80000 &&
        vol >= 20000 &&
        vol / lp >= 3 &&
        age <= 45 &&
        mc >= 70000 &&
        mc <= 1200000
      );
    });

    for (const t of joyas) {
      const mensaje = `🟢 *Birdeye - Gema Detectada*\n\n` +
        `🪙 Token: *${t.name} (${t.symbol})*\n` +
        `💧 LP: $${t.liquidity}\n` +
        `📈 Volumen 24h: $${t.volume_24h}\n` +
        `🕒 Edad: ${t.age_minutes} min\n` +
        `💵 Market Cap: $${t.market_cap_usd}`;
      console.log(mensaje);
      await bot.sendMessage(chatId, mensaje, { parse_mode: "Markdown" });
    }

    if (joyas.length === 0) {
      console.log(`[${new Date().toLocaleTimeString()}] Sin joyas en Birdeye.`);
    }
  } catch (e) {
    console.error("Error escaneando Birdeye:", e.message);
  }
};