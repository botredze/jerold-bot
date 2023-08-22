require("dotenv").config();
const crm = require("../utils/crm");
const Users = require("../model/Users");
const Products = require("../model/Products");
const Subscriptions = require("../model/Subscriptions");
const Payments = require("../model/Payments");
const RefferalLinks = require("../model/Referral_links");
const Logs = require("../model/Logs");
const bot = require("../bot");
const crypto = require("crypto");
const terminal = process.env.KEY_PROD;
const password = process.env.PASSWORD_TEST;
const axios = require("axios");
const Users_channels = require("../model/Users_channels");
const { messenger } = require("../messsages/Messenger");
const { SUCCESSFUL_PAYMENT } = require("../messsages/event_types");
const helpers = require("../utils/helpers");
const zendesk = require("../crm/zendesk");

const currencyLink = "https://api.tinkoff.ru/v1/currency_rates?from=USD&to=RUB";
const category = "DebitCardsTransfers";

const succeeded = async (body) => {
  try {
    const payment = await Payments.findOne({ payment_id: body.PaymentId }).populate([
      "user",
      "product",
      "subscription"
    ]);

    if (payment) {
      const user = payment.user;
      await Logs.create(null, "payment_info", "tinkoff_payment", body, user, "payment succeeded");
      const date = new Date();
      date.setDate(date.getDate() + payment.product.duration);

      await Payments.findByIdAndUpdate(payment._id, {
        status: "approved",
        paid_at: new Date()
      });

      let newSubEndDate = new Date();
      let auto_renew = true;
      let start_date = new Date();

      const product = payment.product;

      try {
        const { email, phone, name } = user;
        let zendesk_deal_id;
        let zendesk_contract_id;

        const contact = zendesk.searchPerson(email, phone, name, product);

        const deal_data = {
          name: `By Jerold product: ${product.name}`,
          value: product.price,
          contact_id: contact.data.id,
          currency: "Stripe",
          custom_fields: {
            "Название пакета": `Jerold ${product.name}`,
            "Дата покупки": `start_date`,
            "Дата попадания в канал": start_date,
            "Способ оплаты": "Tinkoff",
            "Сумма оплаты": product.price,
            "Дата окончания подписки": newSubEndDate,
            "Дата следующего списания": newSubEndDate,
            "TelegramID": user.telegramID,
            "Возможности кросс-сейл": ["Crypto Fundamental", "Forex Fundamental"]
          },
          meta: {
            type: "deal"
          }
        };
        const zendesk_deal = await zendesk.createDeal(deal_data).catch(async (error) => {
          await Logs.create(user, "crm-error", null, error, null);
        });
        zendesk_deal_id = zendesk_deal.data.id;
        zendesk_contract_id = contact.data.id;
      } catch (error) {
        await Logs.create(user, "crm-error", null, error, null);
      }
      if (product.subscription_type === "trial") {
        auto_renew = false;
        newSubEndDate = calculateDate(product.duration);
      } else if (product.subscription_type === "full") {
        newSubEndDate = calculateDate(product.duration);
      } else if (product.subscription_type === "promo") {
        newSubEndDate = calculateDate(product.duration);
        auto_renew = false;
      }

      await Subscriptions.findByIdAndUpdate(payment.subscription._id, {
        status: "active",
        started_at: payment.subscription.started_at ? payment.subscription.started_at : new Date(),
        current_period_start: new Date(),
        current_period_end: date,
        rebill_id: body.RebillId,
        trial_end: newSubEndDate,
        auto_renew: auto_renew,
        zendesk_deal_id: zendesk_deal_id
      });

      await crm.updateDealAfterPayment(
        payment.crm_deal_id,
        { amount_paid: body.Amount, currency: "rub" },
        payment.subscription._id
      ).catch(async (error) => {
        await Logs.create(null, "payment_info", "crm-error", error, null, "Crm error");
      });

      const updatedUser = await Users.findOneAndUpdate(
        { _id: user._id },
        {
          date_delete_user: null,
          channel_id: payment.product.channel_id,
          send_failed_payment: false,
          referral_program: "true",
          subscription_id: payment.subscription._id,
          payment_method: "tinkoff",
          zendesk_contract_id: zendesk_contract_id
        },
        { new: true }
      );

      if (updatedUser.banned && updatedUser.telegramID) {
        await bot.unbanChatMember(user.channel_id, user.telegramID);
        await Users_channels.createOrUpdate(user._id, payment.product.channel_id);
        await Users.updateOne(
          { _id: user._id },
          {
            banned: false
          }
        );
      }

      if (updatedUser.telegramID) {
        await messenger.trigger(SUCCESSFUL_PAYMENT, updatedUser, product);
      }
      // if (updatedUser.telegramID) {
      //   const keyboardForChat = {
      //     reply_markup: {
      //       resize_keyboard: true,
      //       inline_keyboard: [
      //         [
      //           {
      //             text: `Основное меню`,
      //             callback_data: "back",
      //           },
      //         ],
      //       ],
      //     },
      //   };
      //   bot.sendMessage(
      //     user.telegramID,
      //     `Оплата прошла успешно 🎉!\nКанал ${payment.product.name_view} теперь доступен в основном меню`,
      //     keyboardForChat
      //   );
      // }
    }
  } catch (error) {
    await Logs.create(null, "system_error", "system", error.stack.toString(), null);
  }
};

const createPayment = async (body) => {
  try {
    // Logging payment info
    await Logs.create(null, "payment_info", "tinkoff_payment", body, null, "payment body");

    const { name, phone, email, product_name, newspaper } = body;

    const exchange_rate = await axios.get(currencyLink).then((r) => {
      const rates = r.data.payload.rates;
      const rate = rates.filter((el) => el.category === category)[0];
      return rate.sell + 15;
    }).catch(async (error) => {
      await Logs.create(null, "payment_info", "tinkoff_payment", error, null, "Payment body");
    });

    const product = await Products.findOne({ name: product_name });

    try {

      const lead_data = {
        first_name: name,
        last_name: name,
        email: email,
        phone: phone,
        description: `Jerold ${product.name}`
      };

      const lead = await zendesk.createLead(lead_data);
    } catch (error) {
      await Logs.create(null, "crm_error", "crm", error, null, "LeadCreateError");
    }

    // Проверка истечения срока действия тарифа
    if (product.end_date && product.end_date <= new Date()) {
      await Logs.create(null, "payment_error", "tinkoff_payment", payment_body, null, "Product subscription expired");

      return {
        status: 400,
        body: {
          message: "Product subscription expired"
        }
      };
    }

    const existingTrialSubscriptionList = await Subscriptions.find({
      user: user._id
    });

    if (product.is_trial && existingTrialSubscriptionList.some((trial) => trial.product_id === product.id)) {
      return {
        status: 400,
        body: {
          message: "Trial subscription already in use"
        }
      };
    }

    try {

      const person = await crm.searchPerson(email, phone, name);
      const deal = await crm.createDealFromFront(
        person.id,
        "Tinkoff",
        name,
        email,
        phone,
        product,
        body.utm,
        exchange_rate
      );

      if (!deal.id) {
        await Logs.create(null, "payment_error", "stripe_payment", body, null, "Deal not found");

        return {
          status: 500,
          body: {
            message: "Deal not found"
          }
        };
      }

    } catch (err) {
      await Logs.create(null, "crm_error", "search-person", body, null, "Crm error");
    }

    const user = await Users.findOrCreateByEmail(name, email, phone, null, person.id, newspaper);
    await RefferalLinks.attachLink(body.ref, user._id);

    const hasPreviousSubscription = await Subscriptions.findOne({
      user: user._id,
      product: product._id,
      status: "active"
    });

    if (product.is_trial && hasPreviousSubscription) {
      return {
        status: 400,
        body: {
          message: "Trial subscription already active"
        }
      };
    }

    let amount;
    let subscriptionType;

    if (product.duration === 7) {
      // Trial subscription for 7 days
      amount = product.price * exchange_rate;
      subscriptionType = "trial";
    } else if (product.duration === 30) {
      // Regular subscription for 30 days
      amount = product.price * exchange_rate;
      subscriptionType = "full";
    } else if (product.duration === 90) {
      // Promotional subscription for 90 days
      amount = product.price * exchange_rate;
      subscriptionType = "promo";
    }

    const amount_for_pay = amount * 100;
    const randomOrderId = crypto.randomBytes(10).toString("hex");

    const payment_body = {
      TerminalKey: terminal,
      Amount: amount_for_pay,
      OrderId: randomOrderId,
      NotificationURL: `${process.env.HOST}/payment/tinkoffNotification`,
      SuccessURL: `${process.env.HOST_FRONT}/successful-payment`,
      FailURL: `${process.env.HOST_FRONT}/failed-payment`,
      Recurrent: subscriptionType === "trial" ? "N" : "Y",
      CustomerKey: user._id,
      Receipt: {
        Email: user.email || "",
        Phone: user.phone || "",
        Taxation: "usn_income",
        Items: [
          {
            Name: product.name,
            Quantity: 1,
            Amount: amount_for_pay,
            Price: amount_for_pay,
            Tax: "none",
            PaymentObject: "service",
            PaymentMethod: "prepayment"
          }
        ]
      }
    };

    const { data } = await axios.post("https://securepay.tinkoff.ru/v2/Init", { ...payment_body }).catch(async (error) => {
      await Logs.create(null, "payment_info", "tinkoff_payment", error, null, "Payment body");
    });

    if (data.Success) {
      const payment_data = {
        user: user._id,
        product: product._id,
        amount: amount,
        currency: "rub",
        crm_deal_id: deal.id,
        payment_method: "tinkoff",
        status: "created",
        channel_id: product.channel_id,
        payment_id: data.PaymentId,
        order_id: data.OrderId,
        exchange_rate,
        main_payment: true
      };

      const subscription = await Subscriptions.createSubWithPayment(
        user._id,
        deal.id,
        product._id,
        null,
        "inactive",
        payment_data
      );

      await Logs.create(null, "payment_info", "tinkoff_payment", payment_body, null, "Payment body");

      return {
        status: 200,
        body: {
          deal_id: deal.id,
          url: data.PaymentURL,
          payment_id: data.PaymentId
        }
      };
    } else {
      await Logs.create(null, "payment_error", "tinkoff_payment", body, null, "Payment error");

      return {
        status: 500,
        body: {
          message: "Payment error"
        }
      };
    }
  } catch (error) {
    await Logs.create(null, "payment_error", "tinkoff_payment", body, error, "Payment error");

    return {
      status: 500,
      body: {
        message: "Internal server error"
      }
    };
  }
};

const renewal = async (subscription_id, renewal, payments = true) => {
  try {
    const subscription = await Subscriptions.findById(subscription_id).populate(["user", "product"]);
    const user = subscription.user;
    const product = subscription.product;

    // Получение курса валюты и расчет суммы в рублях
    const exchange_rate = await axios.get(currencyLink).then((r) => {
      const rates = r.data.payload.rates;
      const rate = rates.filter((el) => el.category === category)[0];
      return rate.sell + 15;
    }).catch(async (error) => {
      await Logs.create(null, "payment_info", "tinkoff_payment", error, null, "exchange body");
    });

    const amount = product.price * exchange_rate;
    const amount_for_pay = amount * 100;

    // Генерация случайного идентификатора заказа
    const randomOrderId = crypto.randomBytes(10).toString("hex");

    // Создание объекта платежа
    const payment_body = {
      TerminalKey: terminal,
      Amount: amount_for_pay,
      OrderId: randomOrderId,
      NotificationURL: `${process.env.HOST}/payment/tinkoffNotification`,
      SuccessURL: `${process.env.HOST}/successPayment`,
      FailURL: `${process.env.HOST}/cancel`,
      CustomerKey: user._id,
      Receipt: {
        Email: user.email || "",
        Phone: user.phone || "",
        Taxation: "usn_income",
        Items: [
          {
            Name: product.name,
            Quantity: 1,
            Amount: amount_for_pay,
            Price: amount_for_pay,
            Tax: "none",
            PaymentObject: "service",
            PaymentMethod: "prepayment"
          }
        ]
      }
    };

    if (!payments) {
      payment_body.Recurrent = "Y";
    }

    // Проверка истечения срока действия тарифа
    if (product.end_date && product.end_date <= new Date()) {
      await Logs.create(null, "payment_error", "tinkoff_payment", payment_body, null, "Product subscription expired");

      return {
        status: 400,
        body: {
          message: "Product subscription expired"
        }
      };
    }

    const { data } = await axios.post("https://securepay.tinkoff.ru/v2/Init", { ...payment_body }).catch(async (error) => {
      await Logs.create(null, "payment_info", "tinkoff_payment", error, null, "Payment body");
    });

    if (data.Success) {
      if (renewal && subscription.rebill_id) {
        const input = `${password}${data.PaymentId}${subscription.rebill_id}${terminal}`;
        const token = crypto.createHash("sha256").update(input).digest("hex");

        // Подтверждение платежа для продления подписки
        const charge = await axios.post("https://securepay.tinkoff.ru/v2/Charge", {
          TerminalKey: terminal,
          PaymentId: data.PaymentId,
          RebillId: subscription.rebill_id,
          Token: token
        }).catch(async (error) => {
          await Logs.create(null, "payment_info", "tinkoff_payment", error, null, "Payment body");
        });

        const status = charge.data.Status === "CONFIRMED" ? "approved" : "failed";

        if (status === "approved") {
          const payment_data = {
            user: user._id,
            product: product._id,
            amount: amount,
            currency: "rub",
            crm_deal_id: subscription.crm_deal_id,
            payment_method: "tinkoff",
            status,
            channel_id: product.channel_id,
            payment_id: data.PaymentId,
            order_id: data.OrderId,
            exchange_rate,
            main_payment: false,
            subscription: subscription_id
          };

          const payment = await Payments.create(payment_data);
          await Logs.create(null, "payment_info", "tinkoff_payment", payment, user, "payment renewal body");

          return {
            status: 202,
            body: { user }
          };
        }

        const payment_data = {
          user: user._id,
          product: product._id,
          amount: amount,
          currency: "rub",
          crm_deal_id: subscription.crm_deal_id,
          payment_method: "tinkoff",
          status: "created",
          subscription: subscription._id,
          channel_id: product.channel_id,
          payment_id: data.PaymentId,
          order_id: data.OrderId,
          exchange_rate,
          main_payment: false
        };

        const payment = await Payments.create(payment_data);

        return {
          status: 200,
          body: { deal: deal.id, url: data.PaymentURL, payment_id: payment._id, user }
        };
      }

      const payment_data = {
        user: user._id,
        product: product._id,
        amount: amount,
        currency: "rub",
        crm_deal_id: subscription.crm_deal_id,
        payment_method: "tinkoff",
        status: "created",
        subscription: subscription._id,
        channel_id: product.channel_id,
        payment_id: data.PaymentId,
        order_id: data.OrderId,
        exchange_rate,
        main_payment: false
      };

      const existingTrialSubscriptionList = await Subscriptions.find({
        user: user._id
      });

      if (existingTrialSubscriptionList.some((trial) => trial.product_id === product.id)) {
        return {
          status: 400,
          body: {
            message: "Trial subscription already in use"
          }
        };
      }

      const payment = await Payments.create(payment_data);

      await Logs.create(null, "payment_info", "tinkoff_payment", payment, user, "payment renewal body");

      return {
        status: 200,
        body: { amount, url: data.PaymentURL, payment_id: payment._id }
      };
    } else {
      await Logs.create(null, "payment_error", "tinkoff_payment", data, user, "Tinkoff renewal error");

      return {
        status: 500,
        body: {
          message: "Server Error"
        }
      };
    }
  } catch (error) {
    await Logs.create(null, "system_error", "system", error.stack.toString(), null);
  }
};


const failed = async (body) => {
  try {
    const payment = await Payments.findOne({ payment_id: body.PaymentId }).populate([
      "user",
      "product",
      "subscription"
    ]);

    if (payment) {
      const user = payment.user;
      await Logs.create(null, "payment_info", "tinkoff_payment", body, user, "payment failed");

      await Payments.findByIdAndUpdate(payment._id, {
        status: "failed"
      });

      await Subscriptions.findByIdAndUpdate(payment.subscription, {
        status: "inactive"
      });

      if (user.telegramID) {
        await crm.setDateCancelSub(user.telegramID, payment.crm_deal_id).catch(async (error) => {
          await Logs.create(null, "crm-error", "tinkoff_payment", error, null, "create set error");
        });

        if (!payment.send_notification) {
          const user_payments = await Payments.find({ user: user._id, status: "approved" });
          const data = await renewal(payment.subscription._id, false, Boolean(user_payments.length))
            .catch(async (error) => {
              await Logs.create(null, "payment_info", "renewal error", error, null, "Renewal sub error");
            });

          if (data.status === 200) {
            const date = new Date();
            date.setDate(date.getDate() + 3);

            const keyboardForPay = {
              reply_markup: {
                resize_keyboard: true,
                inline_keyboard: [
                  [
                    {
                      text: `Оплатить $${data.body.amount.toFixed(1)}`,
                      web_app: {
                        url: data.body.url
                      }
                    }
                  ],
                  [
                    {
                      text: `Назад`,
                      callback_data: "back_for_pay"
                    }
                  ]
                ]
              }
            };

            const result = await bot
              .sendMessage(
                user.telegramID,
                "Оплата не была осуществлена, просим оплатить услугу в течение трех дней",
                keyboardForPay
              ).catch(async (error) => {
                error = false;
                await Logs.create(null, "bot-error", error, null);
              });

            if (result) {
              await Payments.findByIdAndUpdate(payment._id, {
                send_notification: true
              });
              await Logs.create(user.telegramID, "sendMessage", "bot", result, user, "failedPayment");
            }
            await Subscriptions.findByIdAndUpdate(payment.subscription, {
              date_delete_user: date,
              status: "past_due"
            });

            await Users.updateOne(
              { telegramID: user.telegramID },
              { send_failed_payment: true, payment_method: "tinkoff" }
            );
          }
        }
      }
    }
  } catch (error) {
    console.log(error);
    await Logs.create(null, "system_error", "system", error.stack.toString(), null);
  }
};

const calculateDate = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

module.exports = {
  createPayment,
  succeeded,
  failed,
  renewal
};
