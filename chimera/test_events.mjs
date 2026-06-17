import { loadModel, LLAMA_3_2_1B_INST_Q4_0, completion } from "@qvac/sdk";

const history = [
  { role: "system", content: "You are a wiki writer. Be concise." },
  { role: "user", content: "Write about: distributed systems" }
];

console.log("Loading...");
const modelId = await loadModel({ modelSrc: LLAMA_3_2_1B_INST_Q4_0, modelType: "llm" });
console.log("Loaded:", modelId);

console.log("Completion...");
const result = completion({ modelId, history, stream: true, generationParams: { predict: 30 } });

let count = 0;
for await (const event of result.events) {
  count++;
  if (count <= 5) console.log("Event", count, ":", event.type);
  if (event.type === "completionDone") {
    console.log("Done event at count", count);
    break;
  }
}

console.log("Total events:", count);
