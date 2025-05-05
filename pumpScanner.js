import fetch from "node-fetch";
import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";

dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

export async function escanearPumpFun() {
  console.log(`[${new Date().toLocaleTimeString()}] Escaneando en Pump.fun...`);
  try {
    const res = await fetch("https://pump.fun/data/tokens.json");
    const tokens = await res.json();

    const joyas = tokens.filter((t) => {
      const lp = t.liquidity || 0;
      const vol = t.volume || 0;
      const holders = t.holders || 0;
      const age = (Date.now() - new Date(t.created_at)) / 60000;

      return (
        lp >= 2000 &&
        lp <= 75000 &&
        vol >= 15000 &&
        holders >= 50 &&
        age <= 35
      );
    });

    if (joyas.length > 0) {
      for (const t of joyas) {
        console.log(`🟡 Pump.fun: ${t.name} (${t.symbol}) | LP: $${t.liquidity} | Vol: $${t.volume} | Holders: ${t.holders}`);

        const mensaje = `
🚀 *Joya Detectada en Pump.fun*  
*Nombre:* ${t.name}  
*Símbolo:* ${t.symbol}  
*LP:* $${t.liquidity}  
*Volumen:* $${t.volume}  
*Holders:* ${t.holders}  
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