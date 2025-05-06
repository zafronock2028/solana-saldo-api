import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import idl from './pump.json' assert { type: 'json' };
import dotenv from 'dotenv';

dotenv.config();

// Configuración mejorada de conexión
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const SOLANA_RPC = HELIUS_API_KEY 
  ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
  : clusterApiUrl('mainnet-beta');

const connection = new Connection(SOLANA_RPC, {
  commitment: 'confirmed',
  wsEndpoint: HELIUS_API_KEY 
    ? `wss://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
    : undefined
});

const provider = new AnchorProvider(connection, {}, {});
const programId = new PublicKey('PumPpTunA9D49qkZ2TBeCpYTxUN1UbkXHc3i7zALvN2');
const program = new Program(idl, programId, provider);

// Cache mejorada con expiración
const tokenCache = new Map();

export async function escanearPumpFun(bot, chatId) {
  try {
    console.log(`[${new Date().toLocaleTimeString()}] Iniciando escaneo avanzado...`);

    // 1. Obtener todas las cuentas del programa
    const allAccounts = await connection.getProgramAccounts(programId, {
      filters: [
        { dataSize: 324 }, // Tamaño estándar para cuentas de tokens
        { memcmp: { offset: 0, bytes: '3' } } // Filtro para tokens
      ],
      commitment: 'confirmed'
    });

    console.log(`[Debug] Cuentas encontradas: ${allAccounts.length}`);

    if (allAccounts.length === 0) {
      console.log("No se encontraron cuentas de tokens.");
      return;
    }

    // 2. Filtrar solo tokens nuevos (últimos 5 minutos)
    const currentSlot = await connection.getSlot();
    const currentBlockTime = await connection.getBlockTime(currentSlot);
    
    const newTokens = [];
    
    for (const account of allAccounts) {
      const accountInfo = await connection.getParsedAccountInfo(account.pubkey);
      const parsedData = accountInfo.value?.data?.parsed?.info;
      
      if (!parsedData || !parsedData.createdAt) continue;
      
      const tokenAgeMinutes = (currentBlockTime - parsedData.createdAt) / 60;
      
      if (tokenAgeMinutes < 5) { // Tokens menores a 5 minutos
        const tokenAddress = account.pubkey.toBase58();
        
        if (!tokenCache.has(tokenAddress)) {
          newTokens.push({
            address: tokenAddress,
            age: tokenAgeMinutes,
            data: parsedData
          });
          tokenCache.set(tokenAddress, Date.now());
        }
      }
    }

    console.log(`[Debug] Tokens nuevos encontrados: ${newTokens.length}`);

    // 3. Procesar tokens nuevos
    if (newTokens.length > 0) {
      for (const token of newTokens) {
        try {
          const tokenDetails = await getEnhancedTokenDetails(token.address);
          
          const message = buildTokenMessage(token, tokenDetails);
          await bot.sendMessage(chatId, message, {
            parse_mode: "Markdown",
            disable_web_page_preview: true
          });
          
          console.log(`Token detectado: ${token.address}`);
        } catch (error) {
          console.error(`Error procesando token ${token.address}:`, error);
        }
        await delay(500); // Pequeño delay entre tokens
      }
    } else {
      console.log("No se encontraron tokens nuevos (menores a 5 minutos).");
    }

    // Limpiar cache de tokens viejos (mayores a 1 hora)
    cleanTokenCache();
    
  } catch (error) {
    console.error("Error en escaneo avanzado:", error);
    throw error;
  }
}

// Funciones auxiliares mejoradas
async function getEnhancedTokenDetails(tokenAddress) {
  try {
    // 1. Datos on-chain
    const accountInfo = await connection.getParsedAccountInfo(new PublicKey(tokenAddress));
    const onChainData = accountInfo.value?.data?.parsed?.info || {};
    
    // 2. Datos de la API de Pump.fun (si está disponible)
    let pumpFunData = {};
    try {
      const response = await fetch(`https://api.pump.fun/token/${tokenAddress}`);
      if (response.ok) {
        pumpFunData = await response.json();
      }
    } catch (apiError) {
      console.error(`Error API Pump.fun para ${tokenAddress}:`, apiError);
    }
    
    // 3. Datos de Raydium (opcional)
    let liquidityData = {};
    try {
      const response = await fetch(`https://api.raydium.io/v2/main/coin/info?coin=${tokenAddress}`);
      if (response.ok) {
        const data = await response.json();
        liquidityData = {
          raydiumLiquidity: data?.liquidity,
          raydiumPrice: data?.price
        };
      }
    } catch (raydiumError) {
      console.error(`Error API Raydium para ${tokenAddress}:`, raydiumError);
    }
    
    return {
      ...onChainData,
      ...pumpFunData,
      ...liquidityData
    };
  } catch (error) {
    console.error(`Error obteniendo detalles para ${tokenAddress}:`, error);
    return {};
  }
}

function buildTokenMessage(token, details) {
  return `🚀 *NUEVO TOKEN DETECTADO* 🚀\n\n` +
         `🔹 *CA:* \`${token.address}\`\n` +
         `🔹 *Edad:* ${token.age.toFixed(2)} minutos\n` +
         `🔹 *Nombre:* ${details.name || 'No disponible'}\n` +
         `🔹 *Símbolo:* ${details.symbol || '?'}\n` +
         `🔹 *Liquidez:* ${details.liquidity || details.raydiumLiquidity || '0'} SOL\n` +
         `🔹 *Precio:* ${details.price || details.raydiumPrice || 'No disponible'}\n` +
         `🔹 *Holders:* ${details.holders || '0'}\n\n` +
         `[🔗 Pump.fun](https://pump.fun/${token.address}) | ` +
         `[📊 DexScreener](https://dexscreener.com/solana/${token.address})`;
}

function cleanTokenCache() {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  for (const [token, timestamp] of tokenCache.entries()) {
    if (now - timestamp > oneHour) {
      tokenCache.delete(token);
    }
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}