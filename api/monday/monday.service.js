const initMondayClient = require("monday-sdk-js");
// const dbService = require('./mongo-service')
const dbService = require("../../services/db.service");
// const token = process.env.MONDAY_API;
const monday = initMondayClient();
const cheerio = require("cheerio");
/**
 * todos:
 * add queries: column ids, users,
 * split functions
 *
 */
/**
 *
 * @param {string} shortLivedToken
 * @param {string} boardId
 * @param {string} itemId
 */

async function getInter(shortLivedToken, boardId, itemId) {
  // const dataObj = {
  //   boardId,
  //   itemId,
  //   bodyObj: {},
  // };
  /**
   *
  await sleep(10000);
  await monday.setToken(shortLivedToken);
  const query = `
    query {
      boards(ids:${boardId}) {
        groups{
          title
          id
        }
       name
       items (ids:${itemId}) {
         name 
       }
     }
   }
    `;
  const result = await monday.api(query);
  // console.log(`getInter -> result`, result);
  const groups = result.data?.boards[0].groups;
  const groupId = groups?.filter((group) => {
    return group?.title?.toLowerCase() === "tickets";
  })[0].id;
   */

  // console.log(`getInter -> groups`, groups);
  // console.log(`move_item_to_group -> groupId`, groupId);
  /**
  const query2 = `
  mutation{
    move_item_to_group(item_id: ${itemId}, group_id:${groupId}){
      created_at
      column_values{
        id
        text
        title
       }
      updates{
        body
        text_body
        created_at
      }
    }
  }`;
  // console.log(`getInter -> query2`, query2);
  const ticketData = await monday.api(query2);
  // console.log(`getInter -> ticketData`, ticketData);
  const updates = ticketData.data.move_item_to_group.updates[0];
  // console.log(`getInter -> updates`, updates);
  const txtBody = updates.text_body;
  const columnVals = ticketData.data.move_item_to_group.column_values; // todo: use this for next mutation
  const createdAt = ticketData.data.move_item_to_group.created_at.split("T")[0];
  const txtBodyArr = txtBody.split("\n").filter((cell) => cell);
  // const HTMLBody = cheerio.load(updates.body)
  // console.log(`getInter -> txtBodyArr`, txtBodyArr);
  const bodyObj = {
    title: "",
    person: "",
    role: "",
    email: "",
    mobile: "",
    phone: "",
    address: "",
    "company name": "",
    date: "",
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
  bodyObj["company name"] = txtBodyArr[2].split(".")[1];
  // console.log(`getInter -> bodyObj`, bodyObj);

  // const { mobile, phone, address, company name } = bodyObj;
  let columnsTitles = [];
  console.log("bodyObj", bodyObj);
  for (let prop in bodyObj) {
    console.log(`getInter -> prop`, prop);
    columnVals.filter((column) => {
      column?.title?.toLowerCase() === prop.toLowerCase()
        ? (columnsTitles[prop] = column.id)
        : false;
    });
  }
  */
  // console.log(`columnsTitles -> columnsTitles`, columnsTitles);
  /**
   
  
  const mutation = `
    mutation{
        change_multiple_column_values(item_id:${itemId},board_id:${boardId}, column_values:${JSON.stringify(
    JSON.stringify({
      [columnsTitles.mobile]: bodyObj.mobile,
      [columnsTitles.phone]: bodyObj.phone,
      [columnsTitles.address]: bodyObj.address,
      [columnsTitles["company name"]]: bodyObj["company name"],
      [columnsTitles.date]: createdAt,
    })
  )}){
            id
          }
      }`; //TODO need to add person by id and not name
  console.log(`getInter -> mutation`, mutation);

  const moreData = await monday.api(mutation);
  console.log(`getInter -> moreData`, moreData);
   */
  const groupId = await receiveData(shortLivedToken, boardId, itemId);
  const { columnsTitles, bodyObj } = await parseTicketData(itemId, groupId);
  await insertTicketData(itemId, boardId, columnsTitles, bodyObj);
  return;
}
async function receiveData(shortLivedToken, boardId, itemId) {
  await sleep(20000);
  await monday.setToken(shortLivedToken);
  const query = `
    query {
      boards(ids:${boardId}) {
        groups{
          title
          id
        }
       name
       items (ids:${itemId}) {
         name 
       }
     }
   }
    `;
  const result = await monday.api(query);
  console.log(`getInter -> result`, result);
  const groups = result.data?.boards[0].groups;
  const groupId = groups?.filter((group) => {
    return group?.title?.toLowerCase() === "tickets";
  })[0].id;
  return groupId;
}

async function parseTicketData(itemId, groupId) {
  const mutation = `
  mutation{
    move_item_to_group(item_id: ${itemId}, group_id:${groupId}){
      created_at
      column_values{
        id
        text
        title
       }
      updates{
        body
        text_body
        created_at
      }
    }
  }`;
  console.log(`getInter -> mutation`, mutation);
  const ticketData = await monday.api(mutation);
  console.log(`getInter -> ticketData`, ticketData);
  const updates = ticketData.data.move_item_to_group.updates[0];
  console.log(`getInter -> updates`, updates);
  const txtBody = updates.text_body;
  const columnVals = ticketData.data.move_item_to_group.column_values; // todo: use this for next mutation
  const createdAt = ticketData.data.move_item_to_group.created_at.split("T")[0];
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
    "company name": "",
    date: createdAt,
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
  bodyObj["company name"] = txtBodyArr[2].split(".")[1];
  console.log(`getInter -> bodyObj`, bodyObj);

  let columnsTitles = [];
  for (let prop in bodyObj) {
    console.log(`getInter -> prop`, prop);
    columnVals.filter((column) => {
      column?.title?.toLowerCase() === prop.toLowerCase()
        ? (columnsTitles[prop] = column.id)
        : false;
    });
  }
  return { columnsTitles, bodyObj };
}
async function insertTicketData(itemId, boardId, columnsTitles, bodyObj) {
  console.log(`insertTicketData -> bodyObj`, bodyObj);
  const mutation = `
    mutation{
        change_multiple_column_values(item_id:${itemId},board_id:${boardId}, column_values:${JSON.stringify(
    JSON.stringify({
      [columnsTitles.mobile]: bodyObj.mobile,
      [columnsTitles.phone]: bodyObj.phone,
      [columnsTitles.address]: bodyObj.address,
      [columnsTitles["company name"]]: bodyObj["company name"],
      [columnsTitles.date]: bodyObj.date,
    })
  )}){
      id
      
    }
  }`;
  console.log(`getInter -> mutation`, mutation);

  const moreData = await monday.api(mutation);
  console.log(`getInter -> moreData`, moreData);
}
function sleep(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
module.exports = {
  getInter,
};
