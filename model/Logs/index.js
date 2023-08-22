const mongoose = require("mongoose");
const generalSchema = require("./schema");
const path = require("path");

generalSchema.statics.create = async function (telegram_id, event_type, owner, data, user, type_message) {
  const log = new this({
    telegram_id,
    event_type,
    owner,
    data,
    user: user ? user._id : user,
    type_message,
  });

  log.save(function (err) {
    if (err) return console.log(err);
  });
};

const modelname = path.basename(__dirname);
const model = mongoose.model(modelname, generalSchema);

module.exports = model;
