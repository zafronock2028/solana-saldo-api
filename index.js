import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const WALLET = process.env.WALLET_ADDRESS;

// === Servir el sitio web de consulta de saldo ===
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

// === Lógica para buscar joyas ===
async function buscarJoyas() {
  try {
    const res = await fetch("https://gmgn.ai/api/tokens");
    const tokens = await res.json();

    const joyas = tokens.filter((t) => {
      const liquidez = t.liquidity_usd || 0;
      const volumen = t.volume_usd || 0;
      const edad = t.age_minutes || 9999;
      return (
        liquidez >= 5000 &&
        liquidez <= 80000 &&
        volumen > 15000 &&
        volumen / liquidez > 3 &&
        edad < 45
      );
    });

    if (joyas.length > 0) {
      for (const token of joyas) {
        const mensaje = `
🚀 *Joya Detectada*  
*Nombre:* ${token.name}  
*Símbolo:* ${token.symbol}  
*Liquidez:* $${token.liquidity_usd}  
*Volumen:* $${token.volume_usd}  
*Edad:* ${token.age_minutes} min  
*Ver:* https://dexscreener.com/solana/${token.address}
        `.trim();
        await bot.sendMessage(CHAT_ID, mensaje, { parse_mode: "Markdown" });
      }
    } else {
      console.log(`[${new Date().toLocaleTimeString()}] Sin joyas.`);
    }
  } catch (err) {
    console.error("Error escaneando:", err.message);
  }
}

// === Control desde Telegram ===
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
    intervalo = setInterval(buscarJoyas, 60000);
    buscarJoyas();
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

// === Si el bot estaba encendido antes, reanudar ===
if (leerEstado().activo) {
  intervalo = setInterval(buscarJoyas, 60000);
  buscarJoyas();
}