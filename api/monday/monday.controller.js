const mondayService = require("./monday.service");
// const transformationService = require('../services/transformation-service');
// const { TRANSFORMATION_TYPES } = require('../constants/transformation');
const axios = require("axios");
const initMondayClient = require("monday-sdk-js");
// const token = process.env.MONDAY_API;
const monday = initMondayClient();

async function getInter(req, res) {
  console.log("hi");
  const body = req.body;
  try {
    const { shortLivedToken } = req.session;
    const { boardId, itemId } = body.payload.inboundFieldValues;
    await monday.setToken(shortLivedToken);
    console.log("body.payload.inputFields: ", body.payload?.inputFields);
    const query = `
    query { 
      boards(ids:${boardId}) {
       name
       items (ids:${itemId}) {
         name
         updates{
           body
           text_body
           created_at
         }
       }
     }
   }
    `;

    const result = await monday.api(query);
    const item = result.data.boards[0].items[0];
    const updates = item.updates[0];
    const txtBody = updates.text_body;
    const txtBodyArr = txtBody.split("\n").filter((cell) => cell);

    console.log(`getInter -> txtBodyArr`, txtBodyArr);
    const bodyObj = {
      title: "",
      person: "",
      role: "",
      email: "",
      mobile: "",
      phone: "",
      address: "",
      webSite: "",
    };
    for (let i = 0; i < txtBodyArr.length; i++) {
      switch (txtBodyArr[i]) {
        case "Mobile":
          bodyObj.mobile = `${txtBodyArr[i + 1]}`;
          txtBodyArr.splice(i, 2);
          break;
        case "Phone":
          bodyObj.phone = `${txtBodyArr[i + 1]}`;
          txtBodyArr.splice(i, 2);
          break;
        case "Email":
          bodyObj.email = `${txtBodyArr[i + 1]}`;
          txtBodyArr.splice(i, 2);
          break;
      }
    }
    console.log(`getInter -> txtBodyArr`, txtBodyArr);

    bodyObj.title = txtBodyArr[0];
    bodyObj.person = txtBodyArr[1];
    bodyObj.role = txtBodyArr[2];
    txtBodyArr.splice(0, 3);
    bodyObj.address = `${txtBodyArr[0]}, ${txtBodyArr[1]}`;
    bodyObj.webSite = txtBodyArr[2];
    console.log(`getInter -> bodyObj`, bodyObj);
    const mutation = `
    mutation{
      create_item(board_id:1781381222,group_id:topics,item_name:${bodyObj.title}){
       id
       column_values{
        id
        text
        title
       } 

      }
    }`;
    const ticketData = await monday.api(mutation);
    const ticketId = ticketData.data.create_item.id;
    const columnVals = ticketData.data.create_item.column_values;
    console.log(`getInter -> columnVals`, columnVals);
    console.log(`getInter -> ticketId`, ticketId);
    const { person, mobile, phone, address, webSite } = bodyObj;
    console.log(JSON.stringify({ person, mobile, phone, address, webSite }));
    const mutation2 = `
    mutation{
      change_multiple_column_values(item_id:${ticketId},board_id:1781381222, column_values:\\\"{ \\\"mobile":\\\"${mobile}\\\" ,\\\"phone":\\\"${phone}\\\" ,\\\"address":\\\"${address}\\\" ,\\\"webSite":\\\"${webSite}\\\" }\\\"){
      id
    }
  }`; // need to add person by id and not name

    console.log(`getInter -> mutation2`, mutation2);

    const moreData = await monday.api(mutation2);
    console.log(`getInter -> moreData`, moreData);
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
