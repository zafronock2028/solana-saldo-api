import fetch from "node-fetch";

// URL de la API de Birdeye para obtener información de tokens en Solana
const API_URL = "https://public-api.birdeye.so/public/tokenlist?chain=solana";

async function buscarJoyas() {
  try {
    const response = await fetch(API_URL, {
      headers: {
        "accept": "application/json",
        "x-api-key": "tu_api_key_aquí" // Reemplaza con tu clave de API si es necesario
      }
    });
    const data = await response.json();

    if (!data.data) {
      throw new Error("No se encontraron tokens");
    }

    const filtradas = data.data.filter((token) => {
      const liquidez = token.liquidity || 0;
      const volumen = token.volume_24h || 0;
      const edadMin = (Date.now() - new Date(token.created_at).getTime()) / 60000;

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
      console.log(`- ${j.name} (${j.symbol})`);
      console.log(`  Liquidez: $${j.liquidity}`);
      console.log(`  Volumen 24h: $${j.volume_24h}`);
      console.log(`  Edad: ${Math.round((Date.now() - new Date(j.created_at)) / 60000)} min`);
      console.log(`  Link: https://birdeye.so/token/${j.address}`);
      console.log("--------------------------------------------------");
    });

  } catch (error) {
    console.error("Error al buscar joyas:", error.message);
  }
}

// Escanear cada 60 segundos
setInterval(buscarJoyas, 60000);
buscarJoyas();