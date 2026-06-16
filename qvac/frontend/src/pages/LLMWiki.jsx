import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:3000/api';

export default function LLMWiki({ onBack }) {
  const [mode, setMode] = useState('topic'); // 'topic' | 'prompt' | 'file' | 'link'
  const [topic, setTopic] = useState('');
  const [prompt, setPrompt] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('concepts');
  const [tags, setTags] = useState('');
  const [links, setLinks] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [docs, setDocs] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchDocs();
    const interval = setInterval(fetchDocs, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchDocs = async () => {
    try {
      const res = await fetch(`${API_BASE}/llmwiki-docs`);
      const json = await res.json();
      if (json.success) setDocs(json.data);
    } catch (e) { /* ignore */ }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'file' && file) {
        const form = new FormData();
        form.append('file', file);
        form.append('category', category);
        form.append('tags', tags);
        if (title) form.append('title', title);

        const res = await fetch(`${API_BASE}/llmwiki-upload`, {
          method: 'POST',
          body: form,
        });
        const json = await res.json();
        if (json.success) {
          setMessage(json.data.message);
          setFile(null);
        } else {
          setError(json.error || 'Upload failed');
        }
      } else if (mode === 'link' && links.trim()) {
        const res = await fetch(`${API_BASE}/llmwiki-create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: topic || 'Research summary',
            category,
            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
            links: links.split('\n').map(l => l.trim()).filter(Boolean),
            title: title || undefined,
          }),
        });
        const json = await res.json();
        if (json.success) {
          setMessage(json.data.message);
        } else {
          setError(json.error || 'Generation failed');
        }
      } else {
        const body = {
          category,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        };
        if (mode === 'topic') {
          body.topic = topic;
        } else {
          body.prompt = prompt;
          body.title = title || undefined;
        }

        const res = await fetch(`${API_BASE}/llmwiki-create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (json.success) {
          setMessage(json.data.message);
        } else {
          setError(json.error || 'Generation failed');
        }
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocs = docs.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    (d.tags || []).some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  const modeBtn = (key, label) => (
    <button
      type="button"
      onClick={() => { setMode(key); setError(null); setMessage(null); }}
      style={{
        ...styles.modeBtn,
        ...(mode === key ? styles.modeBtnActive : {}),
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.heading}>LLM Wiki</h1>
        <button onClick={onBack} style={styles.backBtn}>Back</button>
      </div>
      <p style={styles.sub}>Generate AI-powered wiki pages, attach files & links.</p>

      <div style={styles.modeRow}>
        {modeBtn('topic', 'By Topic')}
        {modeBtn('prompt', 'By Prompt')}
        {modeBtn('file', 'From File')}
        {modeBtn('link', 'From Links')}
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        {mode === 'topic' && (
          <div style={styles.field}>
            <label style={styles.label}>Topic</label>
            <input
              style={styles.input}
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. distributed systems consensus"
              required
              disabled={loading}
            />
          </div>
        )}

        {mode === 'prompt' && (
          <>
            <div style={styles.field}>
              <label style={styles.label}>Title (optional)</label>
              <input
                style={styles.input}
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Page title"
                disabled={loading}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Custom Prompt</label>
              <textarea
                style={styles.textarea}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Write a detailed explanation of..."
                rows={4}
                required
                disabled={loading}
              />
            </div>
          </>
        )}

        {mode === 'file' && (
          <div style={styles.field}>
            <label style={styles.label}>Attach File</label>
            <input
              type="file"
              style={styles.fileInput}
              onChange={handleFileChange}
              disabled={loading}
            />
            {file && <div style={styles.fileName}>{file.name} ({Math.round(file.size / 1024)} KB)</div>}
            <p style={styles.hint}>Upload a PDF, text, or markdown file. The AI will read it and generate a wiki page.</p>
          </div>
        )}

        {mode === 'link' && (
          <>
            <div style={styles.field}>
              <label style={styles.label}>Topic</label>
              <input
                style={styles.input}
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. research on consensus algorithms"
                required
                disabled={loading}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Links (one per line)</label>
              <textarea
                style={styles.textarea}
                value={links}
                onChange={e => setLinks(e.target.value)}
                placeholder="https://raft.github.io/raft.pdf&#10;https://example.com/article"
                rows={3}
                required
                disabled={loading}
              />
            </div>
          </>
        )}

        <div style={styles.row}>
          <div style={{ ...styles.field, flex: 1 }}>
            <label style={styles.label}>Category</label>
            <select
              style={styles.select}
              value={category}
              onChange={e => setCategory(e.target.value)}
              disabled={loading}
            >
              <option value="concepts">Concepts</option>
              <option value="entities">Entities</option>
              <option value="comparisons">Comparisons</option>
            </select>
          </div>
          <div style={{ ...styles.field, flex: 2 }}>
            <label style={styles.label}>Tags (comma-separated)</label>
            <input
              style={styles.input}
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="distributed-systems, consensus, raft"
              disabled={loading}
            />
          </div>
        </div>

        <button type="submit" style={styles.btn} disabled={loading}>
          {loading ? 'Starting...' : 'Generate Wiki Page'}
        </button>
      </form>

      {error && <div style={styles.error}>{error}</div>}
      {message && <div style={styles.success}>{message}</div>}

      <div style={styles.searchRow}>
        <input
          style={{ ...styles.input, flex: 1 }}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search wiki pages..."
        />
        <button onClick={fetchDocs} style={styles.refreshBtn}>Refresh</button>
      </div>

      <div style={styles.docsGrid}>
        {filteredDocs.map(d => (
          <div key={d.id} style={styles.docCard}>
            <div style={styles.docTitle}>{d.title}</div>
            <div style={styles.docMeta}>{d.category} {d.date && `· ${d.date}`}</div>
            {d.tags && d.tags.length > 0 && (
              <div style={styles.tags}>
                {d.tags.map(t => <span key={t} style={styles.tag}>{t}</span>)}
              </div>
            )}
          </div>
        ))}
        {filteredDocs.length === 0 && <p style={styles.empty}>No pages found.</p>}
      </div>
    </div>
  );
}

const styles = {
  container: { maxWidth: 900, margin: '0 auto', padding: 24, fontFamily: 'system-ui, sans-serif', color: '#e2e2e2' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  heading: { fontSize: 28, margin: 0, color: '#f8fafc' },
  backBtn: { background: '#1e1e2e', color: '#94a3b8', border: '1px solid #2e2e3e', padding: '6px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer' },
  sub: { color: '#94a3b8', marginBottom: 20, fontSize: 14 },
  modeRow: { display: 'flex', gap: 8, marginBottom: 20 },
  modeBtn: { background: '#12121c', color: '#94a3b8', border: '1px solid #1e1e2e', padding: '8px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer' },
  modeBtnActive: { background: '#1e3a8a', color: '#93c5fd', borderColor: '#3b82f6' },
  form: { display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 },
  input: { background: '#0a0a14', border: '1px solid #1e1e2e', borderRadius: 6, padding: '10px 12px', color: '#e2e2e2', fontSize: 14 },
  textarea: { background: '#0a0a14', border: '1px solid #1e1e2e', borderRadius: 6, padding: '10px 12px', color: '#e2e2e2', fontSize: 14, resize: 'vertical' },
  select: { background: '#0a0a14', border: '1px solid #1e1e2e', borderRadius: 6, padding: '10px 12px', color: '#e2e2e2', fontSize: 14 },
  fileInput: { color: '#e2e2e2', fontSize: 14 },
  fileName: { color: '#93c5fd', fontSize: 13, marginTop: 4 },
  hint: { color: '#64748b', fontSize: 12, marginTop: 4 },
  row: { display: 'flex', gap: 12 },
  btn: { background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 6, fontSize: 14, cursor: 'pointer', alignSelf: 'flex-start' },
  error: { background: '#7f1d1d', color: '#fecaca', padding: 12, borderRadius: 6, marginTop: 8 },
  success: { background: '#14532d', color: '#bbf7d0', padding: 12, borderRadius: 6, marginTop: 8 },
  searchRow: { display: 'flex', gap: 8, marginTop: 20, marginBottom: 12 },
  refreshBtn: { background: '#1e1e2e', color: '#94a3b8', border: '1px solid #2e2e3e', padding: '8px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer' },
  docsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 },
  docCard: { background: '#12121c', border: '1px solid #1e1e2e', borderRadius: 8, padding: 14 },
  docTitle: { fontSize: 15, fontWeight: 600, color: '#f8fafc', marginBottom: 4 },
  docMeta: { fontSize: 12, color: '#64748b', marginBottom: 8 },
  tags: { display: 'flex', flexWrap: 'wrap', gap: 4 },
  tag: { background: '#1e3a8a', color: '#93c5fd', fontSize: 11, padding: '2px 8px', borderRadius: 4 },
  empty: { color: '#64748b', fontSize: 14, textAlign: 'center', padding: 20 },
};
