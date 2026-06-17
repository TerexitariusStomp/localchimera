import { loadModel, LLAMA_3_2_1B_INST_Q4_0, completion, unloadModel } from "@qvac/sdk";

console.log("1. Loading model...");
const modelId = await loadModel({
  modelSrc: LLAMA_3_2_1B_INST_Q4_0,
  modelType: "llm",
});
console.log("2. Model loaded:", modelId);

console.log("3. Starting completion (stream=true, tokenStream)...");
const result = completion({
  modelId,
  history: [{ role: "user", content: "Say hello" }],
  stream: true,
});

let tokens = 0;
let text = "";
const start = Date.now();

for await (const token of result.tokenStream) {
  tokens++;
  text += token;
  if (Date.now() - start > 20000) break; // safety timeout
}

console.log("4. Tokens:", tokens, "Text:", JSON.stringify(text));

console.log("5. Unloading...");
await unloadModel({ modelId });
console.log("6. Done");
process.exit(0);
