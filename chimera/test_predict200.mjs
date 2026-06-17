import { loadModel, LLAMA_3_2_1B_INST_Q4_0, completion, unloadModel } from "@qvac/sdk";

console.log("Loading...");
const modelId = await loadModel({ modelSrc: LLAMA_3_2_1B_INST_Q4_0, modelType: "llm" });
console.log("Loaded:", modelId);

const result = completion({
  modelId,
  history: [
    { role: "system", content: "You are a wiki writer. Write high-quality markdown content." },
    { role: "user", content: "Write a wiki page about: neural networks" }
  ],
  stream: true,
  generationParams: { predict: 200, temp: 0.7 },
});

let body = "";
for await (const token of result.tokenStream) {
  body += token;
}
console.log("Done. Chars:", body.length);
console.log(body.trim().slice(0, 300));

await unloadModel({ modelId });
