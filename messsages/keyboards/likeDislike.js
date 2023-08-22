async function likeDislike(user, template, message, product) {
  return {
    reply_markup: {
      resize_keyboard: true,
      inline_keyboard: [
        [
          {
            text: "👍",
            callback_data: `react.like.${message._id}`,
          },
          {
            text: "👎",
            callback_data: `react.dislike.${message._id}`,
          },
        ],
      ],
    },
  };
}

module.exports = likeDislike;