import fetch from "node-fetch";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

export async function escanearBitquery() {
  console.log(`[${new Date().toLocaleTimeString()}] Escaneando en Bitquery...`);

  const query = {
    query: `
      {
        solana {
          dexTrades(
            options: {limit: 10, desc: ["tradeAmount"]}
            date: {since: null, till: null}
          ) {
            baseCurrency {
              symbol
              address
            }
            quoteCurrency {
              symbol
            }
            tradeAmount(in: USD)
            tradeCount
          }
        }
      }
    `
  };

  try {
    const res = await fetch("https://streaming.bitquery.io/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": process.env.BITQUERY_API_KEY
      },
      body: JSON.stringify(query),
    });

    const data = await res.json();
    const trades = data?.data?.solana?.dexTrades || [];

    const joyas = trades.filter(t => {
      const vol = t.tradeAmount || 0;
      return vol > 15000;
    });

    if (joyas.length > 0) {
      joyas.forEach(t => {
        const msg = `🔶 *Bitquery Detected Gem*\n\n🪙 Token: *${t.baseCurrency.symbol}*\n📊 Volumen: $${t.tradeAmount.toFixed(2)}\n🔁 Trades: ${t.tradeCount}`;
        console.log(msg);
        bot.sendMessage(process.env.CHAT_ID, msg, { parse_mode: "Markdown" });
      });
    } else {
      console.log(`[${new Date().toLocaleTimeString()}] Sin joyas en Bitquery.`);
    }

  } catch (error) {
    console.error("Error escaneando Bitquery:", error.message);
  }
}