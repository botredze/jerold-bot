const express = require("express");
const router = express.Router();
const controllers = require("../../controllers/payment/index");

router.post("/create", controllers.create);
router.post("/webhook", controllers.webhook);
router.post("/validate", controllers.validateUserInfo);
router.post("/chekDemo", controllers.checkDemo);
router.post("/tinkoffNotification", controllers.tinkoffNotification);
router.post("/status", controllers.getStatus);

module.exports = router;
