require("dotenv").config();
const terminal = process.env.KEY_PROD;
const host = process.env.HOST;
const axios = require("axios");
const crypto = require("crypto");
const Users = require("../model/Users");
const Products = require("../model/Products");
const Payments = require("../model/Payments");
const Subscriptions = require("../model/Subscriptions");
const Logs = require("../model/Logs");
const crm = require("../utils/crm");
const zendesk = require("../crm/zendesk");

const currencyLink = "https://api.tinkoff.ru/v1/currency_rates?from=USD&to=RUB";
const category = "DebitCardsTransfers";

const init = async (telegramID, package_id) => {
  try {
    const user = await Users.findOne({ telegramID });
    const product = await Products.findOne({ _id: package_id });

    const exchange_rate = await axios.get(currencyLink).then((r) => {
      const rates = r.data.payload.rates;
      const rate = rates.find((el) => el.category === category);
      return rate.sell + 15;
    });

    let pipedrive_contact_id = user.pipedrive_contact_id;

    if (!pipedrive_contact_id) {
      const person = await crm.searchPerson(user.email, user.phone, user.first_name, user.telegramID);
      pipedrive_contact_id = person.id;
      await Users.updateOne({ telegramID }, { pipedrive_contact_id });
    }

    let zendesk_contact_id = user.zendesk_contact_id;
    let zendesk_contact

    if(zendesk_contact_id) {
      const contact = await zendesk.getContactById(zendesk_contact_id).catch(async (error) => {
        await Logs.create(zendesk_contact_id, "crm-error", error, null)
      })
      zendesk_contact = contact.data
    } else {
      const contact_data = {
        name: user.first_name,
        last_name: user.first_name,
        phone: user.phone,
        email: user.email,
        description: `Jerold ${product.name}`
      }
      const newContact = zendesk.createContract(contact_data)
      zendesk_contact = newContact
      zendesk_contact_id = newContact.data.id
      await  Users.updateOne({telegramID: telegramID, zendesk_contact_id: zendesk_contact_id});
    }


    const deal = await crm.createDealFromFront(
      pipedrive_contact_id,
      "Tinkoff",
      user.first_name,
      user.email,
      user.phone,
      product,
      null,
      exchange_rate
    ).catch(async (error)=> {
      await Logs.create(telegramID, 'creare-crm-deal', null, error);
      throw new Error("Create crm deal error")
    });

    const start_date = new Date()
    let subscriptionEndDate;

    try {
      const zendesk_deal_data = {
        name: `By Jerold product: ${product.name}`,
        value: product.price,
        contact_id: zendesk_contact.id,
        currency: "Stripe",
        custom_fields: {
          "Название пакета": `Jerold ${product.name}`,
          "Дата покупки": start_date,
          "Дата попадания в канал": start_date,
          "Способ оплаты": "Tinkoff",
          "Сумма оплаты": product.price,
          "Дата окончания подписки": subscriptionEndDate,
          "Дата следующего списания": subscriptionEndDate,
          "TelegramID": telegramID,
          "utm_source": terminal,
          "Возможности кросс-сейл": ["Crypto Fundamental", "Forex Fundamental"],
        },
        meta: {
          type: "deal"
        }
      }

      const zendesk_deal = await zendesk.createDeal(zendesk_deal_data).catch(async (err) => {
        await Logs.create(user, "crm-error", err, null)
      })
    }catch (error){
      await Logs.create(null, "crm_error", "crm", error, null, "CreateDealError");
    }

    const amount = product.price * exchange_rate;
    const amount_for_pay = amount * 100;
    const randomOrderId = crypto.randomBytes(10).toString("hex");

    const subscriptionType = product.subscription_type;

    if (subscriptionType === "trial") {
      const hasTrialSubscription = await Subscriptions.findOne({
        user: user._id,
        subscription_type: "trial",
        status: "active",
      });

      if (hasTrialSubscription) {
        await Logs.create(null, "payment_error", "tinkoff_payment", null, user, "Trial subscription already active");
        return { status: 400, message: "Trial subscription already active" };
      }

      const existingTrialSubscriptionList = await Subscriptions.find({
        user: user._id,
      });

      if (product.is_trial && existingTrialSubscriptionList.some((trial) => trial.product_id === product._id)) {
        await Logs.create(null, "payment_error", "tinkoff_payment", null, user, "Trial subscription already in use");
        return { status: 400, message: "Trial subscription already in use" };
      }
    }

    const payment_body = {
      TerminalKey: terminal,
      Amount: amount_for_pay,
      OrderId: randomOrderId,
      NotificationURL: `${process.env.HOST}/payment/tinkoffNotification`,
      SuccessURL: `${host}/successPayment`,
      FailURL: `${host}/cancel`,
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
            PaymentMethod: "prepayment",
          },
        ],
      },
    };

    let paymentResponse;
    let subscriptionAction;

    try {
      paymentResponse = await axios.post("https://securepay.tinkoff.ru/v2/Init", payment_body);
      if (!paymentResponse.data.Success) {
        throw new Error("Payment error");
      }

      const payment_data = {
        user: user._id,
        product: product._id,
        amount,
        currency: "rub",
        crm_deal_id: deal.id,
        payment_method: "tinkoff",
        status: "created",
        channel_id: product.channel_id,
        payment_id: paymentResponse.data.PaymentId,
        order_id: paymentResponse.data.OrderId,
        exchange_rate,
        main_payment: true,
        zendesk_deal_id: zendesk_deal.data.id
      };

      let paymentStatus = "failure";
      if (paymentResponse.data.Success) {
        paymentStatus = "success";
      }

      if (subscriptionType === "trial") {
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 7);
        subscriptionEndDate = trialEndDate;
        subscriptionAction = "trial";
      } else if (subscriptionType === "promo") {
        const promoEndDate = new Date();
        promoEndDate.setDate(promoEndDate.getDate() + product.duration);
        subscriptionEndDate = promoEndDate;
        subscriptionAction = "promo";
      } else {
        const regularEndDate = new Date();
        regularEndDate.setDate(regularEndDate.getDate() + product.duration);
        subscriptionEndDate = regularEndDate;
        subscriptionAction = "full";
      }

      const subscription = await Subscriptions.createSubWithPayment(
        user._id,
        deal.id,
        product._id,
        subscriptionEndDate,
        "inactive",
        payment_data,
        paymentStatus
      ).catch(async (error)=> {
       await Logs.create(telegramID, 'create-subscription', null, error);
        throw new Error("Create subscription failed")
      });

      await Logs.create(null, "payment_info", "tinkoff_payment", payment_body, null, "Payment body");

      return {
        status: true,
        deal_id: deal.id,
        url: paymentResponse.data.PaymentURL,
        amount: amount.toFixed(1),
        subscription_end_date: subscriptionEndDate,
        subscription_action: subscriptionAction,
      };
    } catch (error) {
      await Logs.create(null, "payment_error", "tinkoff_payment", null, error, "Payment error");
      return { status: 500, message: "Payment error" };
    }
  } catch (error) {
    await Logs.create(null, "payment_error", null, null, error, "Internal server error");
    return { status: 500, message: "Internal server error" };
  }
};


module.exports = {
  init,
};
