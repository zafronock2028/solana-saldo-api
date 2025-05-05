import fetch from "node-fetch";

export async function escanearPumpFun(bot, chatId) {
  console.log(`[${new Date().toLocaleTimeString()}] Escaneando en Pump.fun...`);
  try {
    const res = await fetch("https://pump-api-proxy.fly.dev/api/tokens");
    const tokens = await res.json();

    const joyas = tokens.filter((t) => {
      const lp = t.liquidity || 0;
      const vol = t.volume || 0;
      const holders = t.holders || 0;
      const age = (Date.now() - new Date(t.created_at)) / 60000;
      const mc = t.fully_diluted_market_cap || 0;

      return (
        lp >= 3000 &&
        lp <= 75000 &&
        vol >= 18000 &&
        holders >= 60 &&
        age <= 30 &&
        mc >= 100000 && mc <= 1500000
      );
    });

    if (joyas.length > 0) {
      joyas.forEach((t) => {
        const mensaje = `🟡 *Pump.fun Detected Gem*\n\n🪙 Token: *${t.name} (${t.symbol})*\n💧 LP: $${t.liquidity}\n📈 Vol: $${t.volume}\n👥 Holders: ${t.holders}\n⏱️ Edad: ${age.toFixed(1)} min\n💵 MC: $${mc}`;
        console.log(mensaje);
        bot.sendMessage(chatId, mensaje, { parse_mode: "Markdown" });
      });
    } else {
      console.log(`[${new Date().toLocaleTimeString()}] Sin joyas en Pump.fun.`);
    }
  } catch (e) {
    console.error("Error escaneando Pump.fun:", e.message);
  }
}