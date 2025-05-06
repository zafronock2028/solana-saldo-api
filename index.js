import express from "express";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import fs from "fs";
import { escanearPumpFun } from "./pumpScanner.js";
import { Connection } from '@solana/web3.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const WALLET = process.env.WALLET_ADDRESS;

// Configuración mejorada del bot
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, {
  polling: true,
  request: {
    timeout: 60000,
    agent: null
  }
});

// Middleware de verificación de salud
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use(express.static("public"));

// Endpoint de verificación de estado
app.get("/status", (req, res) => {
  const estado = leerEstado();
  res.json({
    status: "OK",
    botActive: estado.activo,
    lastScan: estado.ultimoEscaneo || "Nunca",
    uptime: process.uptime()
  });
});

// Sistema de estado mejorado
const estadoPath = "./estado_bot.json";
let intervalo = null;

function leerEstado() {
  try {
    const data = fs.readFileSync(estadoPath);
    const estado = JSON.parse(data);
    
    // Validar estructura del estado
    if (typeof estado.activo !== 'boolean' || 
        (estado.ultimoEscaneo && isNaN(new Date(estado.ultimoEscaneo)))) {
      throw new Error("Estado inválido");
    }
    
    return estado;
  } catch (error) {
    console.warn("No se pudo leer el estado, usando valores por defecto");
    return { activo: false, ultimoEscaneo: null };
  }
}

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

// Función de escaneo con verificación de conexión
async function ejecutarEscaneo() {
  const estado = leerEstado();
  if (!estado.activo) return;

  try {
    console.log(`[${new Date().toLocaleTimeString()}] Iniciando escaneo...`);
    
    // Verificar conexión antes de escanear
    await verificarConexion();
    
    await escanearPumpFun(bot, CHAT_ID);
    guardarEstado({
      ...estado,
      ultimoEscaneo: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error en escaneo programado:", error);
    bot.sendMessage(CHAT_ID, `⚠️ Error durante el escaneo: ${error.message}`);
  }
}

// Verificación de conexión a Solana
async function verificarConexion() {
  try {
    const connection = new Connection('https://api.mainnet-beta.solana.com');
    const slot = await connection.getSlot();
    console.log(`Conexión OK. Slot actual: ${slot}`);
    return true;
  } catch (error) {
    console.error("Error de conexión a Solana:", error);
    throw new Error("No se pudo conectar a la blockchain");
  }
}

// Comandos del bot mejorados
bot.onText(/\/start/, (msg) => {
  if (msg.chat.id.toString() === CHAT_ID) {
    enviarMenu(msg.chat.id);
  }
});

bot.onText(/\/status/, async (msg) => {
  if (msg.chat.id.toString() === CHAT_ID) {
    const estado = leerEstado();
    const conexion = await verificarConexion().catch(() => false);
    
    await bot.sendMessage(
      msg.chat.id,
      `🔍 *Estado del Sistema* 🔍\n\n` +
      `• Bot: ${estado.activo ? '🟢 ACTIVO' : '🔴 INACTIVO'}\n` +
      `• Último escaneo: ${estado.ultimoEscaneo || 'Nunca'}\n` +
      `• Conexión Solana: ${conexion ? '🟢 OK' : '🔴 Error'}\n` +
      `• Uptime: ${formatUptime(process.uptime())}`,
      { parse_mode: "Markdown" }
    );
  }
});

function formatUptime(seconds) {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${mins}m`;
}

// Menú interactivo mejorado
function enviarMenu(chatId) {
  const estado = leerEstado();
  
  bot.sendMessage(chatId, "🤖 *Panel de Control - Pump.fun Scanner* 🤖", {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { 
            text: estado.activo ? "✅ BOT ACTIVO" : "🚀 Activar Bot", 
            callback_data: "toggle_bot" 
          }
        ],
        [
          { text: "🔍 Escanear Ahora", callback_data: "scan_now" },
          { text: "📊 Estado", callback_data: "status" }
        ],
        [
          { text: "💼 Ver Saldo", callback_data: "balance" },
          { text: "🔄 Reiniciar", callback_data: "restart" }
        ]
      ]
    }
  });
}

// Manejador de callbacks
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  if (chatId.toString() !== CHAT_ID) return;

  try {
    const estado = leerEstado();

    switch (query.data) {
      case 'toggle_bot':
        if (estado.activo) {
          clearInterval(intervalo);
          intervalo = null;
          guardarEstado({ activo: false, ultimoEscaneo: estado.ultimoEscaneo });
          await bot.sendMessage(chatId, "🔴 Bot detenido");
        } else {
          intervalo = setInterval(ejecutarEscaneo, 30000);
          await ejecutarEscaneo();
          guardarEstado({ activo: true, ultimoEscaneo: estado.ultimoEscaneo });
          await bot.sendMessage(chatId, "🟢 Bot activado - Escaneando cada 30 segundos");
        }
        break;

      case 'scan_now':
        await bot.sendMessage(chatId, "🔍 Iniciando escaneo manual...");
        await ejecutarEscaneo();
        break;

      case 'status':
        const conexion = await verificarConexion().catch(() => false);
        await bot.sendMessage(
          chatId,
          `🔄 *Estado Actual* 🔄\n\n` +
          `• Escaneos activos: ${estado.activo ? 'SI' : 'NO'}\n` +
          `• Último escaneo: ${estado.ultimoEscaneo || 'Nunca'}\n` +
          `• Conexión Solana: ${conexion ? 'OK' : 'ERROR'}`,
          { parse_mode: "Markdown" }
        );
        break;

      case 'balance':
        // Implementar lógica de saldo
        break;

      case 'restart':
        await bot.sendMessage(chatId, "🔄 Reiniciando sistema...");
        process.exit(0);
        break;
    }

    // Actualizar menú
    enviarMenu(chatId);
    bot.answerCallbackQuery(query.id);

  } catch (error) {
    console.error("Error en callback:", error);
    await bot.sendMessage(chatId, `⚠️ Error: ${error.message}`);
    bot.answerCallbackQuery(query.id, { text: "Error procesando solicitud" });
  }
});

// Iniciar servicio
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor activo en el puerto ${PORT}`);
  
  // Iniciar bot si estaba activo
  const estado = leerEstado();
  if (estado.activo) {
    intervalo = setInterval(ejecutarEscaneo, 30000);
    console.log("Bot iniciado en modo activo por estado guardado");
    ejecutarEscaneo();
  }
});

// Manejo de cierre limpio
function shutdown() {
  console.log("Recibida señal de apagado. Limpiando...");
  clearInterval(intervalo);
  server.close(() => {
    console.log("Servidor cerrado");
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Verificación periódica del sistema
setInterval(() => {
  const estado = leerEstado();
  if (estado.activo && !intervalo) {
    console.warn("El bot debería estar activo pero no hay intervalo. Reiniciando...");
    intervalo = setInterval(ejecutarEscaneo, 30000);
    ejecutarEscaneo();
  }
}, 60000); // Verificar cada minuto