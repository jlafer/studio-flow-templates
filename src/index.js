const dotenv = require('dotenv');
const {readFile, writeFile} = require('fs/promises');
const twilio = require('twilio');

const [_node, _pgm, cmd, ...params] = process.argv;

const result = dotenv.config({ path: './.env' });
if (result.error) {
  throw result.error
}

const {TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN} = process.env;
const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

switch (cmd) {
  case 'list':
    // list 
    listFlows(client);
    break;
  case 'get':
    // get FWxxxx
    getFlow(client, params[0]);
    break;
  case 'apply':
    // apply FWxxxx <config-name>
    applyParamsToFlow(client, params[0], params[1]);
    break;
  case 'create':
    // create FWxxxx <config-name>
    createFlow(client, params[0], params[1]);
    break;
  case 'update':
    // update FWxxxx <jsonFileName> <config-name>
    updateFlow(client, params[0], params[1], params[2]);
    break;
  case 'deploy':
    // deploy FWxxxx <config-name>
    deployFlow(client, params[0], params[1]);
    break;
  default:
    console.error(`invalid cmd option ${cmd}`);
}

function listFlows(client) {
  client.studio.flows.list()
  .then(flows => {
    flows.forEach(flow => {console.log(`${flow.sid} ${flow.friendlyName}`)})
  });
}

function getFlow(client, sid) {
  fetchFlow(client, sid)
  .then(json => {writeFile(`${sid}.json`, json, 'utf8')})
  .catch(err => {console.log('error:', err)});
}

async function applyParamsToFlow(client, sid, cust) {
  try {
    const custJson = await readFile(`${cust}_config.json`, 'utf8');
    const custConfig = JSON.parse(custJson);
    const json = await fetchFlow(client, sid);
    const newJson = substituteTokensInString(json, custConfig.parameters);
    writeFile(`${sid}_${cust}.json`, newJson, 'utf8');
  }
  catch (err) {
    console.log('error:', err);
  }
}

async function createFlow(client, sid, cust) {
  try {
    const custJson = await readFile(`${cust}_config.json`, 'utf8');
    const custConfig = JSON.parse(custJson);
    const {name, status} = custConfig;
    const json = await readFile(`${sid}_${cust}.json`, 'utf8');;
    const flow = await client.studio.flows.create({
      friendlyName: name,
      status,
      definition: json
    });
    const {sid: newSid, valid} = flow;
    console.log(`created flow: sid=${newSid} status=${status} valid=${valid} ${name}`);
  }
  catch (err) {
    console.log('error:', err);
  }
}

async function updateFlow(client, sid, defnFile, cust) {
  try {
    const custJson = await readFile(`${cust}_config.json`, 'utf8');
    const custConfig = JSON.parse(custJson);
    const {name, status} = custConfig;
    const json = await readFile(defnFile, 'utf8');;
    const flow = await client.studio.flows(sid).update({
      friendlyName: name,
      status,
      definition: json
    });
    const {valid} = flow;
    console.log(`updated flow: sid=${sid} status=${status} valid=${valid} ${name}`);
  }
  catch (err) {
    console.log('error:', err);
  }
}

async function deployFlow(client, sid, cust) {
  try {
    const custJson = await readFile(`${cust}_config.json`, 'utf8');
    const custConfig = JSON.parse(custJson);
    const {phone} = custConfig;
    const phoneList = await client.incomingPhoneNumbers.list({phoneNumber: phone});
    const phoneRsrc = phoneList[0];
    const {sid: phoneSid} = phoneRsrc;
    const flowUrl = `https://webhooks.twilio.com/v1/Accounts/${TWILIO_ACCOUNT_SID}/Flows/${sid}`;
    await client.incomingPhoneNumbers(phoneSid).update({voiceUrl: flowUrl})
    console.log(`deployed flow: sid=${sid} to phone number ${phone}`);
  }
  catch (err) {
    console.log('error:', err);
  }
}

function fetchFlow(client, sid) {
  return client.studio.flows(sid).fetch()
  .then(flow => {
    const {sid, status, valid, friendlyName, definition} = flow;
    const json = JSON.stringify(definition, 0, 4);
    console.log(`sid=${sid} status=${status} valid=${valid} ${friendlyName}`);
    return json;
  })
  .catch(err => {console.log('error:', err)});
}

function substituteTokensInString(str, params) {
  let newStr = str;
  params.forEach(param => {
    const {token, value} = param;
    newStr = newStr.replace(token, value);
  })
  return newStr;
}
