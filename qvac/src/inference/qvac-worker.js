import { workerData, parentPort } from 'worker_threads';

const { history, maxTokens } = workerData;

(async () => {
  try {
    const { loadModel, completion, SMOLLM2_360M_INST_Q8 } = await import('@qvac/sdk');

    parentPort.postMessage({ type: 'status', message: 'Loading model...' });
    const modelId = await loadModel({
      modelSrc: SMOLLM2_360M_INST_Q8,
      modelType: 'llm',
    });
    parentPort.postMessage({ type: 'status', message: `Model ready: ${modelId}` });

    const run = completion({
      modelId,
      history,
      stream: true,
      generationParams: { predict: maxTokens, temp: 0.7, top_p: 0.9 }
    });

    let body = '';
    for await (const token of run.tokenStream) {
      body += token;
      parentPort.postMessage({ type: 'token', body });
    }

    parentPort.postMessage({ type: 'done', body });
  } catch (err) {
    parentPort.postMessage({ type: 'error', message: err.message });
  }
})();
