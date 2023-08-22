const mongoose = require("mongoose");
const generalSchema = require("./schema");
const path = require("path");
const Payments = require("../Payments");

generalSchema.statics.createSubWithPayment = async function(
  user,
  crm_deal_id,
  product,
  subscription_id_service,
  status,
  payment_data
) {
  const subscription = await new this({
    user,
    crm_deal_id,
    product,
    subscription_id_service,
    status,
    created_at: new Date()
  });

  let payment = new Payments({
    ...payment_data,
    subscription: subscription._id
  });

  subscription.payments = payment;

  subscription.save(function(err) {
    if (err) return console.log(err);
  });

  payment.save(function(err) {
    if (err) return console.log(err);
  });

  return subscription;
};

generalSchema.statics.deactivate = async function(id) {
  await this.updateOne({ _id: id }, {
    status: "inactive",
    who_canceled: "system",
    canceled_at: new Date()
  });
};

generalSchema.statics.createSubWithPaymentOldUser = async function(subscription_data, payment_data) {
  const subscription = await new this({
    ...subscription_data
  });

  const payment = new Payments({
    ...payment_data,
    subscription: subscription._id
  });

  subscription.payments = payment;

  subscription.save(function(err) {
    if (err) return console.log(err);
  });

  payment.save(function(err) {
    if (err) return console.log(err);
  });

  return subscription;
};

const modelname = path.basename(__dirname);
const model = mongoose.model(modelname, generalSchema);

module.exports = model;
