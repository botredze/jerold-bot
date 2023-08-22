const mongoose = require("mongoose");
const { Schema } = mongoose;

module.exports = new Schema(
  {
    link: {
      type: String,
      required: true,
      unique: true,
    },
    number_of_users: {
      type: Number,
      default: 0,
    },
    users: [
      {
        type: Schema.Types.ObjectId,
        ref: "Users",
      },
    ],
  },
  { timestamps: true }
);
