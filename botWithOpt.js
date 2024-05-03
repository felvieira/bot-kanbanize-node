// Importações
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const cron = require("node-cron");
const express = require("express");
const bodyParser = require("body-parser");

// Configuração do ambiente
require("dotenv").config();
const app = express();
app.use(bodyParser.json());

// Variáveis de ambiente
const token = process.env.BOT_TOKEN;
const apiKey = process.env.API_KEY;
const userId = process.env.USER_ID;
const chatId = process.env.CHAT_ID;
const bot = new TelegramBot(token, { polling: true });

// Rotina cron para enviar mensagem de registro de tempo
cron.schedule(
  "0 18 * * 1-5",
  () => {
    const opts = {
      reply_markup: JSON.stringify({
        inline_keyboard: [
          [{ text: "2 horas", callback_data: "2_hours" }],
          [{ text: "4 horas", callback_data: "4_hours" }],
          [{ text: "6 horas", callback_data: "6_hours" }],
          [{ text: "8 horas", callback_data: "8_hours" }],
          [{ text: "Personalizado", callback_data: "custom_time" }],
        ],
      }),
    };
    bot.sendMessage(
      chatId,
      "Escolha a quantidade de horas trabalhadas hoje:",
      opts
    );
  },
  {
    scheduled: true,
    timezone: "America/Sao_Paulo",
  }
);

// Rota para enviar mensagem via API
app.post("/send-message", (req, res) => {
  const message = req.body.message;
  if (message) {
    bot.sendMessage(chatId, message);
    res.send("Message sent!");
  } else {
    res.status(400).send("Message is required");
  }
});

// Rota para iniciar o processo de registro de tempo via API
app.post("/start-registration", (req, res) => {
  const chatId = process.env.CHAT_ID;
  if (chatId) {
    startRegistrationProcess(chatId);
    res.send("Processo de registro de tempo iniciado!");
  } else {
    res.status(400).send("CHAT_ID não definido no ambiente.");
  }
});
bot.on("callback_query", (callbackQuery) => {
  const msg = callbackQuery.message;
  const data = callbackQuery.data;

  if (data === "custom_time") {
    bot.sendMessage(msg.chat.id, "Informe o tempo registrado em segundos:");
  } else {
    startRegistrationProcess(msg.chat.id, parseInt(data.split("_")[0]) * 3600);
  }
});

// Tratamento de mensagem para iniciar o registro de tempo
bot.on("message", (msg) => {
  if (msg.text.toLowerCase() === "/start") {
    bot.sendMessage(
      msg.chat.id,
      "Bem-vindo! Escolha uma das opções abaixo para registrar seu tempo hoje:",
      {
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [{ text: "2 horas", callback_data: "2_hours" }],
            [{ text: "4 horas", callback_data: "4_hours" }],
            [{ text: "6 horas", callback_data: "6_hours" }],
            [{ text: "8 horas", callback_data: "8_hours" }],
            [{ text: "Personalizado", callback_data: "custom_time" }],
          ],
        }),
      }
    );
  } else if (msg.text.toLowerCase() === "/registrar") {
    bot.sendMessage(msg.chat.id, "Informe o tempo registrado em segundos:");
  }
});

// Função para iniciar o processo de registro de tempo
async function startRegistrationProcess(chatId, timeInSeconds) {
  if (!isNaN(timeInSeconds)) {
    const cardId = await waitForNextMessage(chatId);
    const success = await registerTime(cardId, timeInSeconds);
    if (success) {
      bot.sendMessage(chatId, `Tempo registrado no Card ${cardId}`);
    } else {
      bot.sendMessage(chatId, "Algo deu errado ao registrar o tempo.");
    }
  } else {
    bot.sendMessage(
      chatId,
      "Tempo inválido. Por favor, informe um número válido em segundos."
    );
  }
}

// Função para aguardar a próxima mensagem do usuário
function waitForNextMessage(chatId) {
  return new Promise((resolve) => {
    bot.on("message", handler);
    function handler(msg) {
      if (msg.chat.id === chatId) {
        bot.removeListener("message", handler);
        resolve(msg.text);
      }
    }
  });
}

// Função para registrar o tempo no Kanbanize
async function registerTime(cardId, timeInSeconds) {
  const apiUrl = "https://rennersa.kanbanize.com/api/v2/loggedTime";
  const data = {
    card_id: cardId,
    subtask_id: null,
    parent_card_id: null,
    user_id: userId,
    date: new Date().toISOString().split("T")[0],
    time: timeInSeconds,
    comment: "",
    category_id: 2,
  };

  try {
    const response = await axios.post(apiUrl, data, {
      headers: {
        accept: "/",
        apikey: apiKey,
        "content-type": "application/json",
      },
    });
    return response.status === 200;
  } catch (error) {
    console.error(error);
    return false;
  }
}
// Inicia o servidor na porta definida ou na porta 3000
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
