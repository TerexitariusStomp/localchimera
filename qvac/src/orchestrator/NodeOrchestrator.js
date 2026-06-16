import { Logger } from '../core/Logger.js';

/**
 * NodeOrchestrator manages multi-node collaborative wiki generation.
 *
 * Roles:
 *   - commander : distributes topics, receives worker registration,
 *                 broadcasts STOP to the fleet.
 *   - worker    : registers with a commander, polls for jobs,
 *                 generates wiki pages locally.
 *
 * Environment:
 *   ORCHESTRATOR_ROLE=commander|worker
 *   COMMANDER_URL=http://host:3000   (used by worker)
 *   ORCHESTRATOR_TAGS=tag1,tag2      (default tags for generated pages)
 */

const ROLE = process.env.ORCHESTRATOR_ROLE || 'commander';
const COMMANDER_URL = process.env.COMMANDER_URL || '';
const DEFAULT_TAGS = (process.env.ORCHESTRATOR_TAGS || 'collaborative,ai-generated')
  .split(',').map(t => t.trim()).filter(Boolean);

export class NodeOrchestrator {
  constructor() {
    this.logger = new Logger('NodeOrchestrator');
    this.role = ROLE;

    // Commander state
    this.workers = new Map(); // url -> { registeredAt, lastSeen, activeJobs, totalPages }
    this.jobQueue = [];       // { topic, category, tags, assignedTo, status }
    this.stopFlag = false;
    this.completedJobs = [];

    // Worker state
    this.commanderUrl = COMMANDER_URL;
    this.workerInterval = null;

    if (this.role === 'commander') {
      this.logger.info('Orchestrator running as COMMANDER');
      this._startCommanderCleanup();
    } else if (this.role === 'worker') {
      this.logger.info(`Orchestrator running as WORKER -> ${this.commanderUrl}`);
      this._startWorkerPoll();
    }
  }

  /* ─── Commander API ─── */

  registerWorker(workerUrl) {
    if (this.role !== 'commander') return { ok: false, error: 'not a commander' };
    const clean = workerUrl.replace(/\/$/, '');
    const existing = this.workers.get(clean);
    this.workers.set(clean, {
      url: clean,
      registeredAt: existing?.registeredAt || Date.now(),
      lastSeen: Date.now(),
      activeJobs: existing?.activeJobs || 0,
      totalPages: existing?.totalPages || 0,
      online: true,
    });
    this.logger.info(`Worker registered: ${clean} (total: ${this.workers.size})`);
    return { ok: true, workers: this.workers.size };
  }

  heartbeat(workerUrl) {
    if (this.role !== 'commander') return { ok: false };
    const clean = workerUrl.replace(/\/$/, '');
    const w = this.workers.get(clean);
    if (w) {
      w.lastSeen = Date.now();
      w.online = true;
    }
    return { ok: !!w };
  }

  getWorkers() {
    return Array.from(this.workers.values()).map(w => ({
      url: w.url,
      online: w.online && (Date.now() - w.lastSeen < 60000),
      activeJobs: w.activeJobs,
      totalPages: w.totalPages,
      lastSeen: new Date(w.lastSeen).toISOString(),
    }));
  }

  getFleetStats() {
    const workers = this.getWorkers();
    return {
      workers: workers.length,
      online: workers.filter(w => w.online).length,
      queueLength: this.jobQueue.length,
      completedJobs: this.completedJobs.length,
      stopFlag: this.stopFlag,
    };
  }

  addJobs(jobs) {
    if (this.role !== 'commander') return { ok: false, error: 'not a commander' };
    if (this.stopFlag) return { ok: false, error: 'fleet stopped' };
    for (const j of jobs) {
      this.jobQueue.push({
        id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        topic: j.topic,
        category: j.category || 'concepts',
        tags: j.tags || DEFAULT_TAGS,
        status: 'pending',
        assignedTo: null,
        createdAt: Date.now(),
      });
    }
    this.logger.info(`Added ${jobs.length} jobs. Queue: ${this.jobQueue.length}`);
    return { ok: true, queued: this.jobQueue.length };
  }

  claimJob(workerUrl) {
    if (this.role !== 'commander') return { stop: true };
    if (this.stopFlag) return { stop: true };

    const clean = workerUrl.replace(/\/$/, '');
    const w = this.workers.get(clean);
    if (w) {
      w.lastSeen = Date.now();
      w.online = true;
    }

    const idx = this.jobQueue.findIndex(j => j.status === 'pending');
    if (idx === -1) return { jobs: [] };

    const job = this.jobQueue[idx];
    job.status = 'running';
    job.assignedTo = clean;
    if (w) w.activeJobs += 1;

    return { jobs: [{
      id: job.id,
      topic: job.topic,
      category: job.category,
      tags: job.tags,
    }] };
  }

  completeJob(jobId, workerUrl, pagesGenerated = 1) {
    if (this.role !== 'commander') return;
    const clean = workerUrl.replace(/\/$/, '');
    const w = this.workers.get(clean);
    if (w) {
      w.activeJobs = Math.max(0, w.activeJobs - 1);
      w.totalPages += pagesGenerated;
    }
    const idx = this.jobQueue.findIndex(j => j.id === jobId);
    if (idx !== -1) {
      const job = this.jobQueue.splice(idx, 1)[0];
      job.status = 'completed';
      job.completedAt = Date.now();
      this.completedJobs.push(job);
    }
  }

  stopFleet() {
    if (this.role !== 'commander') return { ok: false };
    this.stopFlag = true;
    this.logger.info('STOP flag raised. Fleet will halt after current jobs.');

    // Notify workers immediately
    for (const [url, w] of this.workers) {
      if (!w.online) continue;
      fetch(`${url}/api/worker/stop`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
        .catch(() => { /* worker may be unreachable */ });
    }
    return { ok: true, stopped: this.workers.size };
  }

  startFleet() {
    if (this.role !== 'commander') return { ok: false };
    this.stopFlag = false;
    this.logger.info('START flag raised. Fleet resumes accepting jobs.');
    return { ok: true };
  }

  _startCommanderCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [url, w] of this.workers) {
        if (now - w.lastSeen > 120000) {
          w.online = false;
          // Requeue orphaned jobs
          this.jobQueue.forEach(j => {
            if (j.status === 'running' && j.assignedTo === url) {
              j.status = 'pending';
              j.assignedTo = null;
            }
          });
        }
      }
    }, 30000);
  }

  /* ─── Worker API ─── */

  _startWorkerPoll() {
    if (!this.commanderUrl) {
      this.logger.warn('WORKER mode but no COMMANDER_URL set. Polling disabled.');
      return;
    }

    const register = async () => {
      try {
        const myUrl = `http://${this._getLocalIP()}:3000`;
        const res = await fetch(`${this.commanderUrl}/api/commander/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workerUrl: myUrl }),
        });
        const json = await res.json();
        if (json.success) this.logger.info('Registered with commander');
      } catch (e) { /* retry next cycle */ }
    };

    const poll = async () => {
      try {
        const myUrl = `http://${this._getLocalIP()}:3000`;
        const res = await fetch(`${this.commanderUrl}/api/commander/jobs?worker=${encodeURIComponent(myUrl)}`);
        const json = await res.json();
        if (!json.success) return;

        if (json.data?.stop) {
          this.logger.info('Received STOP signal from commander');
          this.stopFlag = true;
          return;
        }

        for (const job of json.data?.jobs || []) {
          this._runLocalJob(job, myUrl);
        }
      } catch (e) { /* retry next cycle */ }
    };

    register();
    setInterval(register, 30000); // re-register every 30s
    this.workerInterval = setInterval(poll, 5000); // poll for jobs every 5s
  }

  async _runLocalJob(job, myUrl) {
    this.logger.info(`Starting local job: ${job.topic}`);
    try {
      // Call the local llmwiki-create endpoint
      const res = await fetch('http://localhost:3000/api/llmwiki-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: job.topic,
          category: job.category,
          tags: job.tags,
        }),
      });
      const json = await res.json();
      if (json.success) {
        this.logger.info(`Job submitted locally: ${job.id}`);
        // Report completion to commander
        fetch(`${this.commanderUrl}/api/commander/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId: job.id, workerUrl: myUrl }),
        }).catch(() => {});
      }
    } catch (e) {
      this.logger.error(`Local job failed: ${e.message}`);
    }
  }

  receiveStop() {
    this.stopFlag = true;
    this.logger.info('Received STOP signal. Worker will halt after current job.');
  }

  /* ─── Shared ─── */

  _getLocalIP() {
    // Return a reasonable default; in real deployments this could use os.networkInterfaces
    return 'localhost';
  }
}
