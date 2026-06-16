import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Logger } from '../core/Logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * LocalLLM — Pure QVAC-native local inference.
 *
 * Uses @qvac/sdk to load models and run inference locally.
 * Demo mode only if QVAC SDK is unavailable.
 */
export class LocalLLM {
  constructor(config = {}) {
    this.config = {
      model: config.model || 'smollm2-360m-inst',
      qvacModelConst: config.qvacModelConst || null,
      timeout: config.timeout || 360000,
      ...config
    };
    this.logger = new Logger('LocalLLM');
    this.qvac = null;
    this.modelId = null;       // Kept loaded between requests
    this._loading = null;      // Promise guard to avoid double-load
  }

  async initialize() {
    this.logger.info('Initializing LocalLLM (QVAC-native)...');
    try {
      this.qvac = await import('@qvac/sdk');
      this.logger.info(`QVAC SDK loaded: ${Object.keys(this.qvac).slice(0, 5).join(', ')}...`);
      // Pre-load model now so first request is fast
      await this._ensureModelLoaded();
    } catch (e) {
      this.logger.warn(`QVAC SDK not available (${e.message}) — demo mode active`);
      this.qvac = null;
    }
  }

  async _ensureModelLoaded() {
    if (this.modelId) return this.modelId;
    if (this._loading) return this._loading;

    this._loading = (async () => {
      const { loadModel, SMOLLM2_360M_INST_Q8 } = this.qvac;
      const modelSrc = this.config.qvacModelConst || SMOLLM2_360M_INST_Q8;
      this.logger.info(`Loading QVAC model (once)...`);
      this.modelId = await loadModel({
        modelSrc,
        modelType: 'llm',
        onProgress: (p) => {
          if (p.percent % 10 === 0) this.logger.info(`Model load: ${p.percent}%`);
        },
      });
      this.logger.info(`QVAC model loaded and ready: ${this.modelId}`);
      return this.modelId;
    })();

    try {
      await this._loading;
    } finally {
      this._loading = null;
    }
    return this.modelId;
  }

  async generate(prompt, options = {}) {
    const title = options.title || prompt.split('.')[0].slice(0, 60);
    if (this.qvac) {
      return this._generateQVAC(prompt, title);
    }
    return this._generateDemo(prompt, title);
  }

  async _generateQVAC(prompt, title) {
    this.logger.info(`Generating via QVAC SDK: ${title}`);
    const modelId = await this._ensureModelLoaded();
    const maxTokens = this.config.maxTokens || 800;
    const timeLimitMs = this.config.timeout || 360000;

    const history = [
      {
        role: 'system',
        content: 'Write concise markdown wiki content. Use ## headings, bullet lists, [[WikiLinks]], and #tags. Output markdown only, no preamble.'
      },
      { role: 'user', content: `Write a wiki page about: ${prompt}` }
    ];

    return new Promise((resolve, reject) => {
      const worker = new Worker(join(__dirname, 'qvac-worker.js'), {
        workerData: { history, maxTokens }
      });

      let lastBody = '';
      const timer = setTimeout(() => {
        worker.terminate();
        if (lastBody) {
          this.logger.warn(`Worker timed out — returning ${lastBody.length} chars`);
          resolve({ title, body: lastBody.trim(), source: 'qvac', model: this.config.model });
        } else {
          reject(new Error(`QVAC worker timed out after ${timeLimitMs / 1000}s with no output`));
        }
      }, timeLimitMs);

      worker.on('message', (msg) => {
        if (msg.type === 'status') {
          this.logger.info(`[worker] ${msg.message}`);
        } else if (msg.type === 'token') {
          lastBody = msg.body;
        } else if (msg.type === 'done') {
          clearTimeout(timer);
          worker.terminate();
          resolve({ title, body: msg.body.trim(), source: 'qvac', model: this.config.model });
        } else if (msg.type === 'error') {
          clearTimeout(timer);
          worker.terminate();
          reject(new Error(msg.message));
        }
      });

      worker.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  _generateDemo(prompt, title) {
    this.logger.info(`Generating demo content: ${title}`);
    const body = `# ${title}\n\n` +
      `This is QVAC-generated content about **${prompt}**.\n\n` +
      `## Overview\n\n` +
      `- Key concept one\n` +
      `- Key concept two\n` +
      `- Key concept three\n\n` +
      `## Details\n\n` +
      `> Important note via QVAC inference.\n\n` +
      `\`\`\`javascript\n` +
      `// Example code\n` +
      `console.log("QVAC AI output");\n` +
      `\`\`\`\n\n` +
      `## Related\n\n` +
      `- [[Related Page]]\n` +
      `- [[Another Topic]]\n\n` +
      `#qvac #generated\n`;
    return { title, body, source: 'demo', model: 'none' };
  }

  getStatus() {
    return {
      qvacAvailable: !!this.qvac,
      qvacExports: this.qvac ? Object.keys(this.qvac).slice(0, 5) : [],
      model: this.config.model,
    };
  }
}
