import { loadModel, LLAMA_3_2_1B_INST_Q4_0, completion, unloadModel } from "@qvac/sdk";

console.log("1. Loading...");
const modelId = await loadModel({ modelSrc: LLAMA_3_2_1B_INST_Q4_0, modelType: "llm" });
console.log("2. Loaded:", modelId);

console.log("3. Completion predict=50...");
const result = completion({
  modelId,
  history: [{ role: "user", content: "Say hello briefly" }],
  stream: true,
  generationParams: { predict: 50 },
});

let text = "";
for await (const token of result.tokenStream) {
  text += token;
}
console.log("4. Done. Chars:", text.length, "Text:", text.trim());

await unloadModel({ modelId });
