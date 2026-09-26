import { getHealth, sendAssistantMessage } from "./api/backend.js";
import { toAssistantRequest } from "./handlers/imessage.js";

const health = await getHealth();
console.log(`backend ${health.status}`);

const sample = toAssistantRequest("How do I get to Prospect Park?");
const reply = await sendAssistantMessage(sample.message);
console.log("imessage bridge ready");
console.log(reply.reply);
