const bot = require("../../bot");

async function goToChannel(user, template, message, product) {
  const inviteLink = await bot.createChatInviteLink(product.channel_id, { member_limit: 1 });
  return {
    reply_markup: {
      resize_keyboard: true,
      inline_keyboard: [
        [
          {
            text: "Перейти в канал",
            url: inviteLink.invite_link
          }
        ]
      ]
    }
  };
}

module.exports = goToChannel;