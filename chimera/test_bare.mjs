import * as q from '@qvac/sdk';

console.log('QVAC SDK loaded');

// Load model
const modelId = await q.loadModel({ 
  modelSrc: q.LLAMA_3_2_1B_INST_Q4_0, 
  modelType: 'llm' 
});
console.log('Model loaded:', modelId);

// Try completion with very short output and explicit generationParams
const result = q.completion({
  modelId,
  history: [{ role: 'user', content: 'Say: hello world' }],
  stream: true,
  generationParams: { predict: 10, temp: 0.1 }
});

console.log('Completion started, consuming events...');
let text = '';
for await (const event of result.events) {
  if (event.type === 'contentDelta') {
    text += event.text;
    process.stdout.write(event.text);
  }
  if (event.type === 'completionDone') {
    console.log('\nDone event received!', event.stopReason);
    break;
  }
}
console.log('\nFinal text:', text);
process.exit(0);
