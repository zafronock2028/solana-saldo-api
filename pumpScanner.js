import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider } from '@project-serum/anchor';
import idl from './pump.json' assert { type: 'json' };
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.HELIUS_API_KEY;
const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${apiKey}`, 'confirmed');
const provider = new AnchorProvider(connection, {}, {});
const programId = new PublicKey('PumPpTunA9D49qkZ2TBeCpYTxUN1UbkXHc3i7zALvN2');
const program = new Program(idl, programId, provider);

// Cache para evitar notificaciones duplicadas
const detectedTokens = new Set();

export async function escanearPumpFun(bot, chatId) {
  try {
    console.log(`[${new Date().toLocaleTimeString()}] Escaneando Pump.fun...`);

    const accounts = await connection.getProgramAccounts(programId, {
      filters: [
        { dataSize: 324 },
        { memcmp: { offset: 0, bytes: '3' } }
      ],
      commitment: 'confirmed'
    });

    if (!accounts || accounts.length === 0) {
      console.log("No se encontraron tokens nuevos.");
      return;
    }

    for (const acc of accounts) {
      const tokenAddress = acc.pubkey.toBase58();
      
      if (detectedTokens.has(tokenAddress)) continue;
      
      try {
        const accountInfo = await connection.getParsedAccountInfo(acc.pubkey);
        const parsedData = accountInfo.value?.data?.parsed?.info;
        
        if (!parsedData) continue;

        const createdAt = parsedData.createdAt;
        const currentSlot = await connection.getSlot();
        const blockTime = await connection.getBlockTime(currentSlot);
        const edad = createdAt ? (blockTime - createdAt) / 60 : 9999;
        
        if (edad < 5) {
          const tokenData = await getTokenDetails(tokenAddress);
          
          const message = `🚀 *Nuevo Token Detectado en Pump.fun* 🚀\n\n` +
                        `🔹 *CA:* \`${tokenAddress}\`\n` +
                        `🔹 *Edad:* ${edad.toFixed(2)} minutos\n` +
                        `🔹 *Nombre:* ${tokenData.name || 'Desconocido'}\n` +
                        `🔹 *Símbolo:* ${tokenData.symbol || '?'}\n` +
                        `🔹 *Liquidez:* ${tokenData.liquidity || '0'} SOL\n` +
                        `🔹 *Holders:* ${tokenData.holders || '0'}\n\n` +
                        `[🔗 Ver en Pump.fun](https://pump.fun/${tokenAddress})`;
          
          await bot.sendMessage(chatId, message, { 
            parse_mode: "Markdown",
            disable_web_page_preview: true
          });
          
          detectedTokens.add(tokenAddress);
        }
      } catch (err) {
        console.error(`Error procesando token ${tokenAddress}:`, err.message);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } catch (err) {
    console.error("Error general en escaneo:", err.message);
    throw err;
  }
}

async function getTokenDetails(tokenAddress) {
  try {
    const tokenAccount = await connection.getParsedAccountInfo(new PublicKey(tokenAddress));
    const pumpFunData = await fetchPumpFunData(tokenAddress);
    
    return {
      name: pumpFunData?.name || tokenAccount?.data?.parsed?.info?.name,
      symbol: pumpFunData?.symbol || tokenAccount?.data?.parsed?.info?.symbol,
      liquidity: pumpFunData?.liquidity,
      holders: pumpFunData?.holders
    };
  } catch {
    return {};
  }
}

async function fetchPumpFunData(tokenAddress) {
  try {
    const response = await fetch(`https://api.pump.fun/token/${tokenAddress}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}