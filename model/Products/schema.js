const mongoose = require("mongoose");
const { Schema } = mongoose;

module.exports = new Schema(
  {
    name: {
      type: String,
      require: true,
    },
    market: {
      type: Number
    },
    kind: {
      type: Number
    },
    name_view: {
      type: String,
      require: true,
    },
    description: {
      type: String,
    },
    price: {
      type: Number,
      require: true,
    },
    price_show: {
      type: String,
      require: true,
    },
    channel_id: {
      type: String,
      require: true,
    },
    channel_url: {
      type: String,
      default: null,
    },
    stripe_product_id: {
      type: String,
      require: true,
    },
    stripe_price_id: {
      type: String,
      default: null,
    },
    is_trial: {
      type: Boolean,
      default: false,
    },
    duration: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      require: true,
    },
    callback_name: {
      type: String,
      default: null,
    },
    start_date: {
      type: Date,
      default: null,
    },
    end_date: {
      type: Date,
      default: null,
    },
    subscription_type: {
      type: String,
      default: null,
      required: true,
    },
    is_visible: {
      type: Boolean,
      default: true,
      required: true,
    }
  },
  { timestamps: true }
);
