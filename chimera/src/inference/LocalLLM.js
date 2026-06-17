import { Logger } from '../core/Logger.js';

/**
 * LocalLLM — QVAC-native local inference via @qvac/sdk.
 *
 * Uses the official QVAC SDK streaming completion API.
 * Falls back to demo content if the SDK is unavailable.
 */
export class LocalLLM {
  constructor(config = {}) {
    this.config = {
      model: config.model || 'llama-3.2-1b-instruct',
      qvacModelConst: config.qvacModelConst || null,
      timeout: config.timeout || 300000,
      ...config
    };
    this.logger = new Logger('LocalLLM');
    this.qvac = null;
    this.modelId = null;
    this._loading = null;
    this._qvacTimedOut = false;
  }

  async initialize() {
    this.logger.info('Initializing LocalLLM (QVAC)...');
    try {
      this.qvac = await import('@qvac/sdk');
      this.logger.info('QVAC SDK loaded.');
    } catch (e) {
      this.logger.warn(`QVAC SDK not available: ${e.message}`);
      this.qvac = null;
    }
  }

  async generate(prompt, options = {}) {
    const title = options.title || prompt.split('.')[0].slice(0, 60);

    if (this.qvac && !this._qvacTimedOut) {
      try {
        return await this._generateQVAC(prompt, title);
      } catch (e) {
        this.logger.warn(`QVAC generation failed: ${e.message}`);
        this._qvacTimedOut = true;
      }
    }

    return this._generateDemo(prompt, title);
  }

  async _generateQVAC(prompt, title) {
    this.logger.info(`Generating via QVAC SDK: ${title}`);
    const { completion } = this.qvac;
    const modelId = await this._ensureModelLoaded();

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

    const result = completion({
      modelId,
      history,
      stream: true,
      generationParams: { predict: 50, temp: 0.7 }
    });

    let body = '';
    for await (const token of result.tokenStream) {
      body += token;
    }

    if (!body) {
      throw new Error('QVAC SDK completion produced no output');
    }

    return { title, body: body.trim(), source: 'qvac', model: this.config.model };
  }

  async _ensureModelLoaded() {
    if (this.modelId) return this.modelId;
    if (this._loading) return this._loading;

    this._loading = (async () => {
      const { loadModel, LLAMA_3_2_1B_INST_Q4_0 } = this.qvac;
      const modelSrc = this.config.qvacModelConst || LLAMA_3_2_1B_INST_Q4_0;
      this.logger.info(`Loading QVAC model (once)...`);
      this.modelId = await loadModel({
        modelSrc,
        modelType: 'llm',
        modelConfig: { device: 'cpu' },
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
      qvacAvailable: !!this.qvac && !this._qvacTimedOut,
      qvacExports: this.qvac ? Object.keys(this.qvac).slice(0, 5) : [],
      model: this.config.model,
    };
  }
}
