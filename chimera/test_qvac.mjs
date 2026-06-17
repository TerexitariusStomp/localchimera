import { loadModel, LLAMA_3_2_1B_INST_Q4_0 } from "@qvac/sdk";
console.log("starting");
const modelId = await loadModel({ modelSrc: LLAMA_3_2_1B_INST_Q4_0, modelType: "llm" });
console.log("model:", modelId);
