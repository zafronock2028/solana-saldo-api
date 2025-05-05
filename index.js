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

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
const estadoPath = "./estado_bot.json";
let intervalo = null;

// === Web básico ===
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
  } catch {
    res.status(500).send("Error al obtener el saldo");
  }
});

app.listen(PORT, () => {
  console.log(`Servidor activo en el puerto ${PORT}`);
});

// === Utilidades ===
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
        [{ text: "🚀 Encender Bot", callback_data: "on" }, { text: "🛑 Apagar Bot", callback_data: "off" }],
        [{ text: "📊 Estado", callback_data: "estado" }],
        [{ text: "💰 Saldo", callback_data: "saldo" }],
        [{ text: "📈 Operación Activa", callback_data: "op" }, { text: "📂 Historial", callback_data: "historial" }]
      ]
    }
  });
}

// === ESCANEO Pump.fun ===
async function escanearPumpFun() {
  console.log(`[${new Date().toLocaleTimeString()}] Escaneando Pump.fun...`);
  try {
    const res = await fetch("https://pump.fun/data/tokens.json");
    const tokens = await res.json();

    const joyas = tokens.filter((t) => {
      const lp = t.liquidity || 0;
      const vol = t.volume || 0;
      const holders = t.holders || 0;
      const age = (Date.now() - new Date(t.created_at)) / 60000;

      return (
        lp >= 2000 &&
        lp <= 75000 &&
        vol >= 15000 &&
        holders >= 50 &&
        age <= 35
      );
    });

    for (const t of joyas) {
      const mensaje = `🟡 *Pump.fun*  
*Nombre:* ${t.name}  
*Símbolo:* ${t.symbol}  
*LP:* $${t.liquidity}  
*Volumen:* $${t.volume}  
*Holders:* ${t.holders}  
[Ver en Pump.fun](https://pump.fun/${t.mint})`;

      console.log(`🟡 Joyita Pump.fun: ${t.name} (${t.symbol})`);
      await bot.sendMessage(CHAT_ID, mensaje, { parse_mode: "Markdown" });
    }

    if (joyas.length === 0) {
      console.log(`[${new Date().toLocaleTimeString()}] Sin joyas en Pump.fun.`);
    }

  } catch (err) {
    console.error("Error escaneando Pump.fun:", err.message);
  }
}

// === ESCANEO Birdeye ===
async function escanearBirdeye() {
  console.log(`[${new Date().toLocaleTimeString()}] Escaneando Birdeye...`);
  try {
    const res = await fetch("https://public-api.birdeye.so/defi/tokenlist?chain=solana");
    const json = await res.json();
    const tokens = json?.data || [];

    const joyas = tokens.filter((t) => {
      const lp = t.liquidity || 0;
      const vol = t.volume_24h || 0;
      const age = t.age_minutes || 9999;
      return (
        lp >= 3000 &&
        lp <= 75000 &&
        vol >= 15000 &&
        vol / lp >= 3 &&
        age <= 45
      );
    });

    for (const t of joyas) {
      const mensaje = `🟢 *Birdeye*  
*Nombre:* ${t.name}  
*Símbolo:* ${t.symbol}  
*LP:* $${t.liquidity?.toFixed(0)}  
*Volumen:* $${t.volume_24h?.toFixed(0)}  
[Ver en Birdeye](https://birdeye.so/token/${t.address}?chain=solana)`;

      console.log(`🟢 Joyita Birdeye: ${t.name} (${t.symbol})`);
      await bot.sendMessage(CHAT_ID, mensaje, { parse_mode: "Markdown" });
    }

    if (joyas.length === 0) {
      console.log(`[${new Date().toLocaleTimeString()}] Sin joyas en Birdeye.`);
    }

  } catch (err) {
    console.error("Error escaneando Birdeye:", err.message);
  }
}

// === Escaneo general ===
async function escaneoParalelo() {
  escanearPumpFun();
  escanearBirdeye();
}

// === Control Telegram ===
bot.onText(/\/start/, (msg) => {
  if (msg.chat.id.toString() === CHAT_ID) enviarMenu(CHAT_ID);
});

bot.on("callback_query", async (query) => {
  const { data } = query;
  if (query.message.chat.id.toString() !== CHAT_ID) return;

  if (data === "on") {
    if (intervalo) return bot.sendMessage(CHAT_ID, "El bot ya está activo.");
    guardarEstado({ activo: true });
    intervalo = setInterval(escanearParalelo, 30000);
    escaneoParalelo();
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
    } catch {
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

// Si estaba encendido previamente
if (leerEstado().activo) {
  intervalo = setInterval(escanearParalelo, 30000);
  escaneoParalelo();
}