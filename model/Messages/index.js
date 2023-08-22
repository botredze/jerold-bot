const mongoose = require("mongoose");
const generalSchema = require("./schema");
const path = require("path");

const SENT = "sent";
const NOT_SENT = "not_sent";

generalSchema.statics.create = async function (templateId, userId) {
  const message = new this({
    template_id: templateId,
    user_id: userId,
    status: NOT_SENT
  });
  await message.save(function (err) {
    if (err) return console.log(err);
  });
  return message;
};

const modelName = path.basename(__dirname);
const model = mongoose.model(modelName, generalSchema);

module.exports = {
  Messages: model,
  SENT,
  NOT_SENT
};