import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

// Configuración mejorada
const RPC_URL = process.env.HELIUS_API_KEY 
  ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
  : 'https://api.mainnet-beta.solana.com';

const connection = new Connection(RPC_URL, {
  commitment: 'confirmed',
  disableRetryOnRateLimit: false,
  confirmTransactionInitialTimeout: 60000
});

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

// Cache mejorada
const detectedTokens = new Set();

export async function escanearPumpFun(bot, chatId) {
  try {
    console.log(`[${new Date().toLocaleTimeString()}] Iniciando escaneo avanzado...`);

    // Estrategia 1: Usar la API de Pump.fun directamente
    const apiTokens = await fetchPumpFunAPI();
    if (apiTokens.length > 0) {
      await processTokens(apiTokens, bot, chatId);
      return;
    }

    // Estrategia 2: Escaneo on-chain si la API falla
    const onChainTokens = await fetchOnChainTokens();
    if (onChainTokens.length > 0) {
      await processTokens(onChainTokens, bot, chatId);
      return;
    }

    console.log("No se encontraron tokens nuevos en esta ronda.");
  } catch (error) {
    console.error("Error en escaneo avanzado:", error);
  }
}

// Estrategia 1: API de Pump.fun
async function fetchPumpFunAPI() {
  try {
    const response = await fetch('https://api.pump.fun/trending', {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      },
      timeout: 10000
    });

    if (!response.ok) throw new Error(`API status: ${response.status}`);

    const data = await response.json();
    return data.slice(0, 50).map(token => ({
      address: token.mint,
      name: token.name,
      symbol: token.symbol,
      age: (Date.now() - new Date(token.createdAt).getTime()) / (1000 * 60),
      liquidity: token.liquidity,
      holders: token.holders
    }));
  } catch (error) {
    console.error("Error en API Pump.fun:", error.message);
    return [];
  }
}

// Estrategia 2: Escaneo on-chain
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
    for (const account of accounts.slice(0, 100)) {
      try {
        const info = await connection.getParsedAccountInfo(account.pubkey);
        const createdAt = info.value?.data?.parsed?.info?.createdAt;
        const age = createdAt ? (currentBlockTime - createdAt) / 60 : 999;

        if (age < 15) { // Tokens menores a 15 minutos
          tokens.push({
            address: account.pubkey.toString(),
            age: age,
            name: info.value?.data?.parsed?.info?.name || 'Unknown',
            symbol: info.value?.data?.parsed?.info?.symbol || '?'
          });
        }
      } catch (error) {
        console.error(`Error procesando cuenta ${account.pubkey}:`, error);
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    return tokens;
  } catch (error) {
    console.error("Error en escaneo on-chain:", error);
    return [];
  }
}

// Procesamiento de tokens encontrados
async function processTokens(tokens, bot, chatId) {
  for (const token of tokens) {
    if (!detectedTokens.has(token.address) && token.age < 15) {
      try {
        const message = buildTokenMessage(token);
        await bot.sendMessage(chatId, message, {
          parse_mode: "Markdown",
          disable_web_page_preview: true
        });
        detectedTokens.add(token.address);
        console.log(`Nuevo token detectado: ${token.address}`);
      } catch (error) {
        console.error(`Error notificando token ${token.address}:`, error);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

function buildTokenMessage(token) {
  return `🚀 *NUEVO TOKEN DETECTADO* 🚀\n\n` +
         `🔹 *Nombre:* ${token.name}\n` +
         `🔹 *Símbolo:* ${token.symbol}\n` +
         `🔹 *CA:* \`${token.address}\`\n` +
         `🔹 *Edad:* ${token.age.toFixed(2)} minutos\n` +
         `🔹 *Liquidez:* ${token.liquidity || 'No disponible'} SOL\n` +
         `🔹 *Holders:* ${token.holders || 'No disponible'}\n\n` +
         `[🔗 Pump.fun](https://pump.fun/${token.address}) | ` +
         `[📊 DexScreener](https://dexscreener.com/solana/${token.address})`;
}