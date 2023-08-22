const Products = require("../../model/Products");
const Subscriptions = require("../../model/Subscriptions");
const Payments = require("../../model/Payments");

const menu = async (user_id) => {
  try {
    const subscriptions_active = await Subscriptions.find({ user: user_id, status: "active" }).populate("product");

    const payments = await Payments.find({ user: user_id, status: "approved" }).populate({
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

    const products = await Products.find({ is_trial: false });

    if (!subscriptions.length) {
      return {
        reply_markup: {
          resize_keyboard: true,
          inline_keyboard: [
            [
              {
                text: "Моя подписка",
                callback_data: "my_subscription",
              },
            ],
            [
              {
                text: "Оформить подписку",
                callback_data: "package_menu",
              },
            ],
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
    }

    if (subscriptions_active.length && subscriptions_active.length < products.length) {
      return {
        reply_markup: {
          resize_keyboard: true,
          inline_keyboard: [
            [
              {
                text: "Моя подписка",
                callback_data: "my_subscription",
              },
            ],
            [
              {
                text: "Добавить подписку",
                callback_data: "package_menu",
              },
            ],
            [
              {
                text: "Отписаться",
                callback_data: "delete_sub_menu",
              },
            ],
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
    }

    if (subscriptions_active.length && subscriptions_active.length === products.length) {
      return {
        reply_markup: {
          resize_keyboard: true,
          inline_keyboard: [
            [
              {
                text: "Моя подписка",
                callback_data: "my_subscription",
              },
            ],
            [
              {
                text: "Отписаться",
                callback_data: "delete_sub_menu",
              },
            ],
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
    }

    if (subscriptions.length >= products.length) {
      return {
        reply_markup: {
          resize_keyboard: true,
          inline_keyboard: [
            [
              {
                text: "Моя подписка",
                callback_data: "my_subscription",
              },
            ],

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
    }
  } catch (error) {
    console.log(error);
  }
};

module.exports = menu;
