const initMondayClient = require("monday-sdk-js");
// const dbService = require('./mongo-service')
const dbService = require("../../services/db.service");
// const token = process.env.MONDAY_API;
const monday = initMondayClient();
const { JSDOM } = require("jsdom");
let counter = 0;

/**
 * parent function, activates all other function by flow
 * @param {string} token
 * @param {string} boardId
 * @param {string} itemId
 */

async function getInter(token, boardId, itemId) {
  const groupId = await getGroupId(token, boardId, itemId);
  if (!groupId) return
  const { columnsIds, bodyObj } = await getTicketData(itemId, groupId);
  await setTicketData(itemId, boardId, columnsIds, bodyObj);
  return;
}
/**
 * Gets groupId by query
 * @param {string} token
 * @param {string} boardId
 * @param {string} itemId
 * @returns {string} groupId
 */
async function getGroupId(token, boardId, itemId) {
  await sleep(60000); 
  await monday.setToken(token);
  const query = `
  query {
    boards(ids: ${boardId}) {
      name
      groups{
        title
        id
      }
      items (ids: ${itemId}) {
        name
        group{
          id
        }
      }
    }
  }
  `;
  console.log(`getGroupId -> query`, query);
  const result = await monday.api(query);
  console.log(`getGroupId -> result`, result);
  const groups = result.data?.boards[0]?.groups;
  let groupId = groups?.filter((group) => {
    return group?.title?.toLowerCase() === "new ticket";
  })[0].id;
  const thisGroupId = result.data.boards[0].items[0].group.id
  if (thisGroupId !== "emailed_items33271") return
  if (groupId === undefined) groupId = "topics";
  return groupId;
}
/**
 * Gets item's data, moves it to tickets group and collects and parses data from item's updates
 * @param {string} itemId
 * @param {string} groupId
 * @constant {object} columnsIds
 * @constant {object} bodyObj
 * @returns {object} {columnsIds, bodyObj}
 */
async function getTicketData(itemId, groupId) {
  const mutation = `
  mutation{
    move_item_to_group(item_id: ${itemId}, group_id: ${JSON.stringify(
    groupId
  )}){
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
        creator{
          email
        }
      }
    }
  }`;
  console.log(`getTicketData -> mutation`, mutation);

  const ticketData = await monday.api(mutation);
  console.log(`getTicketData -> ticketData`, ticketData);
  const itemData = ticketData.data.move_item_to_group;
  const updates = itemData.updates.filter(
    // (update) => console.log(update)
    (update) => update?.creator?.email !== "monday@monday.com"
  )[0];
  // console.log(`getTicketData -> updates`, updates);
  if (!updates) {
    if (counter <= 7) {
      counter++;
      await sleep(10000);
      return getTicketData(itemId, groupId);
    } else {
      return;
    }
  }
  // console.log("isArray", Array.isArray(updates));
  const creator = updates.creator.email;
  const columnVals = itemData.column_values;
  const createdAt = itemData.created_at;
  const body = updates.body;
  // console.log(`getTicketData -> body`, body);
  const { document } = new JSDOM(body).window;
  let filteredBody = body.split("<table")[0];
  filteredBody += body.includes("<table") ? "</div>" : "";
  const filteredDocument = new JSDOM(filteredBody).window.document;

  const spans = Array.from(filteredDocument.querySelectorAll("div > p > span"));

  // return;
  let requestDescription = "";
  spans.forEach((span) => (requestDescription += " " + span.textContent));

  let bodyObj = {};
  if (body.includes(`<table`)) {
    const elRows = Array.from(
      document.querySelector("table").querySelectorAll("tr")
    );

    const elRowsTds = elRows.map((row) => {
      return Array.from(row.querySelectorAll("td")).map((td) =>
        td.textContent.trim()
      );
    });

    console.log(`elRowsTds -> elRowsTds`, elRowsTds);
    bodyObj = {
      "Requester Name ↘️": elRowsTds[0][1],
      role: elRowsTds[1][0],
      "Mobile Phone  ↘️": { phone: elRowsTds[2][1] },
      "Zoom Ext  ↘️": { phone: elRowsTds[3][1] },
      "Requester Email  ↘️": { email: elRowsTds[4][1], text: elRowsTds[4][1] },
      address: `${elRowsTds[2][2]}, ${elRowsTds[3][2]}`,
      "Company  ↘️": elRowsTds[5][2],
      "Request Time": createdAt,
      "Email External": { email: creator, text: creator },
      "Request Description": requestDescription,
    };
    console.log(`getTicketData -> bodyObj`, bodyObj);
  } else {
    const mobile = "0000";
    bodyObj = {
      "Request Time": createdAt,
      "Email External": { email: creator, text: creator },
      "Request Description": requestDescription,
      "Mobile Phone  ↘️": mobile,
      "Company  ↘️": "External / GSA",
    };
  }
  let columnsIds = {};
  for (let key in bodyObj) {
    columnVals.forEach((column) => {
      if (column?.title?.toLowerCase() === key.toLowerCase()) {
        columnsIds[key] = column.id;
      }
    });
  }
  console.log(`getTicketData -> columnsIds`, columnsIds);
  return { columnsIds, bodyObj };
}

/**
 * Sets items data in monday
 * @param {string} itemId
 * @param {string} boardId
 * @param {object} columnsIds
 * @param {object} bodyObj
 */
async function setTicketData(itemId, boardId, columnsIds, bodyObj) {
  console.log("big mutation", {
    [columnsIds["Email External"]]: bodyObj["Email External"],
    [columnsIds["Request Description"]]: bodyObj["Request Description"],
    [columnsIds["Mobile Phone  ↘️"]]: bodyObj["Mobile Phone  ↘️"],
    [columnsIds["Requester Email  ↘️"]]: bodyObj["Requester Email  ↘️"],
    [columnsIds["Requester Name ↘️"]]: bodyObj["Requester Name ↘️"],
    [columnsIds["Zoom Ext  ↘️"]]: bodyObj["Zoom Ext  ↘️"],
    [columnsIds["Company  ↘️"]]: bodyObj["Company  ↘️"],
  });
  const mutation = `
  mutation{
    change_multiple_column_values(item_id: ${itemId},board_id: ${boardId}, column_values: ${JSON.stringify(
    JSON.stringify({
      [columnsIds["Request Description"]]: bodyObj["Request Description"],
      [columnsIds["Requester Email  ↘️"]]: bodyObj["Requester Email  ↘️"],
      [columnsIds["Mobile Phone  ↘️"]]: bodyObj["Mobile Phone  ↘️"],
      [columnsIds["Email External"]]: bodyObj["Email External"],
      [columnsIds["Requester Name ↘️"]]: bodyObj["Requester Name ↘️"],
      [columnsIds["Zoom Ext  ↘️"]]: bodyObj["Zoom Ext  ↘️"],
      [columnsIds["Company  ↘️"]]: bodyObj["Company  ↘️"],
    })
  )}){
        id
      }
    }`;
  console.log(`setTicketData -> mutation`, mutation);
  let res2 = await monday.api(mutation);
  console.log(`setTicketData -> let res2`, res2)
}
function sleep(ms = 0) {
  console.log(`sleep ${ms / 1000}s`);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  getInter,
};
