import fetch from "node-fetch";

export async function escanearPumpFun(bot, CHAT_ID) {
  console.log(`[${new Date().toLocaleTimeString()}] Escaneando en Pump.fun...`);
  try {
    const res = await fetch("https://pump.fun/data/tokens.json");
    const tokens = await res.json();

    const joyas = tokens.filter((t) => {
      const lp = t.liquidity || 0;
      const vol = t.volume || 0;
      const holders = t.holders || 0;
      const age = (Date.now() - new Date(t.created_at)) / 60000;
      const marketCap = t.market_cap || 0;

      return (
        lp >= 2500 &&
        lp <= 75000 &&
        vol >= 15000 &&
        holders >= 50 &&
        marketCap <= 85000 &&
        age <= 35
      );
    });

    if (joyas.length > 0) {
      for (const t of joyas) {
        const msg = `
🟡 *Pump.fun: Joya Detectada*
*Nombre:* ${t.name}
*Símbolo:* ${t.symbol}
*LP:* $${t.liquidity}
*Volumen:* $${t.volume}
*MarketCap:* $${t.market_cap}
*Holders:* ${t.holders}
*Ver:* https://pump.fun/${t.tokenId}
        `.trim();
        await bot.sendMessage(CHAT_ID, msg, { parse_mode: "Markdown" });
      }
    } else {
      console.log(`[${new Date().toLocaleTimeString()}] Sin joyas en Pump.fun.`);
    }
  } catch (e) {
    console.error("Error escaneando Pump.fun:", e.message);
  }
}