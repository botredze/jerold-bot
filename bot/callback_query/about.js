const Logs = require("../../model/Logs");

const aboutBot =
  "Мои родители — физик-математик и профессиональный трейдер. Мне уже 14 лет, и поэтому я считаю себя довольно-таки взрослым и самостоятельным интеллектом, хоть и искусственным =)\n\nМои родители объединили все свои знания и опыт, чтобы я родился на свет в виде продвинутого инструмента для профессиональных трейдеров. Родители научили меня тому, что не нужно предсказывать будущее по прошлому и не нужно искать аналогии настоящего в прошлом.\nТак я пришел к ключевому выводу: никакое предсказание не заменит объяснение.\nЯ состою из 3 научных компонентов: Физики, Математики и Биологии. Из физики я взял концепцию времени, из математики — теорию множеств, из биологии — теорию эволюции.\n\nДля вас я буду работать в простом и знакомом формате Telegram-бота. После подписки вы начнете получать ценные рекомендации от меня.\n\n▪️Для новичков - помогаю в определении направления и сильного уровня.\n\n▪️Для среднесрочной торговли подойду, т.к. среднее время удержания моего  сигнала больше чем 1 день.\n\n▪️Профессионалам я нужен как основание, т.к. базируюсь на строгой математической модели, и могу быть использован как доп. фактор в принятии  решений.";

const keyboardBack = {
  reply_markup: {
    resize_keyboard: true,
    inline_keyboard: [
      [
        {
          text: "Назад",
          callback_data: "back",
        },
      ],
    ],
  },
  parse_mode: "HTML",
};

const about = async (id, bot) => {
  try {
    await bot.sendMessage(id, aboutBot, keyboardBack);

    await Logs.create(id, "sendMessage", "bot", aboutBot, null, "about");
  } catch (error) {
    console.log(error);
  }
};

module.exports = about;
