// Diario Web - Servidor Express con bóvedas cifradas
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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
    return { projects: [], vaults: [], notes: [] };
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ---------- Utilidades de hashing ----------
function hashPassword(password) {
  // PBKDF2 con SHA256: 100,000 iteraciones
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, 100000, 64, 'sha256')
    .toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  try {
    const [salt, hash] = storedHash.split(':');
    const computed = crypto
      .pbkdf2Sync(password, salt, 100000, 64, 'sha256')
      .toString('hex');
    return computed === hash;
  } catch {
    return false;
  }
}

// ---------- API: Proyectos ----------
app.get('/api/projects', (req, res) => {
  const { vaultId } = req.query;
  const data = loadData();
  let projects = data.projects || [];

  // Si se especifica una bóveda, filtrar solo proyectos de esa bóveda
  // Si no, devolver solo proyectos globales (sin vaultId)
  if (vaultId) {
    projects = projects.filter(p => p.vaultId === vaultId);
  } else {
    projects = projects.filter(p => !p.vaultId);
  }

  res.json(projects);
});

app.post('/api/projects', (req, res) => {
  const { name, vaultId } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'El nombre del proyecto es obligatorio' });
  }
  const data = loadData();

  // Si es proyecto dentro de bóveda, validar que la bóveda exista
  if (vaultId) {
    const validVault = (data.vaults || []).some(v => v.id === vaultId);
    if (!validVault) return res.status(400).json({ error: 'Bóveda no válida' });
  }

  const project = {
    id: uid('p'),
    name: name.trim(),
    vaultId: vaultId || null,
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
  data.notes = (data.notes || []).filter(n => n.projectId !== id);
  if (data.projects.length === before) {
    return res.status(404).json({ error: 'Proyecto no encontrado' });
  }
  saveData(data);
  res.json({ ok: true });
});

// ---------- API: Bóvedas ----------
app.get('/api/vaults', (req, res) => {
  const data = loadData();
  // No devolvemos passwordHash en listado
  const vaults = (data.vaults || []).map(v => ({
    id: v.id,
    name: v.name,
    createdAt: v.createdAt,
    hasPassword: !!v.passwordHash,
  }));
  res.json(vaults);
});

app.post('/api/vaults', (req, res) => {
  const { name, password } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'El nombre de la bóveda es obligatorio' });
  }
  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });
  }
  const data = loadData();
  const vault = {
    id: uid('v'),
    name: name.trim(),
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  data.vaults = data.vaults || [];
  data.vaults.push(vault);
  saveData(data);
  res.status(201).json({
    id: vault.id,
    name: vault.name,
    createdAt: vault.createdAt,
    hasPassword: true,
  });
});

app.post('/api/vaults/:id/verify', (req, res) => {
  const { id } = req.params;
  const { password } = req.body || {};
  const data = loadData();
  const vault = (data.vaults || []).find(v => v.id === id);
  if (!vault) return res.status(404).json({ error: 'Bóveda no encontrada' });
  if (!password) return res.status(400).json({ error: 'Contraseña requerida' });

  const isValid = verifyPassword(password, vault.passwordHash);
  if (!isValid) return res.status(401).json({ error: 'Contraseña incorrecta' });

  res.json({ ok: true, vaultId: id });
});

app.delete('/api/vaults/:id', (req, res) => {
  const { id } = req.params;
  const data = loadData();
  const before = (data.vaults || []).length;
  data.vaults = (data.vaults || []).filter(v => v.id !== id);
  // También eliminamos las notas asociadas
  data.notes = (data.notes || []).filter(n => n.vaultId !== id);
  if (data.vaults.length === before) {
    return res.status(404).json({ error: 'Bóveda no encontrada' });
  }
  saveData(data);
  res.json({ ok: true });
});

// ---------- API: Notas ----------
app.get('/api/notes', (req, res) => {
  const { projectId, vaultId, q, tag } = req.query;
  const data = loadData();
  let notes = data.notes || [];

  if (projectId && projectId !== 'all') {
    notes = notes.filter(n => n.projectId === projectId);
  }
  if (vaultId && vaultId !== 'all') {
    notes = notes.filter(n => n.vaultId === vaultId);
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
  const { title, content, projectId, vaultId, tags } = req.body || {};
  console.log('📝 POST /api/notes recibido:', { title: title ? '✓' : '✗', projectId, vaultId });

  if (!title || !title.trim()) {
    console.error('❌ Validación falló: Título vacío');
    return res.status(400).json({ error: 'El título es obligatorio' });
  }
  const data = loadData();

  // Validar proyecto O bóveda
  if (projectId) {
    const project = (data.projects || []).find(p => p.id === projectId);
    if (!project) {
      console.error('❌ Proyecto no encontrado:', projectId);
      return res.status(400).json({ error: 'Proyecto no válido' });
    }
    console.log(`✓ Proyecto encontrado: ${project.name}, vaultId: ${project.vaultId}`);

    // Si la nota se guarda en una bóveda, validar que el proyecto pertenezca a esa bóveda
    if (vaultId && project.vaultId !== vaultId) {
      console.error(`❌ Mismatch bóveda: esperado ${vaultId}, proyecto tiene ${project.vaultId}`);
      return res.status(400).json({ error: 'El proyecto no pertenece a esa bóveda' });
    }
    // Si la nota se guarda sin bóveda, validar que el proyecto sea global
    if (!vaultId && project.vaultId) {
      console.error(`❌ Proyecto de bóveda usado sin bóveda: proyecto.vaultId=${project.vaultId}`);
      return res.status(400).json({ error: 'No puedes usar un proyecto de bóveda fuera de la bóveda' });
    }
  }
  if (vaultId) {
    const validVault = (data.vaults || []).some(v => v.id === vaultId);
    if (!validVault) {
      console.error('❌ Bóveda no válida:', vaultId);
      return res.status(400).json({ error: 'Bóveda no válida' });
    }
    console.log('✓ Bóveda validada:', vaultId);
  }

  const now = new Date().toISOString();
  const note = {
    id: uid('n'),
    title: title.trim(),
    content: (content || '').trim(),
    projectId: projectId || null,
    vaultId: vaultId || null,
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
  const { title, content, projectId, vaultId, tags } = req.body || {};
  const data = loadData();
  const note = (data.notes || []).find(n => n.id === id);
  if (!note) return res.status(404).json({ error: 'Nota no encontrada' });

  if (title !== undefined) note.title = String(title).trim();
  if (content !== undefined) note.content = String(content);
  if (projectId !== undefined) {
    if (projectId) {
      const validProject = (data.projects || []).some(p => p.id === projectId);
      if (!validProject) return res.status(400).json({ error: 'Proyecto no válido' });
    }
    note.projectId = projectId || null;
  }
  if (vaultId !== undefined) {
    if (vaultId) {
      const validVault = (data.vaults || []).some(v => v.id === vaultId);
      if (!validVault) return res.status(400).json({ error: 'Bóveda no válida' });
    }
    note.vaultId = vaultId || null;
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
