const mongoose = require("mongoose");
const generalSchema = require("./schema");
const path = require("path");

generalSchema.statics.attachLink = async function (link, user) {
  const linkCandidate = await this.findOne({ link });

  if (linkCandidate) {
    await this.findOneAndUpdate({ link }, { $push: { users: user } })
      .then((r) => console.log(r))
      .catch((err) => console.log(err));
  }
};
generalSchema.statics.createLink = async function (link) {
  const referral_link = await this.create({
    link: link,
  });
  return referral_link;
};

const modelname = path.basename(__dirname);
const model = mongoose.model(modelname, generalSchema);

module.exports = model;
