const mongoose = require("mongoose");
const generalSchema = require("./schema");
const path = require("path");

generalSchema.statics.findOrCreateByTelegramId = async function (
  id,
  is_bot,
  first_name,
  username,
  language_code,
  phone,
  email,
  link
) {
  const clientCandidate = await this.findOne({ telegramID: id });

  if (!clientCandidate) {
    const newUser = new this({
      telegramID: id,
      is_bot,
      first_name,
      username,
      language_code,
      phone,
      email,
      referrer: link || null,
    });

    newUser.save(function (err) {
      if (err) return console.log(err);
    });
    return newUser;
  } else {
    const user = await this.findByIdAndUpdate(
      clientCandidate._id,
      {
        telegramID: id,
        is_bot,
        first_name,
        username,
        language_code,
        phone,
        email,
        referrer: link || null,
      },
      { new: true }
    );
    return user;
  }
};

generalSchema.statics.findOrCreateByEmail = async function (
  name,
  email,
  phone,
  stripe_customer_id,
  pipedrive_contact_id,
  newspaper
) {
  const clientCandidate = await this.findOne({ email: new RegExp(email, "i") });

  if (!clientCandidate) {
    const newUser = new this({
      first_name: name,
      phone,
      email,
      stripe_customer_id: stripe_customer_id || null,
      pipedrive_contact_id: pipedrive_contact_id || null,
      send_news_paper: newspaper,
    });

    await newUser.save(function (err) {
      if (err) return console.log(err);
    });
    return newUser;
  } else {
    const user = await this.findByIdAndUpdate(
      clientCandidate._id,
      {
        stripe_customer_id,
        pipedrive_contact_id,
        send_news_paper: newspaper,
      },
      { new: true }
    );
    return user;
  }
};

const modelname = path.basename(__dirname);
const model = mongoose.model(modelname, generalSchema);

module.exports = model;
