import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider } from '@project-serum/anchor';
import idl from './pump.json' assert { type: 'json' };
import dotenv from 'dotenv';

dotenv.config();

const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`);
const provider = new AnchorProvider(connection, {}, {});
const programId = new PublicKey('PumPpTunA9D49qkZ2TBeCpYTxUN1UbkXHc3i7zALvN2');
const program = new Program(idl, programId, provider);

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

export async function escanearPumpFun(bot, chatId) {
  try {
    console.log(`[${new Date().toLocaleTimeString()}] Escaneando Pump.fun desde blockchain...`);

    const accounts = await connection.getProgramAccounts(programId, {
      filters: [{ dataSize: 165 }]
    });

    if (!accounts || accounts.length === 0) {
      return console.log("No se encontraron tokens.");
    }

    for (const acc of accounts) {
      const parsed = await connection.getParsedAccountInfo(acc.pubkey);
      const createdAt = parsed.value?.data?.parsed?.info?.createdAt;

      const currentSlot = await connection.getSlot();
      const blockTime = await connection.getBlockTime(currentSlot);

      const edad = createdAt ? (blockTime - createdAt) / 60 : 9999;

      if (edad <= 45) {
        const mensaje = `🔍 *Token Detectado (Modo Prueba)*\n\nCA: \`${acc.pubkey.toBase58()}\`\nEdad: ${edad.toFixed(2)} min`;
        console.log(mensaje);
        await bot.sendMessage(chatId, mensaje, { parse_mode: "Markdown" });
      }

      await delay(300);
    }
  } catch (err) {
    console.error("Error escaneando Pump.fun:", err.message);
  }
}