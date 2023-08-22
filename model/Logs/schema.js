const mongoose = require("mongoose");
const { Schema } = mongoose;

module.exports = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "Users",
    },
    telegram_id: {
      type: String,
      default: null,
    },
    event_type: {
      type: String,
      default: null,
    },
    owner: {
      type: String, // user || system
      default: "system",
    },
    data: {
      type: Schema.Types.Mixed,
      default: null,
    },
    type_message: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);
