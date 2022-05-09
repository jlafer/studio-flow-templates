const dotenv = require('dotenv');
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
    console.log(`${flow.sid} ${flow.friendlyName}`)
  });
}
