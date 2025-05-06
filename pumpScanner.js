import { Connection, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider } from "@project-serum/anchor";
import idl from "./pump.json" assert { type: "json" };
import dotenv from "dotenv";
dotenv.config();

// CONEXIÓN CON HELIUS
const HELIUS_KEY = process.env.HELIUS_KEY;
const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`);
const provider = new AnchorProvider(connection, {}, {});
const programId = new PublicKey("PumPpTunA9D49qkZ2TBeCpYTxUN1UbkXHc3i7zALvN2");
const program = new Program(idl, programId, provider);

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

export async function escanearPumpFun(bot, chatId) {
  try {
    console.log(`[${new Date().toLocaleTimeString()}] Escaneando Pump.fun desde blockchain...`);

    const accounts = await connection.getProgramAccounts(programId, {
      filters: [{ dataSize: 165 }]
    });

    if (!accounts || accounts.length === 0) {
      console.log("No se encontraron tokens.");
      return;
    }

    for (const acc of accounts) {
      const pubkey = acc.pubkey.toBase58();
      const createdAt = (await connection.getParsedAccountInfo(acc.pubkey)).value?.data?.parsed?.info?.createdAt;

      const currentSlot = await connection.getSlot();
      const blockTime = await connection.getBlockTime(currentSlot);

      const edad = createdAt ? (blockTime - createdAt) / 60 : 9999;

      // FILTROS FLEXIBLES (para pruebas en vivo)
      if (edad > 0 && edad <= 30) {
        const mensaje = `🟡 *Gema desde Pump.fun*\n\nCA: \`${pubkey}\`\n⏱️ Edad: ${edad.toFixed(2)} min`;
        console.log(mensaje);
        await bot.sendMessage(chatId, mensaje, { parse_mode: "Markdown" });
      }

      await delay(300);
    }
  } catch (err) {
    console.error("Error escaneando Pump.fun:", err.message);
  }
}