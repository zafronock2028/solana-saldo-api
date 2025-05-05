import fetch from "node-fetch";

// Función para escanear tokens en Pump.fun
export async function escanearPumpFun() {
  try {
    console.log(`[${new Date().toLocaleTimeString()}] Escaneando Pump.fun...`);
    
    const res = await fetch("https://pump.fun/api/combined/tokens");
    const json = await res.json();
    const tokens = json?.tokens || [];

    const filtradas = tokens.filter((t) => {
      const lp = t.liquidity || 0;
      const vol = t.volume || 0;
      const holders = t.holders || 0;
      const age = (Date.now() - new Date(t.created_at).getTime()) / 60000;

      return (
        lp >= 2000 &&
        lp <= 80000 &&
        vol >= 15000 &&
        holders >= 50 &&
        age <= 30
      );
    });

    if (filtradas.length > 0) {
      filtradas.forEach((t) => {
        console.log(`🚨 Token: ${t.name} (${t.symbol}) - LP: $${lp} - Holders: ${holders} - Age: ${age.toFixed(1)} min`);
      });
    } else {
      console.log(`[${new Date().toLocaleTimeString()}] Sin joyas en Pump.fun.`);
    }

  } catch (e) {
    console.error("Error escaneando Pump.fun:", e.message);
  }
}