/**
 * Unit tests for the route table.
 * Run: node --test test/router.test.js
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { matchRoute, ROUTES } from '../src/web/router.js';

describe('matchRoute', () => {
  it('matches known GET route', () => {
    assert.equal(matchRoute('GET', '/api/status'), 'handleStatus');
  });

  it('matches known POST route', () => {
    assert.equal(matchRoute('POST', '/api/llmwiki-create'), 'handleLLMWikiCreate');
  });

  it('returns null for unknown path', () => {
    assert.equal(matchRoute('GET', '/not-a-route'), null);
  });

  it('returns null when method does not match', () => {
    assert.equal(matchRoute('DELETE', '/api/status'), null);
  });

  it('returns null for OPTIONS (handled by CORS middleware)', () => {
    assert.equal(matchRoute('OPTIONS', '/api/status'), null);
  });

  it('all handler names in ROUTES are unique per method+path', () => {
    const seen = new Set();
    for (const [m, p] of ROUTES) {
      const key = `${m}:${p}`;
      assert.ok(!seen.has(key), `Duplicate route: ${key}`);
      seen.add(key);
    }
  });
});
