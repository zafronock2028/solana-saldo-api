// bitqueryScanner.js
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

export async function escanearBitquery(bot, chatId) {
  console.log(`[${new Date().toLocaleTimeString()}] Escaneando en Bitquery...`);

  const query = {
    query: `
      {
        solana {
          dexTrades(options: {limit: 10, desc: "tradeAmount"}){
            market {
              name
            }
            tradeAmount
            count
            buyCurrency {
              symbol
            }
            sellCurrency {
              symbol
            }
            exchange {
              name
            }
          }
        }
      }
    `,
  };

  try {
    const response = await fetch("https://streaming.bitquery.io/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": process.env.BITQUERY_API_KEY,
      },
      body: JSON.stringify(query),
    });

    const data = await response.json();
    const trades = data?.data?.solana?.dexTrades || [];

    if (trades.length > 0) {
      const top = trades[0];
      const mensaje = `📡 *Bitquery Detected Trade*\n\n💱 Par: ${top.buyCurrency.symbol}/${top.sellCurrency.symbol}\n💰 Volumen: $${top.tradeAmount.toFixed(2)}\n📈 Cantidad de trades: ${top.count}`;
      bot.sendMessage(chatId, mensaje, { parse_mode: "Markdown" });
    } else {
      console.log(`[${new Date().toLocaleTimeString()}] Sin joyas en Bitquery.`);
    }
  } catch (error) {
    console.error("Error escaneando Bitquery:", error.message);
  }
}