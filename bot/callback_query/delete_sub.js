const Users = require("../../model/Users");
const Subscriptions = require("../../model/Subscriptions");
const Payments = require("../../model/Payments");
const Notifications = require("../../model/Notifications");
const Products = require("../../model/Products");
const Logs = require("../../model/Logs");
const menu = require("../keyboard/product_menu_delete_sub");
const tinkoff = require("../../utils/tinkoff");
const crm = require("../../utils/crm");
const stripe = require("../../utils/stripe");

const change_notification = async (user, product, date) => {
  const notifications = await Notifications.find({ user: user._id, product: product._id, type: "payment_succeeded" });

  if (notifications.length) {
    await Notifications.deleteMany({ user: user._id, product: product._id, type: "payment_succeeded" });
  }

  await Notifications.create({
    telegram_id: user.telegramID,
    product: product._id,
    date_send: date,
    text: `Эхх, твоя подписка на ${product.name_view} закончилась. 😢\n\nЧтобы оформить подписку на следующий месяц, нажми на кнопку "Оформить подписку" 📲\n\nНе упускай возможности, которые тебе предоставляет жизнь! 🌈`,
    keyboard: {
      reply_markup: {
        resize_keyboard: true,
        inline_keyboard: [
          [
            {
              text: "Оформить подписку",
              callback_data: "package_menu",
            },
          ],
        ],
      },
      parse_mode: "HTML",
    },
    type: "payment_succeeded",
  });
};

const delete_sub = async (id, bot, selected = null) => {
  const user = await Users.findOne({ telegramID: id });
  const subscriptions = await Subscriptions.find({ user: user._id, status: "active" }).populate("product");

  if (subscriptions.length > 1 && !selected) {
    const products = subscriptions.map((el) => el.product);
    const keyboard = await menu(products);
    await bot.sendMessage(id, "Выбери пакет, на который ты хочешь отменить подписку:", keyboard);
    return;
  }

  const product = await Products.findOne({ callback_name: selected });
  const subscription = selected
    ? subscriptions.filter((el) => el.product.callback_name === selected)[0]
    : subscriptions[0];

  if (user.payment_method === "tinkoff") {
    await Subscriptions.updateOne(
      { _id: subscription._id },
      {
        status: "canceled",
        who_canceled: "user",
        canceled_at: new Date(),
        date_delete_user: subscription.current_period_end || new Date(),
      }
    );

    await crm.setDateCancelSub(user.telegramID, subscription.crm_deal_id, true);

    await bot.sendMessage(
      id,
      `Подписка отменена и списаний больше не будет 🙌 Помоги нам стать лучше 🙏 Выбери ниже причину по которой ты от нас уходишь👇`,
      {
        reply_markup: {
          resize_keyboard: true,
          inline_keyboard: [
            [
              {
                text: `Не понимаю, как пользоваться`,
                callback_data: `delete_answer_1_${subscription.crm_deal_id}`,
              },
            ],
            [
              {
                text: `Не хватает знаний в трейдинге`,
                callback_data: `delete_answer_2_${subscription.crm_deal_id}`,
              },
            ],
            [
              {
                text: `Jerold мне не помог`,
                callback_data: `delete_answer_3_${subscription.crm_deal_id}`,
              },
            ],
            [
              {
                text: `Другая`,
                callback_data: `delete_answer_another_${subscription.crm_deal_id}`,
              },
            ],
          ],
        },
      }
    );

    await Logs.create(
      id,
      "sendMessage",
      "bot",
      { message: `Подписка ${product.name_view} успешно отменена` },
      user,
      "delete_sub"
    );
    return;
  }

  const resp = await stripe.cancelSubscription(subscription.subscription_id_service, user);

  if (resp) {
    await crm.setDateCancelSub(user.telegramID, subscription.crm_deal_id, true);

    await Subscriptions.updateOne(
      { _id: subscription._id },
      {
        status: "canceled",
        who_canceled: "user",
        canceled_at: new Date(),
      }
    );

    await bot.sendMessage(
      id,
      `Подписка отменена и списаний больше не будет 🙌 Помоги нам стать лучше 🙏 Выбери ниже причину по которой ты от нас уходишь👇`,
      {
        reply_markup: {
          resize_keyboard: true,
          inline_keyboard: [
            [
              {
                text: `Не понимаю, как пользоваться`,
                callback_data: `delete_answer_1_${subscription.crm_deal_id}`,
              },
            ],
            [
              {
                text: `Не хватает знаний в трейдинге`,
                callback_data: `delete_answer_2_${subscription.crm_deal_id}`,
              },
            ],
            [
              {
                text: `Jerold мне не помог`,
                callback_data: `delete_answer_3_${subscription.crm_deal_id}`,
              },
            ],
            [
              {
                text: `Другая`,
                callback_data: `delete_answer_another_${subscription.crm_deal_id}`,
              },
            ],
          ],
        },
      }
    );

    await Logs.create(
      id,
      "sendMessage",
      "bot",
      { message: `Подписка ${product.name_view} успешно отменена` },
      user,
      "delete_sub"
    );
  } else {
    await Logs.create(id, "sendMessage", "bot", { message: `Подписка не найдена` }, user, "delete_sub");
    await bot.sendMessage(id, "Подписка не найдена", {
      reply_markup: {
        resize_keyboard: true,
        inline_keyboard: [
          [
            {
              text: `Назад`,
              callback_data: "delete_sub_menu",
            },
          ],
        ],
      },
    });
  }
};

module.exports = delete_sub;
