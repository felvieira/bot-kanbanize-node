require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const cron = require("node-cron");

const token = process.env.BOT_TOKEN;
const apiKey = process.env.API_KEY;
const userId = process.env.USER_ID;
const chatId = process.env.CHAT_ID;
const bot = new TelegramBot(token, { polling: true });

cron.schedule(
  "0 18 * * 1-5",
  () => {
    bot.sendMessage(
      chatId,
      "Por favor, informe quantas horas você trabalhou hoje e o ID do cartão."
    );
  },
  {
    scheduled: true,
    timezone: "America/Sao_Paulo",
  }
);

bot.on("message", (msg) => {
  const chatId = msg.chat.id;

  if (msg.text.toLowerCase() === "/start") {
    bot.sendMessage(
      chatId,
      "Bem-vindo! Use /registrar para registrar seu tempo."
    );
  }

  if (msg.text.toLowerCase() === "/registrar") {
    startRegistrationProcess(chatId);
  }
});

async function startRegistrationProcess(chatId) {
  bot.sendMessage(chatId, "Informe o Card ID:");
  const cardId = await waitForNextMessage(chatId);

  bot.sendMessage(chatId, "Informe o tempo registrado em segundos:");
  const timeInSeconds = await waitForNextMessage(chatId);

  const success = await registerTime(cardId, timeInSeconds);
  if (success) {
    bot.sendMessage(chatId, `Tempo registrado no Card ${cardId}`);
  } else {
    bot.sendMessage(chatId, "Algo deu errado ao registrar o tempo.");
  }
}

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
