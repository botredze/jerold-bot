const menu = async (products) => ({
    reply_markup: {
      resize_keyboard: true,
      inline_keyboard: products.map((el) => [{
        text: el.name_view,
        callback_data: `${el.callback_name}_delete`
      }])
    },
    parse_mode: "HTML"
});

module.exports = menu;
