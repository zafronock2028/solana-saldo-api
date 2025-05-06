import fs from 'fs';
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider } from '@project-serum/anchor';
import idl from './pump.json' assert { type: 'json' };
import dotenv from 'dotenv';

dotenv.config();

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
      try {
        const accountInfo = await connection.getParsedAccountInfo(acc.pubkey);
        const createdAt = accountInfo.value?.data?.parsed?.info?.createdAt;
        const currentSlot = await connection.getSlot();
        const blockTime = await connection.getBlockTime(currentSlot);
        const edad = createdAt ? (blockTime - createdAt) / 60 : 9999;

        const marketCap = accountInfo.value?.data?.parsed?.info?.marketCap || 0;
        const holders = accountInfo.value?.data?.parsed?.info?.holders || 0;

        if (
          edad > 5 && edad <= 45 &&
          marketCap >= 8000 && marketCap <= 68000 &&
          holders >= 50
        ) {
          const mensaje = `🔥 *GEMA DETECTADA EN PUMPFUN* 🔥

🪙 Token CA: \`${acc.pubkey.toBase58()}\`
📈 Market Cap: $${marketCap}
👥 Holders: ${holders}
⏱️ Edad: ${edad.toFixed(1)} min`;
          console.log(mensaje);
          await bot.sendMessage(chatId, mensaje, { parse_mode: "Markdown" });
        }

        await delay(300);
      } catch (e) {
        console.log("Error analizando token:", e.message);
      }
    }
  } catch (err) {
    console.error("Error escaneando Pump.fun:", err.message);
  }
}