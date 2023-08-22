const products_menu = require("../keyboard/products_menu");
const Users = require("../../model/Users");
const Subscriptions = require("../../model/Subscriptions");
const Products = require("../../model/Products");
const Payments = require("../../model/Payments");
const _ = require("lodash");

const create = async (id, bot) => {
  try {
    const user = await Users.findOne({ telegramID: id });
    const payments = await Payments.find({ user: user._id, status: "approved" }).populate({
      path: "subscription",
      populate: {
        path: "product",
      },
    });

    const payments_actual = payments.filter((el) => {
      if (el.subscription.current_period_end > new Date()) {
        return el;
      }
    });

    const subscriptions = payments_actual.map((el) => el.subscription);

    const currentDate = new Date();

    const products = await Products.find({
      is_trial: false,
      is_visible: true,
    });

    const product_for_buy = _.filter(products, (el) => {
        const isSubscribed = _.find(subscriptions, { product: { stripe_product_id: el.stripe_product_id }})
        return !isSubscribed
    });

    const keybord = await products_menu(product_for_buy);

    await bot.sendMessage(id, "Меню выбора пакета", keybord);
  } catch (error) {
    console.log(error);
  }
};

module.exports = create;
