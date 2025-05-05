// pumpScanner.js
import fetch from "node-fetch";

export async function escanearPumpFun(bot, chatId) {
  try {
    console.log(`[${new Date().toLocaleTimeString()} PM] Escaneando en Pump.fun...`);

    const url = "https://client-api-2-743b8b4ee2bf.herokuapp.com/api/tokens";
    const res = await fetch(url);
    const data = await res.json();

    const joyas = data.filter((token) => {
      const lp = token.liquidity?.usd || 0;
      const volume = token.volume_24h?.usd || 0;
      const holders = token.holders || 0;
      const age = token.age_minutes || 0;
      const marketCap = token.market_cap_usd || 0;

      return (
        lp >= 2000 &&
        lp <= 75000 &&
        volume >= 15000 &&
        holders >= 50 &&
        age <= 35 &&
        marketCap <= 100000
      );
    });

    if (joyas.length > 0) {
      for (const token of joyas) {
        const msg = `
🔥 *¡Joya detectada en Pump.fun!* 🔥

*Token:* ${token.name} (${token.symbol})
*LP:* $${token.liquidity.usd.toLocaleString()}
*Volumen 24h:* $${token.volume_24h.usd.toLocaleString()}
*Holders:* ${token.holders}
*Edad:* ${token.age_minutes} minutos
*Market Cap:* $${token.market_cap_usd.toLocaleString()}

https://pump.fun/${token.address}
        `.trim();

        await bot.sendMessage(chatId, msg, { parse_mode: "Markdown" });
      }
    }
  } catch (error) {
    console.error("Error escaneando Pump.fun:", error.message);
  }
}