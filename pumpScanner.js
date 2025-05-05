import fetch from "node-fetch";
import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
const CHAT_ID = process.env.CHAT_ID;

export async function escanearPumpFun() {
  console.log(`[${new Date().toLocaleTimeString()}] Escaneando en Pump.fun...`);
  try {
    const res = await fetch("https://pump.fun/api/token/list");
    const json = await res.json();
    const tokens = json.tokens || [];

    const joyas = tokens.filter((t) => {
      const lp = t.liquidity || 0;
      const vol = t.volume || 0;
      const holders = t.holders || 0;
      const age = (Date.now() - new Date(t.created_at)) / 60000;

      return (
        lp >= 2000 && lp <= 75000 &&
        vol >= 15000 &&
        holders >= 50 &&
        age <= 35
      );
    });

    if (joyas.length > 0) {
      for (const t of joyas) {
        const mensaje = `
🔥 *Pump.fun Joya Detectada*  
*Nombre:* ${t.name}  
*Símbolo:* ${t.symbol}  
*LP:* $${t.liquidity.toFixed(0)}  
*Volumen:* $${t.volume.toFixed(0)}  
*Holders:* ${t.holders}  
*Edad:* ${Math.round((Date.now() - new Date(t.created_at)) / 60000)} min  
*Ver:* https://pump.fun/${t.symbol}
        `.trim();
        await bot.sendMessage(CHAT_ID, mensaje, { parse_mode: "Markdown" });
      }
    } else {
      console.log(`[${new Date().toLocaleTimeString()}] Sin joyas en Pump.fun.`);
    }
  } catch (e) {
    console.error("Error escaneando Pump.fun:", e.message);
  }
}