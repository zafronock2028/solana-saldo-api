// dexscreenerScanner.js
import fetch from "node-fetch";

export async function escanearDexScreener(bot, chatId) {
  console.log(`[${new Date().toLocaleTimeString()}] Escaneando en DexScreener...`);
  try {
    const res = await fetch("https://dexscreener-proxy-j5s4.onrender.com/api/dexscreener");
    const json = await res.json();
    const tokens = json.pairs || [];

    for (const t of tokens) {
      const ageMin = (Date.now() - new Date(t.pairCreatedAt).getTime()) / 60000;
      const mc = t.fdv || 0;
      const vol = t.volume.h24 || 0;
      const holders = t.txns?.h24 || 0;
      const lp = t.liquidity?.usd || 0;

      if (
        vol < 1000000 &&
        ageMin <= 4320 && // <= 3 días
        holders >= 5000 &&
        lp >= 3000 &&
        mc >= 100000 && mc <= 1500000
      ) {
        const mensaje = `🟣 *DexScreener Gem Found*\n\n🪙 Token: *${t.baseToken.name} (${t.baseToken.symbol})*\n💧 LP: $${lp}\n📈 Vol: $${vol}\n📅 Edad: ${(ageMin / 60).toFixed(1)} h\n💵 MC: $${mc}`;
        console.log(mensaje);
        await bot.sendMessage(chatId, mensaje, { parse_mode: "Markdown" });
      }
    }

    if (tokens.length === 0) {
      console.log(`[${new Date().toLocaleTimeString()}] Sin joyas en DexScreener.`);
    }
  } catch (e) {
    console.error("Error escaneando DexScreener:", e.message);
  }
}