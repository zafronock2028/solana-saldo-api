import fetch from "node-fetch";

export async function escanearPumpFun() {
  console.log(`[${new Date().toLocaleTimeString()}] Escaneando en Pump.fun...`);
  try {
    const res = await fetch("https://pump.fun/data/tokens.json");
    const tokens = await res.json();

    const joyas = tokens.filter((t) => {
      const lp = t.liquidity || 0;
      const vol = t.volume || 0;
      const holders = t.holders || 0;
      const age = (Date.now() - new Date(t.created_at)) / 60000;

      return (
        lp >= 2000 &&
        lp <= 75000 &&
        vol >= 15000 &&
        holders >= 50 &&
        age <= 35
      );
    });

    if (joyas.length > 0) {
      joyas.forEach((t) => {
        console.log(`🟡 Pump.fun: ${t.name} (${t.symbol}) | LP: $${t.liquidity} | Vol: $${t.volume} | Holders: ${t.holders}`);
      });
    } else {
      console.log(`[${new Date().toLocaleTimeString()}] Sin joyas en Pump.fun.`);
    }
  } catch (e) {
    console.error("Error escaneando Pump.fun:", e.message);
  }
}