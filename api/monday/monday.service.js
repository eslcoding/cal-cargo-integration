const initMondayClient = require("monday-sdk-js");
// const dbService = require('./mongo-service')
const dbService = require("../../services/db.service");
// const token = process.env.MONDAY_API;
const monday = initMondayClient();
const { JSDOM } = require("jsdom");

/**
 * parent function, activates all other function by flow
 * @param {string} shortLivedToken
 * @param {string} boardId
 * @param {string} itemId
 */

async function getInter(shortLivedToken, boardId, itemId) {
  const groupId = await getGroupId(shortLivedToken, boardId, itemId);
  const { columnsIds, bodyObj } = await getTicketData(itemId, groupId);
  await setTicketData(itemId, boardId, columnsIds, bodyObj);
  return;
}
/**
 * Gets groupId by query
 * @param {string} shortLivedToken
 * @param {string} boardId
 * @param {string} itemId
 * @returns {string} groupId
 */
async function getGroupId(shortLivedToken, boardId, itemId) {
  await sleep(30000);
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
  console.log(`getGroupId -> query`, query);
  const result = await monday.api(query);
  const groups = result.data?.boards[0].groups;
  const groupId = groups?.filter((group) => {
    return group?.title?.toLowerCase() === "new ticket";
  })[0].id;
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
        creator{
          email
        }
      }
    }
  }`;
  console.log(`getTicketData -> mutation`, mutation);

  const ticketData = await monday.api(mutation);
  const itemData = ticketData.data.move_item_to_group;
  const updates = itemData.updates[1];
  const creator = updates.creator.email;
  const columnVals = itemData.column_values;
  const createdAt = itemData.created_at.split("T")[0];
  const body = updates.body;
  const { document } = new JSDOM(body).window;
  let filteredBody = body.split("<table")[0];
  filteredBody += body.includes("<table") ? "</div>" : "";
  const filteredDocument = new JSDOM(filteredBody).window.document;

  const spans = Array.from(filteredDocument.querySelectorAll("div > p > span"));
  let requestDescription = "";
  spans.forEach((span) => (requestDescription += " " + span.textContent));

  let bodyObj = {};
  if (body.includes("<table")) {
    const elRows = Array.from(
      document.querySelector("table").querySelectorAll("tr")
    );

    const elRowsTds = elRows.map((row) => {
      return Array.from(row.querySelectorAll("td")).map((td) =>
        td.textContent.trim()
      );
    });
    let company = elRowsTds[4][2].split(".")[1];
    switch (
      company // todo: get all matching names
    ) {
      case "challenge-airlines":
        company = "";
        break;
      case "challenge-group":
        company = "";
        break;
      case "cal-cargo":
        company = "";
        break;
    }
    //TODO: get all companies names and transfer them to status columns
    console.log(`elRowsTds -> elRowsTds`, elRowsTds);
    bodyObj = {
      "Requester Name ↘️": elRowsTds[0][1],
      role: elRowsTds[1][0],
      "Mobile Phone  ↘️": elRowsTds[2][1],
      phone: elRowsTds[3][1],
      "Requester Email  ↘️": elRowsTds[4][1],
      address: `${elRowsTds[2][2]}, ${elRowsTds[3][2]}`,
      "Company  ↘️": company,
      "Request Time": createdAt,
      "Email External": creator,
      "Request Description": requestDescription,
    };
    console.log(`getTicketData -> bodyObj`, bodyObj);
  } else {
    bodyObj = {
      "Request Time": createdAt,
      "Email External": creator,
      "Request Description": requestDescription,
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
    [columnsIds["Requester Email  ↘️"]]: bodyObj["Requester Email  ↘️"],
    [columnsIds["Email External"]]: bodyObj["Email External"],
    [columnsIds["Request Description"]]: bodyObj["Request Description"],
    [columnsIds["Mobile Phone  ↘️"]]: bodyObj["Mobile Phone  ↘️"],
    // [columnsIds["Company  ↘️"]]: bodyObj["Company  ↘️"],
    [columnsIds["Request Time"]]: bodyObj["Request Time"],
    [columnsIds["Requester Name ↘️"]]: bodyObj["Requester Name ↘️"],
  });
  const mutation = `
  mutation{
    change_multiple_column_values(item_id:${itemId},board_id:${boardId}, column_values:${JSON.stringify(
    JSON.stringify({
      [columnsIds["Requester Email  ↘️"]]: bodyObj["Requester Email  ↘️"],
      [columnsIds["Email External"]]: bodyObj["Email External"],
      [columnsIds["Request Description"]]: bodyObj["Request Description"],
      [columnsIds["Mobile Phone  ↘️"]]: bodyObj["Mobile Phone  ↘️"],
      // [columnsIds["Company  ↘️"]]: bodyObj["Company  ↘️"],
      [columnsIds["Request Time"]]: bodyObj["Request Time"],
      [columnsIds["Requester Name ↘️"]]: bodyObj["Requester Name ↘️"],
    })
  )}){
        id
      }
    }`;
  console.log(`setTicketData -> mutation`, mutation);
  await monday.api(mutation);
}
function sleep(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  getInter,
};
