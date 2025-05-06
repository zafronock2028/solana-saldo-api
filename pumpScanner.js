import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

// 1. Configuración de Conexión Avanzada
const RPC_ENDPOINTS = [
  process.env.HELIUS_API_KEY ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}` : null,
  'https://solana-mainnet.rpc.extrnode.com',
  'https://api.mainnet-beta.solana.com',
  'https://rpc.ankr.com/solana',
  'https://ssc-dao.genesysgo.net'
].filter(Boolean);

let currentRpcIndex = 0;
const connection = new Connection(RPC_ENDPOINTS[currentRpcIndex], {
  commitment: 'confirmed',
  disableRetryOnRateLimit: false,
  confirmTransactionInitialTimeout: 60000,
  httpHeaders: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// 2. Programas Relevantes
const PUMP_FUN_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

// 3. Estrategias de Detección
const DETECTION_STRATEGIES = [
  'scanRecentTransactions',
  'scanTokenAccounts',
  'checkPumpFunListings'
];

// 4. Cache Mejorada
const tokenCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hora

export async function escanearPumpFun(bot, chatId) {
  try {
    console.log(`[${new Date().toLocaleTimeString()}] Iniciando escaneo avanzado...`);

    // Verificar conexión RPC
    await verifyRpcConnection();

    // Ejecutar múltiples estrategias de detección
    for (const strategy of DETECTION_STRATEGIES) {
      try {
        const tokens = await executeDetectionStrategy(strategy);
        if (tokens.length > 0) {
          await processAndNotifyTokens(tokens, bot, chatId);
          cleanCache();
          return; // Salir si encontramos tokens
        }
      } catch (error) {
        console.error(`Error en estrategia ${strategy}:`, error.message);
      }
    }

    console.log("No se encontraron tokens nuevos con ninguna estrategia.");
  } catch (error) {
    console.error("Error en escaneo avanzado:", error);
    await rotateRpcEndpoint();
  }
}

// Implementación de Estrategias
async function executeDetectionStrategy(strategy) {
  switch (strategy) {
    case 'scanRecentTransactions':
      return await scanRecentTransactions();
    case 'scanTokenAccounts':
      return await scanTokenAccounts();
    case 'checkPumpFunListings':
      return await checkPumpFunListings();
    default:
      return [];
  }
}

// Estrategia 1: Escaneo de transacciones recientes
async function scanRecentTransactions() {
  const signatures = await connection.getSignaturesForAddress(PUMP_FUN_PROGRAM_ID, {
    limit: 50,
    commitment: 'confirmed'
  });

  const newTokens = [];
  for (const signature of signatures) {
    try {
      const tx = await connection.getParsedTransaction(signature.signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });

      if (!tx || !tx.meta || tx.meta.err) continue;

      // Buscar cuentas creadas
      const createdAccounts = tx.transaction.message.staticAccountKeys
        .filter((_, index) => tx.meta?.createdAccounts?.includes(index))
        .map(account => account.toString());

      // Verificar si son cuentas de token
      for (const account of createdAccounts) {
        if (!tokenCache.has(account)) {
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
    }
    await delay(300);
  }
  return newTokens;
}

// Estrategia 2: Escaneo directo de cuentas de token
async function scanTokenAccounts() {
  const accounts = await connection.getProgramAccounts(PUMP_FUN_PROGRAM_ID, {
    filters: [
      { dataSize: 165 }, // Tamaño de cuenta de token
      { memcmp: { offset: 0, bytes: '3' } } // Filtro para tokens
    ],
    commitment: 'confirmed'
  });

  const currentSlot = await connection.getSlot();
  const currentBlockTime = await connection.getBlockTime(currentSlot);
  const newTokens = [];

  for (const account of accounts.slice(0, 100)) {
    try {
      const tokenAddress = account.pubkey.toString();
      if (tokenCache.has(tokenAddress)) continue;

      const accountInfo = await connection.getParsedAccountInfo(account.pubkey);
      const createdAt = accountInfo.value?.data?.parsed?.info?.createdAt;
      const age = createdAt ? (currentBlockTime - createdAt) / 60 : 999;

      if (age < 30) { // Tokens menores a 30 minutos
        newTokens.push({
          address: tokenAddress,
          age: age,
          source: 'Account Scan'
        });
      }
    } catch (error) {
      console.error(`Error procesando cuenta:`, error);
    }
    await delay(200);
  }
  return newTokens;
}

// Estrategia 3: Consulta directa a Pump.fun (con headers personalizados)
async function checkPumpFunListings() {
  try {
    const response = await fetch('https://api.pump.fun/collections', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://pump.fun/'
      },
      timeout: 10000
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

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

// Helpers Mejorados
async function processAndNotifyTokens(tokens, bot, chatId) {
  for (const token of tokens) {
    try {
      const ageInMinutes = token.age || ((Date.now() - token.timestamp) / 60000);
      
      if (ageInMinutes < 30) { // Límite de 30 minutos
        const metadata = await getTokenMetadata(token.address);
        
        const message = `🚀 *NUEVO TOKEN DETECTADO* (${token.source}) 🚀\n\n` +
                      `🔹 *Nombre:* ${metadata.name || 'Desconocido'}\n` +
                      `🔹 *Símbolo:* ${metadata.symbol || '?'}\n` +
                      `🔹 *CA:* \`${token.address}\`\n` +
                      `🔹 *Edad:* ${ageInMinutes.toFixed(2)} minutos\n\n` +
                      `[🔗 Pump.fun](https://pump.fun/${token.address}) | ` +
                      `[📊 DexScreener](https://dexscreener.com/solana/${token.address})`;
        
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
    await delay(1000);
  }
}

async function getTokenMetadata(tokenAddress) {
  try {
    const metadataPDA = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s').toBuffer(),
        new PublicKey(tokenAddress).toBuffer()
      ],
      new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
    )[0];

    const metadataAccount = await connection.getAccountInfo(metadataPDA);
    if (metadataAccount) {
      const metadata = decodeTokenMetadata(metadataAccount.data);
      return {
        name: metadata.data.name,
        symbol: metadata.data.symbol
      };
    }
  } catch (error) {
    console.error(`Error obteniendo metadatos:`, error);
  }
  return {};
}

function decodeTokenMetadata(buffer) {
  const nameLength = buffer[33];
  const name = buffer.slice(34, 34 + nameLength).toString();
  const symbolLength = buffer[34 + nameLength + 1];
  const symbol = buffer.slice(34 + nameLength + 2, 34 + nameLength + 2 + symbolLength).toString();
  
  return {
    data: {
      name,
      symbol
    }
  };
}

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

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}