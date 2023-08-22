const mongoose = require("mongoose");

module.exports = new mongoose.Schema({
  phone: { type: String, required: true },
  email: { type: String, required: true },
});