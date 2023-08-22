const mongoose = require("mongoose");
const { Schema } = mongoose;

module.exports = new Schema(
  {
    event_type: {
      type: String
    },
    message_body: {
      type: String
    },
    product_id: {
      type: Schema.Types.ObjectId,
      ref: "products"
    },
    day: {
      type: Number
    },
    time: {
      type: String
    },
    time_zone: {
      type: String
    },
    keyboard_name: {
      type: String
    },
    subscription_status: {
      type: String
    },
    filter_name: {
      type: String
    }
  },
  { collection: "message_schedules", timestamps: true }
);
