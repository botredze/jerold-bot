const Users = require("../../model/Users");
const subscription_menu = require("../keyboard/subscription_menu");

const manageSubscriptionMenu = async (id, bot) => {
  const user = await Users.findOne({ telegramID: id });
  const keyboard = await subscription_menu(user);
  await bot.sendMessage(id, "Меню управления подпиской", keyboard);
};

module.exports = manageSubscriptionMenu;
