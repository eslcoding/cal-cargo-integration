const initMondayClient = require("monday-sdk-js");
// const dbService = require('./mongo-service')
const dbService = require("../../services/db.service");
// const token = process.env.MONDAY_API;
const monday = initMondayClient();
const cheerio = require("cheerio");

async function getInter(shortLivedToken, boardId, itemId) {
  console.log("sec", new Date().getSeconds());
  await sleep(30000);
  console.log("sec", new Date().getSeconds());
  await monday.setToken(shortLivedToken);
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
  console.log(`getInter -> result`, result);
  const item = result.data.boards[0].items[0];
  const updates = item.updates[0];
  console.log(`getInter -> updates`, updates);
  const txtBody = updates.text_body;
  const txtBodyArr = txtBody.split("\n").filter((cell) => cell);
  // const HTMLBody = cheerio.load(updates.body)

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

  bodyObj.title = `${txtBodyArr[0]}`;
  bodyObj.person = `${txtBodyArr[1]}`;
  bodyObj.role = `${txtBodyArr[2]}`;
  txtBodyArr.splice(0, 3);
  bodyObj.address = `${txtBodyArr[0]}, ${txtBodyArr[1]}`;
  bodyObj.webSite = txtBodyArr[2];
  console.log(`getInter -> bodyObj`, bodyObj);
  const mutation = `
      mutation{
        create_item(board_id:${boardId},group_id:topics,item_name:${JSON.stringify(
    bodyObj.title
  )}){
         id
         created_at
         column_values{
          id
          text
          title
         }

        }
      }`;
  const ticketData = await monday.api(mutation);
  console.log(`getInter -> ticketData`, ticketData);
  const ticketId = ticketData.data.create_item.id;
  const columnVals = ticketData.data.create_item.column_values;
  const createdAt = ticketData.data.create_item.created_at.split("T")[0];

  const { person, mobile, phone, address, webSite } = bodyObj;
  const mutation2 = `
    mutation{
        change_multiple_column_values(item_id:${ticketId},board_id:${boardId}, column_values:${JSON.stringify(
    JSON.stringify({
      text: mobile,
      text5: phone,
      text9: address,
      text1: webSite,
      date4: createdAt,
    })
  )}){
            id
          }
      }`; // need to add person by id and not name
  console.log(`getInter -> mutation2`, mutation2);

  const moreData = await monday.api(mutation2);
  console.log(`getInter -> moreData`, moreData);
}

function sleep(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  getInter,
};
