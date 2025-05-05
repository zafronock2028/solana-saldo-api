import fetch from "node-fetch";

export const escanearBirdeye = async (bot, chatId) => {
  console.log(`[${new Date().toLocaleTimeString()}] Escaneando en Birdeye...`);
  try {
    const res = await fetch("https://public-api.birdeye.so/defi/tokenlist?chain=solana");
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
        mc >= 100000 && mc <= 1500000
      );
    });

    if (joyas.length > 0) {
      joyas.forEach((t) => {
        const mensaje = `🟢 *Birdeye Detected Gem*\n\n🪙 Token: *${t.name} (${t.symbol})*\n💧 LP: $${t.liquidity}\n📈 Vol: $${t.volume_24h}\n⏱️ Edad: ${t.age_minutes} min\n💵 MC: $${t.market_cap_usd}`;
        console.log(mensaje);
        bot.sendMessage(chatId, mensaje, { parse_mode: "Markdown" });
      });
    } else {
      console.log(`[${new Date().toLocaleTimeString()}] Sin joyas en Birdeye.`);
    }
  } catch (e) {
    console.error("Error escaneando Birdeye:", e.message);
  }
};