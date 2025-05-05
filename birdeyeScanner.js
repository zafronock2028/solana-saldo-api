import fetch from "node-fetch";

export async function escanearBirdeye() {
  console.log(`[${new Date().toLocaleTimeString()}] Escaneando en Birdeye...`);
  try {
    const res = await fetch("https://public-api.birdeye.so/defi/tokenlist?chain=solana");
    const json = await res.json();
    const tokens = json?.data || [];

    const joyas = [];

    for (const token of tokens.slice(0, 30)) {  // solo los primeros 30 para no sobrecargar
      const lp = token.liquidity || 0;
      const vol = token.volume_24h || 0;
      const age = token.age_minutes || 9999;

      if (
        lp >= 3000 && lp <= 75000 &&
        vol >= 15000 &&
        vol / lp >= 3 &&
        age <= 45
      ) {
        const overviewRes = await fetch(`https://public-api.birdeye.so/defi/token_overview?address=${token.address}`);
        const overview = await overviewRes.json();
        const mc = overview?.data?.market_cap_usd || 0;

        if (mc >= 1000 && mc <= 15000) {
          joyas.push({ ...token, market_cap: mc });
        }
      }
    }

    if (joyas.length > 0) {
      joyas.forEach((t) => {
        console.log(`🟢 Birdeye: ${t.name} (${t.symbol}) | LP: $${t.liquidity} | Vol: $${t.volume_24h} | MC: $${t.market_cap.toFixed(0)}`);
      });
    } else {
      console.log(`[${new Date().toLocaleTimeString()}] Sin joyas en Birdeye.`);
    }
  } catch (e) {
    console.error("Error escaneando Birdeye:", e.message);
  }
}