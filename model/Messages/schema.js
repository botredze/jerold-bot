const mongoose = require("mongoose");
const { Schema } = mongoose;

module.exports = new Schema(
  {
    template_id: {
      type: Schema.Types.ObjectId,
      ref: "message_templates",
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "users",
    },
    status: {
      type: String,
      default: "not_sent",
    },
    reaction: {
      type: String
    }
  },
  { timestamps: true }
);
