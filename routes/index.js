const express = require("express");
const router = express.Router();
const controllers = require("../controllers");
const { signalHandler } = require("../controllers/signalHandler");

router.post("/", controllers.getValue);
router.post("/second", controllers.getValueSecond);
router.post("/third", signalHandler);
// router.post("/successPayment", controllers.successPayment);
// router.post("/failedPayment", controllers.failedPayment);
router.post("/cancelSubscription", controllers.cancelSubscription);
router.get("/image", controllers.generateCanvas);
router.get("/buy", controllers.getPageBuy);
router.get("/successPayment", controllers.getSuccessPage);
router.get("/cancel", controllers.getCancelPage);
router.post("/paymentIntent", controllers.getInntentToFront);
router.get("/instruction", controllers.getInstriction);
router.post("/refunded", controllers.refundedStripe);
router.get("/analytics/:type", controllers.analytics);
router.get("/get-user-ip", controllers.getCountry);
router.post("/wait_list", controllers.waitList);
// router.get("/sendpromo", controllers.sendPromo);

module.exports = router;
