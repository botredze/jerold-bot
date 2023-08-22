const Users = require("../../model/Users");
const Subscriptions = require("../../model/Subscriptions");
const Products = require("../../model/Products");
const Logs = require("../../model/Logs");
const { phone } = require("phone");
const tinkoff = require("../../utils/tinkoff");
const stripe = require("../../utils/stripe");

const create_subscription = async (telegram_id, product_callback, bot) => {
  const user = await Users.findOne({ telegramID: telegram_id });
  const product = await Products.findOne({ callback_name: product_callback });

  console.log(user, product, product_callback, bot);

  if (user.phone) {
    if (user.phone[0] === "8") {
      user.phone = user.phone.replace("8", "+7");
    }

    if (user.phone[0] !== "+") {
      user.phone = "+" + user.phone;
    }

    const testPhone = phone(user.phone);

    if (testPhone.isValid) {
      if (testPhone.countryIso2 === "RU") {
        const result = await tinkoff.init(telegram_id, product._id);

        if (result.status) {
          const keyboardForPay = {
            reply_markup: {
              resize_keyboard: true,
              inline_keyboard: [
                [
                  {
                    text: `Оплатить ₽${result.amount}`,
                    web_app: {
                      url: result.url,
                    },
                  },
                ],
                [
                  {
                    text: `Назад`,
                    callback_data: "back_for_pay",
                  },
                ],
              ],
            },
          };
          bot.sendMessage(telegram_id, "Оплатить:", keyboardForPay);
          await Users.updateOne({ telegramID: telegram_id }, { payment_method: "tinkoff" });
          await Logs.create(
            telegram_id,
            "sendMessage",
            "bot",
            { message: "Оплатить:", keyboardForPay },
            user,
            "tinkoff_payment"
          );
        }
        return;
      }
    }
  }

  const params = Buffer.from(`${user.first_name}&${telegram_id}&${product._id}&${product.channel_id}&false`).toString(
    "base64"
  );

  await Users.updateOne({ telegramID: telegram_id }, { data_for_pay: params, payment_method: "stripe" });

  const keyboardForPay = {
    reply_markup: {
      resize_keyboard: true,
      inline_keyboard: [
        [
          {
            text: `Оплатить $${product.price}.00`,
            web_app: {
              url: `${process.env.HOST}/buy?data=${params}`,
            },
          },
        ],
        [
          {
            text: `Назад`,
            callback_data: "back_for_pay",
          },
        ],
      ],
    },
  };
  bot.sendMessage(telegram_id, "Оплатить:", keyboardForPay);

  await Logs.create(
    telegram_id,
    "sendMessage",
    "bot",
    { message: "Оплатить:", keyboardForPay },
    user,
    "stripe_payment"
  );
};

module.exports = create_subscription;
