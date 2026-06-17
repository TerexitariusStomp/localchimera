import { loadModel, LLAMA_3_2_1B_INST_Q4_0, completion, unloadModel } from "@qvac/sdk";

const history = [
  { role: "system", content: "You are a wiki writer. Be concise." },
  { role: "user", content: "Write about: distributed systems" }
];

console.log("Loading with device: cpu...");
const startLoad = Date.now();
const modelId = await loadModel({
  modelSrc: LLAMA_3_2_1B_INST_Q4_0,
  modelType: "llm",
  modelConfig: { device: "cpu", ctx_size: 2048 },
});
console.log("Loaded in", Date.now() - startLoad, "ms. ID:", modelId);

console.log("Completion predict=50...");
const startComp = Date.now();
const result = completion({ modelId, history, stream: true, generationParams: { predict: 50, temp: 0.7 } });

let body = "";
for await (const token of result.tokenStream) {
  body += token;
}
const elapsed = Date.now() - startComp;
console.log("Done in", elapsed, "ms. Chars:", body.length);
console.log(body.trim().slice(0, 200));

await unloadModel({ modelId });
