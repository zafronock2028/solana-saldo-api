
import fetch from "node-fetch";

// Primer módulo: escanear tokens desde GMGN.ai
const GMGN_API_URL = "https://gmgn.ai/api/tokens";

// Lógica inicial para buscar joyas potenciales
async function buscarJoyas() {
  try {
    const response = await fetch(GMGN_API_URL);
    const tokens = await response.json();

    const filtradas = tokens.filter(token => {
      const liquidez = token.liquidity_usd || 0;
      const volumen = token.volume_usd || 0;
      const edadMin = token.age_minutes || 9999;

      // Filtros clave para detectar joyas potenciales
      return (
        liquidez >= 5000 &&
        liquidez <= 80000 &&
        volumen > 15000 &&
        volumen / liquidez > 3 &&
        edadMin < 45
      );
    });

    console.log("Joyas encontradas:", filtradas.length);
    filtradas.forEach(joya => {
      console.log(`- ${joya.name} (${joya.symbol}): Liquidez $${joya.liquidity_usd}, Volumen $${joya.volume_usd}, Edad ${joya.age_minutes} min`);
    });

  } catch (error) {
    console.error("Error al buscar tokens en GMGN:", error.message);
  }
}

// Ejecutar escaneo cada 60 segundos
setInterval(buscarJoyas, 60000);
buscarJoyas();
