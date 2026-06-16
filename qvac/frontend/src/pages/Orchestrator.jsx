import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://localhost:3000/api';

export default function Orchestrator({ onBack }) {
  const [role, setRole] = useState('commander');
  const [commanderUrl, setCommanderUrl] = useState('http://localhost:3000');
  const [workers, setWorkers] = useState([]);
  const [stats, setStats] = useState({ workers: 0, online: 0, queueLength: 0, completedJobs: 0, stopFlag: false });
  const [jobsInput, setJobsInput] = useState('');
  const [fleetStatus, setFleetStatus] = useState('idle'); // idle | running | stopped
  const [logs, setLogs] = useState([]);
  const [docs, setDocs] = useState([]);

  const addLog = (msg) => setLogs(prev => [msg, ...prev].slice(0, 50));

  const fetchFleet = useCallback(async () => {
    try {
      const [workersRes, statsRes, docsRes] = await Promise.all([
        fetch(`${API_BASE}/commander/workers`),
        fetch(`${API_BASE}/commander/stats`),
        fetch(`${API_BASE}/llmwiki-docs`),
      ]);
      const wJson = await workersRes.json();
      const sJson = await statsRes.json();
      const dJson = await docsRes.json();
      if (wJson.success) setWorkers(wJson.data);
      if (sJson.success) {
        setStats(sJson.data);
        setFleetStatus(sJson.data.stopFlag ? 'stopped' : (sJson.data.queueLength > 0 ? 'running' : 'idle'));
      }
      if (dJson.success) setDocs(dJson.data);
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => {
    if (role === 'commander') {
      fetchFleet();
      const interval = setInterval(fetchFleet, 3000);
      return () => clearInterval(interval);
    }
  }, [role, fetchFleet]);

  const handleDistribute = async () => {
    const lines = jobsInput.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) return;
    const jobs = lines.map(line => {
      const [topic, category = 'concepts', ...tagParts] = line.split('|').map(s => s.trim());
      return { topic, category, tags: tagParts[0]?.split(',').map(t => t.trim()).filter(Boolean) || [] };
    });

    addLog(`Distributing ${jobs.length} jobs to fleet...`);
    try {
      const res = await fetch(`${API_BASE}/commander/distribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobs }),
      });
      const json = await res.json();
      if (json.success) {
        addLog(`Fleet accepted ${json.data.queued} jobs`);
        setJobsInput('');
      } else {
        addLog(`Distribute failed: ${json.error}`);
      }
    } catch (e) {
      addLog(`Error: ${e.message}`);
    }
  };

  const handleStop = async () => {
    addLog('Sending STOP signal to entire fleet...');
    try {
      const res = await fetch(`${API_BASE}/commander/stop`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        addLog(`STOP sent to ${json.data.stopped} workers`);
        setFleetStatus('stopped');
      }
    } catch (e) {
      addLog(`Error: ${e.message}`);
    }
  };

  const handleStart = async () => {
    addLog('Sending START signal to fleet...');
    try {
      const res = await fetch(`${API_BASE}/commander/start`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        addLog('Fleet resumed');
        setFleetStatus('running');
      }
    } catch (e) {
      addLog(`Error: ${e.message}`);
    }
  };

  const statusColor = fleetStatus === 'running' ? '#22c55e' : fleetStatus === 'stopped' ? '#ef4444' : '#64748b';

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.heading}>Fleet Orchestrator</h1>
        <button onClick={onBack} style={styles.backBtn}>Back</button>
      </div>
      <p style={styles.sub}>Coordinate multiple QVAC nodes to generate wikis collaboratively.</p>

      <div style={styles.roleRow}>
        <button style={{ ...styles.roleBtn, ...(role === 'commander' ? styles.roleActive : {}) }} onClick={() => setRole('commander')}>
          Commander
        </button>
        <button style={{ ...styles.roleBtn, ...(role === 'worker' ? styles.roleActive : {}) }} onClick={() => setRole('worker')}>
          Worker
        </button>
      </div>

      {role === 'commander' && (
        <>
          <div style={styles.statsRow}>
            <div style={styles.statCard}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#f8fafc' }}>{stats.workers}</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>Workers</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#22c55e' }}>{stats.online}</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>Online</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#f8fafc' }}>{stats.queueLength}</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>Queued</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#93c5fd' }}>{stats.completedJobs}</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>Completed</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: statusColor }}>{fleetStatus.toUpperCase()}</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>Fleet Status</div>
            </div>
          </div>

          <div style={styles.panel}>
            <h3 style={styles.panelTitle}>Distribute Jobs</h3>
            <p style={styles.hint}>One job per line: topic | category | tag1,tag2</p>
            <textarea
              style={{ ...styles.textarea, minHeight: 120 }}
              value={jobsInput}
              onChange={e => setJobsInput(e.target.value)}
              placeholder={`distributed systems consensus | concepts | consensus,raft\nraft algorithm | entities | raft,distributed-systems\nmarkdown memory stores | concepts | markdown,ai`}
            />
            <div style={styles.btnRow}>
              <button style={styles.btnPrimary} onClick={handleDistribute}>Distribute to Fleet</button>
              <button style={{ ...styles.btn, background: '#ef4444' }} onClick={handleStop}>STOP ALL</button>
              <button style={{ ...styles.btn, background: '#22c55e' }} onClick={handleStart}>RESUME</button>
            </div>
          </div>

          <div style={styles.panel}>
            <h3 style={styles.panelTitle}>Connected Workers</h3>
            {workers.length === 0 && <p style={styles.empty}>No workers registered yet.</p>}
            {workers.map(w => (
              <div key={w.url} style={styles.workerRow}>
                <span style={{ color: w.online ? '#22c55e' : '#ef4444', fontSize: 10, marginRight: 8 }}>●</span>
                <span style={{ flex: 1, fontSize: 13 }}>{w.url}</span>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>jobs: {w.activeJobs} pages: {w.totalPages}</span>
              </div>
            ))}
          </div>

          <div style={styles.panel}>
            <h3 style={styles.panelTitle}>Fleet Pages ({docs.length})</h3>
            <div style={styles.docsGrid}>
              {docs.slice(0, 20).map(d => (
                <div key={d.id} style={styles.docCard}>
                  <div style={styles.docTitle}>{d.title}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{d.category}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.panel}>
            <h3 style={styles.panelTitle}>Event Log</h3>
            <div style={styles.logBox}>
              {logs.length === 0 && <p style={styles.empty}>No events yet.</p>}
              {logs.map((l, i) => (
                <div key={i} style={styles.logLine}>{new Date().toLocaleTimeString()} {l}</div>
              ))}
            </div>
          </div>
        </>
      )}

      {role === 'worker' && (
        <div style={styles.panel}>
          <h3 style={styles.panelTitle}>Worker Mode</h3>
          <p style={styles.hint}>This node is a worker. Set COMMANDER_URL env var to register with a commander.</p>
          <div style={styles.field}>
            <label style={styles.label}>Commander URL</label>
            <input style={styles.input} value={commanderUrl} onChange={e => setCommanderUrl(e.target.value)} />
          </div>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 12 }}>
            Export <code style={{ background: '#1e1e2e', padding: '2px 6px', borderRadius: 4 }}>COMMANDER_URL={commanderUrl}</code> and restart this node to join the fleet.
          </p>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { maxWidth: 960, margin: '0 auto', padding: 24, fontFamily: 'system-ui, sans-serif', color: '#e2e2e2' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  heading: { fontSize: 28, margin: 0, color: '#f8fafc' },
  backBtn: { background: '#1e1e2e', color: '#94a3b8', border: '1px solid #2e2e3e', padding: '6px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer' },
  sub: { color: '#94a3b8', marginBottom: 20, fontSize: 14 },
  roleRow: { display: 'flex', gap: 8, marginBottom: 20 },
  roleBtn: { background: '#12121c', color: '#94a3b8', border: '1px solid #1e1e2e', padding: '8px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer' },
  roleActive: { background: '#1e3a8a', color: '#93c5fd', borderColor: '#3b82f6' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12, marginBottom: 20 },
  statCard: { background: '#12121c', border: '1px solid #1e1e2e', borderRadius: 8, padding: 14, textAlign: 'center' },
  panel: { background: '#12121c', border: '1px solid #1e1e2e', borderRadius: 8, padding: 16, marginBottom: 16 },
  panelTitle: { fontSize: 15, fontWeight: 600, color: '#f8fafc', margin: '0 0 10px' },
  hint: { color: '#64748b', fontSize: 12, marginBottom: 10 },
  textarea: { background: '#0a0a14', border: '1px solid #1e1e2e', borderRadius: 6, padding: '10px 12px', color: '#e2e2e2', fontSize: 14, resize: 'vertical', width: '100%', minHeight: 80 },
  btnRow: { display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' },
  btn: { border: 'none', padding: '10px 18px', borderRadius: 6, fontSize: 14, cursor: 'pointer', color: '#fff' },
  btnPrimary: { background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 6, fontSize: 14, cursor: 'pointer' },
  workerRow: { display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1e1e2e' },
  docsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 },
  docCard: { background: '#0a0a14', border: '1px solid #1e1e2e', borderRadius: 6, padding: 10 },
  docTitle: { fontSize: 13, fontWeight: 500, color: '#e2e2e2', marginBottom: 2 },
  logBox: { maxHeight: 200, overflow: 'auto', background: '#0a0a14', borderRadius: 6, padding: 10 },
  logLine: { fontSize: 12, color: '#94a3b8', marginBottom: 4, fontFamily: 'monospace' },
  empty: { color: '#64748b', fontSize: 13 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 },
  input: { background: '#0a0a14', border: '1px solid #1e1e2e', borderRadius: 6, padding: '10px 12px', color: '#e2e2e2', fontSize: 14 },
};
