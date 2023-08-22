const { Messages } = require("../model/Messages");

class ReactionHandler {
  async handle(query) {
    const parts = query.split(".");
    try {
      await Messages.findByIdAndUpdate(parts[2], {
        reaction: parts[1]
      });
    } catch (e) {
      console.log(e);
    }
  }
}

module.exports = ReactionHandler;