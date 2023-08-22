const menu = async (products) => {
  const menu = products.map((el) => {
    return [
      {
        text: el.name_view,
        callback_data: el.callback_name,
      },
    ];
  });
  menu.push([
    {
      text: "Назад",
      callback_data: "manage_subscription",
    },
  ]);
  const keyboard = {
    reply_markup: {
      resize_keyboard: true,
      inline_keyboard: menu,
    },
    parse_mode: "HTML",
  };
  return keyboard;
};

module.exports = menu;
