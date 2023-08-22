const confirmDeleteSubscription = () => ({
  reply_markup: {
    resize_keyboard: true,
    inline_keyboard: [
      [
        {
          text: "Хочу остаться",
          callback_data: "manage_subscription",
        },
      ],
      [
        {
          text: "Хочу отписаться",
          callback_data: "delete_sub",
        },
      ],
    ],
  },
  parse_mode: "HTML",
});

module.exports = confirmDeleteSubscription;
