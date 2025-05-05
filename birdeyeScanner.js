import fetch from "node-fetch";

export async function escanearBirdeye(bot, CHAT_ID) {
  console.log(`[${new Date().toLocaleTimeString()}] Escaneando en Birdeye...`);
  try {
    const res = await fetch("https://public-api.birdeye.so/defi/tokenlist?chain=solana");
    const json = await res.json();
    const tokens = json?.data || [];

    const joyas = tokens.filter((t) => {
      const lp = t.liquidity || 0;
      const vol = t.volume_24h || 0;
      const age = t.age_minutes || 9999;
      const mc = t.market_cap || 0;

      return (
        lp >= 2500 &&
        lp <= 75000 &&
        vol >= 15000 &&
        vol / lp >= 3 &&
        mc <= 85000 &&
        age <= 45
      );
    });

    if (joyas.length > 0) {
      for (const t of joyas) {
        const msg = `
🟢 *Birdeye: Joya Detectada*
*Nombre:* ${t.name}
*Símbolo:* ${t.symbol}
*LP:* $${t.liquidity}
*Volumen 24h:* $${t.volume_24h}
*MarketCap:* $${t.market_cap}
*Edad:* ${t.age_minutes} min
*Ver:* https://birdeye.so/token/${t.address}?chain=solana
        `.trim();
        await bot.sendMessage(CHAT_ID, msg, { parse_mode: "Markdown" });
      }
    } else {
      console.log(`[${new Date().toLocaleTimeString()}] Sin joyas en Birdeye.`);
    }
  } catch (e) {
    console.error("Error escaneando Birdeye:", e.message);
  }
}