const router = require("express").Router();
const {
  authenticationMiddleware,
} = require("../../middlewares/requireAuth.middleware");

const mondayController = require("./monday.controller");

router.post("/newTicket", authenticationMiddleware, mondayController.getInter);

module.exports = router;
