// birdeyeScanner.js
import fetch from "node-fetch";

export async function escanearBirdeye(bot, chatId) {
  try {
    console.log(`[${new Date().toLocaleTimeString()} PM] Escaneando en Birdeye...`);

    const url = "https://public-api.birdeye.so/defi/tokenlist?chain=solana";
    const res = await fetch(url);
    const json = await res.json();
    const tokens = json?.data || [];

    const joyas = tokens.filter((t) => {
      const lp = t.liquidity || 0;
      const vol = t.volume_24h || 0;
      const age = t.age_minutes || 9999;
      const mc = t.market_cap_usd || 0;

      return (
        lp >= 3000 &&
        lp <= 75000 &&
        vol >= 18000 &&
        vol / lp >= 3 &&
        age <= 45 &&
        mc >= 100000 &&
        mc <= 1500000
      );
    });

    if (joyas.length > 0) {
      for (const t of joyas) {
        const mensaje = `
🟢 *Joya detectada en Birdeye*

*Token:* ${t.name} (${t.symbol})
*LP:* $${t.liquidity.toLocaleString()}
*Volumen 24h:* $${t.volume_24h.toLocaleString()}
*Edad:* ${t.age_minutes} minutos
*Market Cap:* $${t.market_cap_usd.toLocaleString()}

https://birdeye.so/token/${t.address}?chain=solana
        `.trim();

        await bot.sendMessage(chatId, mensaje, { parse_mode: "Markdown" });
      }
    }
  } catch (e) {
    console.error("Error escaneando Birdeye:", e.message);
  }
}