require("dotenv").config();
const Subscription = require("../model/Subscriptions");
const User = require("../model/Users");
const Subscriptions = require("../model/Subscriptions");
const Logs = require("../model/Logs");
const Products = require("../model/Products");
const Payments = require("../model/Payments");
const crm = require("../utils/crm");
const Users = require("../model/Users");
const stripe = require("stripe")(process.env.STRIPE_PROD);

const cancel = async (user) => {
  console.log("telegramID: ", user.telegramID);
  try {
    const telegramId = user.telegramID;
    const subscriptions = await Subscription.find({ user: user._id }).populate("product");
    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          const { subscription_id_service } = subscription;
          try {
            if (subscription_id_service) {
              await stripe.subscriptions.del(subscription_id_service).catch(async (error) => {
                console.log(error);
                await Logs.create(telegramId, "stripe-error", error, "Ошибка обновления stripe");
              });

              console.log("--------SUBSCRIPTION ID SERVICE FOR DELETE ON STRIPE-------");
              console.log(subscription_id_service);

            } else {
              console.log("___HAS_NOT_subscription_id_service___", subscription._id);
            }
            await cancelSubscriptionOnDb(subscription._id, telegramId);
            await Logs.create(telegramId, "subscription-product", "canceled_auto_renewal", null);
          } catch (err) {
            console.log(err);
          }
          console.log(`У пользователя ${telegramId} подписка была отменена`);
        } catch (err) {
          console.log(err);
        }
      })
    );

    await createNewSubscription(telegramId, user);
    console.log(`У пользователя ${telegramId} подписка была обновлена`);
  } catch (error) {
    console.error("Ошибка отмены подписок:", error);
  }
};

const createNewSubscription = async (telegramId, user) => {
  //const trialFundamental = await Products.findOne({ name: "Trial_Fundamental_Forex" });
  const fundamental = await Products.findOne({ name: "Fundamental_Forex" });

  const lastSubscription = await Subscription.findOne({ user: user._id }, {}, { sort: { createdAt: -1 } }).populate("product");
  console.log("--------LAST SUBSCRIPTION FOR CREATE NEW SUB-------");
  console.log(lastSubscription);
  try {
    const { subscription_id_service, old_date_start, current_period_start } = lastSubscription;

    if (subscription_id_service) {
      // if (lastSubscription.product.is_trial) {
      console.log("--------STRIPE SUBSCRIPTION_ID_SERVICE FOR-PRODUCT TRIAL SUBSCRIPTION-------");
      console.log(subscription_id_service);
      /* create new stripe subscription */
      await createNewSubscriptionOnStripe(telegramId, fundamental, old_date_start || current_period_start);

      /* update users delete date */
      await updateUsersDeleteDate(user._id, calculateDate(33), telegramId);

      /* update pipedrive subscription */
      await crm.updateSubscriptionEndDate(telegramId, calculateDate(7));
      // }
      
       if (!lastSubscription.product.is_trial) {
         console.log("--------STRIPE SUBSCRIPTION_ID_SERVICE FOR-PRODUCT FULL SUBSCRIPTION-------");
         console.log(subscription_id_service);
         /* create new stripe subscription */
         await createNewSubscriptionOnStripe(telegramId, fundamental, old_date_start || current_period_start);
      
         /* update users delete date */
         await updateUsersDeleteDate(user._id, calculateDate(33), telegramId);
      
         /* update pipedrive subscription */
         await crm.updateSubscriptionEndDate(telegramId, calculateDate(30));
      }
    } else {
      // if (lastSubscription.product.is_trial) {

      console.log("--------SUBSCRIPTION ID TRIAL SUBSCRIPTION ON TINKOFF-------");
      console.log(lastSubscription._id);
      await renewSubscription(user, fundamental, old_date_start || current_period_start, calculateDate(7), telegramId);
      // await crm.updateSubscriptionEndDate(telegramId, calculateDate(30));

      await updateUsersDeleteDate(user._id, calculateDate(33));
    }

    if (!lastSubscription.product.is_trial) {
      console.log("--------SUBSCRIPTION ID FULL SUBSCRIPTION ON TINKOFF-------");
      console.log(lastSubscription._id);
      await renewSubscription(user, fundamental, old_date_start || current_period_start, calculateDate(30), telegramId);
    
      await crm.updateSubscriptionEndDate(telegramId, calculateDate(30));
      await updateUsersDeleteDate(user._id, calculateDate(33));
    }
  } catch (err) {
    await Logs.create(telegramId, "create-subscription", null, err);
    throw new Error("Create subscription error");
  }
};
const createNewSubscriptionOnStripe = async (telegramID, product, current_period_start) => {
  try {
    const user = await User.findOne({ telegramID: telegramID });

    let customer;
    console.log(user.stripe_customer_id);

    if (user.stripe_customer_id) {
      customer = await stripe.customers.retrieve(user.stripe_customer_id).catch(async (error) => {
        console.log(error);
        await Logs.create(telegramID, "stripe-error", error, "Ошибка обновления stripe");
      });
      console.log(customer);
    } else {
      customer = await stripe.customers
        .search({
          query: `metadata[\'telegramID\']:\'${user.telegramID}\'`
        })
        .then((r) => r.data[0]);
      if (customer) {
        console.log(`customer ${customer}`);
        await Users.updateOne({ telegramID: telegramID }, { stripe_customer_id: customer.id }).catch((error) => {
          console.log(error);
          Logs.create(telegramID, "update-error", null, error);
          throw new Error("Update user error");
        });
      }
    }

    const stripe_product = await stripe.products.retrieve(product.stripe_product_id).catch(async (e) => {
      await Logs.create(null, "stripe_error", "stripe_payment", e, null, "Error while retrieving");
    });

    let trial_period = 0;

    if (product.subscription_type === "trial") {
      trial_period = 7;
    } else if (product.subscription_type === "full") {
      trial_period = 30;
    }

    const subscription_data = {
      customer: customer.id,
      items: [{ price: "price_1NPfsnK2FoJO3pChKDukp296" }],
      payment_behavior: "default_incomplete",
      description: `Jerold ${product.name_view}`,
      payment_settings: {
        payment_method_types: ["card"],
        payment_method_options: {
          card: {
            mandate_options: {
              description: `Jerold ${product.name_view}`
            },
            request_three_d_secure: "any"
          }
        }
      },
      expand: ["latest_invoice.payment_intent"],
      trial_period_days: trial_period
    };

    // if (product.is_trial) {
    //   subscription_data.add_invoice_items = [{ price: product.stripe_price_id}];
    // }
    // if (product.subscription_type === "full") {
    //   subscription_data.add_invoice_items = [{ price: product.stripe_price_id}];
    // }


    console.log("sub_data", subscription_data);

    const subscription_stripe = await stripe.subscriptions.create(subscription_data).catch((error) => {
      Logs.create(telegramID, "stripe-create", null, error);
      throw new Error("Stripe create subscription error");
    });

    let end_date;

    if (product.is_trial) {
      end_date = calculateDate(7);
    } else if (product.subscription_type === "full") {
      end_date = calculateDate(30);
    }

    const crm = await createDealOnCrm(user, product);
    const create_subscription_data = {
      user: user._id,
      product: product._id,
      payment_method: "stripe",
      status: "active",
      channel_id: product.channel_id,
      started_at: new Date(),
      old_date_start: current_period_start,
      current_period_start: new Date(),
      current_period_end: end_date,
      trial_start: new Date(),
      trial_end: end_date,
      auto_renew: true,
      subscription_id_service: subscription_stripe.id,
      crm_deal_id: crm.id
    };

    const createdSub = await Subscription.create(create_subscription_data)
      .catch(async (error) => {
        Logs.create(telegramID, "stripe-create", error, null);
        throw new Error("Stripe create subscription error");
      });

    console.log("________stripe created subscription data ___________");
    console.log(createdSub);

    if (createdSub) {
      const crm_deal_id = createdSub.crm_deal_id;
      const payment_data = {
        user: user._id,
        product: product.id,
        amount: 0,
        currency: product.currency.toLowerCase(),
        crm_deal_id: crm_deal_id,
        status: "approved",
        channel_id: product.channel_id,
        payment_id: subscription_stripe.id,
        order_id: null,
        subscription: createdSub._id,
        paid_at: new Date()
      };

      const payment = await Payments.create(payment_data).then((r) => r.populate(["user", "product"]));

      await Subscriptions.updateOne(
        { _id: createdSub._id },
        { crm_deal_id, $push: { payments: payment } }
      );
    }
  } catch (err) {
    await Logs.create(telegramID, "stripe-error", err, "Ошибка обновления stripe");
    console.log(err);
  }
};

async function renewSubscription(user, product, start, end, telegramId) {

  const crm = await createDealOnCrm(user, product);

  const subscription_data = {
    user: user._id,
    product: product._id,
    payment_method: "tinkoff",
    status: "active",
    channel_id: product.channel_id,
    started_at: new Date(),
    old_date_start: start,
    current_period_start: new Date(),
    current_period_end: end,
    trial_start: new Date(),
    trial_end: end,
    auto_renew: true,
    crm_deal_id: crm.id
  };

  const createSub = await Subscription.create(subscription_data).catch(async (error) => {
    await Logs.create(user._id, "db-error", "system", error, null);
  });

  console.log("TICKOFF CREATED SUBSCRIPTION");
  console.log(createSub);

  if (createSub) {
    const crm_deal_id = createSub.crm_deal_id;
    const payment_data = {
      user: user._id,
      product: product.id,
      amount: 0,
      currency: product.currency.toLowerCase(),
      crm_deal_id: crm_deal_id,
      status: "approved",
      channel_id: product.channel_id,
      order_id: null,
      subscription: createSub._id,
      paid_at: new Date()
    };
    const payment = await Payments.create(payment_data).then((r) => r.populate(["user", "product"]));

    await Subscriptions.updateOne(
      { _id: createSub._id },
      { crm_deal_id, $push: { payments: payment } }
    );
  }
}

async function updateUsersDeleteDate(userId, days, telegramId = null) {
  await Users.updateOne(
    { _id: userId },
    { date_delete_user: days }
  ).catch(async (error) => {
    console.log(error);
    await Logs.create(telegramId, "db-error", "system", error, "Ошибка обновления");
  });
}

async function cancelSubscriptionOnDb(subscriptionId, telegramId) {
  await Subscriptions.updateOne(
    { _id: subscriptionId },
    {
      status: "inactive",
      who_canceled: "admin",
      canceled_at: new Date(),
      auto_renew: false
    }
  ).catch(async (error) => {
    console.log(error);
    await Logs.create(telegramId, "db-error", "system", error, "Ошибка обновления");
  });
}

async function createDealOnCrm(user, product) {
  const { first_name, phone, email } = user;

  const person = await crm.searchPerson(email, phone, first_name).catch(async (e) => {
    await Logs.create(null, "crm_error", "crm", e, null, "searchPerson");
  });

  return await crm.createDealFromFront(person.id, "Stripe", first_name, email, phone, product, null).catch(
    async (e) => {
      await Logs.create(null, "crm_error", "crm", e, null, "createDealFromFront");
    }
  );
}


const calculateDate = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

module.exports = cancel;
