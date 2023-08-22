const Logs = require("../../model/Logs");

const helloText =
  "Привет!\nЯ - Jerold\nПерсональный помощник профессиональных трейдеров, созданный на базе ИИ и авторского научного проекта";

const mainKeyboard = require("../keyboard/main");

const back = async (id, user_id, bot) => {
  const keyboard = await mainKeyboard(user_id, bot);
  await bot.sendMessage(id, helloText, keyboard);
  await Logs.create(id, "sendMessage", "bot", "back", null);
};

module.exports = back;
