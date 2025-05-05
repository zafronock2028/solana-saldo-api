// pumpScanner.js
import fetch from "node-fetch";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

const PUMP_FUN_PROXY = "https://client-api-2-743b8b4ee2bf.herokuapp.com/api/tokens";

export async function escanearPumpFun() {
  console.log(`[${new Date().toLocaleTimeString()}] Escaneando en Pump.fun...`);

  try {
    const response = await fetch(PUMP_FUN_PROXY);
    const tokens = await response.json();

    const joyas = tokens.filter((token) => {
      const { liquidity, volume, holders, ageMinutes } = token;
      return (
        liquidity > 2000 &&
        liquidity < 75000 &&
        volume > 15000 &&
        holders > 50 &&
        ageMinutes <= 35 &&
        token.marketCap < 200000
      );
    });

    if (joyas.length > 0) {
      joyas.forEach((token) => {
        const mensaje = `🔥 *Pump.fun Gem*\n\n🪙 Token: *${token.name}*\n💧 LP: $${token.liquidity.toLocaleString()}\n📊 Volumen: $${token.volume.toLocaleString()}\n🧑‍🤝‍🧑 Holders: ${token.holders}\n⏱️ Edad: ${token.ageMinutes} min`;
        bot.sendMessage(process.env.CHAT_ID, mensaje, { parse_mode: "Markdown" });
        console.log(mensaje);
      });
    } else {
      console.log(`[${new Date().toLocaleTimeString()}] Sin joyas en Pump.fun.`);
    }
  } catch (error) {
    console.error("Error escaneando Pump.fun:", error.message);
  }
}