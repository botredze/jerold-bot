const Logs = require('../model/Logs');
const Products = require('../model/Products');
const Users = require('../model/Users');
const Subscriptions = require('../model/Subscriptions');
const Payments = require('../model/Payments');

// Function to create a new log entry
const createLog = async (params) => {
  try {
    const log = await Logs.create(params);
    return log;
  } catch (error) {
    console.error("Error creating log:", error);
    throw error;
  }
};

// Function to find a single document in the Products collection
const findProduct = async (query) => {
  try {
    const product = await Products.findOne(query);
    return product;
  } catch (error) {
    console.error("Error finding product:", error);
    throw error;
  }
};

// Function to find a document by ID and update it in the Subscriptions collection
const findByIdAndUpdateSubscription = async (id, update) => {
  try {
    const subscription = await Subscriptions.findByIdAndUpdate(id, update, { new: true });
    return subscription;
  } catch (error) {
    console.error("Error updating subscription:", error);
    throw error;
  }
};

// Function to find a document by ID in the Users collection
const findUserById = async (id) => {
  try {
    const user = await Users.findById(id);
    return user;
  } catch (error) {
    console.error("Error finding user:", error);
    throw error;
  }
};

// Function to create a new payment entry
const createPayment = async (params) => {
  try {
    const payment = await Payments.create(params);
    return payment;
  } catch (error) {
    console.error("Error creating payment:", error);
    throw error;
  }
};

module.exports = {
  createLog,
  findProduct,
  findByIdAndUpdateSubscription,
  findUserById,
  createPayment,
};
