import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import fs from "fs";
import { escanearPumpFun } from "./pumpScanner.js";
import { escanearBirdeye } from "./birdeyeScanner.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const WALLET = process.env.WALLET_ADDRESS;

app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/saldo", async (req, res) => {
  const walletAddress = req.query.wallet;
  if (!walletAddress) return res.status(400).send("Falta wallet");

  try {
    const response = await fetch("https://api.mainnet-beta.solana.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [walletAddress],
      }),
    });
    const data = await response.json();
    const balance = data.result?.value || 0;
    res.send(`Saldo: ${balance / 10 ** 9} SOL`);
  } catch (error) {
    res.status(500).send("Error al obtener el saldo");
  }
});

app.listen(PORT, () => {
  console.log(`Servidor activo en el puerto ${PORT}`);
});

// === BOT TELEGRAM ===
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
const estadoPath = "./estado_bot.json";
let intervalo = null;

function leerEstado() {
  try {
    return JSON.parse(fs.readFileSync(estadoPath));
  } catch {
    return { activo: false };
  }
}

function guardarEstado(nuevo) {
  fs.writeFileSync(estadoPath, JSON.stringify(nuevo));
}

function enviarMenu(chatId) {
  bot.sendMessage(chatId, "Panel de control ZafroBot Joyas X100", {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🚀 Encender Bot", callback_data: "on" },
          { text: "🛑 Apagar Bot", callback_data: "off" },
        ],
        [{ text: "📊 Estado", callback_data: "estado" }],
        [{ text: "💰 Saldo", callback_data: "saldo" }],
        [
          { text: "📈 Operación Activa", callback_data: "op" },
          { text: "📂 Historial", callback_data: "historial" },
        ],
      ],
    },
  });
}

bot.onText(/\/start/, (msg) => {
  if (msg.chat.id.toString() === CHAT_ID) {
    enviarMenu(CHAT_ID);
  }
});

bot.on("callback_query", async (query) => {
  const { data } = query;
  if (query.message.chat.id.toString() !== CHAT_ID) return;

  if (data === "on") {
    if (intervalo) return bot.sendMessage(CHAT_ID, "El bot ya está activo.");
    guardarEstado({ activo: true });
    intervalo = setInterval(async () => {
      await escanearPumpFun(bot, CHAT_ID);
      await escanearBirdeye(bot, CHAT_ID);
    }, 30000);
    await escanearPumpFun(bot, CHAT_ID);
    await escanearBirdeye(bot, CHAT_ID);
    bot.sendMessage(CHAT_ID, "ZafroBot está ENCENDIDO.");
  }

  if (data === "off") {
    guardarEstado({ activo: false });
    clearInterval(intervalo);
    intervalo = null;
    bot.sendMessage(CHAT_ID, "ZafroBot está APAGADO.");
  }

  if (data === "estado") {
    const estado = leerEstado().activo;
    bot.sendMessage(CHAT_ID, `Estado actual: ${estado ? "✅ Encendido" : "⛔ Apagado"}`);
  }

  if (data === "saldo") {
    try {
      const res = await fetch("https://api.mainnet-beta.solana.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getBalance",
          params: [WALLET],
        }),
      });
      const json = await res.json();
      const sol = (json.result?.value || 0) / 10 ** 9;
      bot.sendMessage(CHAT_ID, `Tu saldo actual es: ${sol.toFixed(4)} SOL`);
    } catch (e) {
      bot.sendMessage(CHAT_ID, "Error consultando saldo.");
    }
  }

  if (data === "op") {
    bot.sendMessage(CHAT_ID, "No hay operación activa.");
  }

  if (data === "historial") {
    bot.sendMessage(CHAT_ID, "Historial vacío (aún no se guarda).");
  }

  bot.answerCallbackQuery(query.id);
});

// Si estaba encendido, continuar escaneo automático
if (leerEstado().activo) {
  intervalo = setInterval(async () => {
    await escanearPumpFun(bot, CHAT_ID);
    await escanearBirdeye(bot, CHAT_ID);
  }, 30000);
  await escanearPumpFun(bot, CHAT_ID);
  await escanearBirdeye(bot, CHAT_ID);
}