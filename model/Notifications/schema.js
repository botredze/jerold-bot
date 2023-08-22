const mongoose = require("mongoose");
const { Schema } = mongoose;

module.exports = new Schema(
  {
    telegram_id: {
      type: String,
      required: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: "Products",
    },
    type: {
      type: String,
    },
    status: {
      type: String, // sended || not send || progress
      default: "not send",
    },
    date_send: {
      type: Date,
      required: true,
    },
    text: {
      type: String,
    },
    keyboard: {
      type: Object,
      default: null,
    },
    send_log: {
      type: Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);
