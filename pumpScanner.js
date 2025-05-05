export async function escanearPumpFun() {
  console.log(`[${new Date().toLocaleTimeString()}] Escaneando en Pump.fun...`);
  try {
    const res = await fetch("https://pump.fun/api/token/list");
    const json = await res.json();
    const tokens = json.tokens || [];

    const joyas = tokens.filter((t) => {
      const lp = t.liquidity || 0;
      const vol = t.volume || 0;
      const holders = t.holders || 0;
      const age = (Date.now() - new Date(t.created_at)) / 60000;

      return (
        lp >= 2500 && lp <= 60000 &&
        vol >= 20000 &&
        holders >= 70 &&
        age <= 30
      );
    });

    if (joyas.length > 0) {
      joyas.forEach((t) => {
        console.log(`🟡 Pump.fun: ${t.name} (${t.symbol}) | LP: $${t.liquidity} | Vol: $${t.volume} | Holders: ${t.holders} | Edad: ${((Date.now() - new Date(t.created_at)) / 60000).toFixed(1)} min`);
      });
    } else {
      console.log(`[${new Date().toLocaleTimeString()}] Sin joyas en Pump.fun.`);
    }
  } catch (e) {
    console.error("Error escaneando Pump.fun:", e.message);
  }
}