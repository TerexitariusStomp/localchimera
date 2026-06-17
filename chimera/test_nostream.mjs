import { loadModel, LLAMA_3_2_1B_INST_Q4_0, completion, unloadModel } from "@qvac/sdk";

console.log("1. Loading model...");
const modelId = await loadModel({
  modelSrc: LLAMA_3_2_1B_INST_Q4_0,
  modelType: "llm",
});
console.log("2. Model loaded:", modelId);

console.log("3. Calling completion (stream=false)...");
const result = completion({
  modelId,
  history: [{ role: "user", content: "Say hello briefly" }],
  stream: false,
  generationParams: { predict: 10 },
});

console.log("4. Waiting for result.text...");
const text = await result.text;
console.log("5. Text:", JSON.stringify(text));

await unloadModel({ modelId });
console.log("6. Done");
