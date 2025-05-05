import fetch from "node-fetch";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

export async function escanearPumpFun() {
  console.log(`[${new Date().toLocaleTimeString()}] Escaneando en Pump.fun...`);
  try {
    const res = await fetch("https://pump.fun/api/token/list");  // ¡Este es el correcto!
    const json = await res.json();
    const tokens = json.tokens || [];

    const joyas = tokens.filter((t) => {
      const lp = t.liquidity || 0;
      const vol = t.volume || 0;
      const holders = t.holders || 0;
      const age = (Date.now() - new Date(t.created_at)) / 60000;
      const mc = t.fully_diluted_market_cap || 0;

      return (
        lp >= 3000 &&
        lp <= 70000 &&
        vol >= 18000 &&
        holders >= 60 &&
        age <= 30 &&
        mc >= 100000 && mc <= 1500000
      );
    });

    if (joyas.length > 0) {
      joyas.forEach((t) => {
        const mensaje = `🟡 *Pump.fun Detected Gem*\n\n🪙 Token: *${t.name} (${t.symbol})*\n💧 LP: $${t.liquidity}\n📈 Vol: $${t.volume}\n👥 Holders: ${t.holders}\n⏱️ Edad: ${((Date.now() - new Date(t.created_at)) / 60000).toFixed(1)} min\n💵 Market Cap: $${t.fully_diluted_market_cap}`;
        console.log(mensaje);
        bot.sendMessage(process.env.CHAT_ID, mensaje, { parse_mode: "Markdown" });
      });
    } else {
      console.log(`[${new Date().toLocaleTimeString()}] Sin joyas en Pump.fun.`);
    }
  } catch (e) {
    console.error("Error escaneando Pump.fun:", e.message);
  }
}