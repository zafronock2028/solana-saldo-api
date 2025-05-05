import fetch from "node-fetch";

// API pública de Dexscreener (filtrando por Solana)
const API_URL = "https://api.dexscreener.com/latest/dex/pairs/solana";

async function buscarJoyas() {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    if (!data.pairs) {
      throw new Error("No se encontraron pares");
    }

    const filtradas = data.pairs.filter((pair) => {
      const liquidez = pair.liquidity?.usd || 0;
      const volumen = pair.volume?.h24 || 0;
      const edadMin = (Date.now() - new Date(pair.pairCreatedAt).getTime()) / 60000;

      return (
        liquidez >= 5000 &&
        liquidez <= 80000 &&
        volumen > 15000 &&
        volumen / liquidez > 3 &&
        edadMin < 45
      );
    });

    console.clear();
    console.log(`[${new Date().toLocaleTimeString()}] Joyas encontradas: ${filtradas.length}`);
    filtradas.forEach((j) => {
      console.log(`- ${j.baseToken.name} (${j.baseToken.symbol})`);
      console.log(`  Liquidez: $${j.liquidity.usd}`);
      console.log(`  Volumen 24h: $${j.volume.h24}`);
      console.log(`  Edad: ${Math.round((Date.now() - new Date(j.pairCreatedAt)) / 60000)} min`);
      console.log(`  Link: ${j.url}`);
      console.log("--------------------------------------------------");
    });

  } catch (error) {
    console.error("Error al buscar joyas:", error.message);
  }
}

// Escanear cada 60 segundos
setInterval(buscarJoyas, 60000);
buscarJoyas();