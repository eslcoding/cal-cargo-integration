const mondayService = require("./monday.service");
// const transformationService = require('../services/transformation-service');
// const { TRANSFORMATION_TYPES } = require('../constants/transformation');
const axios = require("axios");
// const initMondayClient = require("monday-sdk-js");
// const token = process.env.MONDAY_API;
// const monday = initMondayClient();
// const mondayService = require("./monday.service");
let isOn = false;
async function getInter(req, res) {
  console.log(`isOn`, isOn);
  if (isOn) res.end();
  isOn = true;
  console.log("hi");
  const body = req.body;
  try {
    const { shortLivedToken } = req.session;
    const { boardId, itemId } = body.payload.inboundFieldValues;
    await mondayService.getInter(shortLivedToken, boardId, itemId);
    console.log("END");
    res.end();
  } catch (err) {
    console.log("err: ", err);
  } finally {
    res.end();
  }
}

module.exports = {
  getInter,
};
