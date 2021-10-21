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
  const { columnsTitles, bodyObj } = await getTicketData(itemId, groupId);
  await setTicketData(itemId, boardId, columnsTitles, bodyObj);
  return;
}
/**
 * Gets groupId by query
 * @param {*} shortLivedToken
 * @param {*} boardId
 * @param {*} itemId
 * @returns {string} groupId
 */
async function getGroupId(shortLivedToken, boardId, itemId) {
  // await sleep(20000);
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
 * @constant {object} columnsTitles
 * @constant {object} bodyObj
 * @returns {object} {columnsTitles, bodyObj}
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
  const updates = itemData.updates[0];
  const creator = updates.creator.email;
  const columnVals = itemData.column_values;
  const createdAt = itemData.created_at.split("T")[0];
  const body = updates.body;
  // console.log(`getTicketData -> body`, body);
  const { document } = new JSDOM(body).window;
  let filteredBody = body.split("<table")[0];
  filteredBody += "</div>";
  const filteredDocument = new JSDOM(filteredBody).window.document;
  console.log(`getTicketData -> filteredDocument`, filteredDocument);

  const spans = Array.from(filteredDocument.querySelectorAll("div > p > span"));
  // console.log(
  //   `getTicketData -> test`,
  //   Array.from(test).map((t) => console.log(t.textContent)),
  //   "TTT"
  // );

  let requestDescription = "";
  spans
    // .filter((span) => span.style._values[`font-size`] === "10.0pt")
    .map((span) => (requestDescription += " " + span.textContent));

  console.log(`requestDescription -> requestDescription`, requestDescription);
  const elRows = Array.from(
    document.querySelector("table").querySelectorAll("tr")
  );

  const elRowsTds = elRows.map((row, i) => {
    return Array.from(row.querySelectorAll("td")).map((td) =>
      td.textContent.trim()
    );
  });
  console.log(`elRowsTds -> elRowsTds`, elRowsTds);
  const bodyObj = {
    "requester name": elRowsTds[0][1],
    role: elRowsTds[1][0],
    "mobile phone": elRowsTds[2][1],
    phone: elRowsTds[3][1],
    "requester email": elRowsTds[4][1],
    address: `${elRowsTds[2][2]}, ${elRowsTds[3][2]}`,
    "company name": elRowsTds[4][2].split(".")[1],
    date: createdAt,
    email: creator,
    "request description": requestDescription,
  };
  console.log(`getTicketData -> bodyObj`, bodyObj);

  let columnsTitles = {};
  for (let key in bodyObj) {
    columnVals.forEach((column) => {
      if (column?.title?.toLowerCase() === key.toLowerCase()) {
        columnsTitles[key] = column.id;
      }
    });
  }
  console.log(`getTicketData -> columnsTitles`, columnsTitles);
  return { columnsTitles, bodyObj };
}

/**
 * Sets items data in monday
 * @param {string} itemId
 * @param {string} boardId
 * @param {object} columnsTitles
 * @param {object} bodyObj
 */
async function setTicketData(itemId, boardId, columnsTitles, bodyObj) {
  const mutation = `
  mutation{
    change_multiple_column_values(item_id:${itemId},board_id:${boardId}, column_values:${JSON.stringify(
    JSON.stringify({
      [columnsTitles["mobile phone"]]: bodyObj["mobile phone"],
      [columnsTitles.phone]: bodyObj.phone,
      [columnsTitles.address]: bodyObj.address,
      [columnsTitles["company name"]]: bodyObj["company name"],
      [columnsTitles.date]: bodyObj.date,
      [columnsTitles["requester name"]]: bodyObj["requester name"],
      [columnsTitles["requester email"]]: bodyObj["requester email"],
      [columnsTitles.email]: bodyObj.email,
      [columnsTitles["request description"]]: bodyObj["request description"],
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
