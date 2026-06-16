/**
 * Unit tests for CommanderOrchestrator and WorkerOrchestrator.
 * Run: node --test test/orchestrator.test.js
 */
import assert from 'node:assert/strict';
import { describe, it, before, after } from 'node:test';
import { CommanderOrchestrator, WorkerOrchestrator } from '../src/orchestrator/NodeOrchestrator.js';

describe('CommanderOrchestrator', () => {
  let cmd;
  before(() => { cmd = new CommanderOrchestrator({ defaultTags: ['test'] }).start(); });
  after(() => cmd.stop());

  it('registers a worker', () => {
    const result = cmd.registerWorker('http://worker-a:3000/');
    assert.equal(result.ok, true);
    assert.equal(result.workers, 1);
  });

  it('normalises trailing slash on register', () => {
    cmd.registerWorker('http://worker-b:3000/');
    const workers = cmd.getWorkers();
    assert.ok(workers.every(w => !w.url.endsWith('/')));
  });

  it('returns fleet stats', () => {
    const stats = cmd.getFleetStats();
    assert.equal(typeof stats.workers, 'number');
    assert.equal(typeof stats.stopFlag, 'boolean');
  });

  it('adds jobs to queue', () => {
    const result = cmd.addJobs([{ topic: 'Foo' }, { topic: 'Bar' }]);
    assert.equal(result.ok, true);
    assert.equal(result.queued, 2);
  });

  it('claims a pending job', () => {
    cmd.registerWorker('http://worker-a:3000');
    const result = cmd.claimJob('http://worker-a:3000');
    assert.equal(result.jobs.length, 1);
    assert.equal(typeof result.jobs[0].id, 'string');
  });

  it('returns empty jobs when queue exhausted', () => {
    // drain remaining
    while (true) {
      const r = cmd.claimJob('http://worker-a:3000');
      if (!r.jobs?.length) break;
    }
    const result = cmd.claimJob('http://worker-a:3000');
    assert.deepEqual(result, { jobs: [] });
  });

  it('completes a job and updates worker totals', () => {
    cmd.addJobs([{ topic: 'Complete-me' }]);
    const { jobs } = cmd.claimJob('http://worker-a:3000');
    const before = cmd.getWorkers().find(w => w.url === 'http://worker-a:3000');
    cmd.completeJob(jobs[0].id, 'http://worker-a:3000', 1);
    const after = cmd.getWorkers().find(w => w.url === 'http://worker-a:3000');
    assert.equal(after.totalPages, (before?.totalPages ?? 0) + 1);
  });

  it('stops the fleet and blocks new jobs', () => {
    cmd.startFleet(); // reset
    cmd.stopFleet();
    const result = cmd.addJobs([{ topic: 'Should fail' }]);
    assert.equal(result.ok, false);
    assert.match(result.error, /stopped/);
    cmd.startFleet(); // cleanup
  });

  it('stop flag causes claimJob to return {stop:true}', () => {
    cmd.stopFleet();
    const result = cmd.claimJob('http://worker-a:3000');
    assert.deepEqual(result, { stop: true });
    cmd.startFleet();
  });
});

describe('WorkerOrchestrator stubs', () => {
  let worker;
  before(() => { worker = new WorkerOrchestrator({ commanderUrl: '', localPort: 3000 }); });

  it('registerWorker returns not-a-commander error', () => {
    assert.equal(worker.registerWorker().ok, false);
  });

  it('addJobs returns not-a-commander error', () => {
    assert.equal(worker.addJobs([]).ok, false);
  });

  it('receiveStop sets stopFlag', () => {
    assert.equal(worker.stopFlag, false);
    worker.receiveStop();
    assert.equal(worker.stopFlag, true);
  });
});
