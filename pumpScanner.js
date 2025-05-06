import fs from "fs";
import { Connection, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider } from "@project-serum/anchor";
import idl from "./pump.json" assert { type: "json" };
import dotenv from "dotenv";

dotenv.config();

// HELIUS RPC
const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`);
const provider = new AnchorProvider(connection, {}, {});
const programId = new PublicKey("PumPpTunA9D49qkZ2TBeCpYTxUN1UbkXHc3i7zALvN2");
const program = new Program(idl, programId, provider);

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// DETECTAR GEMAS FLEXIBLEMENTE
export async function escanearPumpFun(bot, chatId) {
  try {
    console.log(`[${new Date().toLocaleTimeString()}] Escaneando Pump.fun...`);

    const accounts = await connection.getProgramAccounts(programId, {
      filters: [{ dataSize: 165 }]
    });

    const currentSlot = await connection.getSlot();
    const blockTime = await connection.getBlockTime(currentSlot);

    for (const acc of accounts) {
      const accInfo = await connection.getParsedAccountInfo(acc.pubkey);
      const createdAt = accInfo.value?.data?.parsed?.info?.createdAt;
      const edadMinutos = createdAt ? (blockTime - createdAt) / 60 : 9999;

      // FILTRO FLEXIBLE: GEMAS CON MENOS DE 45 MINUTOS
      if (edadMinutos <= 45) {
        bot.sendMessage(chatId, `✨ *Gema Detectada en Pump.fun*\n\nCA: \`${acc.pubkey.toBase58()}\`\nEdad: ${edadMinutos.toFixed(2)} min`, {
          parse_mode: "Markdown"
        });
      }

      await delay(250); // Para evitar rate limit
    }
  } catch (error) {
    console.error("Error escaneando Pump.fun:", error.message);
  }
}