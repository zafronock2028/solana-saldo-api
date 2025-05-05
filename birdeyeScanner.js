import fetch from "node-fetch";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
dotenv.config();

const CHAT_ID = process.env.CHAT_ID;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

export async function escanearBirdeye() {
  try {
    console.log(`[${new Date().toLocaleTimeString()}] [Birdeye] Escaneando...`);
    const res = await fetch("https://public-api.birdeye.so/defi/tokenlist?chain=solana");
    const json = await res.json();
    const tokens = json.data || [];

    const joyas = tokens.filter(t => {
      const lp = t.liquidity || 0;
      const vol = t.volume_24h || 0;
      const age = t.age_minutes || 9999;
      return lp >= 5000 && lp <= 80000 && vol > 15000 && vol / lp > 3 && age < 45;
    });

    for (const token of joyas) {
      const msg = `
🚀 *Joya Detectada en Birdeye*  
*Nombre:* ${token.name}  
*Símbolo:* ${token.symbol}  
*LP:* $${token.liquidity?.toFixed(0)}  
*Volumen 24h:* $${token.volume_24h?.toFixed(0)}  
*Ver:* https://birdeye.so/token/${token.address}?chain=solana
      `.trim();
      await bot.sendMessage(CHAT_ID, msg, { parse_mode: "Markdown" });
    }
  } catch (err) {
    console.error("[Birdeye] Error:", err.message);
  }
}