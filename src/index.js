const dotenv = require('dotenv');
const {writeFile} = require('fs/promises');
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
    listFlows(client);
    break;
  case 'fetch':
    fetchFlow(client, params[0]);
    break;
}

function listFlows(client) {
  client.studio.flows.list()
  .then(flows => {
    flows.forEach(flow => {console.log(`${flow.sid} ${flow.friendlyName}`)})
  });
}

function fetchFlow(client, sid) {
  client.studio.flows(sid).fetch()
  .then(flow => {
    const {sid, status, valid, friendlyName, definition} = flow;
    const json = JSON.stringify(definition, 0, 4);
    console.log(`sid=${sid} status=${status} valid=${valid} ${friendlyName}`);
    return writeFile("output.json", json, 'utf8');
  })
  .then((_p) => {
    console.log('JSON file written')
  })
  .catch(err => {console.log('error:', err)});
}
