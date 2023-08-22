const cron = require("node-cron");
const fs = require("fs").promises;
const path = require("path");
const _ = require("lodash");
const moment = require("moment");

const Notifications = require("../model/Notifications");
const Users_channels = require("../model/Users_channels");
const stripe = require("stripe")(process.env.STRIPE_PROD);

const Users = require("../model/Users");
const RefferalLinks = require("../model/Referral_links");
const Logs = require("../model/Logs");
const Products = require("../model/Products");
const Subscriptions = require("../model/Subscriptions");
const Payments = require("../model/Payments");
const bot = require("../bot");
const canvas = require("./canvas");
const tinkoffService = require("../services/tinkoff");
const messageScheduler = require("../messsages/MessageScheduler");
const UsersBlocker = require("../utils/usersBlocker");

const queue = [];

const addElementToQueue = (obj) => {
  queue.push(obj);
};

cron.schedule("00 * * * *", async () => {
  await messageScheduler.setBot(bot).run();
});

// //delete user from channel every hour
cron.schedule("55 23 * * *", async () => {
  //const blocker = new UsersBlocker(bot);
  //await blocker.cleanUp();

  // try {
  //   const dateEnd = moment().endOf('day').toISOString();
  //   const subscriptions = await Subscriptions.aggregate([
  //     {
  //       $match: {
  //         $and: [
  //           { status: { $in: ["active", "canceled"] } },
  //           {
  //             $or: [
  //               { date_delete_user: { $gt: dateEnd } },
  //               { current_period_end: { $gt: dateEnd } },
  //               { trial_end: { $gt: dateEnd } }
  //             ]
  //           }
  //         ]
  //       }
  //     },
  //     {
  //       $addFields: {
  //         maxDate: {
  //           $max: ["$date_delete_user", "$current_period_end", "$trial_end"]
  //         }
  //       }
  //     },
  //     {
  //       $match: {
  //         maxDate: { $gt: dateEnd }
  //       }
  //     },
  //     {
  //       $lookup: {
  //         from: "users",
  //         localField: "user",
  //         foreignField: "_id",
  //         as: "user"
  //       }
  //     },
  //     {
  //       $lookup: {
  //         from: "products",
  //         localField: "product",
  //         foreignField: "_id",
  //         as: "product"
  //       }
  //     },
  //     {
  //       $unwind: "$user"
  //     },
  //     {
  //       $unwind: "$product"
  //     }
  //   ]);
  //
  //   // console.log("subscriptions", subscriptions);
  //
  //   // const banUser = async (user, product) => {
  //   //   try {
  //   //     const channelId = product ? product.channel_id : user.channel_id;
  //   //     const response = await bot
  //   //       .banChatMember(channelId, user.telegramID)
  //   //       .catch(async (err) => await Logs.create("Cron Error", user.channel_id, err.response.body));
  //   //
  //   //     if (response) {
  //   //       await Users.updateOne({ _id: user._id }, { banned: true });
  //   //       await Logs.create(user.telegramID, "user_banned", "system", JSON.stringify(user), null);
  //   //       await Users_channels.createOrUpdate(user._id, channelId, true);
  //   //
  //   //       await bot
  //   //         .sendMessage(user.telegramID, `Вы были удалены из канала ${product.name_view}`)
  //   //         .catch(async (err) => await Logs.create(null, "Cron Error", user.channel_id, err));
  //   //     } else {
  //   //       console.log(`Не отработала функция бана ${user.telegramID} ${product.name_view}`);
  //   //       await Logs.create(null, "cron-error", `Не отработала функция бана ${user.telegramID} ${product.name_view}` )
  //   //       // await bot.sendMessage("-1001642911005", `Не отработала функция бана ${user.telegramID} ${product.name_view}`);
  //   //     } }catch (err){
  //   //     await Logs.create(null, "cron-error", user.channel_id, err)
  //   //     console.log(err);
  //   //   }
  //   // }
  //
  //   console.log("deleted user from channel", subscriptions.length);
  //
  //   if (subscriptions.length) {
  //     for await (let subscription of subscriptions) {
  //       const { user, product } = subscription;
  //         await banUser(user, product).catch(async (error)=> {
  //           await Logs.create("Cron Error", user.channel_id, error .response.body)
  //         });
  //     }
  //   }
  // } catch (error) {
  //    await Logs.create(null, "cron_error", "cron", error.stack.toString(), "cron delete user from channel");
  //    console.log("cron delete user error", error);
  //   // await bot.sendMessage("-1001642911005", `Не отработала функция бана глобальная ошибка`);
  // }
});

cron.schedule("* * * * *", async () => {
  console.log("queue length", queue.length, new Date().toISOString());
  for (let i = 0; i < 19; i++) {
    const { channel_id, imageData } = queue[0];
    let responseImage;
    if (typeof imageData === "string") {
      responseImage = canvas.returnShortImage(imageData);
    } else {
      responseImage = canvas.generateImageFromJson(imageData);
    }
    await bot.sendPhoto(channel_id, responseImage).then((r) => queue.splice(0, 1));
  }
});

// // tinkoff autoPay
// cron.schedule("* * * * *", async () => {
//   try {
//     console.log(">>>>>>>>>>");
//     const dateStart = new Date();
//     dateStart.setHours(00, 00, 00);
//     const dateEnd = new Date();
//     dateEnd.setHours(23, 59, 59);
//     const subscriptions = await Subscriptions.find({
//       status: "active",
//       rebill_id: { $ne: null },
//       // current_period_end: {
//       //   $gte: dateStart,
//       //   $lt: dateEnd,
//       // },
//       canceled_at: null,
//     });

//     if (subscriptions.length) {
//       for await (let subscription of subscriptions) {
//         console.log("TEUE");
//         const data = await tinkoffService.renewal(subscription._id, true);
//         console.log(data);
//       }
//     }
//   } catch (error) {
//     await Logs.create(null, "cron_error", "cron", error.stack.toString(), "cron tinkoff autoPay");
//   }

//   // const users = await Users.find({
//   //   channel_id: {
//   //     $ne: null,
//   //   },
//   //   next_payment: {
//   //     $gte: dateStart,
//   //     $lt: dateEnd,
//   //   },
//   //   payment_method: "tinkoff",
//   // });

//   // if (users.length) {
//   //   for await (let user of users) {
//   //     console.log(user);
//   //     const result = await tinkoff.init(user.telegramID, packages[0]);
//   //     console.log(result);
//   //     const date = new Date();
//   //     date.setDate(date.getDate() + 3);

//   //     if (result.status) {
//   //       const keyboardForPay = {
//   //         reply_markup: {
//   //           resize_keyboard: true,
//   //           inline_keyboard: [
//   //             [
//   //               {
//   //                 text: `Оплатить ₽${result.amount}`,
//   //                 web_app: {
//   //                   url: result.url,
//   //                 },
//   //               },
//   //             ],
//   //             [
//   //               {
//   //                 text: `Назад`,
//   //                 callback_data: "back_for_pay",
//   //               },
//   //             ],
//   //           ],
//   //         },
//   //       };

//   //       await bot
//   //         .sendMessage(user.telegramID, "Просим оплатить услугу в течение трех дней", keyboardForPay)
//   //         .then((r) => console.log(user.telegramID, "Tinkoff Просим оплатить услугу в течение трех дней"))
//   //         .catch((err) => console.log("cron tinkoff error", user.telegramID, err));

//   //       await Users.updateOne({ telegramID: user.telegramID }, { date_delete_user: date, send_failed_payment: true });
//   //     }
//   //   }
//   // }
// });

// cron.schedule("00 09 * * *", async () => {
//   const dateStart = new Date();
//   dateStart.setHours(00, 00, 00);
//   const dateEnd = new Date();
//   dateEnd.setHours(23, 59, 59);
//   const users = await Users.find({
//     channel_id: {
//       $ne: null,
//     },
//     next_payment: {
//       $gte: dateStart,
//       $lt: dateEnd,
//     },
//     payment_method: "tinkoff",
//   });

//   if (users.length) {
//     for await (let user of users) {
//       console.log(user);
//       const result = await tinkoff.init(user.telegramID, packages[0]);
//       console.log(result);
//       const date = new Date();
//       date.setDate(date.getDate() + 3);

//       if (result.status) {
//         const keyboardForPay = {
//           reply_markup: {
//             resize_keyboard: true,
//             inline_keyboard: [
//               [
//                 {
//                   text: `Оплатить ₽${result.amount}`,
//                   web_app: {
//                     url: result.url,
//                   },
//                 },
//               ],
//               [
//                 {
//                   text: `Назад`,
//                   callback_data: "back_for_pay",
//                 },
//               ],
//             ],
//           },
//         };

//         await bot
//           .sendMessage(user.telegramID, "Просим оплатить услугу в течение трех дней", keyboardForPay)
//           .then((r) => console.log(user.telegramID, "Tinkoff Просим оплатить услугу в течение трех дней"))
//           .catch((err) => console.log("cron tinkoff error", user.telegramID, err));

//         await Users.updateOne({ telegramID: user.telegramID }, { date_delete_user: date, send_failed_payment: true });
//       }
//     }
//   }
// });

// //referral system
cron.schedule("* * * * *", async () => {
  const dateStart = new Date();
  dateStart.setDate(dateStart.getDate() + 1);
  dateStart.setHours(00, 00, 00);

  const dateEnd = new Date();
  dateEnd.setDate(dateEnd.getDate() + 1);
  dateEnd.setHours(23, 59, 59);

  const referal_link = await RefferalLinks.findOne({ link: "420c9a1f70ef6c36357a" });
  const users = await Promise.all(
    referal_link.users.map(async (el) => {
      const user = await Users.findOne({ _id: el });
      return user;
    })
  );

  const needed_users = _.filter(users, (user) => user.next_payment > dateStart && user.next_payment < dateEnd);
  console.log("referral system", needed_users);
  if (needed_users.length) {
    for await (let user of needed_users) {
      await Users.updateOne({ _id: user._id }, { referral_program: false });
    }
  }
});

// cron.schedule("* * * * *", async () => {
//   try {
//     const messages = await Notifications.find({ date_send: { $lte: new Date() }, status: { $ne: "sended" } });
//
//     for await (let message of messages) {
//       await Notifications.findByIdAndUpdate({ _id: message._id }, { status: "progress" });
      // if (message.keyboard) {
      //   await bot
      //     .sendMessage(message.telegram_id, message.text, message.keyboard)
      //     .then(async (r) => {
      //       await Notifications.findByIdAndUpdate({ _id: message._id }, { status: "sended", send_log: r });
      //     })
      //     .catch(async (err) => {
      //       console.log(err);
      //       await Notifications.findByIdAndUpdate({ _id: message._id }, { status: "not send", send_log: err });
      //     });
      // } else {
      //   await bot
      //     .sendMessage(message.telegram_id, message.text)
      //     .then(async (r) => {
      //       await Notifications.updateOne({ _id: message._id }, { status: "sended", send_log: r });
      //     })
      //     .catch(async (err) => {
      //       console.log(err);
      //       await Notifications.updateOne({ _id: message._id }, { status: "not send", send_log: err });
      //     });
      // }
//     }
//   } catch (error) {
//     console.log(error);
//   }
// });

module.exports = {
  cron,
  addElementToQueue
};
