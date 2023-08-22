const mongoose = require("mongoose");
const { Schema } = mongoose;

module.exports = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "Users",
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: "Products",
    },
    amount: {
      type: Number,
      default: null,
    },
    currency: {
      type: String, // USD || RUB
      default: null,
    },
    crm_deal_id: {
      type: String,
      default: null,
    },
    payment_method: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      default: "created", // created || approved || failed || refunded
    },
    channel_id: {
      type: String,
      default: null,
    },
    payment_id: {
      type: String,
      default: null,
    },
    order_id: {
      type: String,
      default: null,
    },
    subscription: {
      type: Schema.Types.ObjectId,
      ref: "Subscriptions",
    },
    main_payment: {
      type: Boolean, // для подписки Тинькофф, главный платеж
      default: false,
    },
    paid_at: {
      type: Date,
      default: null,
    },
    send_notification: {
      type: Boolean,
      default: false,
    },
    exchange_rate: {
      type: String,
      default: null,
    },
    metadata: [
      {
        key: String,
        value: String,
      },
    ],
  },
  { timestamps: true }
);
