import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

// Configuración de conexión mejorada
const RPC_ENDPOINTS = [
  process.env.HELIUS_API_KEY ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}` : null,
  'https://api.mainnet-beta.solana.com',
  'https://solana-mainnet.rpc.extrnode.com',
  'https://ssc-dao.genesysgo.net'
].filter(Boolean);

let currentRpcIndex = 0;
const connection = new Connection(RPC_ENDPOINTS[currentRpcIndex], {
  commitment: 'confirmed',
  disableRetryOnRateLimit: true,
  confirmTransactionInitialTimeout: 60000
});

// Programa de Pump.fun
const PROGRAM_ID = new PublicKey('PumPpTunA9D49qkZ2TBeCpYTxUN1UbkXHc3i7zALvN2');
const provider = new AnchorProvider(connection, {}, {});
const program = new Program({
  version: '0.1.0',
  name: 'pumpfun',
  instructions: [],
  accounts: [],
  metadata: {
    address: PROGRAM_ID.toString()
  }
}, PROGRAM_ID, provider);

// Estrategias de detección
const DETECTION_METHODS = [
  'pumpFunTrending',
  'pumpFunRecent',
  'onChainScan',
  'birdeyeTrending'
];

// Cache de tokens
const tokenCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hora

export async function escanearPumpFun(bot, chatId) {
  try {
    console.log(`[${new Date().toLocaleTimeString()}] Iniciando escaneo...`);

    // Rotar RPC si es necesario
    await checkRpcConnection();

    // Probar múltiples métodos de detección
    for (const method of DETECTION_METHODS) {
      try {
        const tokens = await detectTokens(method);
        if (tokens.length > 0) {
          await processAndNotify(tokens, bot, chatId);
          cleanCache();
          return;
        }
      } catch (error) {
        console.error(`Error con método ${method}:`, error.message);
      }
    }

    console.log("No se encontraron tokens nuevos con ningún método.");
  } catch (error) {
    console.error("Error general en escaneo:", error);
    rotateRpcEndpoint();
  }
}

// Métodos de detección
async function detectTokens(method) {
  switch (method) {
    case 'pumpFunTrending':
      return fetchPumpFunTrending();
    case 'pumpFunRecent':
      return fetchPumpFunRecent();
    case 'onChainScan':
      return fetchOnChainTokens();
    case 'birdeyeTrending':
      return fetchBirdeyeTrending();
    default:
      return [];
  }
}

async function fetchPumpFunTrending() {
  try {
    const response = await fetch('https://api.pump.fun/trending', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 8000
    });
    
    if (!response.ok) throw new Error(`Status: ${response.status}`);
    
    const data = await response.json();
    return data.map(t => ({
      address: t.mint,
      name: t.name,
      symbol: t.symbol,
      age: (Date.now() - new Date(t.createdAt).getTime()) / 60000,
      liquidity: t.liquidity,
      holders: t.holders,
      source: 'Pump.fun Trending'
    }));
  } catch (error) {
    console.error("Error en Pump.fun Trending:", error.message);
    return [];
  }
}

async function fetchPumpFunRecent() {
  try {
    const response = await fetch('https://api.pump.fun/recent', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 8000
    });
    
    if (!response.ok) throw new Error(`Status: ${response.status}`);
    
    const data = await response.json();
    return data.map(t => ({
      address: t.mint,
      name: t.name,
      symbol: t.symbol,
      age: (Date.now() - new Date(t.createdAt).getTime()) / 60000,
      liquidity: t.liquidity,
      holders: t.holders,
      source: 'Pump.fun Recent'
    }));
  } catch (error) {
    console.error("Error en Pump.fun Recent:", error.message);
    return [];
  }
}

async function fetchOnChainTokens() {
  try {
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        { dataSize: 324 },
        { memcmp: { offset: 0, bytes: '3' } }
      ],
      commitment: 'confirmed'
    });

    const currentSlot = await connection.getSlot();
    const currentBlockTime = await connection.getBlockTime(currentSlot);

    const tokens = [];
    for (const account of accounts.slice(0, 50)) {
      try {
        const info = await connection.getParsedAccountInfo(account.pubkey);
        const createdAt = info.value?.data?.parsed?.info?.createdAt;
        const age = createdAt ? (currentBlockTime - createdAt) / 60 : 999;

        if (age < 30) { // Tokens menores a 30 minutos
          tokens.push({
            address: account.pubkey.toString(),
            name: info.value?.data?.parsed?.info?.name || 'Unknown',
            symbol: info.value?.data?.parsed?.info?.symbol || '?',
            age: age,
            source: 'On-chain Scan'
          });
        }
      } catch (error) {
        console.error(`Error procesando cuenta ${account.pubkey}:`, error);
      }
      await delay(200);
    }
    return tokens;
  } catch (error) {
    console.error("Error en escaneo on-chain:", error);
    rotateRpcEndpoint();
    return [];
  }
}

async function fetchBirdeyeTrending() {
  try {
    const response = await fetch('https://public-api.birdeye.so/public/trending?time_range=1h', {
      headers: { 'X-API-KEY': process.env.BIRDEYE_API_KEY || '' },
      timeout: 8000
    });
    
    if (!response.ok) throw new Error(`Status: ${response.status}`);
    
    const data = await response.json();
    return data.data?.map(t => ({
      address: t.address,
      name: t.name,
      symbol: t.symbol,
      age: 0, // Birdeye no proporciona timestamp de creación
      liquidity: t.liquidity?.value,
      holders: t.holders,
      source: 'Birdeye Trending'
    })) || [];
  } catch (error) {
    console.error("Error en Birdeye Trending:", error.message);
    return [];
  }
}

// Helpers
async function processAndNotify(tokens, bot, chatId) {
  for (const token of tokens) {
    if (!isTokenCached(token.address) && token.age < 30) {
      try {
        const message = buildTokenMessage(token);
        await bot.sendMessage(chatId, message, {
          parse_mode: "Markdown",
          disable_web_page_preview: true
        });
        cacheToken(token.address);
        console.log(`Token detectado (${token.source}): ${token.address}`);
      } catch (error) {
        console.error(`Error notificando token ${token.address}:`, error);
      }
      await delay(1000);
    }
  }
}

function buildTokenMessage(token) {
  return `🚀 *NUEVO TOKEN DETECTADO* (${token.source}) 🚀\n\n` +
         `🔹 *Nombre:* ${token.name}\n` +
         `🔹 *Símbolo:* ${token.symbol}\n` +
         `🔹 *CA:* \`${token.address}\`\n` +
         `🔹 *Edad:* ${token.age ? token.age.toFixed(2) + ' minutos' : 'Reciente'}\n` +
         `🔹 *Liquidez:* ${token.liquidity ? `${token.liquidity} SOL` : 'No disponible'}\n` +
         `🔹 *Holders:* ${token.holders || 'No disponible'}\n\n` +
         `[🔗 Pump.fun](https://pump.fun/${token.address}) | ` +
         `[📊 DexScreener](https://dexscreener.com/solana/${token.address})`;
}

function isTokenCached(address) {
  return tokenCache.has(address);
}

function cacheToken(address) {
  tokenCache.set(address, Date.now());
}

function cleanCache() {
  const now = Date.now();
  for (const [address, timestamp] of tokenCache.entries()) {
    if (now - timestamp > CACHE_TTL) {
      tokenCache.delete(address);
    }
  }
}

async function checkRpcConnection() {
  try {
    await connection.getSlot();
  } catch (error) {
    console.error("Error con RPC actual, rotando...");
    rotateRpcEndpoint();
  }
}

function rotateRpcEndpoint() {
  currentRpcIndex = (currentRpcIndex + 1) % RPC_ENDPOINTS.length;
  connection._rpcEndpoint = RPC_ENDPOINTS[currentRpcIndex];
  console.log(`RPC cambiado a: ${RPC_ENDPOINTS[currentRpcIndex]}`);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}