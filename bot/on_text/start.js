require("dotenv").config();
const Users = require("../../model/Users");
const Subscriptions = require("../../model/Subscriptions");
const Payments = require("../../model/Payments");
const Products = require("../../model/Products");
const Logs = require("../../model/Logs");
const Notifications = require("../../model/Notifications");
const crm = require("../../utils/crm");
const fs = require("fs").promises;
const helloText =
  "Привет!\nЯ - Jerold\nПерсональный помощник профессиональных трейдеров, созданный на базе ИИ и авторского научного проекта";

const mainKeyboard = require("../keyboard/main");
const { messenger } = require("../../messsages/Messenger");
const { SUCCESSFUL_PAYMENT } = require("../../messsages/event_types");

const create_notifications = async (telegram_id, product) => {
  const notifications = await Notifications.find({ telegram_id });

  if (!notifications.length) {
    const messages = await fs.readFile(`public/notifications/${product}.json`).then((data) => JSON.parse(data));

    for await (let message of Object.keys(messages)) {
      const el = messages[message];

      let date = new Date();
      if (el.hour) {
        date.setHours(date.getHours() + el.hour);
      }

      if (el.day) {
        date.setDate(date.getDate() + el.day);
      }
      if (el.keyboard_type === "buy" && el.keyboard_life) {
        const user = await Users.findOne({ telegramID: telegram_id });
        const product_promo = await Products.findOne({ _id: el.product });

        if (user && product_promo) {
          let date_promo = new Date();
          date_promo.setHours(date_promo.getHours() + el.keyboard_life);

          const params = Buffer.from(
            `${user.first_name}&${telegram_id}&${product_promo._id}&${
              product_promo.channel_id
            }&false&${date_promo.toISOString()}`
          ).toString("base64");

          el.keyboard = {
            reply_markup: {
              resize_keyboard: true,
              inline_keyboard: [
                [
                  {
                    text: "Оплатить",
                    web_app: {
                      url: `${process.env.HOST}/buy?data=${params}`,
                    },
                  },
                ],
              ],
            },
            parse_mode: "HTML",
          };
        }
      }

      await Notifications.create({
        telegram_id,
        date_send: date,
        text: el.text,
        keyboard: el.keyboard,
        type: "notification",
      });
    }
  }
};

const start = async (msg, bot) => {
  try {
    const { id, is_bot, username, first_name, language_code } = msg.from;
    const user_by_id = await Users.findOne({ telegramID: id });

    const payment_id = msg.text.slice(7);
    if (payment_id) {
      const payment = await Payments.findOne({ payment_id }).populate(["user", "subscription", "product"]);

      if (payment) {
        // await create_notifications(id, payment.product.callback_name);
        const user = payment.user;
        console.log("_____USER________", user);
        const subscription = payment.subscription;
        const person = await crm.startBotWithCrm(subscription.crm_deal_id, id);

        if (person) {
          await Users.findByIdAndUpdate(user._id, {
            telegramID: id,
            is_bot,
            first_name: first_name || person.name,
            username,
            language_code,
            phone: person.phone[0].value,
            email: person.email[0].value,
          });

          const keyboard = await mainKeyboard(user._id, bot);
          await messenger.setBot(bot).trigger(SUCCESSFUL_PAYMENT, user, payment.product, keyboard);
          // await bot.sendMessage(id, helloText, keyboard);

          // if (!user_by_id) {
            // await create_notifications(id, payment.product.callback_name);
          // }

          return;
        } else {
          await Logs.create(null, "system_error", "system", "Bot start, person not found", null);
        }
      }
    } else {
      if (user_by_id) {
        const keyboard = await mainKeyboard(user_by_id._id, bot);
        Logs.create(user_by_id.telegramID, 'start_response_keyboard', 'system', keyboard, user_by_id);
        bot.sendMessage(id, helloText, keyboard);
      }
    }
  } catch (error) {
    console.log(error);
  }
};

module.exports = start;
