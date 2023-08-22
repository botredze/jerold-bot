const mongoose = require("mongoose");
const generalSchema = require("./schema");
const path = require("path");

generalSchema.statics.createProduct = async function (name, name_view, description, price, price_show, channel_id) {
  const product = new this({
    name,
    name_view,
    description,
    price,
    price_show,
    channel_id,
  });
  product.save(function (err) {
    if (err) return console.log(err);
  });
};

const modelname = path.basename(__dirname);
const model = mongoose.model(modelname, generalSchema);

module.exports = model;
