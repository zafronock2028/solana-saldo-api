import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import fs from "fs";
import { escanearPumpFun } from "./pumpScanner.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validación de variables de entorno
const REQUIRED_ENV = ['TELEGRAM_BOT_TOKEN', 'CHAT_ID', 'WALLET_ADDRESS', 'HELIUS_API_KEY'];
REQUIRED_ENV.forEach(env => {
  if (!process.env[env]) {
    console.error(`Falta la variable de entorno requerida: ${env}`);
    process.exit(1);
  }
});

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const WALLET = process.env.WALLET_ADDRESS;

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// Middleware para registro de solicitudes
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Endpoint mejorado para saldo
app.get("/saldo", async (req, res) => {
  const walletAddress = req.query.wallet || WALLET;
  if (!walletAddress) return res.status(400).json({ error: "Falta wallet address" });

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
    if (data.error) throw new Error(data.error.message);
    
    const balance = data.result?.value || 0;
    res.json({
      wallet: walletAddress,
      balance: balance / 10 ** 9,
      unit: "SOL"
    });
  } catch (error) {
    console.error("Error al obtener saldo:", error);
    res.status(500).json({ error: "Error al obtener el saldo", details: error.message });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Iniciar servidor
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor activo en el puerto ${PORT}`);
});

// Manejo de estado del bot
const estadoPath = "./estado_bot.json";
let intervalo = null;

// Función mejorada para leer estado
function leerEstado() {
  try {
    const data = fs.readFileSync(estadoPath);
    return JSON.parse(data);
  } catch (error) {
    console.warn("No se pudo leer el estado, usando valores por defecto");
    return { activo: false, ultimoEscaneo: null };
  }
}

// Función mejorada para guardar estado
function guardarEstado(estado) {
  try {
    fs.writeFileSync(estadoPath, JSON.stringify({
      ...estado,
      ultimaActualizacion: new Date().toISOString()
    }));
  } catch (error) {
    console.error("Error guardando estado:", error);
  }
}

// Menú mejorado
function enviarMenu(chatId) {
  const estado = leerEstado();
  const textoEstado = estado.activo ? 
    `✅ ACTIVO (último escaneo: ${estado.ultimoEscaneo || 'N/A'})` : 
    '❌ INACTIVO';

  bot.sendMessage(chatId, `🔷 *Panel de control ZafroBot* 🔷\n\nEstado: ${textoEstado}\n\nOpciones:`, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🚀 Encender Bot", callback_data: "on" },
          { text: "🛑 Apagar Bot", callback_data: "off" }
        ],
        [
          { text: "📊 Estado", callback_data: "estado" },
          { text: "💰 Saldo", callback_data: "saldo" }
        ],
        [
          { text: "🔄 Escanear ahora", callback_data: "scan_now" }
        ]
      ],
    },
  });
}

// Función para manejar el escaneo
async function ejecutarEscaneo() {
  try {
    console.log("Iniciando escaneo programado...");
    await escanearPumpFun(bot, CHAT_ID);
    guardarEstado({
      ...leerEstado(),
      ultimoEscaneo: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error en escaneo programado:", error);
    bot.sendMessage(CHAT_ID, `⚠️ Error durante el escaneo: ${error.message}`);
  }
}

// Comandos del bot
bot.onText(/\/start/, (msg) => {
  if (msg.chat.id.toString() === CHAT_ID) {
    enviarMenu(CHAT_ID);
  }
});

bot.onText(/\/status/, (msg) => {
  if (msg.chat.id.toString() === CHAT_ID) {
    const estado = leerEstado();
    bot.sendMessage(CHAT_ID, `Estado actual:\n\n- Bot: ${estado.activo ? '✅ ACTIVO' : '❌ INACTIVO'}\n- Último escaneo: ${estado.ultimoEscaneo || 'Nunca'}`);
  }
});

// Manejador de callbacks
bot.on("callback_query", async (query) => {
  const { data } = query;
  if (query.message.chat.id.toString() !== CHAT_ID) return;

  try {
    if (data === "on") {
      if (intervalo) {
        await bot.sendMessage(CHAT_ID, "ℹ️ El bot ya está activo.");
        return;
      }
      
      guardarEstado({ activo: true, ultimoEscaneo: null });
      intervalo = setInterval(ejecutarEscaneo, 30000);
      await ejecutarEscaneo(); // Ejecutar inmediatamente
      await bot.sendMessage(CHAT_ID, "🟢 *ZafroBot ACTIVADO*\n\nEscaneando Pump.fun cada 30 segundos.", { parse_mode: "Markdown" });
    }

    if (data === "off") {
      guardarEstado({ activo: false });
      clearInterval(intervalo);
      intervalo = null;
      await bot.sendMessage(CHAT_ID, "🔴 *ZafroBot DESACTIVADO*", { parse_mode: "Markdown" });
    }

    if (data === "estado") {
      const estado = leerEstado();
      await bot.sendMessage(CHAT_ID, `Estado actual:\n\n- Bot: ${estado.activo ? '✅ ACTIVO' : '❌ INACTIVO'}\n- Último escaneo: ${estado.ultimoEscaneo || 'Nunca'}`);
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
        if (json.error) throw new Error(json.error.message);
        
        const sol = (json.result?.value || 0) / 10 ** 9;
        await bot.sendMessage(CHAT_ID, `💳 *Saldo actual:*\n\n${sol.toFixed(4)} SOL`, { parse_mode: "Markdown" });
      } catch (e) {
        console.error("Error consultando saldo:", e);
        await bot.sendMessage(CHAT_ID, "❌ Error consultando saldo. Verifica la conexión.");
      }
    }

    if (data === "scan_now") {
      await bot.sendMessage(CHAT_ID, "🔍 Iniciando escaneo manual...");
      await ejecutarEscaneo();
    }

    // Actualizar menú después de cada acción
    enviarMenu(CHAT_ID);
  } catch (error) {
    console.error("Error en callback:", error);
    await bot.sendMessage(CHAT_ID, `⚠️ Error: ${error.message}`);
  } finally {
    bot.answerCallbackQuery(query.id);
  }
});

// Iniciar bot si estaba activo
const estadoInicial = leerEstado();
if (estadoInicial.activo) {
  intervalo = setInterval(ejecutarEscaneo, 30000);
  console.log("Bot iniciado en modo activo por estado guardado");
  ejecutarEscaneo();
}

// Manejo de cierre limpio
process.on('SIGTERM', () => {
  console.log("Recibido SIGTERM. Cerrando...");
  clearInterval(intervalo);
  server.close(() => {
    console.log("Servidor cerrado");
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log("Recibido SIGINT. Cerrando...");
  clearInterval(intervalo);
  server.close(() => {
    console.log("Servidor cerrado");
    process.exit(0);
  });
});