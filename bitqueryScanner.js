import fetch from "node-fetch";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

export async function escanearBitquery(bot, chatId) {
  console.log(`[${new Date().toLocaleTimeString()}] Escaneando en Bitquery...`);

  const query = `
    {
      solana(network: solana) {
        dexTrades(
          options: {desc: ["tradeAmount"], limit: 20}
          date: {since: "2025-05-05T00:00:00Z"}
        ) {
          market {
            baseCurrency {
              symbol
              address
            }
            quoteCurrency {
              symbol
            }
            name
          }
          tradeAmount(in: USD)
          trades: count
        }
      }
    }
  `;

  try {
    const res = await fetch("https://streaming.bitquery.io/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": process.env.BITQUERY_TOKEN,
      },
      body: JSON.stringify({ query }),
    });

    const data = await res.json();
    const tokens = data?.data?.solana?.dexTrades || [];

    const joyas = tokens.filter((t) => {
      const amount = t.tradeAmount || 0;
      const trades = t.trades || 0;
      return amount > 10000 && trades > 30;
    });

    if (joyas.length > 0) {
      joyas.forEach((t) => {
        const mensaje = `🔵 *Bitquery Detected Gem*\n\n🪙 Token: *${t.market.baseCurrency.symbol}*\n💵 Monto en trades: $${t.tradeAmount.toFixed(2)}\n📊 Trades: ${t.trades}`;
        console.log(mensaje);
        bot.sendMessage(chatId, mensaje, { parse_mode: "Markdown" });
      });
    } else {
      console.log(`[${new Date().toLocaleTimeString()}] Sin joyas en Bitquery.`);
    }
  } catch (e) {
    console.error("Error escaneando Bitquery:", e.message);
  }
}