import fetch from "node-fetch";
import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
const CHAT_ID = process.env.CHAT_ID;

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
        const mensaje = `
🟢 *Birdeye Joya Detectada*  
*Nombre:* ${t.name}  
*Símbolo:* ${t.symbol}  
*LP:* $${t.liquidity?.toFixed(0)}  
*Volumen 24h:* $${t.volume_24h?.toFixed(0)}  
*Edad:* ${t.age_minutes} min  
*Ver:* https://birdeye.so/token/${t.address}?chain=solana
        `.trim();
        await bot.sendMessage(CHAT_ID, mensaje, { parse_mode: "Markdown" });
      }
    } else {
      console.log(`[${new Date().toLocaleTimeString()}] Sin joyas en Birdeye.`);
    }
  } catch (e) {
    console.error("Error escaneando Birdeye:", e.message);
  }
};