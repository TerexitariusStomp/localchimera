import { loadModel, LLAMA_3_2_1B_INST_Q4_0, completion } from "@qvac/sdk";

const prompt = "distributed systems";
const history = [
  {
    role: 'system',
    content: (
      'You are a wiki writer. Write high-quality markdown content. ' +
      'Use headings, lists, bold/italic, code blocks, tables, and wiki links [[PageName]] where relevant. ' +
      'Use #tags for categorization. Be concise but thorough. ' +
      'Output ONLY the markdown body content — no explanations, no wrap-up sentences.'
    )
  },
  { role: 'user', content: `Write a wiki page about: ${prompt}` }
];

console.log("Loading model...");
const modelId = await loadModel({
  modelSrc: LLAMA_3_2_1B_INST_Q4_0,
  modelType: 'llm',
});
console.log("Model loaded:", modelId);

console.log("Starting completion predict=100...");
const start = Date.now();
const result = completion({
  modelId,
  history,
  stream: true,
  generationParams: { predict: 100, temp: 0.7 }
});

let body = '';
for await (const token of result.tokenStream) {
  body += token;
}

const elapsed = Date.now() - start;
console.log("Done in", elapsed, "ms. Chars:", body.length);
console.log(body.trim().slice(0, 300));
