// bitqueryScanner.js
import fetch from "node-fetch";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

export async function escanearBitquery(bot, chatId) {
  console.log(`[${new Date().toLocaleTimeString()}] Escaneando en Bitquery...`);

  const query = `
  {
    solana {
      dexTrades(
        options: {limit: 20, desc: "timeInterval.minute"}
        exchangeName: {is: "Raydium"}
        time: {since: "2025-05-05T00:00:00", till: "2025-05-05T23:59:00"}
      ) {
        market {
          baseCurrency {
            symbol
            address
          }
        }
        tradeAmount(in: USD)
        quoteCurrency {
          symbol
        }
        timeInterval {
          minute(count: 5)
        }
      }
    }
  }`;

  try {
    const res = await fetch("https://streaming.bitquery.io/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": process.env.BITQUERY_API_KEY,
      },
      body: JSON.stringify({ query }),
    });

    const data = await res.json();

    if (!data?.data?.solana?.dexTrades?.length) {
      console.log(`[${new Date().toLocaleTimeString()}] Sin resultados en Bitquery.`);
      return;
    }

    const joyas = data.data.solana.dexTrades.filter((t) => t.tradeAmount > 10000);

    joyas.forEach((t) => {
      const token = t.market.baseCurrency;
      const mensaje = `🔵 *Bitquery Detected Gem*\n\n🪙 Token: *${token.symbol}*\n💰 Volumen USD: $${t.tradeAmount}\n📊 Dirección: ${token.address}`;
      console.log(mensaje);
      bot.sendMessage(chatId, mensaje, { parse_mode: "Markdown" });
    });

    if (joyas.length === 0) {
      console.log(`[${new Date().toLocaleTimeString()}] Sin joyas en Bitquery.`);
    }
  } catch (e) {
    console.error("Error escaneando Bitquery:", e.message);
  }
}