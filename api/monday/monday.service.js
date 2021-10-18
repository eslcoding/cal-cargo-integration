const initMondayClient = require("monday-sdk-js");
// const dbService = require('./mongo-service')
const dbService = require("../../services/db.service");
// const token = process.env.MONDAY_API;
const monday = initMondayClient();
const { JSDOM } = require("jsdom");
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
  const groupId = await getGroupId(shortLivedToken, boardId, itemId);
  const { columnsTitles, bodyObj } = await parseTicketData(itemId, groupId);
  await insertTicketData(itemId, boardId, columnsTitles, bodyObj);
  return;
}
async function getGroupId(shortLivedToken, boardId, itemId) {
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
  // console.log(`getInter -> result`, result);
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
  // console.log(`getInter -> mutation`, mutation);
  const ticketData = await monday.api(mutation);
  const itemData = ticketData.data.move_item_to_group;
  // console.log(`getInter -> ticketData`, ticketData);
  const updates = itemData.updates[0];
  // console.log(`getInter -> updates`, updates);
  // const txtBody = updates.text_body;
  const columnVals = itemData.column_values; // todo: use this for next mutation
  const createdAt = itemData.created_at.split("T")[0];
  const body = updates.body;
  const { document } = new JSDOM(body).window;
  // console.log("document", document.querySelectorAll("tr"));
  const elRows = Array.from(
    document.querySelector("table").querySelectorAll("tr")
  );

  // console.log(`getInter -> txtBodyArr`, txtBodyArr);

  const elRowsTds = elRows.map((row, i) => {
    console.log(`elRows.forEach -> row `, i);
    console.log(row.querySelectorAll("td"));
    return Array.from(row.querySelectorAll("td")).map((td) => td.textContent);
  });
  console.log(`elRowsTds -> elRowsTds`, elRowsTds);

  const bodyObj = {
    // title: "",
    person: elRowsTds[0][1].trim(),
    role: elRowsTds[1][0].trim(),
    mobile: elRowsTds[2][1].trim(),
    phone: elRowsTds[3][1].trim(),
    email: elRowsTds[4][1].trim(),
    address: `${elRowsTds[2][2].trim()}, ${elRowsTds[3][2].trim()}`,
    "company name": elRowsTds[4][2].split(".")[1].trim(),
    date: createdAt,
  };
  console.log(`parseTicketData -> bodyObj`, bodyObj);

  // for (let i = 0; i < txtBodyArr.length; i++) {
  //   switch (txtBodyArr[i]) {
  //     case "Mobile":
  //       bodyObj.mobile = `${txtBodyArr[i + 1]}`;
  //       txtBodyArr.splice(i, 2);
  //       break;
  //     case "Phone":
  //       bodyObj.phone = `${txtBodyArr[i + 1]}`;
  //       txtBodyArr.splice(i, 2);
  //       break;
  //     case "Email":
  //       bodyObj.email = `${txtBodyArr[i + 1]}`;
  //       txtBodyArr.splice(i, 2);
  //       break;
  //   }
  // }

  // bodyObj.title = `${txtBodyArr[0]}`;
  // bodyObj.person = `${txtBodyArr[1]}`;
  // bodyObj.role = `${txtBodyArr[2]}`;
  // txtBodyArr.splice(0, 3);
  // bodyObj.address = `${txtBodyArr[0]}, ${txtBodyArr[1]}`;
  // bodyObj["company name"] = txtBodyArr[2].split(".")[1];
  // console.log(`getInter -> bodyObj`, bodyObj);

  let columnsTitles = {};
  for (let key in bodyObj) {
    // console.log(`getInter -> key`, key);
    columnVals.forEach((column) => {
      if (column?.title?.toLowerCase() === key.toLowerCase()) {
        columnsTitles[key] = column.id;
      }
    });
  }
  return { columnsTitles, bodyObj };
}
async function insertTicketData(itemId, boardId, columnsTitles, bodyObj) {
  // console.log(`insertTicketData -> bodyObj`, bodyObj);
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
  // console.log(`getInter -> mutation`, mutation);

  const moreData = await monday.api(mutation);
  // console.log(`getInter -> moreData`, moreData);
}
function sleep(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  getInter,
};
