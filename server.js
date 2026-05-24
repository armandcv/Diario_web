// Diario Web - Servidor Express con autenticación multi-usuario
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const JWT_SECRET = process.env.JWT_SECRET || 'diario-web-secret-key-change-in-production';
const BCRYPT_ROUNDS = 10;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Utilidades de persistencia ----------
function loadData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return { users: [], projects: [], vaults: [], notes: [] };
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ---------- Utilidades de hashing para bóvedas ----------
function hashPassword(password) {
  // PBKDF2 con SHA256: 100,000 iteraciones (para bóvedas)
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

// ---------- Middleware de autenticación JWT ----------
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticación requerido' });
  }

  const token = authHeader.substring(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    req.username = payload.username;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// ---------- API: Autenticación ----------
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'El nombre de usuario es obligatorio' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  const data = loadData();
  const data_users = data.users || [];

  // Verificar si el usuario ya existe
  if (data_users.some(u => u.username === username.trim())) {
    return res.status(409).json({ error: 'El nombre de usuario ya está en uso' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = {
      id: uid('u'),
      username: username.trim(),
      passwordHash: hashedPassword,
      createdAt: new Date().toISOString(),
    };
    data.users = [...(data.users || []), user];
    saveData(data);

    // Generar token JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      id: user.id,
      username: user.username,
      token,
      expiresIn: '7d',
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }

  const data = loadData();
  const user = (data.users || []).find(u => u.username === username);

  if (!user) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }

  try {
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    // Generar token JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      id: user.id,
      username: user.username,
      token,
      expiresIn: '7d',
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al autenticar' });
  }
});

// Endpoint para verificar token actual
app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({
    id: req.userId,
    username: req.username,
  });
});

// ---------- API: Proyectos (con autenticación) ----------
app.get('/api/projects', authMiddleware, (req, res) => {
  const { vaultId } = req.query;
  const data = loadData();
  let projects = data.projects || [];

  // Filtrar por usuario
  projects = projects.filter(p => p.userId === req.userId);

  // Si se especifica una bóveda, filtrar solo proyectos de esa bóveda
  if (vaultId) {
    projects = projects.filter(p => p.vaultId === vaultId);
  } else {
    projects = projects.filter(p => !p.vaultId);
  }

  res.json(projects);
});

app.post('/api/projects', authMiddleware, (req, res) => {
  const { name, vaultId } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'El nombre del proyecto es obligatorio' });
  }
  const data = loadData();

  // Si es proyecto dentro de bóveda, validar que la bóveda pertenezca al usuario
  if (vaultId) {
    const validVault = (data.vaults || []).some(
      v => v.id === vaultId && v.userId === req.userId
    );
    if (!validVault) return res.status(400).json({ error: 'Bóveda no válida' });
  }

  const project = {
    id: uid('p'),
    userId: req.userId,
    name: name.trim(),
    vaultId: vaultId || null,
    createdAt: new Date().toISOString(),
  };
  data.projects = data.projects || [];
  data.projects.push(project);
  saveData(data);
  res.status(201).json(project);
});

app.delete('/api/projects/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const data = loadData();
  const project = (data.projects || []).find(p => p.id === id);

  // Verificar que el proyecto pertenezca al usuario
  if (!project || project.userId !== req.userId) {
    return res.status(404).json({ error: 'Proyecto no encontrado' });
  }

  data.projects = (data.projects || []).filter(p => p.id !== id);
  // También eliminamos las notas asociadas
  data.notes = (data.notes || []).filter(n => n.projectId !== id);
  saveData(data);
  res.json({ ok: true });
});

// ---------- API: Bóvedas (con autenticación) ----------
app.get('/api/vaults', authMiddleware, (req, res) => {
  const data = loadData();
  // Filtrar por usuario y no devolver passwordHash
  const vaults = (data.vaults || [])
    .filter(v => v.userId === req.userId)
    .map(v => ({
      id: v.id,
      name: v.name,
      createdAt: v.createdAt,
      hasPassword: !!v.passwordHash,
    }));
  res.json(vaults);
});

app.post('/api/vaults', authMiddleware, (req, res) => {
  const { name, password } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'El nombre de la bóveda es obligatorio' });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  // Validar que no haya números consecutivos
  if (/\d(?=\d)/.test(password)) {
    return res.status(400).json({
      error: 'La contraseña no puede contener números consecutivos (ej: 12, 456)'
    });
  }

  const data = loadData();
  const vault = {
    id: uid('v'),
    userId: req.userId,
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

app.post('/api/vaults/:id/verify', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { password } = req.body || {};
  const data = loadData();
  const vault = (data.vaults || []).find(v => v.id === id && v.userId === req.userId);

  if (!vault) return res.status(404).json({ error: 'Bóveda no encontrada' });
  if (!password) return res.status(400).json({ error: 'Contraseña requerida' });

  const isValid = verifyPassword(password, vault.passwordHash);
  if (!isValid) return res.status(401).json({ error: 'Contraseña incorrecta' });

  res.json({ ok: true, vaultId: id });
});

app.delete('/api/vaults/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const data = loadData();
  const vault = (data.vaults || []).find(v => v.id === id);

  // Verificar que la bóveda pertenezca al usuario
  if (!vault || vault.userId !== req.userId) {
    return res.status(404).json({ error: 'Bóveda no encontrada' });
  }

  data.vaults = (data.vaults || []).filter(v => v.id !== id);
  // También eliminamos las notas asociadas
  data.notes = (data.notes || []).filter(n => n.vaultId !== id);
  saveData(data);
  res.json({ ok: true });
});

// ---------- API: Notas (con autenticación) ----------
app.get('/api/notes', authMiddleware, (req, res) => {
  const { projectId, vaultId, q, tag } = req.query;
  const data = loadData();
  let notes = data.notes || [];

  // Filtrar por usuario
  notes = notes.filter(n => n.userId === req.userId);

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

app.post('/api/notes', authMiddleware, (req, res) => {
  const { title, content, projectId, vaultId, tags } = req.body || {};
  console.log('📝 POST /api/notes recibido:', { title: title ? '✓' : '✗', projectId, vaultId });

  if (!title || !title.trim()) {
    console.error('❌ Validación falló: Título vacío');
    return res.status(400).json({ error: 'El título es obligatorio' });
  }
  const data = loadData();

  // Validar proyecto O bóveda (deben pertenecerle al usuario)
  if (projectId) {
    const project = (data.projects || []).find(
      p => p.id === projectId && p.userId === req.userId
    );
    if (!project) {
      console.error('❌ Proyecto no encontrado:', projectId);
      return res.status(400).json({ error: 'Proyecto no válido' });
    }
    console.log(`✓ Proyecto encontrado: ${project.name}, vaultId: ${project.vaultId}`);

    if (vaultId && project.vaultId !== vaultId) {
      console.error(`❌ Mismatch bóveda: esperado ${vaultId}, proyecto tiene ${project.vaultId}`);
      return res.status(400).json({ error: 'El proyecto no pertenece a esa bóveda' });
    }
    if (!vaultId && project.vaultId) {
      console.error(`❌ Proyecto de bóveda usado sin bóveda: proyecto.vaultId=${project.vaultId}`);
      return res.status(400).json({ error: 'No puedes usar un proyecto de bóveda fuera de la bóveda' });
    }
  }
  if (vaultId) {
    const validVault = (data.vaults || []).some(
      v => v.id === vaultId && v.userId === req.userId
    );
    if (!validVault) {
      console.error('❌ Bóveda no válida:', vaultId);
      return res.status(400).json({ error: 'Bóveda no válida' });
    }
    console.log('✓ Bóveda validada:', vaultId);
  }

  const now = new Date().toISOString();
  const note = {
    id: uid('n'),
    userId: req.userId,
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

app.put('/api/notes/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { title, content, projectId, vaultId, tags } = req.body || {};
  const data = loadData();
  const note = (data.notes || []).find(n => n.id === id);

  if (!note || note.userId !== req.userId) {
    return res.status(404).json({ error: 'Nota no encontrada' });
  }

  if (title !== undefined) note.title = String(title).trim();
  if (content !== undefined) note.content = String(content);
  if (projectId !== undefined) {
    if (projectId) {
      const validProject = (data.projects || []).some(
        p => p.id === projectId && p.userId === req.userId
      );
      if (!validProject) return res.status(400).json({ error: 'Proyecto no válido' });
    }
    note.projectId = projectId || null;
  }
  if (vaultId !== undefined) {
    if (vaultId) {
      const validVault = (data.vaults || []).some(
        v => v.id === vaultId && v.userId === req.userId
      );
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

app.delete('/api/notes/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const data = loadData();
  const note = (data.notes || []).find(n => n.id === id);

  if (!note || note.userId !== req.userId) {
    return res.status(404).json({ error: 'Nota no encontrada' });
  }

  data.notes = (data.notes || []).filter(n => n.id !== id);
  saveData(data);
  res.json({ ok: true });
});

// ---------- Arranque ----------
app.listen(PORT, () => {
  console.log(`\n📓 Diario Web (Multi-usuario) corriendo en http://localhost:${PORT}\n`);
  console.log(`⚠️  Asegúrate de instalar dependencias: npm install\n`);
});
