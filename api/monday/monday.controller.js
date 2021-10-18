const mondayService = require("./monday.service");
const axios = require("axios");
let isOn = false;
/**
 * Integration request
 * @param {*} req
 * @param {*} res
 */
async function getInter(req, res) {
  console.log(`isOn`, isOn);
  if (isOn) res.end();
  isOn = true;
  console.log("hi");
  const body = req.body;
  try {
    console.log("integration START");
    const { shortLivedToken } = req.session;
    const { boardId, itemId } = body.payload.inboundFieldValues;
    await mondayService.getInter(shortLivedToken, boardId, itemId);
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
