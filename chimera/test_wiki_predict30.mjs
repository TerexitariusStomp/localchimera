import { loadModel, LLAMA_3_2_1B_INST_Q4_0, completion, unloadModel } from "@qvac/sdk";

const history = [
  { role: "system", content: "You are a wiki writer. Be concise." },
  { role: "user", content: "Write about: distributed systems" }
];

console.log("Loading...");
const modelId = await loadModel({ modelSrc: LLAMA_3_2_1B_INST_Q4_0, modelType: "llm" });
console.log("Loaded:", modelId);

console.log("Completion predict=30...");
const result = completion({ modelId, history, stream: true, generationParams: { predict: 30 } });

let body = "";
const start = Date.now();
for await (const token of result.tokenStream) {
  body += token;
}
const elapsed = Date.now() - start;
console.log("Done in", elapsed, "ms. Chars:", body.length);
console.log(body.trim().slice(0, 200));

await unloadModel({ modelId });
