require("dotenv").config();
const Subscriptions = require("../../model/Subscriptions");
const Users = require("../../model/Users");
const Payments = require("../../model/Payments");
const Products = require("../../model/Products");
const _ = require("lodash");

const main = async (id, bot) => {
  try {
    const payments = await Payments.find({ user: id, status: "approved" }).populate({
      path: "subscription",
      populate: {
        path: "product",
      },
    });

    const user = await Users.findOne({ _id: id });

    const payments_actual = payments.filter((el) => {
      if (
        el.subscription.current_period_end > new Date() &&
        el.subscription.status !== "past_due" &&
        el.subscription.status !== "inactive"
      ) {
        return el;
      }
    });

    const subscriptions = payments_actual.map((el) => el.subscription);
    const uniq_subscriptions = _.uniqBy(subscriptions, (el) => el.product.channel_id);

    let keyboard = [];

    if (!user.banned && uniq_subscriptions.length) {
      console.log("uniq_subscriptions")
      console.log(uniq_subscriptions)
      const channels = uniq_subscriptions.map(async (el) => {
        try {
          console.log("!!!!__________el__________!!!!");
          console.log(el.product.channel_id)
          console.log(el)
          const inviteLink = await bot.createChatInviteLink(el.product.channel_id, { member_limit: 1 });
          return [
            {
              text: `Канал ${el.product.name_view}`,
              url: inviteLink.invite_link
            }
          ];
        } catch (e) {
          console.log("inviteLink___________ERROR");
          console.error(e);
        }
      });
      console.log(channels)
      if (channels) {
        let channelPromise;
        while (channelPromise = channels.shift()) {
          let channel = await channelPromise;
          console.log("channel");
          console.log(channel);
          keyboard.push(channel);
        }
      }
    }

    // if (!user.banned && !uniq_subscriptions.length && user.channel_id) {
    //   const product = await Products.findOne({ channel_id: user.channel_id });
    //   try {
    //     const inviteLink = await bot.createChatInviteLink(user.channel_id, { member_limit: 1 });
    //     keyboard.push([
    //       {
    //         text: `Канал ${product.name_view}`,
    //         url: inviteLink.invite_link
    //       }
    //     ]);
    //   } catch (e) {
    //     console.error(e);
    //   }
    // }

    keyboard.push(
      [
        {
          text: "Больше обо мне",
          callback_data: "about",
        },
      ],
      [
        {
          text: `Инструкция`,
          web_app: {
            url: `${process.env.HOST}/instruction`,
          },
        },
      ],
      [
        {
          text: "Управление подпиской",
          callback_data: "manage_subscription",
        },
      ],
      [
        {
          text: "Поддержка",
          callback_data: "support",
        },
      ]
    );

    return {
      reply_markup: {
        resize_keyboard: true,
        one_time_keyboard: true,
        inline_keyboard: keyboard,
      },
    };
  } catch (error) {
    console.log(error);
  }
};

module.exports = main;
