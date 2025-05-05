import fetch from "node-fetch";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

export async function escanearBitquery() {
  console.log(`[${new Date().toLocaleTimeString()}] Escaneando en Bitquery...`);

  const apiKey = process.env.BITQUERY_API_KEY;
  const endpoint = "https://streaming.bitquery.io/graphql";

  const query = {
    query: `
      {
        solana {
          dexTrades(options: {limit: 5, desc: ["tradeAmount"]}) {
            market {
              baseCurrency {
                symbol
                address
              }
            }
            tradeAmount
            trades: count
          }
        }
      }
    `,
  };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify(query),
    });

    const data = await res.json();

    if (data.errors) {
      console.error("Error en respuesta de Bitquery:", data.errors);
      return;
    }

    const tokens = data?.data?.solana?.dexTrades || [];

    if (tokens.length === 0) {
      console.log(`[${new Date().toLocaleTimeString()}] Sin joyas en Bitquery.`);
      return;
    }

    tokens.forEach((t) => {
      const mensaje = `🔵 *Bitquery Detected*\n\n🪙 Token: *${t.market.baseCurrency.symbol}*\n💰 Monto: $${t.tradeAmount}\n📊 Trades: ${t.trades}`;
      console.log(mensaje);
      bot.sendMessage(process.env.CHAT_ID, mensaje, { parse_mode: "Markdown" });
    });
  } catch (e) {
    console.error("Error escaneando Bitquery:", e.message);
  }
}