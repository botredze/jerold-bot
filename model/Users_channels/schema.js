const mongoose = require("mongoose");
const { Schema } = mongoose;

module.exports = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "Users",
    },
    channel: {
      type: String,
    },
    banned: {
      type: Boolean,
    },
  },
  { timestamps: true }
);
