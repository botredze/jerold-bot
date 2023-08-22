const MessageSchedules = require("../model/MessageSchedules");
const filters = require("./filters");
const BaseMessenger = require("./BaseMessenger");
const { Messages } = require("../model/Messages");
const Subscriptions = require("../model/Subscriptions");
const bot = require("../bot");
const keyboards = require("./keyboards");
const { SCHEDULED } = require("./event_types");
const moment = require('moment-timezone');

class MessageScheduler extends BaseMessenger {
  constructor(telegramBot, filters, keyboards) {
    super(keyboards, telegramBot);
    this.filters = filters;
  }

  async run() {
    try {
      const currentDateTime = moment().utcOffset('+03:00');
      const now = currentDateTime.hour() + ":00";
      const messageSchedules = await MessageSchedules.find({ time: now });

      for (const schedule of messageSchedules) {
        let subscriptions = await this.findSubscriptions(schedule);
        for (const subscription of subscriptions) {
          const user = subscription.user;
          const message = await Messages.create(schedule._id, user._id);

          const keyboard = await this.prepareKeyboard(user, schedule, message, subscription.product);
          await this.sendMessage(user.telegramID, schedule.message_body, message, keyboard);
        }
      }
    } catch (error) {
      console.error("Error processing message schedules:", error);
    }
  }

  async findSubscriptions(schedule) {
    const { product_id, day, filter_name, subscription_status } = schedule;
    const now = new Date();
    const subscriptionDate = new Date();
    subscriptionDate.setDate(now.getDate() - day + 1);
    const subscriptions = await this.fetchSubscriptionsByDate(subscriptionDate, product_id, subscription_status);
    if (filter_name) {
      const filter = this.getFilter(filter_name);
      return filter(subscriptions);
    }
    return subscriptions;
  }

  async fetchSubscriptionsByDate(date, productId, subscriptionStatus) {
    try {
      const dateParsed = date.toISOString().split("T");
      const dateString = dateParsed[0];
      const startDate = new Date(`${dateString}T00:00:00.007Z`);
      const endDate = new Date(startDate.toISOString());
      endDate.setDate(endDate.getDate() + 1);

      return await Subscriptions.find({
        event_type: SCHEDULED,
        product_id: productId,
        status: subscriptionStatus,
        current_period_start: { $gte: startDate, $lt: endDate }
      }).populate(["user", "product"]);
    } catch (error) {
      console.error('Error fetching subscriptions by date:', error);
      return [];
    }
  }

  getFilter(name) {
    return this.filters.find(f => name === f.name);
  }
}

const messageScheduler = new MessageScheduler(bot, filters, keyboards);

module.exports = messageScheduler;