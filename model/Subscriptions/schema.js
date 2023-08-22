const mongoose = require("mongoose");
const { Schema } = mongoose;

module.exports = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "Users",
    },
    crm_deal_id: {
      type: String,
      default: null,
    },
    payments: [
      {
        type: Schema.Types.ObjectId,
        ref: "Payments",
      },
    ],
    product: {
      type: Schema.Types.ObjectId,
      ref: "Products",
    },
    subscription_id_service: {
      type: String, // Id подписки на стороннем сервисе
      default: null,
    },
    status: {
      type: String, // active || inactive || past_due || canceled
      default: null,
    },
    started_at: {
      type: Date,
      default: null,
    },
    old_date_start: {
      type: Date,
      default: null,
    },
    canceled_at: {
      type: Date,
      default: null,
    },
    created_at: {
      type: Date,
      default: null,
    },
    current_period_start: {
      type: Date,
      default: null,
    },
    current_period_end: {
      type: Date,
      default: null,
    },
    trial_start: {
      type: Date,
      default: null,
    },
    trial_end: {
      type: Date,
      default: null,
    },
    who_canceled: {
      type: String, // user || system
      default: null,
    },
    date_delete_user: {
      type: Date,
      default: null,
    },
    rebill_id: {
      type: String,
      default: null,
    },
    note: {
      type: String,
      default: null,
    },
    auto_renew: {
      type: Boolean,
      default: false, // Флаг автоматического продления подписки
    },
    next_renewal_date: {
      type: Date,
      default: null, // Дата следующего автоматического продления
    },
    grace_period_days: {
      type: Number,
      default: 0, // Количество дней, на которые подписка будет продлена после отмены автоматического продления
    },
    zendesk_deal_id: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);
