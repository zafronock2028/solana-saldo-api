import TelegramBot from 'node-telegram-bot-api';
import 'dotenv/config';
import fs from 'fs';

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.CHAT_ID;
const estadoPath = './estado.json';

const bot = new TelegramBot(token, { polling: true });

// Estado persistente
function guardarEstado(nuevoEstado) {
  fs.writeFileSync(estadoPath, JSON.stringify(nuevoEstado));
}

function leerEstado() {
  try {
    return JSON.parse(fs.readFileSync(estadoPath));
  } catch {
    return { activo: false };
  }
}

// Crear teclado con botones
const teclado = {
  reply_markup: {
    keyboard: [
      ['🚀 Encender Bot', '🛑 Apagar Bot'],
      ['📊 Estado', '💰 Saldo'],
      ['📈 Operación Activa', '📂 Historial']
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

bot.onText(/\/start/, (msg) => {
  if (msg.chat.id.toString() !== chatId) return;
  bot.sendMessage(chatId, 'Bienvenido al Panel de Control ZafroBot Joyas X100', teclado);
});

bot.on('message', (msg) => {
  if (msg.chat.id.toString() !== chatId) return;

  const estado = leerEstado();

  switch (msg.text) {
    case '🚀 Encender Bot':
      guardarEstado({ activo: true });
      bot.sendMessage(chatId, 'Bot encendido.');
      break;

    case '🛑 Apagar Bot':
      guardarEstado({ activo: false });
      bot.sendMessage(chatId, 'Bot apagado.');
      break;

    case '📊 Estado':
      bot.sendMessage(chatId, `Estado actual: ${estado.activo ? '✅ Activo' : '⛔ Inactivo'}`);
      break;

    case '💰 Saldo':
      bot.sendMessage(chatId, 'Función de saldo aún no implementada.');
      break;

    case '📈 Operación Activa':
      bot.sendMessage(chatId, 'Operación activa: aún no hay ninguna.');
      break;

    case '📂 Historial':
      bot.sendMessage(chatId, 'Historial vacío por ahora.');
      break;
  }
});
