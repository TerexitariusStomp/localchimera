import { Logger } from '../core/Logger.js';
import { createServer } from 'http';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { MarkdownIndexer } from '../llmwiki/MarkdownIndexer.js';
import { NodeOrchestrator } from '../orchestrator/NodeOrchestrator.js';
import { matchRoute } from './router.js';
import { ok, accepted, badRequest, serverError, serviceUnavailable, parseBody } from './reply.js';
import { extractBoundary, readBody, parseMultipart } from './multipart.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve built React frontend from project root
const PUBLIC_DIR = path.join(__dirname, '..', '..', 'frontend', 'dist');

export class WebServer {
  constructor(config, nodeManager = null) {
    this.config = config;
    this.nodeManager = nodeManager;
    this.logger = new Logger('WebServer');
    this.server = null;
    this.port = 3000;
    this.indexer = new MarkdownIndexer();
    this.orchestrator = new NodeOrchestrator();
  }

  async initialize() {
    this.logger.info('Initializing web server...');
    try {
      await this.indexer.index();
    } catch (e) {
      this.logger.warn(`Initial llmwiki index failed: ${e.message}`);
    }
    this.logger.info('Web server initialized');
  }
  
  async start() {
    this.logger.info('Starting web server...');
    
    this.server = createServer(async (req, res) => {
      // CORS for all responses
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }
      await this.handleRequest(req, res);
    });

    // Increase server timeout for long AI generation (10 min)
    this.server.timeout = 600000;
    this.server.keepAliveTimeout = 620000;
    
    this.server.listen(this.port, () => {
      this.logger.info(`Web server listening on port ${this.port}`);
    });
  }
  
  async stop() {
    this.logger.info('Stopping web server...');
    
    if (this.server) {
      this.server.close();
    }
    
    this.logger.info('Web server stopped');
  }
  
  async handleRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    this.logger.debug(`${req.method} ${url.pathname}`);

    const handlerName = matchRoute(req.method, url.pathname);
    if (handlerName) {
      try {
        await this[handlerName](req, res);
      } catch (error) {
        this.logger.error(`${handlerName} threw:`, error);
        serverError(res, error);
      }
      return;
    }

    await this.serveStatic(res, url.pathname);
  }

  async serveStatic(res, pathname) {
    try {
      let filePath;
      let contentType = 'application/octet-stream';

      if (pathname === '/' || pathname === '/index.html') {
        filePath = path.join(PUBLIC_DIR, 'index.html');
        contentType = 'text/html';
      } else if (pathname.startsWith('/assets/')) {
        filePath = path.join(PUBLIC_DIR, pathname);
        if (pathname.endsWith('.js')) contentType = 'application/javascript';
        else if (pathname.endsWith('.css')) contentType = 'text/css';
      } else {
        // Try to serve other files from dist, fall back to index.html for SPA routing
        filePath = path.join(PUBLIC_DIR, pathname);
        try {
          await fs.access(filePath);
          if (pathname.endsWith('.html')) contentType = 'text/html';
          else if (pathname.endsWith('.css')) contentType = 'text/css';
          else if (pathname.endsWith('.js')) contentType = 'application/javascript';
          else if (pathname.endsWith('.json')) contentType = 'application/json';
          else if (pathname.endsWith('.png')) contentType = 'image/png';
          else if (pathname.endsWith('.svg')) contentType = 'image/svg+xml';
        } catch {
          // SPA fallback: serve index.html for unknown routes
          filePath = path.join(PUBLIC_DIR, 'index.html');
          contentType = 'text/html';
        }
      }

      const content = await fs.readFile(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch (error) {
      this.logger.error(`Error serving ${pathname}:`, error);
      res.writeHead(500);
      res.end('Internal Server Error');
    }
  }
  
  async handleConsent(req, res) {
    const body = await parseBody(req);
    const consentPath = path.join(process.cwd(), 'data', 'consent.json');
    await fs.mkdir(path.dirname(consentPath), { recursive: true });
    await fs.writeFile(consentPath, JSON.stringify({
      accepted: body.accepted,
      timestamp: Date.now(),
      userAgent: req.headers['user-agent'],
    }, null, 2));
    ok(res, { accepted: body.accepted });
  }
  
  async handleSignIn(req, res) {
    const body = await parseBody(req);
    ok(res, { method: body.method || 'email', email: body.email, timestamp: Date.now() });
  }
  
  async handleDownload(req, res) {
    const consentPath = path.join(process.cwd(), 'data', 'consent.json');
    try { await fs.access(consentPath); }
    catch { badRequest(res, 'Consent required'); return; }
    ok(res, { downloadUrl: '/install/qvac-pear-miner-node-installer.sh' });
  }
  
  async handleStatus(req, res) {
    if (!this.nodeManager) { serviceUnavailable(res, 'Node manager not available'); return; }
    ok(res, this.nodeManager.getStatus());
  }
  
  async handleAIWrite(req, res) {
    const body = await parseBody(req);
    const prompt = body.prompt?.trim();
    const title = body.title?.trim();
    if (!prompt) { badRequest(res, 'Prompt is required'); return; }

    const localLLM = this.nodeManager?.localLLM;
    if (!localLLM) { serviceUnavailable(res, 'LocalLLM not initialized'); return; }

    this.logger.info(`AI write request: ${title || prompt}`);
    const result = await localLLM.generate(prompt, { title });

    const docId = `ai-${Date.now()}`;
    const doc = { id: docId, title: result.title, body: result.body, source: result.source, model: result.model, prompt, createdAt: Date.now() };

    if (this.nodeManager?.dataStore) await this.nodeManager.dataStore.appendAIDoc(doc);

    const docPath = path.join(process.cwd(), 'data', 'ai-docs', `${docId}.md`);
    await fs.mkdir(path.dirname(docPath), { recursive: true });
    await fs.writeFile(docPath, `# ${result.title}\n\n${result.body}\n\n<!-- source: ${result.source} | model: ${result.model} | prompt: ${prompt} -->\n`);

    ok(res, doc);
  }

  async handleAIStatus(req, res) {
    const localLLM = this.nodeManager?.localLLM;
    ok(res, localLLM ? localLLM.getStatus() : { available: false });
  }

  async handleAIDocs(req, res) {
    const docsDir = path.join(process.cwd(), 'data', 'ai-docs');
    const files = [];
    try {
      const entries = await fs.readdir(docsDir);
      for (const entry of entries.filter(e => e.endsWith('.md'))) {
        const full = path.join(docsDir, entry);
        const content = await fs.readFile(full, 'utf-8');
        const titleMatch = content.match(/^#\s(.+)$/m);
        files.push({ id: entry.replace('.md', ''), title: titleMatch?.[1] ?? entry, createdAt: (await fs.stat(full)).mtime.getTime() });
      }
    } catch { /* directory may not exist */ }
    ok(res, files.sort((a, b) => b.createdAt - a.createdAt));
  }

  async handleLLMWikiCreate(req, res) {
    const body = await parseBody(req);
    const { topic = '', prompt: customPrompt = '', category = 'concepts', tags = [], description = '', links = [] } = body;
    if (!topic && !customPrompt) { badRequest(res, 'topic or prompt is required'); return; }

    const jobId = await this._spawnBridgeJob({ topic, customPrompt, category, tags, description, links });
    accepted(res, { jobId, topic: customPrompt || topic, category, status: 'started',
      message: `Wiki page generation started for category '${category}'.` });
  }

  async handleLLMWikiUpload(req, res) {
    const boundary = extractBoundary(req);
    if (!boundary) { badRequest(res, 'Missing multipart boundary'); return; }

    const data = await readBody(req);
    const parts = parseMultipart(data, boundary);
    const filePart = parts.find(p => p.filename);
    if (!filePart) { badRequest(res, 'No file uploaded'); return; }

    const fields = Object.fromEntries(parts.filter(p => !p.filename).map(p => [p.name, p.value]));
    const category = fields.category || 'concepts';
    const tags = (fields.tags || '').split(',').map(t => t.trim()).filter(Boolean);

    const sourcesDir = path.join(process.cwd(), 'llmwiki-data', 'sources');
    await fs.mkdir(sourcesDir, { recursive: true });
    const destPath = path.join(sourcesDir, filePart.filename);
    await fs.writeFile(destPath, filePart.data);

    const jobId = await this._spawnBridgeJob({
      topic: filePart.filename,
      customPrompt: 'Analyze the following document and write a comprehensive wiki page summarizing its key concepts, findings, and structure.',
      category,
      tags,
      description: fields.title || '',
      fileSource: destPath,
    });
    accepted(res, { jobId, filename: filePart.filename, category, status: 'started',
      message: `File saved. Wiki page generation started for category '${category}'.` });
  }

  async handleLLMWikiDocs(req, res) {
    await this.indexer.ensureFresh();
    ok(res, this.indexer.listDocuments());
  }

  async handleLLMWikiSearch(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const query = url.searchParams.get('q') || '';
    const tags = (url.searchParams.get('tags') || '').split(',').filter(Boolean);
    const category = url.searchParams.get('category') || '';
    await this.indexer.ensureFresh();
    ok(res, this.indexer.search(query, { tags, category }));
  }

  async handleLLMWikiGraph(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const nodeId = url.searchParams.get('id') || '';
    await this.indexer.ensureFresh();
    const result = nodeId
      ? this.indexer.graph(nodeId)
      : { nodes: this.indexer.documents.length, links: this.indexer.links.length };
    ok(res, result);
  }

  /* ─── Orchestrator Handlers ─── */

  async handleCommanderRegister(req, res) {
    const { workerUrl } = await parseBody(req);
    const result = this.orchestrator.registerWorker(workerUrl);
    ok(res, result);
  }

  async handleCommanderWorkers(req, res) {
    ok(res, this.orchestrator.getWorkers());
  }

  async handleCommanderStats(req, res) {
    ok(res, this.orchestrator.getFleetStats());
  }

  async handleCommanderJobs(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    ok(res, this.orchestrator.claimJob(url.searchParams.get('worker') || ''));
  }

  async handleCommanderComplete(req, res) {
    const { jobId, workerUrl, pagesGenerated = 1 } = await parseBody(req);
    this.orchestrator.completeJob(jobId, workerUrl, pagesGenerated);
    ok(res, { completed: jobId });
  }

  async handleCommanderDistribute(req, res) {
    const { jobs = [] } = await parseBody(req);
    const result = this.orchestrator.addJobs(jobs);
    ok(res, result);
  }

  async handleCommanderStop(req, res) {
    ok(res, this.orchestrator.stopFleet());
  }

  async handleCommanderStart(req, res) {
    ok(res, this.orchestrator.startFleet());
  }

  async handleWorkerStop(req, res) {
    this.orchestrator.receiveStop();
    ok(res, { message: 'Worker will halt after current job' });
  }

  async handleStart(req, res) {
    if (!this.nodeManager) { serviceUnavailable(res, 'Node manager not available'); return; }
    const body = await parseBody(req);
    if (!this.nodeManager.isRunning) await this.nodeManager.start();
    if (body.wallet && this.nodeManager.minerManager) {
      this.nodeManager.minerManager.evmAddress = body.wallet;
    }
    ok(res, { message: 'Mining started', running: true });
  }

  async handleStop(req, res) {
    if (!this.nodeManager) { serviceUnavailable(res, 'Node manager not available'); return; }
    if (this.nodeManager.isRunning) await this.nodeManager.stop();
    ok(res, { message: 'Mining stopped', running: false });
  }

  /* ─── Private helpers ─── */

  async _spawnBridgeJob({ topic, customPrompt, category, tags, description, links = [], fileSource = '' }) {
    const workspace = path.join(process.cwd(), 'llmwiki-data');
    const bridge = path.join(process.cwd(), 'src', 'llmwiki', 'bridge.py');
    const args = [bridge, workspace, topic || 'Untitled', '--category', category];
    if (tags.length)       args.push('--tags', ...tags);
    if (description)       args.push('--description', description);
    if (customPrompt)      args.push('--prompt', customPrompt);
    if (links.length)      args.push('--links', ...links);
    if (fileSource)        args.push('--file-source', fileSource);

    const jobId = `lw-${Date.now()}`;
    this.logger.info(`[llmwiki] Job ${jobId}: ${customPrompt || topic} (${category})`);

    const proc = spawn('/usr/bin/python3', args, { detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
    proc.unref();
    let out = '', err = '';
    proc.stdout.on('data', d => { out += d; });
    proc.stderr.on('data', d => { err += d; });
    proc.on('close', code => {
      if (code !== 0) this.logger.error(`[llmwiki] Job ${jobId} failed: ${err || out}`);
      else this.logger.info(`[llmwiki] Job ${jobId} completed`);
    });
    return jobId;
  }
}
