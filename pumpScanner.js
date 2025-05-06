import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

// 1. Configuración de Conexión Mejorada
const RPC_ENDPOINTS = [
  process.env.HELIUS_API_KEY ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}` : null,
  'https://solana-mainnet.rpc.extrnode.com',
  'https://api.mainnet-beta.solana.com'
].filter(Boolean);

let currentRpcIndex = 0;
const connection = new Connection(RPC_ENDPOINTS[currentRpcIndex], {
  commitment: 'confirmed',
  disableRetryOnRateLimit: true,
  confirmTransactionInitialTimeout: 30000,
  httpAgent: new (require('http').Agent)({ keepAlive: true })
});

// 2. Configuración de Programas
const PUMP_FUN_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

// 3. Cache y Estado
const tokenCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hora
let lastRequestTime = 0;
const REQUEST_DELAY = 1000; // 1 segundo entre requests

// 4. Función Principal Mejorada
export async function escanearPumpFun(bot, chatId) {
  try {
    console.log(`[${new Date().toLocaleTimeString()}] Iniciando escaneo inteligente...`);

    // Estrategia 1: API de Pump.fun con headers personalizados
    const apiTokens = await fetchPumpFunListings();
    if (apiTokens.length > 0) {
      await processAndNotifyTokens(apiTokens, bot, chatId);
      return;
    }

    // Estrategia 2: Escaneo de transacciones con manejo de errores
    const txTokens = await scanRecentTransactions();
    if (txTokens.length > 0) {
      await processAndNotifyTokens(txTokens, bot, chatId);
      return;
    }

    console.log("No se encontraron tokens nuevos en esta ronda.");
  } catch (error) {
    console.error("Error en escaneo inteligente:", error);
    await rotateRpcEndpoint();
  } finally {
    cleanCache();
  }
}

// 5. Estrategia 1: API de Pump.fun con protección contra rate limiting
async function fetchPumpFunListings() {
  try {
    await rateLimit();
    const response = await fetch('https://api.pump.fun/collections', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://pump.fun/'
      },
      timeout: 8000
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn("Rate limit alcanzado en API Pump.fun");
        return [];
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.map(item => ({
      address: item.mintAddress,
      name: item.name,
      symbol: item.symbol,
      age: (Date.now() - new Date(item.createdAt).getTime()) / 60000,
      source: 'Pump.fun API'
    })).filter(token => !tokenCache.has(token.address) && token.age < 30);
  } catch (error) {
    console.error("Error en API Pump.fun:", error.message);
    return [];
  }
}

// 6. Estrategia 2: Escaneo de transacciones con manejo robusto
async function scanRecentTransactions() {
  try {
    await rateLimit();
    const signatures = await connection.getSignaturesForAddress(PUMP_FUN_PROGRAM_ID, {
      limit: 20, // Reducido para evitar rate limiting
      commitment: 'confirmed'
    });

    const newTokens = [];
    for (const signature of signatures) {
      try {
        await rateLimit();
        const tx = await connection.getTransaction(signature.signature, {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0
        });

        if (!tx?.meta?.createdAccounts) continue;

        // Procesar cuentas creadas de forma segura
        const createdAccounts = tx.transaction.message.staticAccountKeys
          .filter((_, index) => tx.meta.createdAccounts.includes(index))
          .map(account => account.toString());

        for (const account of createdAccounts) {
          if (!tokenCache.has(account)) {
            await rateLimit();
            const accountInfo = await connection.getParsedAccountInfo(new PublicKey(account));
            if (accountInfo.value?.owner?.equals(TOKEN_PROGRAM_ID)) {
              newTokens.push({
                address: account,
                timestamp: new Date(signature.blockTime * 1000),
                source: 'Transaction Scan'
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error procesando transacción:`, error.message);
        await delay(1000); // Delay adicional en caso de error
      }
    }
    return newTokens;
  } catch (error) {
    console.error("Error en escaneo de transacciones:", error);
    await rotateRpcEndpoint();
    return [];
  }
}

// 7. Procesamiento de Tokens con Rate Limiting
async function processAndNotifyTokens(tokens, bot, chatId) {
  for (const token of tokens.slice(0, 10)) { // Limitar a 10 notificaciones por ciclo
    try {
      const ageInMinutes = token.age || ((Date.now() - token.timestamp) / 60000);
      
      if (ageInMinutes < 30) {
        await rateLimit();
        const metadata = await getTokenMetadata(token.address);
        
        const message = buildTokenMessage(token, metadata, ageInMinutes);
        await bot.sendMessage(chatId, message, {
          parse_mode: "Markdown",
          disable_web_page_preview: true
        });
        
        tokenCache.set(token.address, Date.now());
        console.log(`Token detectado (${token.source}): ${token.address}`);
      }
    } catch (error) {
      console.error(`Error notificando token ${token.address}:`, error);
    }
    await delay(1500); // Delay entre notificaciones
  }
}

// 8. Helpers Mejorados
async function getTokenMetadata(tokenAddress) {
  try {
    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s').toBuffer(),
        new PublicKey(tokenAddress).toBuffer()
      ],
      new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
    );

    await rateLimit();
    const metadataAccount = await connection.getAccountInfo(metadataPDA);
    if (metadataAccount) {
      return decodeTokenMetadata(metadataAccount.data);
    }
  } catch (error) {
    console.error(`Error obteniendo metadatos:`, error);
  }
  return { name: 'Desconocido', symbol: '?' };
}

function decodeTokenMetadata(buffer) {
  try {
    const nameLength = buffer[33];
    const name = buffer.slice(34, 34 + nameLength).toString();
    const symbolLength = buffer[34 + nameLength + 1];
    const symbol = buffer.slice(34 + nameLength + 2, 34 + nameLength + 2 + symbolLength).toString();
    return { name, symbol };
  } catch {
    return { name: 'Desconocido', symbol: '?' };
  }
}

function buildTokenMessage(token, metadata, ageInMinutes) {
  return `🚀 *NUEVO TOKEN DETECTADO* (${token.source}) 🚀\n\n` +
         `🔹 *Nombre:* ${metadata.name}\n` +
         `🔹 *Símbolo:* ${metadata.symbol}\n` +
         `🔹 *CA:* \`${token.address}\`\n` +
         `🔹 *Edad:* ${ageInMinutes.toFixed(2)} minutos\n\n` +
         `[🔗 Pump.fun](https://pump.fun/${token.address}) | ` +
         `[📊 DexScreener](https://dexscreener.com/solana/${token.address})`;
}

async function rotateRpcEndpoint() {
  currentRpcIndex = (currentRpcIndex + 1) % RPC_ENDPOINTS.length;
  connection._rpcEndpoint = RPC_ENDPOINTS[currentRpcIndex];
  console.log(`RPC cambiado a: ${RPC_ENDPOINTS[currentRpcIndex]}`);
  await delay(2000); // Esperar después de rotar
}

function cleanCache() {
  const now = Date.now();
  for (const [address, timestamp] of tokenCache.entries()) {
    if (now - timestamp > CACHE_TTL) {
      tokenCache.delete(address);
    }
  }
}

async function rateLimit() {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < REQUEST_DELAY) {
    await delay(REQUEST_DELAY - elapsed);
  }
  lastRequestTime = Date.now();
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}