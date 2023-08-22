const mongoose = require("mongoose");
const generalSchema = require("./schema");
const path = require("path");

generalSchema.statics.createOrUpdate = async function (user, channel, banned = false) {
  const record = await this.findOne({ user, channel });

  if (!record) {
    const new_record = new this({
      user,
      channel,
      banned,
    });
    await new_record.save(function (err) {
      if (err) return console.log(err);
    });
    return;
  }

  await this.findByIdAndUpdate(record._id, {
    banned,
  });
};

const modelname = path.basename(__dirname);
const model = mongoose.model(modelname, generalSchema);

module.exports = model;
