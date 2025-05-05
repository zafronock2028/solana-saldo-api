import fetch from "node-fetch";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

export async function escanearPumpFun(bot, chatId) {
  console.log(`[${new Date().toLocaleTimeString()}] Escaneando en Pump.fun...`);
  try {
    const res = await fetch("https://client-api-2-743b8b4ee2bf.herokuapp.com/api/tokens");
    const tokens = await res.json();

    const joyas = tokens.filter((t) => {
      const lp = t.liquidity || 0;
      const vol = t.volume || 0;
      const holders = t.holders || 0;
      const age = (Date.now() - new Date(t.created_at)) / 60000;
      const mc = t.fully_diluted_market_cap || 0;

      return (
        lp >= 3000 &&
        lp <= 75000 &&
        vol >= 18000 &&
        holders >= 60 &&
        age <= 30 &&
        mc >= 100000 && mc <= 1500000
      );
    });

    for (const t of joyas) {
      const mensaje = `🟡 *Pump.fun Detected Gem*\n\n🪙 Token: *${t.name} (${t.symbol})*\n💧 LP: $${t.liquidity}\n📈 Vol: $${t.volume}\n👥 Holders: ${t.holders}\n⏱️ Edad: ${((Date.now() - new Date(t.created_at)) / 60000).toFixed(1)} min\n💵 MC: $${t.fully_diluted_market_cap}`;
      console.log(mensaje);
      await bot.sendMessage(chatId, mensaje, { parse_mode: "Markdown" });
    }

    if (joyas.length === 0) {
      console.log(`[${new Date().toLocaleTimeString()}] Sin joyas en Pump.fun.`);
    }
  } catch (e) {
    console.error("Error escaneando Pump.fun:", e.message);
  }
}