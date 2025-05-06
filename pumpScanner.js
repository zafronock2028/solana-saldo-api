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

// Función mejorada para escanear tokens
export async function escanearPumpFun(bot, chatId) {
  try {
    console.log(`[${new Date().toLocaleTimeString()}] Escaneando Pump.fun...`);

    // 1. Obtener las cuentas más recientes del programa
    const accounts = await connection.getProgramAccounts(programId, {
      filters: [
        { dataSize: 324 }, // Tamaño actualizado para cuentas de tokens en Pump.fun
        { memcmp: { offset: 0, bytes: '3' } } // Filtro adicional para asegurar que son tokens
      ],
      commitment: 'confirmed'
    });

    if (!accounts || accounts.length === 0) {
      console.log("No se encontraron tokens nuevos.");
      return;
    }

    // 2. Procesar cada cuenta encontrada
    for (const acc of accounts) {
      const tokenAddress = acc.pubkey.toBase58();
      
      // Evitar procesar tokens ya detectados
      if (detectedTokens.has(tokenAddress)) continue;
      
      try {
        // 3. Obtener información detallada del token
        const accountInfo = await connection.getParsedAccountInfo(acc.pubkey);
        const parsedData = accountInfo.value?.data?.parsed?.info;
        
        if (!parsedData) continue;

        // 4. Extraer métricas importantes
        const createdAt = parsedData.createdAt;
        const currentSlot = await connection.getSlot();
        const blockTime = await connection.getBlockTime(currentSlot);
        const edad = createdAt ? (blockTime - createdAt) / 60 : 9999;
        
        // 5. Verificar si es un token reciente (menos de 5 minutos)
        if (edad < 5) {
          // 6. Obtener más datos sobre el token
          const tokenData = await getTokenDetails(tokenAddress);
          
          // 7. Enviar notificación con información completa
          const message = `🚀 *Nuevo Token Detectado en Pump.fun* 🚀\n\n` +
                          `🔹 *CA:* \`${tokenAddress}\`\n` +
                          `🔹 *Edad:* ${edad.toFixed(2)} minutos\n` +
                          `🔹 *Nombre:* ${tokenData.name || 'Desconocido'}\n` +
                          `🔹 *Símbolo:* ${tokenData.symbol || '?'}\n` +
                          `🔹 *Liquidez:* ${tokenData.liquidity || '0'} SOL\n` +
                          `🔹 *Holders:* ${tokenData.holders || '0'}\n\n` +
                          `[🔗 Ver en Pump.fun](https://pump.fun/${tokenAddress})`;
          
          bot.sendMessage(chatId, message, { 
            parse_mode: "Markdown",
            disable_web_page_preview: true
          });
          
          // Agregar a cache para no notificar nuevamente
          detectedTokens.add(tokenAddress);
        }
      } catch (err) {
        console.error(`Error procesando token ${tokenAddress}:`, err.message);
      }
      
      // Pequeño delay para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } catch (err) {
    console.error("Error general en escaneo:", err.message);
  }
}

// Función auxiliar para obtener detalles del token
async function getTokenDetails(tokenAddress) {
  try {
    // 1. Consultar datos on-chain
    const tokenAccount = await connection.getParsedAccountInfo(new PublicKey(tokenAddress));
    
    // 2. Consultar API de Pump.fun si está disponible
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

// Función para consultar la API de Pump.fun
async function fetchPumpFunData(tokenAddress) {
  try {
    const response = await fetch(`https://api.pump.fun/token/${tokenAddress}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}