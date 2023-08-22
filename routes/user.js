const express = require("express");
const router = express.Router();
const controllers = require("../controllers/cabinet");

router.get("/", controllers.render);
router.post("/registration", controllers.registration);
router.post("/login", controllers.login);
router.post("/getLink", controllers.getLink);
router.post("/getStatistics", controllers.getStatistics);
router.get("/refferal", controllers.updLink);
router.get("/generateReferralLink", controllers.generateReferralLink);
module.exports = router;
