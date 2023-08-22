require("dotenv").config();
const crm = require("../utils/crm");
const Users = require("../model/Users");
const Products = require("../model/Products");
const Subscriptions = require("../model/Subscriptions");
const Payments = require("../model/Payments");
const RefferalLinks = require("../model/Referral_links");
const Logs = require("../model/Logs");
const Notifications = require("../model/Notifications");
const Users_channels = require("../model/Users_channels");
const bot = require("../bot");
const stripe = require("stripe")(process.env.STRIPE_PROD);
const validator = require("validator");
const fs = require("fs").promises;
const { phone } = require("phone");
const {
  FIRST_FAILED_PAYMENT,
  SECOND_FAILED_PAYMENT,
  THIRD_FAILED_PAYMENT,
  SUCCESSFUL_PAYMENT
} = require("../messsages/event_types");
const { messenger } = require("../messsages/Messenger");
const moment = require("moment");
const zendesk = require("../crm/zendesk");

const validate = (data) => {
  if (typeof data.name !== "string") {
    return { status: 0, message: "name not valid" };
  }

  if (!phone(data.phone).isValid) {
    return { status: 0, message: "phone not valid" };
  }

  if (!validator.isEmail(data.email)) {
    return { status: 0, message: "email not valid" };
  }

  if (!validator.isCreditCard(data.cardNumber)) {
    return { status: 0, message: "card not valid" };
  }

  if (!validator.isCreditCard(data.cardNumber)) {
    return { status: 0, message: "card not valid" };
  }

  if (!validator.isNumeric(data.cvv)) {
    return { status: 0, message: "cvv not valid" };
  }

  if (validator.isEmpty(data.validity)) {
    return { status: 0, message: "validity not valid" };
  }

  return { status: 1, message: "" };
};
// not_used
// const create_notifications_failed = async (user, product, keyboard) => {
//   const messages = await fs
//     .readFile(`public/notifications/payment/failed/${product.name}.json`)
//     .then((data) => JSON.parse(data));
//
//   for await (let message of Object.keys(messages)) {
//     const el = messages[message];
//
//     let date = new Date();
//
//     if (el.hour) {
//       date.setHours(date.getHours() + el.hour);
//     }
//
//     if (el.day) {
//       date.setDate(date.getDate() + el.day);
//     }
//
//     await Notifications.create({
//       telegram_id: user.telegramID,
//       product,
//       date_send: date,
//       text: el.text,
//       keyboard,
//       type: "payment_failed",
//     });
//   }
// };
//
// const create_notifications_succeeded = async (user, product) => {
//   const messages = await fs
//     .readFile(`public/notifications/payment/succeeded/${product.name}.json`)
//     .then((data) => JSON.parse(data));
//
//   for await (let message of Object.keys(messages)) {
//     const el = messages[message];
//
//     let date = new Date();
//
//     if (el.hour) {
//       date.setHours(date.getHours() + el.hour);
//     }
//
//     if (el.day) {
//       date.setDate(date.getDate() + el.day);
//     }
//
//     await Notifications.create({
//       telegram_id: user.telegramID,
//       product: product._id,
//       date_send: date,
//       text: el.text,
//       type: "payment_succeeded",
//     });
//   }
// };

const createPayment = async (body) => {
  try {
    await Logs.create(null, "payment_info", "stripe_payment", body, null, "payment body");

    let paymentMethod = body.paymentMethod;
    const { name, phone, email, product_name, newspaper, utm } = body;

    if (body.card) {
      const validateResult = validate(body);
      if (!validateResult.status) {
        return {
          status: 200,
          body: validateResult
        };
      }
      const { cardNumber, cvv, validity } = body;
      const exp = validity.split("/");
      try {
        paymentMethod = await stripe.paymentMethods.create({
          type: "card",
          card: {
            number: cardNumber,
            exp_month: exp[0],
            exp_year: exp[1],
            cvc: cvv
          }
        });
      } catch (e) {
        await Logs.create(null, "create_payment_error", "stripe", e, null);
      }
    }

    const product = await Products.findOne({ name: product_name });

    if (!product) {
      await Logs.create(null, "payment_error", "stripe_payment", body, null, "Product not found");
      return {
        status: 500,
        body: {
          message: "Product not found"
        }
      };
    }

    let customer = await stripe.customers
      .search({
        query: `email:\'${email}\'`
      })
      .then((r) => r.data[0])
      .catch(async (e) => await Logs.create(null, "payment_error", "stripe_payment", body, null, "Search by email error"));

    if (customer && customer.currency === "usd" && paymentMethod) {
      await stripe.paymentMethods.attach(paymentMethod.id, { customer: customer.id }).catch(async (e) => {
        await Logs.create(null, "stripe_error", "stripe_payment", e, null, "Error when attach");
      });
    } else {
      customer = await stripe.customers.create({
        name,
        phone,
        email,
        payment_method: paymentMethod ? paymentMethod.id : null
      }).catch(async (e) => {
        console.log(e);
        await Logs.create(null, "stripe_error", "stripe_payment", e, null, "Error while creating new customer");
      });
    }

    const stripe_product = await stripe.products.retrieve(product.stripe_product_id).catch(async (e) => {
      await Logs.create(null, "stripe_error", "stripe_payment", e, null, "Error while retrieving");
    });

    const person = await crm.searchPerson(email, phone, name).catch(async (e) => {
      await Logs.create(null, "crm_error", "crm", e, null, "searchPerson");
    });
    const deal = await crm.createDealFromFront(person.id, "Stripe", name, email, phone, product, body.utm).catch(
      async (e) => {
        await Logs.create(null, "crm_error", "crm", e, null, "createDealFromFront");
      }
    );
    try {
      const lead_data = {
        last_name: name,
        first_name: name,
        email: email,
        phone: phone,
        description: `Jerold ${product.name}`
      };
      const lead = await zendesk.createLead(lead_data);
    } catch (error) {
      await Logs.create(null, "crm_error", "crm", error, null, "LeadCreateError");
    }

    if (!deal.id) {
      await Logs.create(null, "payment_error", "stripe_payment", body, null, "Deal not found");

      return {
        status: 500,
        body: {
          message: "Deal not found"
        }
      };
    }

    const subscription_data = {
      customer: customer.id,
      items: [{ price: stripe_product.default_price }],
      default_payment_method: paymentMethod.id,
      payment_behavior: "allow_incomplete",
      description: `Jerold / Fundamental / Forex`,
      payment_settings: {
        payment_method_types: ["card"],
        payment_method_options: {
          card: {
            mandate_options: {
              description: `Jerold ${product_name}`
            },
            request_three_d_secure: "any"
          }
        }
      },
      expand: ["latest_invoice.payment_intent"]
    };

    if (product.is_trial) {
      subscription_data.add_invoice_items = [{ price: product.stripe_price_id }];
      subscription_data.trial_period_days = product.duration;
    }

    const subscription_stripe = await stripe.subscriptions.create(subscription_data).catch(async (e) => {
      await Logs.create(null, "payment_info", "stripe_payment", subscription_data, null, "creating subscription");
    });

    const invoice = await stripe.invoices.retrieve(subscription_stripe.latest_invoice.id).catch(async (e) => {
      await Logs.create(null, "payment_info", "stripe_payment", subscription_data, null, "retrieving invoice");
    });

    await Logs.create(null, "payment_info", "stripe_payment", invoice, null, "payment invoice");

    const paymentIntent = await stripe.paymentIntents
      .retrieve(subscription_stripe.latest_invoice.payment_intent.id)
      .catch(async (e) => {
        await Logs.create(null, "payment_info", "stripe_payment", subscription_data, null, "retrieving paymentIntents");
      });

    await Logs.create(null, "payment_info", "stripe_payment", paymentIntent, null, "payment intent");

    const user = await Users.findOrCreateByEmail(name, email, phone, customer.id, person.id, newspaper);

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

    const existingTrialSubscription = await Subscriptions.findOne({
      user: user._id,
      status: "active",
      product: product._id
    });

    if (product.is_trial && existingTrialSubscription) {
      return {
        status: 400,
        body: {
          message: "Trial subscription already is active"
        }
      };
    }

    //Logging UTM data
    try {
      const { utm_source, utm_medium, utm_campaign, utm_content, utm_term } = utm;
      if (utm_source && utm_medium && utm_campaign && utm_content && utm_term) {
        await Logs.create(user.telegramID, "utm_info", "system", utm, user, "utm_info_logging");
      }
    } catch (e) {
      await Logs.create(null, "utm_info_error", "system", e.message, user, "error while writing utm data");
    }

    await RefferalLinks.attachLink(body.ref, user._id);

    const payment_data = {
      user: user._id,
      product: product._id,
      amount: product.price,
      currency: "usd",
      crm_deal_id: deal.id,
      payment_method: "stripe",
      status: "created",
      channel_id: product.channel_id,
      payment_id: invoice.id,
      order_id: "null"
    };

    const subscription = await Subscriptions.createSubWithPayment(
      user._id,
      deal.id,
      product._id,
      subscription_stripe.id,
      "inactive",
      payment_data
    );

    await Logs.create(null, "payment_info", "stripe_payment", subscription, user, "payment subscription");

    return {
      status: 200,
      body: { payment_id: invoice.id, client_secret: paymentIntent.client_secret, status: paymentIntent.status }
    };
  } catch (error) {
    console.log(error.message);
    await Logs.create(null, "system_error", "system", error.stack.toString(), null);

    if (error.type === "StripeCardError") {
      return {
        status: 200,
        body: {
          message: error.raw.message
        }
      };
    }
    console.log(error);
    await Logs.create(null, "stripe-error", error, null);
    return {
      status: 500,
      body: {
        message: "Server Error"
      }
    };
  }
};

const succeeded = async (body) => {
  try {
    const invoice = body;
    const subscription_from_database = await Subscriptions.findOne({
      subscription_id_service: invoice.subscription
    }).populate(["user", "product"]);

    let dealSubscriptionEndDate;

    if (subscription_from_database && invoice.subscription) {
      const subscription = await stripe.subscriptions
        .retrieve(invoice.subscription)
        .catch(async (e) => {
          await Logs.create(null, "payment_info", "stripe_payment", subscription, user, "retrieving subscription");
        });

      let payment = await Payments.findOne({ payment_id: body.id }).populate(["user", "product"]);

      const user = subscription_from_database.user;
      const product = await Products.findOne({ stripe_price_id: invoice.lines.data[0].price.id });
      let zendesk_deal_id;
      let zendesk_contract_id;

      if (!payment) {
        let crm_deal_id = subscription_from_database.crm_deal_id;

        if (subscription_from_database.product.is_trial) {
          try {
            const deal = await crm.createDealFromFront(
              user.pipedrive_contact_id,
              "Stripe",
              user.first_name,
              user.email,
              user.phone,
              product
            );
            crm_deal_id = deal.id;

            try {
              const { email, phone, first_name } = user;
              const start_date = new Date();

              const person = zendesk.searchPerson(email, phone, first_name, product);

              const deal_data = {
                name: `By Jerold product: ${product.name}`,
                value: product.price,
                contact_id: person.data.id,
                currency: "Stripe",
                custom_fields: {
                  "Название пакета": `Jerold ${product.name}`,
                  "Дата покупки": start_date,
                  "Дата попадания в канал": start_date,
                  "Способ оплаты": "Stripe",
                  "Сумма оплаты": product.price,
                  "Дата окончания подписки": dealSubscriptionEndDate,
                  "Дата следующего списания": dealSubscriptionEndDate,
                  "TelegramID": user.telegramID,
                  "Возможности кросс-сейл": ["Crypto Fundamental", "Forex Fundamental"]
                },
                meta: {
                  type: "deal"
                }
              };
              const zendesk_deal = await zendesk.createDeal(deal_data).catch(async (error) => {
                await Logs.create(user, "crm-error", error, null);
              });
              zendesk_deal_id = zendesk_deal.data.id;
              zendesk_contract_id = person.data.id;
            } catch (err) {
              await Logs.create(user.telegramID, "crm_create_deal_error", "system", user, user);
            }
          } catch (e) {
            await Logs.create(user.telegramID, "crm_create_deal_error", "system", user, user);
          }
        }

        payment = await Payments.create({
          user: subscription_from_database.user,
          product: product.id,
          amount: product.price,
          currency: product.currency.toLowerCase(),
          crm_deal_id,
          payment_method: "stripe",
          status: "approved",
          channel_id: product.channel_id,
          payment_id: invoice.id,
          order_id: null,
          subscription: subscription_from_database._id,
          paid_at: new Date()
        }).then((r) => r.populate(["user", "product"]));

        await Subscriptions.updateOne(
          { _id: subscription_from_database._id },
          { crm_deal_id, $push: { payments: payment } }
        );
      } else {
        await Payments.findByIdAndUpdate(payment._id, {
          status: "approved",
          paid_at: new Date()
        });
      }

      try {
        await crm.updateDealAfterPayment(payment.crm_deal_id, body, subscription_from_database._id);
      } catch (e) {
        await Logs.create(user.telegramID, "crm_update_error", "crm", JSON.stringify(e), user);
      }

      const banFromChannel = async (user, subscription) => {
        await stripe.subscriptions.del(subscription.subscription_id_service).catch(async (error) => {
          await Logs.create(user.telegramID, "stripe_del_sub_error", "stripe", error, user);
        });
        await bot
          .banChatMember(subscription.product.channel_id, user.telegramID)
          .then(async (r) => {
            await Users_channels.createOrUpdate(user._id, subscription.product.channel_id, true);
          })
          .then(() => {
            Logs.create(user.telegramID, "ban_channel_member", "system", subscription, user);
          })
          .catch(async (error) => {
            let message = `failed to ban user in chat_id: ${subscription.product.channel_id}`;
            await Logs.create(user.telegramID, "ban_error", "telegram", error.stack.toString(), null, message);
          });

        await Subscriptions.deactivate(subscription._id);
      };

      const subscriptions = await Subscriptions.find({
        user: user._id,
        _id: { $ne: subscription_from_database._id }
      }).sort({ started_at: 1 }).populate("product");

      if (subscriptions.length > 0) {
        for await (const oldSubscription of subscriptions) {
          if (oldSubscription.status === "active") {
            if (oldSubscription.product.channel_id !== subscription_from_database.product.channel_id) {
              await banFromChannel(user, oldSubscription);
            } else {
              await Subscriptions.deactivate(oldSubscription.id);
            }
          }
        }
      }

      await Logs.create(user.telegramID, "payment_info", "stripe_payment", body, user, "payment succeeded");

      let newSubscriptionEndDate = new Date(subscription.current_period_end * 1000);
      let newSubscriptionAutoRenew = true;

      if (subscription_from_database.product.is_trial) {
        newSubscriptionAutoRenew = false;
        newSubscriptionEndDate = new Date(subscription.trial_end * 1000);
        dealSubscriptionEndDate =  new Date(subscription.trial_end * 1000);
      } else if (subscription_from_database.product.subscription_type === "full") {
        newSubscriptionEndDate.setMonth(newSubscriptionEndDate.getMonth() + 1);
        dealSubscriptionEndDate = calculateDate(30)
      } else if (subscription_from_database.product.subscription_type === "promo") {
        newSubscriptionEndDate.setMonth(newSubscriptionEndDate.getMonth() + 3);
        dealSubscriptionEndDate = calculateDate(90)
      }

      await Subscriptions.findByIdAndUpdate(payment.subscription, {
        product: product._id,
        status: "active",
        zendesk_deal_id: zendesk_deal_id,
        started_at: new Date(subscription.created * 1000),
        current_period_start: new Date(subscription.current_period_start * 1000),
        current_period_end: newSubscriptionEndDate,
        trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
        trial_end: newSubscriptionEndDate,
        date_delete_user: null,
        auto_renew: newSubscriptionAutoRenew
      });

      const updatedUser = await Users.findOneAndUpdate(
        { _id: user._id },
        {
          date_delete_user: null,
          channel_id: payment.product.channel_id,
          send_failed_payment: false,
          referral_program: "true",
          subscription_id: subscription.id,
          zendesk_contract_id: zendesk_contract_id
        },
        { new: true }
      );

      await Users_channels.createOrUpdate(user._id, payment.product.channel_id);

      if (updatedUser.telegramID) {
        await bot.unbanChatMember(user.channel_id, user.telegramID);
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
      //   await create_notifications_succeeded(user, product);
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
    console.log(error);
    await Logs.create(null, "system_error", "system", error.stack.toString(), null);
    return {
      status: 500,
      body: {
        message: "Server Error"
      }
    };
  }
};

const failed = async (body) => {
  try {
    const invoice = body;
    const subscription_from_database = await Subscriptions.findOne({
      subscription_id_service: invoice.subscription
    }).populate(["product", "user"]);

    const subscription_stripe = await stripe.subscriptions
      .retrieve(invoice.subscription)
      .catch(async e => {
        await Logs.create(null, "stripe_error", "stripe_payment", e, user, "subscriptions retrieve error");
      });

    const product = await Products.findOne({ stripe_price_id: invoice.lines.data[0].price.id });

    if (subscription_from_database) {
      const user = subscription_from_database.user;
      let payment = await Payments.findOne({ payment_id: body.id });

      if (!payment) {
        let crm_deal_id = subscription_from_database.crm_deal_id;

        if (subscription_from_database.product.is_trial) {
          try {
            const deal = await crm.createDealFromFront(
              user.pipedrive_contact_id,
              "Stripe",
              user.first_name,
              user.email,
              user.phone,
              product
            );
            crm_deal_id = deal.id;
          } catch (e) {
            await Logs.create(user.telegramID, "crm_error", "system", e, user, "createDealFromFront");
          }
        }

        payment = await Payments.create({
          user: subscription_from_database.user,
          product: product.id,
          amount: product.price,
          currency: product.currency.toLowerCase(),
          crm_deal_id,
          payment_method: "stripe",
          status: "failed",
          channel_id: product.channel_id,
          payment_id: invoice.id,
          order_id: null,
          subscription: subscription_from_database._id,
          paid_at: null
        }).then((r) => r.populate(["user", "product"]));

        await Subscriptions.updateOne(
          { _id: subscription_from_database._id },
          { crm_deal_id, $push: { payments: payment } }
        );
      } else {
        await Payments.findByIdAndUpdate(payment._id, {
          status: "failed"
        });
      }

      await Logs.create(null, "payment_info", "stripe_payment", body, user, "payment failed");

      if (invoice.billing_reason !== "subscription_create") {
        const date = new Date();
        date.setDate(date.getDate() + 3);

        let amount = (invoice.amount || invoice.amount_due) / 100;
        amount = amount.toString().includes(".") ? amount : `${amount}.00`;

        if (!subscription_from_database.date_delete_user) {
          if (!subscription_from_database.product.is_trial) {
            try {
              await crm.setDateCancelSub(user.telegramID, payment.crm_deal_id);
            } catch (e) {
              await Logs.create(user.telegramID, "crm_error", "system", e, user, "setDateCancelSub");
            }
          }

          if (subscription_from_database.product.is_trial) {
            await bot
              .banChatMember(subscription_from_database.product.channel_id, user.telegramID)
              .then(async (r) => {
                await Users_channels.createOrUpdate(user._id, subscription_from_database.product.channel_id, true);
              })
              .catch(async (error) =>
                await Logs.create(
                  user.telegramID,
                  "ban_error",
                  "telegram",
                  error.stack.toString(),
                  null,
                  `failed ban user in chat_id: ${subscription_from_database.product.channel_id}`
                )
              );
          }
          await Subscriptions.findByIdAndUpdate(payment.subscription, {
            product: product._id,
            status: "past_due",
            started_at: new Date(subscription_stripe.created * 1000),
            current_period_start: new Date(subscription_stripe.current_period_start * 1000),
            current_period_end: new Date(subscription_stripe.current_period_end * 1000),
            trial_start: subscription_stripe.trial_start ? new Date(subscription_stripe.trial_start * 1000) : null,
            trial_end: subscription_stripe.trial_end ? new Date(subscription_stripe.trial_end * 1000) : null,
            date_delete_user: date
          });

          const params = Buffer.from(
            `${user.first_name}&${user.telegramID}&${payment.product._id}&${user.channel_id}&${invoice.payment_intent}`
          ).toString("base64");

          const startDate = new Date(subscription_from_database.current_period_start);
          const currentDate = new Date();
          const timeDiff = currentDate.getTime() - startDate.getTime();
          const daysPassed = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
          let eventType;
          switch (daysPassed) {
            case 7:
              eventType = FIRST_FAILED_PAYMENT;
              break;
            case 8:
              eventType = SECOND_FAILED_PAYMENT;
              break;
            case 9:
              eventType = THIRD_FAILED_PAYMENT;
          }
          if (eventType && user.telegramID) {
            await messenger.trigger(eventType, user, product);
          }
          // if (!payment.send_notification) {
          //   const keyboardForPay = {
          //     reply_markup: {
          //       resize_keyboard: true,
          //       inline_keyboard: [
          //         [
          //           {
          //             text: `Оплатить $${amount}`,
          //             web_app: {
          //               url: `${process.env.HOST}/buy?data=${params}`,
          //             },
          //           },
          //         ],
          //         [
          //           {
          //             text: `Назад`,
          //             callback_data: "back",
          //           },
          //         ],
          //       ],
          //     },
          //   };
          //
          //   await create_notifications_failed(user, product, keyboardForPay);
          //
          //   const result = await bot
          //     .sendMessage(
          //       user.telegramID,
          //       `🤖 Привет, это Jerold!\n\nВозникла проблема со списанием суммы для продолжения месячной подписки на пакет ${product.name_view}. 😔\n\n🔁 Нажми на кнопку “Оплатить” ниже, чтобы продолжить подписку на следующий месяц.\n\nДержи свои навыки трейдинга на высоте вместе с моими сигналами! 🚀`,
          //       keyboardForPay
          //     )
          //     .catch((err) => false);
          //
          //   if (result) {
          //     await Payments.findByIdAndUpdate(payment._id, {
          //       send_notification: true,
          //     });
          //     await Logs.create(user.telegramID, "sendMessage", "bot", result, user, "failedPayment");
          //   }
          // }
        }
      }
    } else {
      const customer = await stripe.customers.retrieve(invoice.customer).catch(async e => {
        await Logs.create(null, "stripe_error", "stripe_payment", invoice, user, "customer retrieve error");
      });

      if (product && invoice.billing_reason !== "subscription_create") {
        let user = await Users.findOne({ email: customer.email });

        if (!user) {
          if (customer.metadata.telegram_id) {
            user = await Users.findOne({ telegramID: customer.metadata.telegram_id });
          }
        }

        if (user) {
          const person = await crm.searchPerson(customer.email, customer.phone, customer.name).catch(async e => {
            await Logs.create(user.telegramID, "crm_error", "system", customer, user, "crm searchPerson error");
          });
          let deal = {};

          const deals = await crm.findDealByPerson(person.id).catch(async e => {
            await Logs.create(user.telegramID, "crm_error", "system", person, user, "crm findDealByPerson error");
          });

          if (!deals) {
            deal = await crm.createDealFromFront(
              person.id,
              "Stripe",
              customer.name,
              customer.email,
              customer.phone,
              product,
              null
            ).catch(async e => {
              await Logs.create(user.telegramID, "crm_error", "system", person, user, "crm createDealFromFront error");
            });
          } else {
            deal = deals[0];
          }

          if (!subscription_from_database.product.is_trial) {
            await crm.setDateCancelSub(user.telegramID, deal.id).catch(async e => {
              await Logs.create(user.telegramID, "crm_error", "system", person, user, "crm createDealFromFront error");
            });
          }

          const payment_data = {
            user: user._id,
            product: product._id,
            amount: product.price,
            currency: "usd",
            crm_deal_id: deal.id,
            payment_method: "stripe",
            status: "failed",
            channel_id: product.channel_id,
            payment_id: invoice.id,
            order_id: "null"
          };

          const date = new Date();
          date.setDate(date.getDate() + 3);

          const subscription_data = {
            user: user._id,
            crm_deal_id: deal.id,
            product: product._id,
            subscription_id_service: subscription_stripe.id,
            status: "past_due",
            started_at: new Date(subscription_stripe.created * 1000),
            current_period_start: new Date(subscription_stripe.current_period_start * 1000),
            current_period_end: new Date(subscription_stripe.current_period_end * 1000),
            trial_start: subscription_stripe.trial_start ? new Date(subscription_stripe.trial_start * 1000) : null,
            trial_end: subscription_stripe.trial_end ? new Date(subscription_stripe.trial_end * 1000) : null,
            date_delete_user: date
          };
          const subscription = await Subscriptions.createSubWithPaymentOldUser(subscription_data, payment_data);

          const params = Buffer.from(
            `${user.first_name}&${user.telegramID}&${product._id}&${user.channel_id}&${invoice.payment_intent}`
          ).toString("base64");

          if (user.channel_id) {
            const date = new Date();
            date.setDate(date.getDate() + 3);

            let amount = (invoice.amount || invoice.amount_due) / 100;
            amount = amount.toString().includes(".") ? amount : `${amount}.00`;

            const keyboardForPay = {
              reply_markup: {
                resize_keyboard: true,
                inline_keyboard: [
                  [
                    {
                      text: `Оплатить $${amount}`,
                      web_app: {
                        url: `${process.env.HOST}/buy?data=${params}`
                      }
                    }
                  ],
                  [
                    {
                      text: `Назад`,
                      callback_data: "back"
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
              )
              .catch(async (err) => {
                err = false;
                await Logs.create(null, "bot-error", err, null);
              });

            if (result) {
              await Payments.findByIdAndUpdate(subscription.payments[0], {
                send_notification: true
              });
              await Logs.create(user.telegramID, "sendMessage", "bot", result, user, "failedPayment");
            }
          }
        }
      }
    }
  } catch (error) {
    console.log(error);
    await Logs.create(null, "system_error", "system", error.stack.toString(), null);
    return {
      status: 500,
      body: {
        message: "Server Error"
      }
    };
  }
};

const refunded = async (body) => {
  try {
    const invoice = await stripe.invoices.retrieve(body.invoice).catch(async (e) => {
      await Logs.create(null, "strie_error", "stripe_payment", body, null, "");
    });
    const subscription_from_database = await Subscriptions.findOne({
      subscription_id_service: invoice.subscription
    }).populate("product");
    const subscription_stripe = await stripe.subscriptions.retrieve(invoice.subscription);

    if (subscription_from_database) {
      let payment = await Payments.findOne({ payment_id: invoice.id }).populate(["user", "product"]);
      const product = subscription_from_database.product;

      if (!payment) {
        payment = await Payments.create({
          user: subscription_from_database.user,
          product: product.id,
          amount: product.price,
          currency: product.currency.toLowerCase(),
          crm_deal_id: subscription_from_database.crm_deal_id,
          payment_method: "stripe",
          status: "refunded",
          channel_id: product.channel_id,
          payment_id: invoice.id,
          order_id: null,
          subscription: subscription_from_database._id,
          paid_at: null
        }).then((r) => r.populate(["user", "product"]));

        await Subscriptions.updateOne({ _id: subscription_from_database._id }, { $push: { payments: payment } });
      }

      const user = payment.user;

      await Logs.create(null, "payment_info", "stripe_payment", body, user, "payment refunded");

      try {
        await crm.setRefunded(user.telegramID, payment.crm_deal_id);
      } catch (e) {
        await Logs.create(null, "crm_error", "system", e, user, "payment refunded");
      }

      await Payments.findByIdAndUpdate(payment._id, {
        status: "refunded"
      });

      await Subscriptions.findByIdAndUpdate(payment.subscription, {
        status: "inactive",
        started_at: new Date(subscription_stripe.created * 1000),
        canceled_at: subscription_stripe.canceled_at ? new Date(subscription_stripe.canceled_at * 1000) : null,
        current_period_start: new Date(subscription_stripe.current_period_start * 1000),
        current_period_end: new Date(subscription_stripe.current_period_end * 1000),
        trial_start: subscription_stripe.trial_start ? new Date(subscription_stripe.trial_start * 1000) : null,
        trial_end: subscription_stripe.trial_end ? new Date(subscription_stripe.trial_end * 1000) : null,
        who_canceled: "user"
      });

      await bot.banChatMember(user.channel_id, user.telegramID).catch(async (e) => {
        await Logs.create(user.telegramID, "bot_error", "telegram", body, user, "ban error");
      });

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
          subscription_id: null
        }
      );

      await bot.sendMessage(user.telegramID, "Вы были удалены из канала").catch(async (e) => {
        await Logs.create(user.telegramID, "bot_error", "telegram", body, user, "send message error");
      });
    } else {
      const customer = await stripe.customers.retrieve(invoice.customer).catch(async (e) => {
        await Logs.create(null, "stripe_error", "stripe_payment", invoice, null, "customers retrieve error");
      });
      const product = await Products.findOne({ stripe_product_id: invoice.lines.data[0].price.product });

      if (product) {
        let user = await Users.findOne({ email: customer.email });

        if (!user && customer.metadata.telegram_id) {
          user = await Users.findOne({ telegramID: customer.metadata.telegram_id });
        }

        if (user) {
          await Logs.create(null, "payment_info", "stripe_payment", body, user, "payment refunded");

          let deal = {};
          try {
            const person = await crm.searchPerson(customer.email, customer.phone, customer.name);
            const deals = await crm.findDealByPerson(person.id);

            if (!deals) {
              deal = await crm.createDealFromFront(
                person.id,
                "Stripe",
                customer.name,
                customer.email,
                customer.phone,
                product,
                null
              );
            } else {
              deal = deals[0];
            }

            await crm.setRefunded(user.telegramID, deal.id);
          } catch (e) {
            await Logs.create(user.telegramID, "crm_error", "system", e, user, "error when payment refund");
          }

          const payment_data = {
            user: user._id,
            product: product._id,
            amount: product.price,
            currency: "usd",
            crm_deal_id: deal.id,
            payment_method: "stripe",
            status: "refunded",
            channel_id: product.channel_id,
            payment_id: invoice.id,
            order_id: null
          };

          const subscription_data = {
            user: user._id,
            crm_deal_id: deal.id,
            product: product._id,
            subscription_id_service: subscription_stripe.id,
            status: "inactive",
            started_at: new Date(subscription_stripe.created * 1000),
            canceled_at: subscription_stripe.canceled_at ? new Date(subscription_stripe.canceled_at * 1000) : null,
            current_period_start: new Date(subscription_stripe.current_period_start * 1000),
            current_period_end: new Date(subscription_stripe.current_period_end * 1000),
            trial_start: subscription_stripe.trial_start ? new Date(subscription_stripe.trial_start * 1000) : null,
            trial_end: subscription_stripe.trial_end ? new Date(subscription_stripe.trial_end * 1000) : null,
            who_canceled: "user"
          };

          await Subscriptions.createSubWithPaymentOldUser(subscription_data, payment_data);

          await bot.banChatMember(user.channel_id, user.telegramID).catch(async (e) => {
            await Logs.create(user.telegramID, "bot_error", "telegram", body, user, "ban error");
          });

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
              subscription_id: null
            }
          );

          await bot.sendMessage(user.telegramID, "Вы были удалены из канала");
        }
      }
    }
  } catch (error) {
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
  refunded
};
