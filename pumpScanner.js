import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import dotenv from 'dotenv';

dotenv.config();

// Configuración actualizada
const PUMP_FUN_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

// Endpoints RPC con prioridad
const RPC_ENDPOINTS = [
  process.env.HELIUS_API_KEY ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}` : null,
  'https://api.mainnet-beta.solana.com',
  'https://solana-mainnet.rpc.extrnode.com',
  'https://rpc.ankr.com/solana'
].filter(Boolean);

let currentRpcIndex = 0;
const connection = new Connection(RPC_ENDPOINTS[currentRpcIndex], {
  commitment: 'confirmed',
  disableRetryOnRateLimit: false,
  confirmTransactionInitialTimeout: 60000
});

// Cache mejorada
const tokenCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hora

export async function escanearPumpFun(bot, chatId) {
  try {
    console.log(`[${new Date().toLocaleTimeString()}] Iniciando escaneo avanzado...`);

    // 1. Obtener firmas recientes del programa Pump.fun
    const signatures = await connection.getSignaturesForAddress(PUMP_FUN_PROGRAM_ID, {
      limit: 30, // Reducido para mayor eficiencia
      commitment: 'confirmed'
    });

    if (!signatures || signatures.length === 0) {
      console.log("No se encontraron transacciones recientes.");
      return;
    }

    // 2. Procesar transacciones para encontrar tokens nuevos
    const newTokens = [];
    
    for (const signature of signatures) {
      try {
        const tx = await connection.getTransaction(signature.signature, {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0
        });

        if (!tx || !tx.meta || tx.meta.err) continue;

        // Buscar cuentas creadas en la transacción
        const createdAccounts = tx.transaction.message.staticAccountKeys
          .filter((_, index) => tx.meta?.createdAccounts?.includes(index))
          .map(account => account.toString());

        // Filtrar y procesar cuentas nuevas
        for (const account of createdAccounts) {
          if (!tokenCache.has(account)) {
            const accountInfo = await connection.getParsedAccountInfo(new PublicKey(account));
            if (accountInfo.value?.data?.space === 165) { // Tamaño estándar de cuenta de token
              newTokens.push({
                address: account,
                timestamp: new Date(signature.blockTime * 1000),
                source: 'Transaction Scan'
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error procesando transacción ${signature.signature}:`, error.message);
      }
      await new Promise(resolve => setTimeout(resolve, 300)); // Rate limiting
    }

    // 3. Notificar tokens nuevos
    if (newTokens.length > 0) {
      await processAndNotifyTokens(newTokens, bot, chatId);
    } else {
      console.log("No se encontraron tokens nuevos en las transacciones recientes.");
    }

    // Limpiar cache
    cleanCache();

  } catch (error) {
    console.error("Error en escaneo avanzado:", error);
    await rotateRpcEndpoint();
  }
}

// Procesar y notificar tokens
async function processAndNotifyTokens(tokens, bot, chatId) {
  const now = Date.now();
  
  for (const token of tokens) {
    try {
      const ageInMinutes = (now - token.timestamp) / (1000 * 60);
      
      if (ageInMinutes < 15) { // Solo tokens menores a 15 minutos
        const metadata = await getTokenMetadata(token.address);
        
        const message = `🚀 *NUEVO TOKEN DETECTADO* 🚀\n\n` +
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
        
        tokenCache.set(token.address, now);
        console.log(`Token detectado: ${token.address}`);
      }
    } catch (error) {
      console.error(`Error procesando token ${token.address}:`, error);
    }
    await new Promise(resolve => setTimeout(resolve, 800)); // Rate limiting
  }
}

// Obtener metadatos del token
async function getTokenMetadata(tokenAddress) {
  try {
    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        new PublicKey(tokenAddress).toBuffer()
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    const metadataAccount = await connection.getAccountInfo(metadataPDA);
    if (metadataAccount) {
      const metadata = decodeTokenMetadata(metadataAccount.data);
      return {
        name: metadata.data.name,
        symbol: metadata.data.symbol
      };
    }
  } catch (error) {
    console.error(`Error obteniendo metadatos para ${tokenAddress}:`, error);
  }
  return {};
}

// Decodificador básico de metadatos
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

// Helpers
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