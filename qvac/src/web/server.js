import { Logger } from '../core/Logger.js';
import { createServer } from 'http';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { MarkdownIndexer } from '../llmwiki/MarkdownIndexer.js';
import { NodeOrchestrator } from '../orchestrator/NodeOrchestrator.js';

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

    // API routes
    if (url.pathname === '/api/consent' && req.method === 'POST') {
      await this.handleConsent(req, res);
      return;
    } else if (url.pathname === '/api/signin' && req.method === 'POST') {
      await this.handleSignIn(req, res);
      return;
    } else if (url.pathname === '/api/download' && req.method === 'GET') {
      await this.handleDownload(req, res);
      return;
    } else if (url.pathname === '/api/status' && req.method === 'GET') {
      await this.handleStatus(req, res);
      return;
    } else if (url.pathname === '/api/ai-write' && req.method === 'POST') {
      await this.handleAIWrite(req, res);
      return;
    } else if (url.pathname === '/api/ai-status' && req.method === 'GET') {
      await this.handleAIStatus(req, res);
      return;
    } else if (url.pathname === '/api/ai-docs' && req.method === 'GET') {
      await this.handleAIDocs(req, res);
      return;
    } else if (url.pathname === '/api/llmwiki-create' && req.method === 'POST') {
      await this.handleLLMWikiCreate(req, res);
      return;
    } else if (url.pathname === '/api/llmwiki-upload' && req.method === 'POST') {
      await this.handleLLMWikiUpload(req, res);
      return;
    } else if (url.pathname === '/api/llmwiki-docs' && req.method === 'GET') {
      await this.handleLLMWikiDocs(req, res);
      return;
    } else if (url.pathname === '/api/llmwiki-search' && req.method === 'GET') {
      await this.handleLLMWikiSearch(req, res);
      return;
    } else if (url.pathname === '/api/llmwiki-graph' && req.method === 'GET') {
      await this.handleLLMWikiGraph(req, res);
      return;
    } else if (url.pathname === '/api/commander/register' && req.method === 'POST') {
      await this.handleCommanderRegister(req, res);
      return;
    } else if (url.pathname === '/api/commander/workers' && req.method === 'GET') {
      await this.handleCommanderWorkers(req, res);
      return;
    } else if (url.pathname === '/api/commander/jobs' && req.method === 'GET') {
      await this.handleCommanderJobs(req, res);
      return;
    } else if (url.pathname === '/api/commander/complete' && req.method === 'POST') {
      await this.handleCommanderComplete(req, res);
      return;
    } else if (url.pathname === '/api/commander/distribute' && req.method === 'POST') {
      await this.handleCommanderDistribute(req, res);
      return;
    } else if (url.pathname === '/api/commander/stop' && req.method === 'POST') {
      await this.handleCommanderStop(req, res);
      return;
    } else if (url.pathname === '/api/commander/start' && req.method === 'POST') {
      await this.handleCommanderStart(req, res);
      return;
    } else if (url.pathname === '/api/commander/stats' && req.method === 'GET') {
      await this.handleCommanderStats(req, res);
      return;
    } else if (url.pathname === '/api/worker/stop' && req.method === 'POST') {
      await this.handleWorkerStop(req, res);
      return;
    } else if (url.pathname === '/api/start' && req.method === 'POST') {
      await this.handleStart(req, res);
      return;
    } else if (url.pathname === '/api/stop' && req.method === 'POST') {
      await this.handleStop(req, res);
      return;
    }

    // Static files from built frontend
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
    try {
      const body = await this.parseBody(req);
      
      // Store consent
      const consentData = {
        accepted: body.accepted,
        timestamp: Date.now(),
        userAgent: req.headers['user-agent']
      };
      
      // Save consent to data store
      const consentPath = path.join(process.cwd(), 'data', 'consent.json');
      await fs.mkdir(path.dirname(consentPath), { recursive: true });
      await fs.writeFile(consentPath, JSON.stringify(consentData, null, 2));
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (error) {
      this.logger.error('Error handling consent:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }
  
  async handleSignIn(req, res) {
    try {
      const body = await this.parseBody(req);
      
      // Handle sign-in
      const signInData = {
        method: body.method || 'email',
        email: body.email,
        timestamp: Date.now()
      };
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, signInData }));
    } catch (error) {
      this.logger.error('Error handling sign-in:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }
  
  async handleDownload(req, res) {
    try {
      // Check if consent was given
      const consentPath = path.join(process.cwd(), 'data', 'consent.json');
      try {
        await fs.access(consentPath);
      } catch (error) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Consent required' }));
        return;
      }
      
      // In real implementation, this would serve the actual installer
      // For now, return a placeholder
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        message: 'Download link would be provided here',
        downloadUrl: '/install/qvac-pear-miner-node-installer.sh'
      }));
    } catch (error) {
      this.logger.error('Error handling download:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }
  
  async handleStatus(req, res) {
    try {
      if (!this.nodeManager) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Node manager not available' }));
        return;
      }

      const status = this.nodeManager.getStatus();
      
      // Add CORS headers for frontend
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      res.end(JSON.stringify({ success: true, data: status }));
    } catch (error) {
      this.logger.error('Error handling status:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }
  
  async handleAIWrite(req, res) {
    try {
      const body = await this.parseBody(req);
      const prompt = body.prompt?.trim();
      const title = body.title?.trim();

      if (!prompt) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Prompt is required' }));
        return;
      }

      // Get LocalLLM from node manager
      const localLLM = this.nodeManager?.localLLM;
      if (!localLLM) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'LocalLLM not initialized' }));
        return;
      }

      this.logger.info(`AI write request: ${title || prompt}`);
      const result = await localLLM.generate(prompt, { title });

      // Store in Hypercore via storage module
      const docId = `ai-${Date.now()}`;
      const doc = {
        id: docId,
        title: result.title,
        body: result.body,
        source: result.source,
        model: result.model,
        prompt,
        createdAt: Date.now()
      };

      if (this.nodeManager?.dataStore) {
        await this.nodeManager.dataStore.appendAIDoc(doc);
      }

      // Also write to local markdown for OpenViking indexing
      const docPath = path.join(process.cwd(), 'data', 'ai-docs', `${docId}.md`);
      await fs.mkdir(path.dirname(docPath), { recursive: true });
      const mdContent = `# ${result.title}\n\n${result.body}\n\n<!-- source: ${result.source} | model: ${result.model} | prompt: ${prompt} -->\n`;
      await fs.writeFile(docPath, mdContent);

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ success: true, data: doc }));
    } catch (error) {
      this.logger.error('Error handling AI write:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }

  async handleAIStatus(req, res) {
    try {
      const localLLM = this.nodeManager?.localLLM;
      const status = localLLM ? localLLM.getStatus() : { available: false };

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ success: true, data: status }));
    } catch (error) {
      this.logger.error('Error handling AI status:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }

  async handleAIDocs(req, res) {
    try {
      const docsDir = path.join(process.cwd(), 'data', 'ai-docs');
      const files = [];
      try {
        const entries = await fs.readdir(docsDir);
        for (const entry of entries.filter(e => e.endsWith('.md'))) {
          const content = await fs.readFile(path.join(docsDir, entry), 'utf-8');
          const titleMatch = content.match(/^#\s(.+)$/m);
          files.push({
            id: entry.replace('.md', ''),
            title: titleMatch ? titleMatch[1] : entry,
            createdAt: (await fs.stat(path.join(docsDir, entry))).mtime.getTime()
          });
        }
      } catch {
        // Directory may not exist yet
      }

      files.sort((a, b) => b.createdAt - a.createdAt);

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ success: true, data: files }));
    } catch (error) {
      this.logger.error('Error handling AI docs:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }

  async handleLLMWikiCreate(req, res) {
    try {
      const body = await this.parseBody(req);
      const topic = body.topic || '';
      const customPrompt = body.prompt || '';
      const category = body.category || 'concepts';
      const tags = body.tags || [];
      const description = body.description || '';
      const links = body.links || [];

      if (!topic && !customPrompt) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'topic or prompt is required' }));
        return;
      }

      const workspace = path.join(process.cwd(), 'llmwiki-data');
      const bridge = path.join(process.cwd(), 'src', 'llmwiki', 'bridge.py');
      const args = [bridge, workspace, topic || 'Untitled', '--category', category];
      if (tags.length) args.push('--tags', ...tags);
      if (description) args.push('--description', description);
      if (customPrompt) args.push('--prompt', customPrompt);
      if (links.length) args.push('--links', ...links);

      const jobId = `lw-${Date.now()}`;
      this.logger.info(`[llmwiki] Starting job ${jobId}: ${customPrompt || topic} (${category})`);

      const proc = spawn('/usr/bin/python3', args, {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      proc.unref();

      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (d) => { stdout += d; });
      proc.stderr.on('data', (d) => { stderr += d; });
      proc.on('close', (code) => {
        if (code !== 0) {
          this.logger.error(`[llmwiki] Job ${jobId} failed: ${stderr || stdout}`);
        } else {
          this.logger.info(`[llmwiki] Job ${jobId} completed`);
        }
      });

      res.writeHead(202, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({
        success: true,
        data: {
          jobId,
          topic: customPrompt || topic,
          category,
          status: 'started',
          message: `Wiki page generation started. Check ${workspace}/wiki/${category}/ in ~6-8 minutes.`
        }
      }));
    } catch (error) {
      this.logger.error('Error handling llmwiki create:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }

  async handleLLMWikiUpload(req, res) {
    try {
      const boundary = this._extractBoundary(req);
      if (!boundary) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Missing multipart boundary' }));
        return;
      }

      const buffers = [];
      for await (const chunk of req) buffers.push(chunk);
      const data = Buffer.concat(buffers);

      const parts = this._parseMultipart(data, boundary);
      const filePart = parts.find(p => p.filename);
      const fields = {};
      parts.filter(p => !p.filename).forEach(p => { fields[p.name] = p.value; });

      if (!filePart) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'No file uploaded' }));
        return;
      }

      const sourcesDir = path.join(process.cwd(), 'llmwiki-data', 'sources');
      await fs.mkdir(sourcesDir, { recursive: true });
      const destPath = path.join(sourcesDir, filePart.filename);
      await fs.writeFile(destPath, filePart.data);

      const category = fields.category || 'concepts';
      const tags = (fields.tags || '').split(',').map(t => t.trim()).filter(Boolean);
      const title = fields.title || '';

      const workspace = path.join(process.cwd(), 'llmwiki-data');
      const bridge = path.join(process.cwd(), 'src', 'llmwiki', 'bridge.py');
      const promptText = `Analyze the following document and write a comprehensive wiki page summarizing its key concepts, findings, and structure.`;
      const args = [bridge, workspace, filePart.filename, '--category', category, '--prompt', promptText, '--file-source', destPath];
      if (tags.length) args.push('--tags', ...tags);
      if (title) args.push('--description', title);

      const jobId = `lw-${Date.now()}`;
      this.logger.info(`[llmwiki] Starting upload job ${jobId}: ${filePart.filename}`);

      const proc = spawn('/usr/bin/python3', args, {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      proc.unref();

      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (d) => { stdout += d; });
      proc.stderr.on('data', (d) => { stderr += d; });
      proc.on('close', (code) => {
        if (code !== 0) {
          this.logger.error(`[llmwiki] Upload job ${jobId} failed: ${stderr || stdout}`);
        } else {
          this.logger.info(`[llmwiki] Upload job ${jobId} completed`);
        }
      });

      res.writeHead(202, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({
        success: true,
        data: {
          jobId,
          filename: filePart.filename,
          category,
          status: 'started',
          message: `File saved. Wiki page generation started. Check ${workspace}/wiki/${category}/ in ~6-8 minutes.`
        }
      }));
    } catch (error) {
      this.logger.error('Error handling llmwiki upload:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }

  _extractBoundary(req) {
    const ct = req.headers['content-type'] || '';
    const m = ct.match(/boundary=([^;\s]+)/);
    return m ? m[1].replace(/^"|"$/g, '') : null;
  }

  _parseMultipart(data, boundary) {
    const parts = [];
    const sep = Buffer.from(`--${boundary}`);
    let start = data.indexOf(sep);
    while (start !== -1) {
      let end = data.indexOf(sep, start + sep.length);
      if (end === -1) break;
      const part = data.slice(start + sep.length + 2, end - 2); // skip \r\n before and \r\n-- after
      const headerEnd = part.indexOf('\r\n\r\n');
      if (headerEnd === -1) { start = end; continue; }
      const headers = part.slice(0, headerEnd).toString('utf-8');
      const body = part.slice(headerEnd + 4);
      const nameMatch = headers.match(/name="([^"]+)"/);
      const filenameMatch = headers.match(/filename="([^"]+)"/);
      parts.push({
        name: nameMatch ? nameMatch[1] : '',
        filename: filenameMatch ? filenameMatch[1] : '',
        value: body.toString('utf-8').replace(/\r\n$/, ''),
        data: body,
      });
      start = end;
    }
    return parts;
  }

  async handleLLMWikiDocs(req, res) {
    try {
      await this.indexer.ensureFresh();
      const docs = this.indexer.listDocuments();
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ success: true, data: docs }));
    } catch (error) {
      this.logger.error('Error handling llmwiki docs:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }

  async handleLLMWikiSearch(req, res) {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const query = url.searchParams.get('q') || '';
      const tags = (url.searchParams.get('tags') || '').split(',').filter(Boolean);
      const category = url.searchParams.get('category') || '';
      await this.indexer.ensureFresh();
      const results = this.indexer.search(query, { tags, category });
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ success: true, data: results }));
    } catch (error) {
      this.logger.error('Error handling llmwiki search:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }

  async handleLLMWikiGraph(req, res) {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const nodeId = url.searchParams.get('id') || '';
      await this.indexer.ensureFresh();
      const result = nodeId ? this.indexer.graph(nodeId) : { nodes: this.indexer.documents.length, links: this.indexer.links.length };
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ success: true, data: result }));
    } catch (error) {
      this.logger.error('Error handling llmwiki graph:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }

  /* ─── Orchestrator Handlers ─── */

  async handleCommanderRegister(req, res) {
    try {
      const body = await this.parseBody(req);
      const result = this.orchestrator.registerWorker(body.workerUrl);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ success: result.ok, data: result }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }

  async handleCommanderWorkers(req, res) {
    try {
      const workers = this.orchestrator.getWorkers();
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ success: true, data: workers }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }

  async handleCommanderJobs(req, res) {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const workerUrl = url.searchParams.get('worker') || '';
      const result = this.orchestrator.claimJob(workerUrl);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ success: true, data: result }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }

  async handleCommanderComplete(req, res) {
    try {
      const body = await this.parseBody(req);
      this.orchestrator.completeJob(body.jobId, body.workerUrl, body.pagesGenerated || 1);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ success: true }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }

  async handleCommanderDistribute(req, res) {
    try {
      const body = await this.parseBody(req);
      const jobs = body.jobs || [];
      const result = this.orchestrator.addJobs(jobs);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ success: result.ok, data: result }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }

  async handleCommanderStop(req, res) {
    try {
      const result = this.orchestrator.stopFleet();
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ success: result.ok, data: result }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }

  async handleCommanderStart(req, res) {
    try {
      const result = this.orchestrator.startFleet();
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ success: result.ok, data: result }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }

  async handleCommanderStats(req, res) {
    try {
      const stats = this.orchestrator.getFleetStats();
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ success: true, data: stats }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }

  async handleWorkerStop(req, res) {
    try {
      this.orchestrator.receiveStop();
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ success: true, message: 'Worker will halt after current job' }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }

  async handleStart(req, res) {
    try {
      const body = await this.parseBody(req);
      this.logger.info(`Start mining request from PWA: wallet=${body.wallet?.slice(0, 10)}...`);

      if (!this.nodeManager) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Node manager not available' }));
        return;
      }

      if (!this.nodeManager.isRunning) {
        await this.nodeManager.start();
        this.logger.info('Node started via PWA');
      }

      // Update wallet address if provided
      if (body.wallet && this.nodeManager.minerManager) {
        this.nodeManager.minerManager.evmAddress = body.wallet;
        this.logger.info(`Wallet updated: ${body.wallet.slice(0, 10)}...`);
      }

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ success: true, message: 'Mining started', running: true }));
    } catch (error) {
      this.logger.error('Error handling start:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }

  async handleStop(req, res) {
    try {
      this.logger.info('Stop mining request from PWA');

      if (!this.nodeManager) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Node manager not available' }));
        return;
      }

      if (this.nodeManager.isRunning) {
        await this.nodeManager.stop();
        this.logger.info('Node stopped via PWA');
      }

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ success: true, message: 'Mining stopped', running: false }));
    } catch (error) {
      this.logger.error('Error handling stop:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }

  async parseBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
      req.on('error', reject);
    });
  }
}
