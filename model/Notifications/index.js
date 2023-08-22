const mongoose = require("mongoose");
const generalSchema = require("./schema");
const path = require("path");

const modelname = path.basename(__dirname);
const model = mongoose.model(modelname, generalSchema);

module.exports = model;
