require("dotenv").config();

const stripe = require("stripe")(process.env.STRIPE_PROD);
const Users = require("../model/Users");
const Products = require("../model/Products");
const Logs = require("../model/Logs");
const Subscriptions = require("../model/Subscriptions");
const crm = require("../utils/crm");
const zendesk = require("../crm/zendesk")

const createSubscription = async (customer_name, telegram_id, package_id) => {
  try {
  const user = await Users.findOne({ telegramID: telegram_id }).catch(async (error) => {
    await Logs.create(telegram_id, "retrieve-user", null, error )
    throw new Error('Failed to retrieve user')
  })

  let customer = null;

  if (user.stripe_customer_id) {
    customer = await stripe.customers.retrieve(user.stripe_customer_id).catch(async (error)=> {
      await Logs.create(telegram_id, "stripe-customer", null, error)
      throw  new Error('Failed to retrieve customer ')
    });
  } else {
    customer = await stripe.customers
      .search({
        query: `metadata[\'telegram_id\']:\'${telegram_id}\'`,
      })
      .then((r) => r.data[0]);

    if (customer) {
      await Users.updateOne({ telegramID: telegram_id }, { stripe_customer_id: customer.id }).catch(async (error)=> {
       await Logs.create(telegram_id, "update-error", null, error);
        throw new Error("Update user error");
      });
    }
  }

  if (!customer) {
    customer = await stripe.customers.create({
      name: customer_name,
      email: user.email,
      phone: user.phone,
      metadata: {
        telegram_id,
      },
    })
    await Users.updateOne({ telegramID: telegram_id }, { stripe_customer_id: customer.id }).catch(async (error)=> {
      await Logs.create(telegram_id, "stripe-crate", null, error);
      throw new Error("Stripe create user error");
    });
  }

  let pipedrive_contact_id = user.pipedrive_contact_id;

  if (!pipedrive_contact_id) {
    const person = await crm.searchPerson(user.email, user.phone, user.first_name, user.telegramID).catch(async (error)=> {
     await Logs.create(telegram_id, "crm-searche", null, error);
      throw new Error("crm searche error");
    });
    pipedrive_contact_id = person.id;
    await Users.updateOne({ telegramID: telegram_id }, { pipedrive_contact_id });
  }

  const product = await Products.findOne({ _id: package_id }).catch(async (error)=> {
    await Logs.create(telegram_id, "find-product", null, error);
    throw new Error("Failed to find product");
  });

  try {
    let zendesk_contact_id = user.zendesk_contact_id;
    let zendesk_contact

    if (zendesk_contact_id) {
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
      await Users.updateOne({ telegramID: telegram_id, zendesk_contact_id: zendesk_contact_id });
    }
  } catch (e) {
    console.log(e.message);
  }

  if (product.end_date && product.end_date <= new Date()) {
    await Logs.create(null, "payment_error", "stripe_payment", null, "Product subscription expired");

    return {
      status: 400,
      body: {
        message: "Product subscription expired",
      },
    };
  }
  const hasPreviousSubscription = await Subscriptions.findOne({
    user: user._id,
    product: product._id,
    status: 'active',
  });

  if (product.is_trial && hasPreviousSubscription) {
    return {
      status: 400,
      body: {
        message: 'Trial subscription already active',
      },
    };
  }

  const stripe_product = await stripe.products.retrieve(product.stripe_product_id).catch(async (error)=> {
   await Logs.create(telegram_id, "stripe-retrieve", null, error);
    throw new Error("Stripe retrieve product error");
  });

  const subscription_data = {
    customer: customer.id,
    items: [{ price: stripe_product.default_price }],
    payment_behavior: "default_incomplete",
    description: `Jerold ${product.name_view}`,
    payment_settings: {
      payment_method_types: ["card"],
      payment_method_options: {
        card: {
          mandate_options: {
            description: `Jerold ${product.name_view}`,
          },
          request_three_d_secure: "any",
        },
      },
    },
    expand: ["latest_invoice.payment_intent"],
  };

  if (product.is_trial) {
    subscription_data.add_invoice_items = [{ price: product.stripe_price_id }];
    subscription_data.trial_period_days = product.duration;
  } else if (product.subscription_type === 'promo') {
    subscription_data.add_invoice_items = [{price: product.stripe_price_id}];
    subscription_data.cancel_at_period_end = true;
  }

  const subscription_stripe = await stripe.subscriptions.create(subscription_data).catch(async (error)=> {
    await Logs.create(telegram_id, "stripe-create", null, error);
    throw new Error("Stripe create subscription error");
  });

  const deal = await crm.createDealFromFront(
    pipedrive_contact_id,
    "Stripe",
    user.first_name,
    user.email,
    user.phone,
    product,
    null
  ).catch(async (error)=> {
    await Logs.create(telegram_id, "crm-create-deal", null, error);
    throw new Error("crm create deal error");
  })
    console.log("{{{test}}}")
    const start_date = new Date()
    let subscriptionEndDate;
    const subscriptionType = product.subscription_type;

    if (subscriptionType === "trial") {
      // Trial subscription for 7 days
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 7);
      subscriptionEndDate = trialEndDate;
    } else if (subscriptionType === "promo") {
      // Promotional subscription
      const promoEndDate = new Date();
      promoEndDate.setDate(promoEndDate.getDate() + 90);
      subscriptionEndDate = promoEndDate;
    } else {
      const regularEndDate = new Date();
      regularEndDate.setDate(regularEndDate.getDate() + product.duration);
      subscriptionEndDate = regularEndDate;
    }
    const zendesk_deal = null;
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
          "Способ оплаты": "Stripe",
          "Сумма оплаты": product.price,
          "Дата окончания подписки": subscriptionEndDate,
          "Дата следующего списания": subscriptionEndDate,
          "TelegramID": telegram_id,
          "Возможности кросс-сейл": ["Crypto Fundamental", "Forex Fundamental"],
        },
        meta: {
          type: "deal"
        }
      }

      zendesk_deal = await zendesk.createDeal(zendesk_deal_data).catch(async (err) => {
        await Logs.create(user, "crm-error", err, null)
        return zendesk_deal
      })
    }catch (error){
      await Logs.create(null, "crm_error", "crm", error, null, "CreateDealError");
    }

  const paymentIntent = await stripe.paymentIntents.retrieve(subscription_stripe.latest_invoice.payment_intent.id);

  const payment_data = {
    user: user._id,
    product: product._id,
    amount: product.price,
    currency: "usd",
    crm_deal_id: deal.id,
    payment_method: "stripe",
    status: 'created',
    channel_id: product.channel_id,
    payment_id: subscription_stripe.latest_invoice.id,
    order_id: "null",
    current_period_end: subscriptionEndDate,
    trial_end: subscriptionEndDate,
    zendesk_deal_id: zendesk_deal ? zendesk_deal.data.id : "",
  };

  const subscription = await Subscriptions.createSubWithPayment(
    user._id,
    deal.id,
    product._id,
    subscription_stripe.id,
    'active',
    payment_data,
  ).catch(async (error)=> {
    await Logs.create(telegram_id, "create-subscription", null, error);
    throw new Error("Create subsubscription on DB error");
  });

  if (product.is_trial) {
    // Perform payment deduction for trial subscription
    const paymentResult = await performPaymentDeduction(subscription, product.price);
    if (paymentResult.success) {
      // Payment deduction successful
      // return { success: true };
      return subscription_stripe.latest_invoice.payment_intent;
    } else {
      // Payment deduction failed
      return { success: false };
    }
  } else {
    // Regular subscription, no immediate payment deduction required
    // return { success: true };
    return subscription_stripe.latest_invoice.payment_intent;
  }
  }catch (err){
    console.log(err);
   await Logs.create(null, "create-error", "create-subscription-error", "server error", err)
  }
};

const performPaymentDeduction = async (subscription, amount) => {
  try {
    const paymentIntent = await stripe.paymentIntents.confirm(subscription.latest_invoice.payment_intent.id, { amount: amount }).catch(async (error)=> {
      await Logs.create(null , "stripe-create", null, error);
      throw new Error("Stripe create subscription error");
    });

    if (paymentIntent.status === 'succeeded') {
      // Payment deduction successful
      return { success: true };
    } else {
      // Payment deduction failed
      return { success: false };
    }
  } catch (error) {
    console.error('Payment deduction error:', error);
    return { success: false };
  }
};

const cancelSubscription = async (id, user) => {
  try {
    console.log("Cancel Subscription", id, user.telegramID);
    let error = false;

    let deleted = await stripe.subscriptions.del(id).catch(async (error) => {
      console.log("Error deleting subscription");
      await Logs.create(id, 'cancel-subscription', error , null)
      error = true;
    });

    if (error) {
      deleted = await stripe.subscriptions.retrieve(id)
    }

    const subscription = await Subscriptions.findOne({ subscription_id_service: id }).catch(async (error)=> {
     await Logs.create(null, "subscription-error ", null, error);
      throw new Error("Failed to retrieve sub");
    });

    if (subscription.auto_renew) {
      // Отменить автоматическое продление подписки
      subscription.auto_renew = false;

      // Вычислить новую дату окончания подписки
      const currentDate = new Date();
      const gracePeriod = subscription.grace_period_days;
      const nextRenewalDate = subscription.next_renewal_date || subscription.current_period_end;
      const newEndDate = new Date(nextRenewalDate.getTime() + gracePeriod * 24 * 60 * 60 * 1000);

      if (newEndDate > currentDate) {
        subscription.current_period_end = newEndDate;
      }
    }

    await Subscriptions.updateOne(
      { subscription_id_service: id },
      {
        status: "canceled",
        who_canceled: "user",
        canceled_at: new Date(),
        date_delete_user: subscription.current_period_end,
      }
    ).catch(async (error)=> {
     await Logs.create(null, "cancel-error ", null, error);
      throw new Error("Failed to cancel sub");
    });

    // Создать лог об отмене автоматического продления
    await Logs.create(user.id, "canceled_auto_renew", subscription, null  )

    return deleted;
  } catch (error) {
    console.log(error);
    await Logs.create(null, 'cancel-subscription', error, null);
    return null;
  }
};


const getCustomer = async (id) => {
  const customer = await stripe.customers.retrieve(id);
  return customer;
};

const getProduct = async (id) => {
  const product = await stripe.products.retrieve(id);
  return product;
};

const getSubscription = async (id) => {
  const subscription = await stripe.subscriptions.retrieve(id);
  return subscription;
};

const getIntent = async (id) => {
  const paymentIntent = await stripe.paymentIntents.retrieve(id);
  return paymentIntent;
};

const getInvoice = async (id) => {
  const invoice = await stripe.invoices.retrieve(id);
  return invoice;
};

const getSubscriptionList = async (params) => {
  const allActiveSubscription = await stripe.subscriptions.list({
    ...params,
  });
  return allActiveSubscription.data;
};

module.exports = {
  createSubscription,
  getCustomer,
  getProduct,
  getSubscription,
  getIntent,
  getInvoice,
  cancelSubscription,
  getSubscriptionList,
};
