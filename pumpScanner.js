import fs from 'fs';
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider } from '@project-serum/anchor';
import idl from './pump.json' assert { type: 'json' };
import dotenv from 'dotenv';

dotenv.config();

// Conexión con Helius
const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=3e221462-c157-4c86-b885-dfbc736e2846');
const provider = new AnchorProvider(connection, {}, {});
const programId = new PublicKey('PumPpTunA9D49qkZ2TBeCpYTxUN1UbkXHc3i7zALvN2');
const program = new Program(idl, programId, provider);

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

export async function escanearPumpFun(bot, chatId) {
  try {
    console.log(`[${new Date().toLocaleTimeString()}] Escaneando Pump.fun desde blockchain...`);

    const accounts = await connection.getProgramAccounts(programId, {
      filters: [{ dataSize: 165 }],
    });

    console.log(`Cuentas encontradas: ${accounts.length}`);

    if (!accounts || accounts.length === 0) {
      console.log("No se encontraron tokens.");
      return;
    }

    const currentSlot = await connection.getSlot();
    const blockTime = await connection.getBlockTime(currentSlot);

    for (const acc of accounts) {
      const parsedInfo = (await connection.getParsedAccountInfo(acc.pubkey)).value;

      const createdAt = parsedInfo?.data?.parsed?.info?.createdAt;
      console.log(`Token: ${acc.pubkey.toBase58()} | createdAt: ${createdAt}`);

      const edad = createdAt ? (blockTime - createdAt) / 60 : 9999;

      // Filtro temporal relajado para probar que sí funciona
      if (edad < 3000) {
        const msg = `🟡 *Pump.fun - Gem Found*\n\nCA: \`${acc.pubkey.toBase58()}\`\nEdad: ${edad.toFixed(2)} min`;
        bot.sendMessage(chatId, msg, { parse_mode: "Markdown" });
      }

      await delay(250);
    }
  } catch (err) {
    console.error("Error escaneando Pump.fun:", err.message);
  }
}