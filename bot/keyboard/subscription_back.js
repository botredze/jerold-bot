module.exports = {
  reply_markup: {
    resize_keyboard: true,
    inline_keyboard: [
      [
        {
          text: "Назад",
          callback_data: "manage_subscription",
        },
      ],
    ],
  },
  parse_mode: "HTML",
};
