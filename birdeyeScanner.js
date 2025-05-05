export const escanearBirdeye = async () => {
  console.log(`[${new Date().toLocaleTimeString()}] Escaneando en Birdeye...`);
  try {
    const res = await fetch("https://public-api.birdeye.so/defi/tokenlist?chain=solana");
    const json = await res.json();
    const tokens = json?.data || [];

    const joyas = tokens.filter((t) => {
      const lp = t.liquidity || 0;
      const vol = t.volume_24h || 0;
      const age = t.age_minutes || 9999;
      return (
        lp >= 3000 && lp <= 75000 &&
        vol >= 15000 &&
        vol / lp >= 3 &&
        age <= 45
      );
    });

    if (joyas.length > 0) {
      joyas.forEach((t) => {
        console.log(`🟢 Birdeye: ${t.name} (${t.symbol}) | LP: $${t.liquidity} | Vol: $${t.volume_24h}`);
      });
    } else {
      console.log(`[${new Date().toLocaleTimeString()}] Sin joyas en Birdeye.`);
    }
  } catch (e) {
    console.error("Error escaneando Birdeye:", e.message);
  }
};