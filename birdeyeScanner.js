import fetch from "node-fetch";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
dotenv.config();

const CHAT_ID = process.env.CHAT_ID;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);

export const escanearBirdeye = async () => {
  console.log(`[${new Date().toLocaleTimeString()}] Escaneando en Birdeye...`);
  try {
    const res = await fetch("https://public-api.birdeye.so/defi/tokenlist?chain=solana");
    const json = await res.json();
    const tokens = json?.data || [];

    const joyas = tokens.filter((t) => {
      const lp = t.liquidity || 0;
      const vol = t.volume_24h || 0;
      const age = t.age_minutes || 9999;
      return (
        lp >= 3000 && lp <= 75000 &&
        vol >= 15000 &&
        vol / lp >= 3 &&
        age <= 45
      );
    });

    if (joyas.length > 0) {
      for (const t of joyas) {
        const msg = `
🟢 *Birdeye - Joya Detectada*
*Nombre:* ${t.name}
*Símbolo:* ${t.symbol}
*LP:* $${t.liquidity}
*Volumen 24h:* $${t.volume_24h}
[Ver en Birdeye](https://birdeye.so/token/${t.address}?chain=solana)
        `.trim();
        await bot.sendMessage(CHAT_ID, msg, { parse_mode: "Markdown" });
        console.log(`🟢 Birdeye: ${t.name} (${t.symbol})`);
      }
    } else {
      console.log(`[${new Date().toLocaleTimeString()}] Sin joyas en Birdeye.`);
    }
  } catch (e) {
    console.error("Error escaneando Birdeye:", e.message);
  }
};