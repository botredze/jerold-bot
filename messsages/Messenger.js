const keyboards = require("./keyboards");
const BaseMessenger = require("./BaseMessenger");
const { Messages } = require("../model/Messages");
const MessageSchedules = require("../model/MessageSchedules");
const bot = require("../bot");

class Messenger extends BaseMessenger {
  async trigger(eventType, user, product, keyboard = null) {
    const template = await Messenger.findTemplate(eventType, product._id);
    const message = await Messages.create(template._id, user._id);

    if (!keyboard) {
      keyboard = this.prepareKeyboard(user, template, message, product);
    }

    this.sendMessage(user.telegramID, template.message_body, message, keyboard);
  }

  static async findTemplate(eventType, productId) {
    return await MessageSchedules.findOne({
      event_type: eventType,
      product_id: productId
    });
  }
}

const messenger = new Messenger(keyboards, bot);

module.exports = { messenger };