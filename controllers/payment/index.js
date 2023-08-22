const stripeServices = require("../../services/stripe");
const tinkoffServices = require("../../services/tinkoff");
const Logs = require("../../model/Logs");
const Payments = require("../../model/Payments");
const { phone } = require("phone");
const Users = require("../../model/Users");
const _ = require("lodash");

const validateWallet = (data) => {
  if (!phone(data.phone).isValid) {
    return { status: 0, message: "phone not valid" };
  }
  return { status: 1, message: "" };
};

const create = async (req, res) => {
  const payment_system = req.body.payment_system;
  let response = null;
  switch (payment_system) {
    case "stripe":
      response = await stripeServices.createPayment(req.body);
      res.status(response.status).send(response.body);
      break;
    case "tinkoff":
      response = await tinkoffServices.createPayment(req.body);
      res.status(response.status).send(response.body);
      break;
    default:
      await Logs.create(null, "payment_error", "system", "Payment_system not found");
      res.status(400).send({ message: "Payment system not found" });
      break;
  }
};

const webhook = async (req, res) => {
  const event = req.body;
  res.status(200).send("OK");
  switch (event.type) {
    case "invoice.payment_failed":
      const invoicePaymentFailed = event.data.object;
      await stripeServices.failed(invoicePaymentFailed);
      break;
    case "invoice.payment_succeeded":
      const invoicePaymentSucceeded = event.data.object;
      await stripeServices.succeeded(invoicePaymentSucceeded);
      break;
    case "charge.refunded":
      const refunded = event.data.object;
      await stripeServices.refunded(refunded);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }
};

const tinkoffNotification = async (req, res) => {
  res.status(200).send("OK");

  switch (req.body.Status) {
    case "CONFIRMED":
      await tinkoffServices.succeeded(req.body);
      break;
    case "REJECTED":
      await tinkoffServices.failed(req.body);
      break;
  }
};

const validateUserInfo = async (req, res) => {
  const validateResult = validateWallet(req.body);
  return res.status(200).send(validateResult);
};

const getStatus = async (req, res) => {
  const { payment_id } = req.body;

  if (!payment_id) {
    await Logs.create(null, "system_error", "system", "Payment id not found", null);
    return res.status(400).send({ message: "Payment id not found" });
  }

  const payment = await Payments.findOne({ payment_id });

  if (!payment) {
    await Logs.create(null, "system_error", "system", `Payment not found ${payment_id}`, null);
    return res.status(400).send({ message: "Payment not found" });
  }

  res.status(200).send({
    payment_id,
    status: payment.status,
  });
};

const checkDemo = async (req, res) => {
  const usersByEmail = await Users.find({ email: req.body.email });
  const usersByPhone = await Users.find({ email: { $ne: req.body.email }, phone: req.body.phone });
  const users = _.concat(usersByEmail, usersByPhone);
  const result = await Promise.all(
    users.map(async (el) => {
      const payment = await Payments.find({ user: el._id, status: "approved" }).populate("product");
      const product_trial = _.find(payment, function (el) {
        return el.product.callback_name === "product_trial_fundamental_forex" && el.product.is_trial;//TODO поправить логику
      });
      return !!product_trial;
    })
  );
  const demo = _.includes(result, true);
  res.status(200).send({
    demo,
  });
};

module.exports = {
  create,
  webhook,
  validateUserInfo,
  tinkoffNotification,
  getStatus,
  checkDemo,
};
