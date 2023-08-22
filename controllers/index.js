require("dotenv").config();
const fs = require("fs");
const MD5 = require("crypto-js/md5");
const encoding = require("encoding");
const Users = require("../model/Users");
const Logs = require("../model/Logs");
const Subscriptions = require("../model/Subscriptions");
const WaitingList = require("../model/WaitingList");
const Products = require("../model/Products");
const bot = require("../bot");
const stripe = require("../utils/stripe");
const crm = require("../utils/crm");
const canvas = require("../utils/canvas");
const addElementToQueue = require("../utils/cron").addElementToQueue;
const promoMessages = require("../public/promo/text.json");
const tinkoff = require("../utils/tinkoff");
const path = require("path");
const geoip = require("geoip-lite");

const packages = [
  {
    nameView: "Essential Forex",
    name: "Essential",
    description:
      "Помогу вашему алгоритму определить направление движения цены.\nУкажу правильное направление и покажу, когда НУЖНО заходить в рынок.",
    priceShow: "79$/мес",
    price: "79",
    channel_id: "-1001748848136",
  },
];

function getEncodetDataFromArray(array, folder) {
  const data = [];
  array.forEach((item) => {
    const md5Name = MD5(item).toString();

    if (fs.existsSync(`${folder}/${md5Name}.txt`)) return;

    const resultBuffer = encoding.convert(item, "UTF-8", "UTF-16BE");
    let string = Buffer.from(resultBuffer, "utf8").toString();
    string = string.replace(/[^a-zа-яё0-9\s,;:.]/gi, " ").trim();

    if (!Boolean(string)) return;

    let str = "";
    if (string.match(/(\d{4})\.(\d{2})\.(\d{2}) (\d{2})\:(\d{2})\:(\d{2})/gi)) {
      str = string
        .replace(/(\d{4})\.(\d{2})\.(\d{2}) (\d{2})\:(\d{2})\:(\d{2})/gi, (value) => {
          return new Date(`${value} UTC`).toISOString();
        })
        .split(";")
        .join(" ");
    } else if (string.match(/\d{4}.\d{2}.\d{2} \d{2}:\d{2}/gi)) {
      str = string
        .replace(/\d{4}.\d{2}.\d{2} \d{2}:\d{2}/gi, (value) => {
          return new Date(`${value} UTC`).toISOString();
        })
        .split(";")
        .join(" ");
    } else {
      str = string
        .replace(/(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})/gi, ($1, $2, $3, $4, $5, $6) => {
          return new Date(`${$4}.${$3}.${$2} ${$5}:${$6} UTC`).toISOString();
        })
        .split(";")
        .join(" ");
    }

    fs.writeFile(`${folder}/${md5Name}.txt`, str, (err) => {
      if (err) {
        console.error(err);
      }
    });

    data.push(str);
  });

  return data;
}

function getSortedDataByDate(data) {
  const sortData = data.sort((a, b) => {
    const pattern = /\d{4}.\d{2}.\d{2}T\d{2}:\d{2}:\d{2}/;
    a = new Date(a.match(pattern)[0]);
    b = new Date(b.match(pattern)[0]);
    return a < b ? -1 : a > b ? 1 : 0;
  });
  return sortData;
}

const getValue = async (req, res) => {
  try {
    if (!Object.keys(req.body).length) {
      res.status(400).send({ message: "Invalid Data" });
      return;
    }

    const codetArray = ("\x00" + Object.keys(req.body)[0].slice(2)).split("\n");
    const data = getEncodetDataFromArray(codetArray, "data");

    if (data.length) {
      const sortData = getSortedDataByDate(data);
      const users = await Users.find({});
      for (const string of sortData) {
        const arr = string.split(" ");
        let inputParams = {};

        if (arr.length <= 8) {
          inputParams = {
            short: false,
            direction_top: arr[1] == "Up" ? true : false,
            symbol: arr[0],
            openPrice: Number(arr[5]).toFixed(3),
            type: arr[2],
            date: `${arr[3]} ${arr[4].slice(0, -3)}`,
            stopLoss: Number(arr[6]).toFixed(3),
            profit: Number(arr[7]).toFixed(3),
          };
        } else {
          inputParams = {
            short: false,
            direction_top: arr[2] == "Up" ? true : false,
            symbol: `${arr[0]}${arr[1]}`,
            openPrice: Number(arr[6]).toFixed(3),
            type: arr[3],
            date: `${arr[4]} ${arr[5].slice(0, -3)}`,
            stopLoss: Number(arr[7]).toFixed(3),
            profit: Number(arr[8]).toFixed(3),
          };
        }
        let responseImage = canvas.generateImage(
          inputParams.short,
          inputParams.direction_top,
          inputParams.symbol,
          inputParams.openPrice,
          inputParams.type,
          inputParams.date,
          inputParams.stopLoss,
          inputParams.profit
        );

        await bot.sendPhoto(-1001650219078, responseImage);
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.status(500);
  }
};

const getValueSecond = async (req, res) => {
  try {
    if (!Object.keys(req.body).length) {
      res.status(400).send({ message: "Invalid Data" });
      return;
    }

    const codetArray = ("\x00" + Object.keys(req.body)[0].slice(2)).split("\n");
    const data = getEncodetDataFromArray(codetArray, "data2");
    console.log("length decode data>>>", data.length, new Date().toISOString());
    if (data.length) {
      const sortData = getSortedDataByDate(data);

      for await (let element of sortData) {
        const responseImage = canvas.returnShortImage(element);
        await bot
          .sendPhoto("-1001748848136", responseImage)
          .catch((err) => addElementToQueue({ channel_id: "-1001748848136", string: element }));
        await bot
          .sendPhoto("-1001730654964", responseImage)
          .catch((err) => addElementToQueue({ channel_id: "-1001730654964", string: element }));
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.status(500);
  }
};

const generateCanvas = async (req, res) => {
  let inputParams = {
    short: false,
    direction_top: true,
    symbol: "EUR/USD",
    openPrice: "1.0098",
    type: "Sell Limit",
    date: "31.05.2022 09:26",
    stopLoss: "1.0767",
    profit: "1.0692",
  };

  let responseImage = canvas.generateImage(
    inputParams.short,
    inputParams.direction_top,
    inputParams.symbol,
    inputParams.openPrice,
    inputParams.type,
    inputParams.date,
    inputParams.stopLoss,
    inputParams.profit
  );

  await bot.sendPhoto(-1001650219078, responseImage);
  res.sendStatus(200);
};

const getInntentToFront = async (req, res) => {
  try {
    const { user_name, telegram_id, package_id, channel_id, payment_intent } = req.body;

    const user = await Users.findOne({ telegramID: telegram_id });
    const product = await Products.findById(package_id);

    const subscriptions = await Subscriptions.find({ user: user._id, product: package_id, status: "active" });

    if (subscriptions.length) {
      bot.sendMessage(telegram_id, `Вы уже купили подписку ${product.name_view}`, {
        reply_markup: {
          resize_keyboard: true,
          inline_keyboard: [
            [
              {
                text: `Назад`,
                callback_data: "back_for_pay",
              },
            ],
          ],
        },
      });
      res.send({
        clientSecret: false,
      });
      return;
    }

    if (payment_intent && payment_intent !== "false") {
      const intent = await stripe.getIntent(payment_intent);
      res.send({
        clientSecret: intent.client_secret,
      });
      return;
    }

    const paymentIntent = await stripe.createSubscription(user_name, telegram_id, package_id);
    const intent = await stripe.getIntent(paymentIntent.id);

    res.send({
      clientSecret: intent.client_secret,
    });
  } catch (error) {
    console.log(error);
    await Logs.create(null, "system_error", "system_payment", error.stack.toString(), null);
    res.send({
      clientSecret: "error",
    });
  }
};

const getPageBuy = async (req, res) => {
  const { data } = req.query;
  if (data) {
    const params = Buffer.from(data, "base64").toString().split("&");
    if (params.length > 5) {
      const user = await Users.findOne({ telegramID: params[1] });
      const subscriptions = await Subscriptions.findOne({ user: user._id, product: params[2], status: "active" });
      const date_end = new Date(params[5]);

      if (new Date() >= date_end && !subscriptions.length) {
        return res.render("link_inactive");
      }
    }
  }

  res.render("index");
};
const getSuccessPage = async (req, res) => {
  res.render("success");
};
const getCancelPage = async (req, res) => {
  res.render("cancel");
};

const getInstriction = async (req, res) => {
  res.render("instruction");
};

const sendPromo = async (req, res) => {
  res.status(200).send({ message: "ok" });
};

const cancelSubscription = async (req, res) => {
  const subscription = req.body.data.object;

  if (subscription.metadata?.telegram_id) {
    const allActiveSubscription = await stripe.getSubscriptionList({
      customer: subscription.customer,
    });

    const jeroldSubscription = allActiveSubscription.filter((el) => el.description.includes("Jerold"));

    if (jeroldSubscription.length) {
      const user = await Users.findOne({ telegramID: subscription.metadata.telegram_id });
      await crm.setDateCancelSub(user.telegramID);
      if (!user.banned) {
        await Subscriptions.updateOne(
          { subscription_id_service: subscription.id },
          {
            status: "inactive",
            who_canceled: "system",
            canceled_at: new Date(),
            date_delete_user: new Date(subscription.canceled_at * 1000),
          }
        );
      }
    }
  }
  res.sendStatus(200);
};

const tinkoffNotification = async (req, res) => {
  const { OrderId, Success, Amount, Status } = req.body;
  const telegramID = OrderId.split("/")[0];
  const user = await Users.findOne({ telegramID });
  console.log("Tinkoff Payment", telegramID, req.body);

  if (Success) {
    if (Status === "CONFIRMED") {
      const date = new Date();
      date.setDate(date.getDate() + 30);

      await Users.updateOne(
        { telegramID },
        {
          date_delete_user: null,
          channel_id: "-1001748848136",
          send_failed_payment: false,
          subscription_id: OrderId,
          payment_method: "tinkoff",
          next_payment: date,
          referral_program: "true",
        }
      );

      await crm.createDeals(
        "Jerold / Essential / Forex",
        Number(Amount) / 100,
        "RUB",
        user.username,
        user.email,
        user.phone,
        "Tinkoff"
      );

      if (user.banned) {
        await bot.unbanChatMember(user.channel_id, telegramID);
        await Users.updateOne(
          { telegramID },
          {
            banned: false,
          }
        );
      }

      const inviteLink = await bot.createChatInviteLink(process.env.CHANNEL_ID, { member_limit: 1 });

      const keyboardForChat = {
        reply_markup: {
          resize_keyboard: true,
          inline_keyboard: [
            [
              {
                text: `Перейти в канал с сигналами`,
                url: inviteLink.invite_link,
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
      bot.sendMessage(telegramID, "Оплата успешна!", keyboardForChat);
      res.status(200).send("OK");

      return;
    }
    res.status(200).send("OK");
    return;
  }

  const result = await tinkoff.init(telegramID, packages[0]);

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
    bot.sendMessage(telegramID, "Оплата не была осуществлена", keyboardForPay);
  }
  res.status(200).send("OK");
};

const refundedStripe = async (req, res) => {
  const body = req.body.data.object;
  const customer = await stripe.getCustomer(body.customer);

  if (customer.metadata?.telegram_id) {
    const user = await Users.findOne({ telegramID: customer.metadata.telegram_id });
    console.log("Refunded", user.telegramID);
    await bot
      .banChatMember(user.channel_id, user.telegramID)
      .catch((err) => console.log("Refunded Error", user.channel_id, err));

    await Users.updateOne(
      { telegramID: user.telegramID },
      {
        channel_id: null,
        banned: true,
        send_failed_payment: null,
        data_for_pay: null,
        date_delete_user: null,
        payment_method: null,
        next_payment: null,
        subscription_id: null,
      }
    );
    await bot
      .sendMessage(user.telegramID, "Вы были удалены из канала")
      .catch((err) => console.log("Refunded Error", user.channel_id, err));
    await crm.setRefunded(user.telegramID);
  }

  res.sendStatus(200);
};

const analytics = async (req, res) => {
  const token = process.env.ANALYTIC_TOKEN;
  const auth_token = req.headers.authorization;
  if (!auth_token || token !== auth_token) {
    return res.status(401).send({ message: "Unauthorized" });
  }
  switch (req.params.type) {
    case "deal":
      const deals = await crm.getAllDealsAnalytics();
      res.status(200).send({ deals });
      break;
    case "person":
      const persons = await crm.getAllPersonAnalytics();
      res.status(200).send({ persons });
      break;
    default:
      console.log(`Unhandled event type ${req.params.type}`);
      res.status(200).send(`Unhandled event type ${req.params.type}`);
      break;
  }
  // console.log(req.query);

  // if (!req.query.email) {
  //   return res.status(400).send({ message: "Bad Request" });
  // }
  // const { email } = req.query;
  // const lead = await crm.findByEmail(email);
};

const getCountry = async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const geo = geoip.lookup(ip);

  let language = 'EN';
  if (!geo || !['US', 'CA', 'GB'].includes(geo.country)) {
    language = 'RU';
  }

  res.send(language);
}

const waitList = async (req, res) => {
  const { phone, email } = req.body;

  if (!phone || !email) {
    return res.status(400).json({ error: 'Требуется указать телефон и электронную почту.' });
  }

  WaitingList.create({ phone, email })
    .then(() => {
      res.status(200).json({ message: 'Данные успешно сохранены.' });
    })
    .catch(err => {
      console.error('Ошибка при сохранении данных:', err);
      return res.status(500).json({ error: 'Произошла ошибка при сохранении данных.' });
    });
};

module.exports = {
  getValue,
  getValueSecond,
  generateCanvas,
  getPageBuy,
  getSuccessPage,
  getCancelPage,
  getInntentToFront,
  getInstriction,
  sendPromo,
  cancelSubscription,
  tinkoffNotification,
  refundedStripe,
  analytics,
  getCountry,
  waitList
};
