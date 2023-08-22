async function buyFundamental(user, template, message, product) {
  return {
    reply_markup: {
      resize_keyboard: true,
      inline_keyboard: [
        [
          {
            text: "Купить сейчас",
            callback_data: "product_essential_forex_promo"
          }
        ],
      ],
    },
  };
}

module.exports = buyFundamental;