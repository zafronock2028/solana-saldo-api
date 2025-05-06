import fs from 'fs';
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider } from '@project-serum/anchor';
import idl from './pump.json' assert { type: 'json' };
import dotenv from 'dotenv';

dotenv.config();

// USANDO HELIUS
const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=3e221462-c157-4c86-b885-dfbc736e2846');
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
      const createdAt = (await connection.getParsedAccountInfo(acc.pubkey)).value?.data?.parsed?.info?.createdAt;
      const currentSlot = await connection.getSlot();
      const blockTime = await connection.getBlockTime(currentSlot);
      const edad = createdAt ? (blockTime - createdAt) / 60 : 9999;

      if (edad < 30) {
        bot.sendMessage(chatId, `🟡 *Pump.fun - Gem Found*\n\nCA: \`${acc.pubkey.toBase58()}\`\nEdad: ${edad.toFixed(2)} min`, { parse_mode: "Markdown" });
      }

      await delay(250);
    }
  } catch (err) {
    console.error("Error escaneando Pump.fun:", err.message);
  }
}