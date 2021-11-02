const mondayService = require("./monday.service");
const axios = require("axios");
require("dotenv").config();
/**
 * Integration request
 * @param {*} req
 * @param {*} res
 */
async function getInter(req, res) {
  console.log("hi");
  // res.end();
  const body = req.body;
  try {
    console.log("integration START");
    const { shortLivedToken } = req.session;
    const token = process.env.MONDAY_API;
    const { boardId, itemId } = body.payload.inboundFieldValues;
    await mondayService.getInter(token, boardId, itemId);
    console.log("integration END");
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
