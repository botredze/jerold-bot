const mongoose = require("mongoose");
const { Schema } = mongoose;

module.exports = new Schema(
  {
    telegramID: {
      type: "string",
      default: null,
    },
    is_bot: {
      type: Boolean,
    },
    first_name: {
      type: String,
    },
    username: {
      type: String,
    },
    language_code: {
      type: String,
    },
    date_delete_user: {
      type: Date,
      default: null,
    },
    channel_id: {
      type: String,
      default: null,
    },
    send_failed_payment: {
      type: Boolean,
      default: null,
    },
    item_bought: {
      type: String,
      default: null,
    },
    data_for_pay: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      default: null,
    },
    email: {
      type: String,
      default: null,
    },
    subscription_id: {
      type: String,
      default: null,
    },
    banned: {
      type: Boolean,
      default: false,
    },
    next_payment: {
      type: Date,
      default: null,
    },
    payment_method: {
      type: String,
      default: null,
    },
    referral_link: {
      type: Schema.Types.ObjectId,
      ref: "Referral_links",
      default: null,
    },
    referral_program: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
      default: null,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: "Products",
      default: null,
    },
    send_news_paper: {
      type: Boolean,
      default: false,
    },

    stripe_customer_id: {
      type: String,
      default: null,
    },
    pipedrive_contact_id: {
      type: String,
      default: null,
    },
    zendesk_contact_id: {
      type: String,
      default: null,
    },
    used_promo_subscription: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);
