require("dotenv").config();
const Subscriptions = require("../../model/Subscriptions");
const Payments = require("../../model/Payments");
const Users = require("../../model/Users");
const Products = require("../../model/Products");
const keyboardBack = require("../keyboard/subscription_back");

const mySubscription = async (id, user, bot) => {
  try {
    const subscriptions_all = await Subscriptions.find({ user: user._id, status: { $ne: "inactive" } }).populate(
      "product"
    );

    const subscriptions = subscriptions_all.filter((el) => {
      if (el.current_period_end > new Date()) {
        return el;
      }
    });

    let text = "❌Активной подписки не обнаружено❌";

    if (subscriptions.length) {
      text = await Promise.all(
        subscriptions.map(async (subscription) => {
          const status = "✅ Активна";

          if (subscription.product.is_trial) {
            const main_product = await Products.findOne({
              stripe_product_id: subscription.product.stripe_product_id,
              is_trial: false,
            });

            const next_payment_date = subscription.current_period_end
              ? subscription.current_period_end.toLocaleDateString()
              : null;
            const next_payment =
              subscription.status === "active"
                ? `Следующий платёж на сумму ${main_product.price}$ состоится ${next_payment_date}`
                : `Пакет действителен до ${next_payment_date}`;

            const main_text = `Твой пакет подписки: ${subscription.product.name_view}, ${subscription.product.price_show}\nСтатус: ${status}\n${next_payment}`;
            return main_text;
          }

          let next_payment = `Следующий платёж на сумму ${subscription.product.price}$ состоится ${
            subscription.current_period_end ? subscription.current_period_end.toLocaleDateString() : null
          }`;

          if (subscription.status === "past_due") {
            next_payment = `Оплата не прошла. Нужно оплатить до ${subscription.date_delete_user.toLocaleDateString()}`;
          }

          if (subscription.status === "canceled") {
            next_payment = "Следующий платеж: не состоится по причине того, что вы отменили ежемесячные списания";
          }

          const main_text = `Твой пакет подписки ${subscription.product.name_view}, ${subscription.product.price_show}\nСтатус: ${status}\n${next_payment}`;

          return main_text;
        })
      );
      text = text.join("\n\n");
    }

    await bot.sendMessage(id, text, keyboardBack);
  } catch (error) {
    console.log(error);
  }
};

module.exports = mySubscription;
