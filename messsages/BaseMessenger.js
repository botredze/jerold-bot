const { SENT, Messages } = require("../model/Messages");

class BaseMessenger {
  constructor(keyboards, telegramBot) {
    this.telegramBot = null;
    this.keyboards = keyboards;
  }

  setBot(bot) {
    this.telegramBot = bot;
    return this;
  }

  prepareKeyboard(user, template, message, product) {
    const keyboard = this.keyboards[template.keyboard_name];
    if (typeof keyboard !== "function") {
      throw new Error(`Keyboard ${template.keyboard_name} is not defined`);
    }
    return keyboard(user, template, message, product);
  }

  sendMessage(telegramId, body, message, keyboard) {
    console.log(telegramId, body, keyboard);
    this.telegramBot.sendMessage(telegramId, body, keyboard)
      .then(async data => {
        console.log(data);
        const msg = await Messages.findOne({ _id: message._id });
        msg.status = SENT;
        msg.save(e => console.log(e));
      })
      .catch(e => console.log(e));
  }
}

module.exports = BaseMessenger;