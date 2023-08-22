const crm = require("../../utils/crm");

const answer_by_callback = {
  delete_answer_1: "Не понимаю, как пользоваться",
  delete_answer_2: "Не хватает знаний в трейдинге",
  delete_answer_3: "Jerold мне не помог",
};

const answer = async (id, bot, data) => {
  try {
    const deal_id = data.slice(data.lastIndexOf("_"), data.length).slice(1, data.lastIndexOf("_"));
    const callback_name = data.slice(0, data.lastIndexOf("_"));

    if (callback_name === "delete_answer_another") {
      await bot.sendMessage(id, `Отправь пожалуйста мне в сообщении причину🙏...`);

      const send_message = async (msg) => {
        if (msg.from.id === id) {
          await crm.updateDealField(deal_id, "d6c63ae9504ef698615880c96afe5e80148e2baa", msg.text);
          await bot.sendMessage(
            id,
            `Спасибо большое за твой отзыв🤝! Ты всегда можешь вернуться к нам. Всё что для этого нужно:\n1. Нажать на кнопку "Оформить подписку" в Управлении подписками.\nВыбирай любой способ, мы всегда будем тебе рады😊!`,
            {
              reply_markup: {
                resize_keyboard: true,
                inline_keyboard: [
                  [
                    {
                      text: `В главное меню`,
                      callback_data: "back",
                    },
                  ],
                ],
              },
            }
          );
          bot.removeListener("message", send_message);
        }
      };

      bot.on("message", send_message);

      return;
    }

    await crm.updateDealField(deal_id, "d6c63ae9504ef698615880c96afe5e80148e2baa", answer_by_callback[callback_name]);
    await bot.sendMessage(
      id,
      `Спасибо большое за твой отзыв🤝! Ты всегда можешь вернуться к нам. Всё что для этого нужно:\n1. Нажать на кнопку "Оформить подписку" в Управлении подписками.\nВыбирай любой способ, мы всегда будем тебе рады😊!`,
      {
        reply_markup: {
          resize_keyboard: true,
          inline_keyboard: [
            [
              {
                text: `В главное меню`,
                callback_data: "back",
              },
            ],
          ],
        },
      }
    );
  } catch (error) {
    console.log(error);
  }
};

module.exports = answer;
