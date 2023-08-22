const Users = require("../model/Users");
const Logs = require("../model/Logs");
const Subscriptions = require("../model/Subscriptions");
const Users_channels = require("../model/Users_channels");

class UsersBlocker {
  constructor(telegramBot) {
    this.telegramBot = telegramBot;
  }

  async cleanUp() {
    const usersCanceledExpired = await this.getUsersWithCanceledSubscriptions();
    const usersActiveExpired = await this.getUsersWithActiveSubscriptions();
    const usersWithDateDeleteUser = await this.getUsersWithDateDeleteUser();
    usersCanceledExpired.push(...usersWithDateDeleteUser, ...usersActiveExpired);

    console.log("___USERS___");
    console.log(usersCanceledExpired);

    const batchSize = 10;
    const batches = [];
    for (let i = 0; i < usersCanceledExpired.length; i += batchSize) {
      const batch = usersCanceledExpired.slice(i, i + batchSize);
      batches.push(batch);
    }

    for (const batch of batches) {
      await Promise.all(
        batch.map(async user => {
          if (user.telegramID) {
            await this.banUser(user);
          }
        })
      );
      await new Promise((resolve) => setTimeout(resolve, 60 * 1000));
    }
  }

  async getUsersWithDateDeleteUser() {
    try {
      const query = this.baseQuery();
      query.splice(4, 0, {
        $match: {
          $and: [
            { "subscription.status": "past_due" },
            { "subscription.date_delete_user": { $ne: null } },
            { "subscription.date_delete_user": { $lte: new Date() } }
          ]
        }
      });
      return await Users.aggregate(query);
    } catch (error) {
      console.error(error);
    }
  }

  async getUsersWithActiveSubscriptions() {
    try {
      const query = this.baseQuery();
      query.splice(4, 0, {
        $match: {
          $and: [
            { "subscription.status": "active" },
            { "subscription.current_period_end": { $ne: null } },
            { "subscription.current_period_end": { $lte: new Date() } }
          ]
        }
      });
      return await Users.aggregate(query);
    } catch (error) {
      console.error(error);
    }
  }

  async getUsersWithCanceledSubscriptions() {
    try {
      const query = this.baseQuery();
      query.splice(4, 0, {
        $match: {
          //{ _id: mongoose.Types.ObjectId("635fd59d4ae6abe713c3dd83") },
          $and: [
            { "subscription.status": "canceled" },
            {
              $or: [
                {
                  $and: [
                    { "subscription.date_delete_user": { $ne: null } },
                    { "subscription.date_delete_user": { $lte: new Date() } }
                  ]
                },
                {
                  $and: [
                    { "subscription.current_period_end": { $ne: null } },
                    { "subscription.current_period_end": { $lte: new Date() } }
                  ]
                }
              ]
            }
          ]
        }
      });
      return await Users.aggregate(query);
    } catch (error) {
      console.error(error);
    }
  };

  async banUser(user) {
    const { subscription, product } = user;
    try {
      const channelId = product ? product.channel_id : user.channel_id;
      await this.telegramBot.banChatMember(channelId, user.telegramID);

      await Users.updateOne({ _id: user._id }, { banned: true });
      await Subscriptions.findByIdAndUpdate(subscription._id);
      await Logs.create(user.telegramID, "user_banned", "system", JSON.stringify(user), null);
      await Users_channels.createOrUpdate(user._id, channelId, true);

      await this.telegramBot
        .sendMessage(user.telegramID, `Вы были удалены из канала ${product.name_view}`)
        .catch(async (err) => await Logs.create(null, "ban_notification_error", "telegram", { user, err }, user));
    } catch (err) {
      console.log("----------start-----------");
      console.log(`Не отработала функция бана ${user.telegramID} ${product.name_view}`);
      await Logs.create(null, "ban_error", "telegram", { user, err }, user);
      await this.telegramBot
        .sendMessage(process.env.LOG_CHANNEL_ID, `Не отработала функция бана ${user.telegramID} ${product.name_view}`)
        .catch(e => console.log(e.message));
      console.log(err.message);
      console.log("----------end-----------");
    }
  }

  baseQuery() {
    return [
      //Делаем join с таблицей subscriptions
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "user",
          as: "subscriptions"
        }
      },
      //Создаем поле subscriptions для каждого юзера
      { $unwind: "$subscriptions" },
      //Сортируем результат по дате создания подписки
      { $sort: { "subscriptions.createdAt": -1 } },
      //Агрегируем подписки с юзерами, то есть группируем подписки по юзеру
      {
        $group: {
          _id: "$subscriptions.user",
          user: { $first: "$$ROOT" },
          //Тут мы указываем что из группы подписок мы берем только первый
          subscription: { $first: "$subscriptions" }
        }
      },
      //Указываем какие поля показать в конечном результате
      {
        $project: {
          _id: "$user._id",
          name: "$user.name",
          telegramID: "$user.telegramID",
          subscription: "$subscription",
          product: "$subscription.product"
        }
      },
      //Делаем join с продуктами
      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "productInfo"
        }
      },
      //создаем поле для продукта
      { $unwind: "$productInfo" },
      //Тут делаем выборку для подписок и продуктов
      {
        $project: {
          _id: 1,
          first_name: 1,
          telegramID: 1,
          subscriptions: {
            _id: "$subscription._id",
            status: "$subscription.status",
            createdAt: "$subscription.createdAt",
            current_period_start: "$subscription.current_period_start",
            current_period_end: "$subscription.current_period_end",
            trial_start: "$subscription.trial_start",
            trial_end: "$subscription.trial_end"
          },
          product: {
            _id: "$productInfo._id",
            name_view: "$productInfo.name_view",
            channel_id: "$productInfo.channel_id"
          }
        }
      }
    ];
  }
}

module.exports = UsersBlocker;