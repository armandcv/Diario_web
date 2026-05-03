// Diario Web - Servidor Express con persistencia en JSON
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Utilidades de persistencia ----------
function loadData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return { projects: [], notes: [] };
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ---------- API: Proyectos ----------
app.get('/api/projects', (req, res) => {
  const data = loadData();
  res.json(data.projects || []);
});

app.post('/api/projects', (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'El nombre del proyecto es obligatorio' });
  }
  const data = loadData();
  const project = {
    id: uid('p'),
    name: name.trim(),
    createdAt: new Date().toISOString(),
  };
  data.projects = data.projects || [];
  data.projects.push(project);
  saveData(data);
  res.status(201).json(project);
});

app.delete('/api/projects/:id', (req, res) => {
  const { id } = req.params;
  const data = loadData();
  const before = (data.projects || []).length;
  data.projects = (data.projects || []).filter(p => p.id !== id);
  // También eliminamos las notas asociadas
  data.notes = (data.notes || []).filter(n => n.projectId !== id);
  if (data.projects.length === before) {
    return res.status(404).json({ error: 'Proyecto no encontrado' });
  }
  saveData(data);
  res.json({ ok: true });
});

// ---------- API: Notas ----------
app.get('/api/notes', (req, res) => {
  const { projectId, q, tag } = req.query;
  const data = loadData();
  let notes = data.notes || [];

  if (projectId && projectId !== 'all') {
    notes = notes.filter(n => n.projectId === projectId);
  }
  if (tag) {
    const t = String(tag).toLowerCase();
    notes = notes.filter(n => (n.tags || []).map(x => x.toLowerCase()).includes(t));
  }
  if (q) {
    const needle = String(q).toLowerCase();
    notes = notes.filter(n =>
      (n.title || '').toLowerCase().includes(needle) ||
      (n.content || '').toLowerCase().includes(needle) ||
      (n.tags || []).some(t => t.toLowerCase().includes(needle))
    );
  }

  notes = notes.slice().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  res.json(notes);
});

app.post('/api/notes', (req, res) => {
  const { title, content, projectId, tags } = req.body || {};
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'El título es obligatorio' });
  }
  const data = loadData();
  const validProject = (data.projects || []).some(p => p.id === projectId);
  if (!validProject) {
    return res.status(400).json({ error: 'Proyecto no válido' });
  }
  const now = new Date().toISOString();
  const note = {
    id: uid('n'),
    title: title.trim(),
    content: (content || '').trim(),
    projectId,
    tags: Array.isArray(tags) ? tags.map(t => String(t).trim()).filter(Boolean) : [],
    createdAt: now,
    updatedAt: now,
  };
  data.notes = data.notes || [];
  data.notes.push(note);
  saveData(data);
  res.status(201).json(note);
});

app.put('/api/notes/:id', (req, res) => {
  const { id } = req.params;
  const { title, content, projectId, tags } = req.body || {};
  const data = loadData();
  const note = (data.notes || []).find(n => n.id === id);
  if (!note) return res.status(404).json({ error: 'Nota no encontrada' });

  if (title !== undefined) note.title = String(title).trim();
  if (content !== undefined) note.content = String(content);
  if (projectId !== undefined) {
    const validProject = (data.projects || []).some(p => p.id === projectId);
    if (!validProject) return res.status(400).json({ error: 'Proyecto no válido' });
    note.projectId = projectId;
  }
  if (tags !== undefined) {
    note.tags = Array.isArray(tags) ? tags.map(t => String(t).trim()).filter(Boolean) : [];
  }
  note.updatedAt = new Date().toISOString();

  saveData(data);
  res.json(note);
});

app.delete('/api/notes/:id', (req, res) => {
  const { id } = req.params;
  const data = loadData();
  const before = (data.notes || []).length;
  data.notes = (data.notes || []).filter(n => n.id !== id);
  if (data.notes.length === before) {
    return res.status(404).json({ error: 'Nota no encontrada' });
  }
  saveData(data);
  res.json({ ok: true });
});

// ---------- Arranque ----------
app.listen(PORT, () => {
  console.log(`\n📓 Diario Web corriendo en http://localhost:${PORT}\n`);
});
