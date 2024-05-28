const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const cron = require("node-cron");
const express = require("express");
const bodyParser = require("body-parser");

require("dotenv").config();

const app = express();
app.use(bodyParser.json());

const token = process.env.BOT_TOKEN;
const apiKey = process.env.API_KEY;
const userId = process.env.USER_ID;
const chatId = process.env.CHAT_ID;
const kanbanizeDomain = process.env.KANBANIZE_DOMAIN;
const bot = new TelegramBot(token, { polling: true });

cron.schedule(
  "0 18 * * 1-5",
  () => {
    sendStartButton(chatId);
  },
  {
    scheduled: true,
    timezone: "America/Sao_Paulo",
  }
);

app.post("/send-message", (req, res) => {
  const message = req.body.message;
  if (message) {
    bot.sendMessage(chatId, message);
    res.send("Message sent!");
  } else {
    res.status(400).send("Message is required");
  }
});

app.post("/start-registration", async (req, res) => {
  if (chatId) {
    sendStartButton(chatId);
    res.send("Processo de registro de tempo iniciado!");
  } else {
    res.status(400).send("CHAT_ID não definido no ambiente.");
  }
});

async function fetchCardsFromKanbanize() {
  const apiUrl = `https://${kanbanizeDomain}/api/v2/cards?owner_user_ids=${userId}`;
  const headers = {
    apikey: apiKey,
    "Content-Type": "application/json",
  };
  try {
    const response = await axios.get(apiUrl, { headers });
    return response.data.data; // Correção para acessar o array de cards corretamente
  } catch (error) {
    console.error("Erro ao fazer requisição para Kanbanize:", error);
    throw error;
  }
}

function sendStartButton(chatId) {
  const opts = {
    reply_markup: JSON.stringify({
      inline_keyboard: [
        [{ text: "Registrar Tempo", callback_data: "start_registration" }],
      ],
    }),
  };
  bot.sendMessage(
    chatId,
    "Clique abaixo para registrar o tempo trabalhado hoje:",
    opts
  );
}

bot.on("callback_query", async (callbackQuery) => {
  const msg = callbackQuery.message;
  const data = callbackQuery.data;

  if (data === "start_registration") {
    await startRegistrationProcess(msg.chat.id);
  } else if (data.startsWith("card_")) {
    const cardId = data.split("_")[1];
    showTimeRegistrationOptions(cardId, msg.chat.id);
  } else if (data.includes("_")) {
    const [cardId, timeData] = data.split("_");
    if (timeData === "custom") {
      bot.sendMessage(msg.chat.id, "Informe o tempo registrado em segundos:");
      const customTime = await waitForNextMessage(msg.chat.id);
      const success = await registerTime(cardId, customTime, msg.chat.id);
      if (success) {
        bot.sendMessage(
          msg.chat.id,
          `Tempo registrado: ${customTime} segundos no Card ${cardId}.`
        );
      } else {
        bot.sendMessage(msg.chat.id, "Algo deu errado ao registrar o tempo.");
      }
    } else {
      const success = await registerTime(cardId, timeData, msg.chat.id);
      if (success) {
        bot.sendMessage(
          msg.chat.id,
          `Tempo registrado: ${timeData} segundos no Card ${cardId}.`
        );
      } else {
        bot.sendMessage(msg.chat.id, "Algo deu errado ao registrar o tempo.");
      }
    }
  }
});

bot.on("message", (msg) => {
  if (msg.text.toLowerCase() === "/start") {
    sendStartButton(msg.chat.id);
  }
});

async function startRegistrationProcess(chatId) {
  try {
    const cards = await fetchCardsFromKanbanize();
    if (cards.length > 0) {
      const opts = {
        reply_markup: JSON.stringify({
          inline_keyboard: cards.map((card) => [
            { text: card.title, callback_data: `card_${card.card_id}` },
          ]),
        }),
      };
      bot.sendMessage(chatId, "Escolha um card para registrar o tempo:", opts);
    } else {
      bot.sendMessage(chatId, "Não há cards disponíveis.");
    }
  } catch (error) {
    console.error("Erro ao buscar cards:", error);
    bot.sendMessage(chatId, "Erro ao buscar os cards do Kanbanize.");
  }
}

function showTimeRegistrationOptions(cardId, chatId) {
  const opts = {
    reply_markup: JSON.stringify({
      inline_keyboard: [
        [{ text: "1 hora", callback_data: `${cardId}_3600` }],
        [{ text: "2 horas", callback_data: `${cardId}_7200` }],
        [{ text: "3 horas", callback_data: `${cardId}_10800` }],
        [{ text: "4 horas", callback_data: `${cardId}_14400` }],
        [{ text: "5 horas", callback_data: `${cardId}_18000` }],
        [{ text: "6 horas", callback_data: `${cardId}_21600` }],
        [{ text: "7 horas", callback_data: `${cardId}_25200` }],
        [{ text: "8 horas", callback_data: `${cardId}_28800` }],
        [{ text: "Outro valor", callback_data: `${cardId}_custom` }],
      ],
    }),
  };
  bot.sendMessage(
    chatId,
    "Selecione o tempo trabalhado ou informe um valor personalizado:",
    opts
  );
}

function waitForNextMessage(chatId) {
  return new Promise((resolve) => {
    const handler = (msg) => {
      if (msg.chat.id === chatId) {
        bot.removeListener("message", handler);
        resolve(msg.text);
      }
    };
    bot.on("message", handler);
  });
}

async function registerTime(cardId, timeInSeconds, chatId) {
  const apiUrl = "https://rennersa.kanbanize.com/api/v2/loggedTime";
  const data = {
    card_id: cardId,
    subtask_id: null,
    parent_card_id: null,
    user_id: userId,
    date: new Date().toISOString().split("T")[0],
    time: parseInt(timeInSeconds, 10), // Certifique-se de que time está em segundos e é um número
    comment: "",
    category_id: 2,
  };

  console.log("Payload enviado para Kanbanize:", JSON.stringify(data, null, 2));

  try {
    const response = await axios.post(apiUrl, data, {
      headers: {
        accept: "/",
        apikey: apiKey,
        "content-type": "application/json",
      },
    });
    if (response.status === 200) {
      bot.sendMessage(chatId, "Tempo registrado com sucesso!");
    } else {
      bot.sendMessage(
        chatId,
        "Erro ao registrar tempo. Por favor, tente novamente."
      );
    }
    return response.status === 200;
  } catch (error) {
    console.error("Erro ao registrar tempo:", error.response.data);
    bot.sendMessage(
      chatId,
      `Erro ao registrar tempo: ${error.response.data.error.message}`
    );
    return false;
  }
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
