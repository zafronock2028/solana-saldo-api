import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import dotenv from 'dotenv';

dotenv.config();

// Lista de endpoints RPC con prioridad
const RPC_ENDPOINTS = [
  process.env.HELIUS_API_KEY ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}` : null,
  'https://solana-mainnet.rpc.extrnode.com',
  'https://api.mainnet-beta.solana.com',
  'https://ssc-dao.genesysgo.net',
  'https://rpc.ankr.com/solana'
].filter(Boolean);

// Variables de estado
let currentRpcIndex = 0;
let connection = new Connection(RPC_ENDPOINTS[currentRpcIndex], {
  commitment: 'confirmed',
  disableRetryOnRateLimit: false,
  confirmTransactionInitialTimeout: 60000
});

// Configuración del programa
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

// Cache de tokens detectados
const tokenCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hora

export async function escanearPumpFun(bot, chatId) {
  try {
    console.log(`[${new Date().toLocaleTimeString()}] Iniciando escaneo on-chain...`);

    // Verificar y rotar RPC si es necesario
    await verifyRpcConnection();

    // Obtener cuentas del programa
    const accounts = await getProgramAccountsWithRetry();

    if (!accounts || accounts.length === 0) {
      console.log("No se encontraron cuentas en el programa.");
      return;
    }

    // Procesar cuentas
    const newTokens = await processAccounts(accounts);

    if (newTokens.length > 0) {
      await notifyTokens(newTokens, bot, chatId);
    } else {
      console.log("No se encontraron tokens nuevos.");
    }

    // Limpiar cache
    cleanCache();

  } catch (error) {
    console.error("Error en escaneo:", error);
    await rotateRpcEndpoint();
  }
}

// Función mejorada para obtener cuentas con reintentos
async function getProgramAccountsWithRetry(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
        filters: [
          { dataSize: 324 }, // Tamaño estándar para cuentas de tokens
          { memcmp: { offset: 0, bytes: '3' } } // Filtro para tokens
        ],
        commitment: 'confirmed'
      });
      return accounts;
    } catch (error) {
      console.error(`Intento ${i + 1} fallido:`, error.message);
      if (i < retries - 1) {
        await rotateRpcEndpoint();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  return [];
}

// Procesar cuentas encontradas
async function processAccounts(accounts) {
  const currentSlot = await connection.getSlot();
  const currentBlockTime = await connection.getBlockTime(currentSlot);
  const newTokens = [];

  for (const account of accounts.slice(0, 100)) { // Limitar a 100 para no saturar
    try {
      const tokenAddress = account.pubkey.toString();
      
      // Saltar si ya está en cache
      if (tokenCache.has(tokenAddress)) continue;

      const accountInfo = await connection.getParsedAccountInfo(account.pubkey);
      const parsedData = accountInfo.value?.data?.parsed?.info;
      
      if (!parsedData) continue;

      const createdAt = parsedData.createdAt;
      const tokenAge = createdAt ? (currentBlockTime - createdAt) / 60 : 999; // Edad en minutos

      if (tokenAge < 15) { // Solo tokens menores a 15 minutos
        newTokens.push({
          address: tokenAddress,
          age: tokenAge,
          name: parsedData.name || 'Unknown',
          symbol: parsedData.symbol || '?',
          source: 'On-chain Scan'
        });
      }
    } catch (error) {
      console.error(`Error procesando cuenta:`, error);
    }
    await new Promise(resolve => setTimeout(resolve, 200)); // Delay entre peticiones
  }

  return newTokens;
}

// Notificar tokens encontrados
async function notifyTokens(tokens, bot, chatId) {
  for (const token of tokens) {
    try {
      const message = `🚀 *NUEVO TOKEN DETECTADO* 🚀\n\n` +
                     `🔹 *Nombre:* ${token.name}\n` +
                     `🔹 *Símbolo:* ${token.symbol}\n` +
                     `🔹 *CA:* \`${token.address}\`\n` +
                     `🔹 *Edad:* ${token.age.toFixed(2)} minutos\n\n` +
                     `[🔗 Pump.fun](https://pump.fun/${token.address}) | ` +
                     `[📊 DexScreener](https://dexscreener.com/solana/${token.address})`;
      
      await bot.sendMessage(chatId, message, {
        parse_mode: "Markdown",
        disable_web_page_preview: true
      });
      
      tokenCache.set(token.address, Date.now());
      console.log(`Token detectado: ${token.address}`);
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
    } catch (error) {
      console.error(`Error notificando token ${token.address}:`, error);
    }
  }
}

// Helpers
async function verifyRpcConnection() {
  try {
    await connection.getEpochInfo();
  } catch (error) {
    console.error("Error de conexión RPC, rotando endpoint...");
    await rotateRpcEndpoint();
  }
}

async function rotateRpcEndpoint() {
  currentRpcIndex = (currentRpcIndex + 1) % RPC_ENDPOINTS.length;
  connection = new Connection(RPC_ENDPOINTS[currentRpcIndex], {
    commitment: 'confirmed',
    disableRetryOnRateLimit: false,
    confirmTransactionInitialTimeout: 60000
  });
  console.log(`RPC cambiado a: ${RPC_ENDPOINTS[currentRpcIndex]}`);
}

function cleanCache() {
  const now = Date.now();
  for (const [address, timestamp] of tokenCache.entries()) {
    if (now - timestamp > CACHE_TTL) {
      tokenCache.delete(address);
    }
  }
}