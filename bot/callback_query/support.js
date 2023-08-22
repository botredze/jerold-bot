const Logs = require("../../model/Logs");
const keyboardBack = require("../keyboard/back");

const support = async (id, bot) => {
  const message = `Если у вас возникли какие-либо сложности или дополнительные вопросы, напишите на почту ${process.env.SUPPORT_EMAIL}`;
  await bot.sendMessage(id, message, keyboardBack);

  await Logs.create(
    id,
    "sendMessage",
    "bot",
    "Если у вас возникли какие-либо сложности или дополнительные вопросы, напишите на почту support@jerold.io",
    null,
    "support"
  );
};

module.exports = support;
