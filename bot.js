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
const bot = new TelegramBot(token, { polling: true });

// Guardar os Card IDs em memória para simplificar (substituir por uma solução de banco de dados se necessário)
let cardIds = new Map();

cron.schedule(
    "0 18 * * 1-5",
    () => {
        const opts = {
            reply_markup: JSON.stringify({
                inline_keyboard: [
                    [{ text: "Registrar Tempo", callback_data: "registrar_tempo" }],
                ],
            }),
        };
        bot.sendMessage(
            chatId,
            "Clique abaixo para registrar o tempo trabalhado hoje:",
            opts
        );
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
        await startRegistrationProcess(chatId);
        res.send("Processo de registro de tempo iniciado!");
    } else {
        res.status(400).send("CHAT_ID não definido no ambiente.");
    }
});

bot.on("callback_query", async (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data;

    if (data === "registrar_tempo") {
        await startRegistrationProcess(msg.chat.id);
    } else if (!isNaN(data) || data === "custom") {
        const cardId = cardIds.get(msg.chat.id);
        if (data === "custom") {
            bot.sendMessage(msg.chat.id, "Informe o tempo registrado em segundos:");
            const customTime = await waitForNextMessage(msg.chat.id);
            await processTimeRegistration(cardId, customTime, msg.chat.id);
        } else {
            await processTimeRegistration(cardId, data, msg.chat.id);
        }
    }
});

bot.on("message", (msg) => {
    if (msg.text.toLowerCase() === "/start") {
        bot.sendMessage(
            msg.chat.id,
            "Bem-vindo! Use o botão abaixo quando estiver pronto para registrar seu tempo.",
            {
                reply_markup: JSON.stringify({
                    inline_keyboard: [
                        [{ text: "Registrar Tempo", callback_data: "registrar_tempo" }],
                    ],
                }),
            }
        );
    }
});

async function startRegistrationProcess(chatId) {
    bot.sendMessage(chatId, "Informe o Card ID:");
    const cardId = await waitForNextMessage(chatId);
    cardIds.set(chatId, cardId);  // Salva o Card ID para uso futuro no mesmo chat

    const opts = {
        reply_markup: JSON.stringify({
            inline_keyboard: [
                [{ text: "1 hora", callback_data: "3600" }],
                [{ text: "2 horas", callback_data: "7200" }],
                [{ text: "3 horas", callback_data: "10800" }],
                [{ text: "4 horas", callback_data: "14400" }],
                [{ text: "5 horas", callback_data: "18000" }],
                [{ text: "6 horas", callback_data: "21600" }],
                [{ text: "7 horas", callback_data: "25200" }],
                [{ text: "8 horas", callback_data: "28800" }],
                [{ text: "Outro valor", callback_data: "custom" }]
            ]
        }),
    };
    bot.sendMessage(chatId, "Selecione o tempo trabalhado ou informe um valor personalizado:", opts);
}

async function processTimeRegistration(cardId, timeInSeconds, chatId) {
    const success = await registerTime(cardId, timeInSeconds);
    if (success) {
        bot.sendMessage(chatId, `Tempo registrado no Card ${cardId}: ${timeInSeconds} segundos`);
    } else {
        bot.sendMessage(chatId, "Algo deu errado ao registrar o tempo.");
    }
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

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
