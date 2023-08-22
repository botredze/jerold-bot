const mongoose = require("mongoose");
const generalSchema = require("./schema");
const path = require("path");

const modelName = path.basename(__dirname);
const model = mongoose.model(modelName, generalSchema);

module.exports = model;