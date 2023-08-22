const mongoose = require("mongoose");
const generalSchema = require("./schema");

generalSchema.statics.create = async function({ phone, email }) {
  try {
    const document = new this({ phone, email });
    await document.save();
    console.log("Документ успешно сохранен:", document);
    return document;
  } catch (error) {
    console.error("Ошибка при сохранении документа:", error);
    throw error;
  }
};

const WaitingList = mongoose.model("WaitingList", generalSchema, "waiting_list");

module.exports = WaitingList;