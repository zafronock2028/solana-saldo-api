// bitqueryScanner.js
import fetch from "node-fetch";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

export async function escanearBitquery() {
  console.log(`[${new Date().toLocaleTimeString()}] Escaneando en Bitquery...`);

  const query = `
    {
      solana(network: solana) {
        dexTrades(
          options: {limit: 10, desc: "timeInterval.minute"}
          exchangeName: "Raydium"
          baseCurrency: {isNot: "SOL"}
          quoteCurrency: {is: "SOL"}
          time: {since: null}
        ) {
          timeInterval {
            minute(count: 1)
          }
          baseCurrency {
            symbol
            address
          }
          quoteCurrency {
            symbol
          }
          trades: count
          tradeAmount(in: USD)
          quotePrice
        }
      }
    }
  `;

  try {
    const response = await fetch("https://streaming.bitquery.io/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": process.env.BITQUERY_API_KEY,
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();

    const joyas = (data.data?.solana?.dexTrades || []).filter((t) => {
      const volumen = t.tradeAmount;
      return volumen > 15000;
    });

    if (joyas.length > 0) {
      joyas.forEach((t) => {
        const mensaje = `🟣 *Bitquery Detected Gem*\n\n🪙 Token: *${t.baseCurrency.symbol}*\n📊 Volumen: $${t.tradeAmount.toFixed(2)}\n💱 Precio: ${t.quotePrice.toFixed(6)} SOL`;
        console.log(mensaje);
        bot.sendMessage(process.env.CHAT_ID, mensaje, { parse_mode: "Markdown" });
      });
    } else {
      console.log(`[${new Date().toLocaleTimeString()}] Sin joyas en Bitquery.`);
    }
  } catch (error) {
    console.error("Error escaneando Bitquery:", error.message);
  }
}