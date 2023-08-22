const mongoose = require("mongoose");
const generalSchema = require("./schema");
const path = require("path");
const Subscriptions = require("../Subscriptions");

generalSchema.statics.create = async function (data) {
  const payment = new this({
    ...data,
  });
  await payment.save(function (err) {
    if (err) return console.log(err);
  });
  return payment;
};

const modelname = path.basename(__dirname);
const model = mongoose.model(modelname, generalSchema);

module.exports = model;
