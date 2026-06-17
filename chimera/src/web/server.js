import { Logger } from '../core/Logger.js';
import { createServer, request as httpRequest } from 'http';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
  }
  
  async initialize() {
    this.logger.info('Initializing web server...');
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
    } else if (url.pathname === '/api/start' && req.method === 'POST') {
      await this.handleStart(req, res);
      return;
    } else if (url.pathname === '/api/stop' && req.method === 'POST') {
      await this.handleStop(req, res);
      return;
    } else if (url.pathname === '/api/wiki-pages' && req.method === 'GET') {
      await this.handleWikiPages(req, res);
      return;
    } else if (url.pathname.startsWith('/api/wiki-pages/') && req.method === 'GET') {
      await this.handleWikiPageGet(req, res, url.pathname.replace('/api/wiki-pages/', ''));
      return;
    } else if (url.pathname === '/api/wiki-pages' && req.method === 'POST') {
      await this.handleWikiPageSave(req, res);
      return;
    } else if (url.pathname.startsWith('/api/wiki-pages/') && req.method === 'DELETE') {
      await this.handleWikiPageDelete(req, res, url.pathname.replace('/api/wiki-pages/', ''));
      return;
    } else if (url.pathname.startsWith('/api/wiki-pages/') && url.pathname.endsWith('/sync-joplin') && req.method === 'POST') {
      await this.handleWikiPageSyncJoplin(req, res, url.pathname.replace('/api/wiki-pages/', '').replace('/sync-joplin', ''));
      return;
    } else if (url.pathname === '/api/joplin/notes' && req.method === 'GET') {
      await this.handleJoplinNotes(req, res);
      return;
    } else if (url.pathname === '/api/joplin/sync' && req.method === 'POST') {
      await this.handleJoplinSync(req, res);
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
        downloadUrl: '/install/qvac-chimera-installer.sh'
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

  // ─── Wiki Pages ───
  async handleWikiPages(req, res) {
    try {
      const wikiDir = path.join(process.cwd(), 'data', 'wiki-pages');
      const pages = [];
      try {
        const entries = await fs.readdir(wikiDir);
        for (const entry of entries.filter(e => e.endsWith('.md'))) {
          const content = await fs.readFile(path.join(wikiDir, entry), 'utf-8');
          const titleMatch = content.match(/^#\s(.+)$/m);
          const stat = await fs.stat(path.join(wikiDir, entry));
          pages.push({ id: entry.replace('.md', ''), title: titleMatch ? titleMatch[1] : entry.replace('.md', ''), updatedAt: stat.mtime.getTime() });
        }
      } catch { /* dir may not exist */ }
      pages.sort((a, b) => b.updatedAt - a.updatedAt);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ success: true, data: pages }));
    } catch (error) {
      this.logger.error('Error listing wiki pages:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }

  async handleWikiPageGet(req, res, pageId) {
    try {
      const wikiDir = path.join(process.cwd(), 'data', 'wiki-pages');
      const filePath = path.join(wikiDir, `${pageId}.md`);
      let content = '';
      try { content = await fs.readFile(filePath, 'utf-8'); } catch {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Page not found' }));
        return;
      }
      const titleMatch = content.match(/^#\s(.+)$/m);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ success: true, data: { id: pageId, title: titleMatch ? titleMatch[1] : pageId, content, updatedAt: (await fs.stat(filePath)).mtime.getTime() } }));
    } catch (error) {
      this.logger.error('Error getting wiki page:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }

  async handleWikiPageSave(req, res) {
    try {
      const body = await this.parseBody(req);
      const { id, title, content } = body;
      if (!id || !content) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'id and content are required' }));
        return;
      }
      const wikiDir = path.join(process.cwd(), 'data', 'wiki-pages');
      await fs.mkdir(wikiDir, { recursive: true });
      const filePath = path.join(wikiDir, `${id}.md`);
      const mdContent = content.startsWith('# ') ? content : `# ${title || id}\n\n${content}`;
      await fs.writeFile(filePath, mdContent);
      if (this.nodeManager?.dataStore) {
        await this.nodeManager.dataStore.append({ type: 'wiki-page', id, title: title || id, content: mdContent, timestamp: Date.now() });
      }
      this.logger.info(`Wiki page saved: ${id}`);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ success: true, data: { id, title: title || id } }));
    } catch (error) {
      this.logger.error('Error saving wiki page:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }

  async handleWikiPageDelete(req, res, pageId) {
    try {
      const wikiDir = path.join(process.cwd(), 'data', 'wiki-pages');
      const filePath = path.join(wikiDir, `${pageId}.md`);
      try { await fs.unlink(filePath); } catch { }
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ success: true }));
    } catch (error) {
      this.logger.error('Error deleting wiki page:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }

  // ─── Joplin Helpers ───
  async joplinRequest(endpoint, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
      const token = process.env.JOPLIN_TOKEN || '102746798bf0b619bcf42b2a3f9bd5c286d0720eabb98916ca40db2f4564f9be';
      const options = { hostname: 'localhost', port: 41184, path: `${endpoint}?token=${token}`, method, headers: {} };
      if (body) { options.headers['Content-Type'] = 'application/json'; }
      const reqJ = httpRequest(options, (resJ) => {
        let data = '';
        resJ.on('data', chunk => data += chunk);
        resJ.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
      });
      reqJ.on('error', reject);
      if (body) reqJ.write(JSON.stringify(body));
      reqJ.end();
    });
  }

  async handleWikiPageSyncJoplin(req, res, pageId) {
    try {
      const wikiDir = path.join(process.cwd(), 'data', 'wiki-pages');
      const filePath = path.join(wikiDir, `${pageId}.md`);
      let content = '';
      try { content = await fs.readFile(filePath, 'utf-8'); } catch {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Page not found' }));
        return;
      }
      const titleMatch = content.match(/^#\s(.+)$/m);
      const title = titleMatch ? titleMatch[1] : pageId;
      // Create note in Joplin
      const note = await this.joplinRequest('/notes', 'POST', { title, body: content });
      this.logger.info(`Synced wiki page ${pageId} to Joplin note ${note?.id}`);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ success: true, data: note }));
    } catch (error) {
      this.logger.error('Error syncing to Joplin:', error);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ success: false, error: error.message || 'Joplin not available' }));
    }
  }

  async handleJoplinNotes(req, res) {
    try {
      const notes = await this.joplinRequest('/notes');
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ success: true, data: notes || [] }));
    } catch (error) {
      this.logger.error('Error fetching Joplin notes:', error);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ success: false, error: error.message || 'Joplin not available', data: [] }));
    }
  }

  async handleJoplinSync(req, res) {
    try {
      const body = await this.parseBody(req);
      const direction = body.direction || 'both'; // 'to-joplin', 'from-joplin', 'both'
      let synced = 0;

      if (direction === 'to-joplin' || direction === 'both') {
        const wikiDir = path.join(process.cwd(), 'data', 'wiki-pages');
        try {
          const entries = await fs.readdir(wikiDir);
          for (const entry of entries.filter(e => e.endsWith('.md'))) {
            const content = await fs.readFile(path.join(wikiDir, entry), 'utf-8');
            const titleMatch = content.match(/^#\s(.+)$/m);
            const title = titleMatch ? titleMatch[1] : entry.replace('.md', '');
            await this.joplinRequest('/notes', 'POST', { title, body: content });
            synced++;
          }
        } catch { }
      }

      if (direction === 'from-joplin' || direction === 'both') {
        const notes = await this.joplinRequest('/notes');
        const items = notes?.items || notes || [];
        const wikiDir = path.join(process.cwd(), 'data', 'wiki-pages');
        await fs.mkdir(wikiDir, { recursive: true });
        for (const note of items) {
          const id = (note.title || 'untitled').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
          const filePath = path.join(wikiDir, `${id}.md`);
          await fs.writeFile(filePath, `# ${note.title}\n\n${note.body || ''}`);
          if (this.nodeManager?.dataStore) {
            await this.nodeManager.dataStore.append({ type: 'wiki-page', id, title: note.title, content: note.body || '', timestamp: Date.now(), source: 'joplin' });
          }
          synced++;
        }
      }

      this.logger.info(`Joplin sync complete: ${synced} items`);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ success: true, data: { synced } }));
    } catch (error) {
      this.logger.error('Error during Joplin sync:', error);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ success: false, error: error.message || 'Joplin not available' }));
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
