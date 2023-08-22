module.exports = {
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
