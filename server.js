// Diario Web - Servidor Express con autenticación multi-usuario (CON SEGURIDAD MEJORADA)
require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const DATA_FILE = path.join(__dirname, 'data.json');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
const BCRYPT_ROUNDS = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// ========== SEGURIDAD: JWT_SECRET desde variable de entorno (CRÍTICO) ==========
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ ERROR CRÍTICO: JWT_SECRET no está configurada en variables de entorno');
  console.error('📋 Por favor configura el archivo .env con JWT_SECRET');
  console.error('💡 Genera una clave con: openssl rand -base64 32');
  process.exit(1);
}

// ========== SEGURIDAD: Validación de tipos MIME permitidos ==========
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAGIC_BYTES = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/gif': [0x47, 0x49, 0x46],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
};

// Crear carpeta uploads si no existe
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ========== SEGURIDAD: Helmet para headers HTTP seguros ==========
app.use(helmet());

// ========== SEGURIDAD: CORS configurado explícitamente (CRÍTICO) ==========
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ========== SEGURIDAD: Rate limiting en endpoints de autenticación (CRÍTICO) ==========
const loginLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || 900000), // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || 5), // máximo 5 intentos
  message: 'Demasiados intentos de acceso. Intenta más tarde.',
  standardHeaders: false,
  skip: (req) => NODE_ENV !== 'production', // No limitar en desarrollo
});

// ========== Utilidades de persistencia ==========
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

// ========== SEGURIDAD: Sanitización de inputs (ALTO) ==========
function sanitizeInput(str) {
  if (typeof str !== 'string') return '';
  // Remover caracteres peligrosos para búsquedas
  return str.replace(/[<>"`]/g, '').trim();
}

function validatePassword(password) {
  // SEGURIDAD (ALTO): Requisitos más fuertes de contraseña
  const errors = [];

  if (password.length < 12) {
    errors.push('Mínimo 12 caracteres');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Debe contener mayúsculas');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Debe contener minúsculas');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Debe contener números');
  }
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Debe contener caracteres especiales (!@#$%^&*)');
  }

  return errors.length > 0 ? errors[0] : null;
}

// ========== Utilidades de hashing para bóvedas ==========
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

// ========== SEGURIDAD: Validación de magic bytes para archivos (CRÍTICO) ==========
function validateImageMagicBytes(buffer, declaredMimeType) {
  // Validar que el contenido real del archivo corresponda al tipo declarado
  for (const [mimeType, signature] of Object.entries(MAGIC_BYTES)) {
    const matches = buffer.subarray(0, signature.length).every((b, i) => b === signature[i]);
    if (matches) {
      if (mimeType === declaredMimeType) {
        return true; // ✅ Tipo coincide
      }
      // ❌ El archivo es un tipo diferente al declarado
      return false;
    }
  }
  return false; // No es una imagen válida
}

// ========== Middleware de autenticación JWT ==========
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

// ========== SEGURIDAD: Logging seguro (BAJO) ==========
function secureLog(type, message, details = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    type,
    message,
    // Sanitizar detalles sensibles
    userId: details.userId ? `${details.userId.substring(0, 6)}...` : undefined,
    action: details.action,
  };
  if (NODE_ENV === 'production') {
    // En producción: solo los datos esenciales
    console.log(`[${timestamp}] ${type}: ${message}`);
  } else {
    // En desarrollo: más detalles
    console.log(logEntry);
  }
}

// ---------- API: Autenticación ----------
app.post('/api/auth/register', loginLimiter, async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'El nombre de usuario es obligatorio' });
  }

  // SEGURIDAD (ALTO): Validación más fuerte de contraseña
  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  const data = loadData();
  const data_users = data.users || [];

  // Verificar si el usuario ya existe
  if (data_users.some(u => u.username === username.trim())) {
    secureLog('AUTH', 'Intento de registro con usuario existente', { action: 'register' });
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

    secureLog('AUTH', 'Usuario registrado exitosamente', { userId: user.id, action: 'register' });

    res.status(201).json({
      id: user.id,
      username: user.username,
      token,
      expiresIn: '7d',
    });
  } catch (err) {
    secureLog('ERROR', 'Error al registrar usuario', { action: 'register', error: err.message.substring(0, 50) });
    res.status(500).json({ error: 'Error al registrar usuario. Intenta más tarde.' });
  }
});

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }

  const data = loadData();
  const user = (data.users || []).find(u => u.username === username);

  if (!user) {
    secureLog('AUTH', 'Intento de login con usuario inexistente', { action: 'login' });
    // No revelar si el usuario existe (seguridad)
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }

  try {
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      secureLog('AUTH', 'Intento de login con contraseña incorrecta', { userId: user.id, action: 'login' });
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    // Generar token JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    secureLog('AUTH', 'Login exitoso', { userId: user.id, action: 'login' });

    res.json({
      id: user.id,
      username: user.username,
      token,
      expiresIn: '7d',
    });
  } catch (err) {
    secureLog('ERROR', 'Error al autenticar', { action: 'login', error: err.message.substring(0, 50) });
    res.status(500).json({ error: 'Error al autenticar. Intenta más tarde.' });
  }
});

// Endpoint para verificar token actual
app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({
    id: req.userId,
    username: req.username,
  });
});

// ---------- API: Upload de imágenes (CON VALIDACIÓN DE MAGIC BYTES - CRÍTICO) ----------
app.post('/api/upload', authMiddleware, (req, res) => {
  const { imageData, filename } = req.body || {};

  if (!imageData || !filename) {
    return res.status(400).json({ error: 'Imagen y nombre requeridos' });
  }

  try {
    // Validar base64
    const base64Match = imageData.match(/^data:([^;]+);base64,(.+)$/);
    if (!base64Match) {
      return res.status(400).json({ error: 'Formato de imagen inválido' });
    }

    const mimeType = base64Match[1];
    const base64String = base64Match[2];

    // Validar tipo de archivo
    if (!ALLOWED_TYPES.includes(mimeType)) {
      return res.status(400).json({
        error: 'Tipo de archivo no permitido. Solo: JPEG, PNG, GIF, WebP'
      });
    }

    // Convertir base64 a buffer
    const buffer = Buffer.from(base64String, 'base64');

    // Validar tamaño
    if (buffer.length > MAX_FILE_SIZE) {
      return res.status(400).json({
        error: 'Archivo demasiado grande. Máximo 5MB'
      });
    }

    // SEGURIDAD (CRÍTICO): Validar magic bytes para prevenir ataques
    if (!validateImageMagicBytes(buffer, mimeType)) {
      secureLog('UPLOAD', 'Intento de upload con archivo falsificado', { userId: req.userId });
      return res.status(400).json({
        error: 'El contenido del archivo no coincide con el tipo declarado. No se permiten archivos falsificados.'
      });
    }

    // Generar nombre único
    const ext = mimeType.split('/')[1];
    const uniqueName = `${req.userId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, uniqueName);

    // Guardar archivo
    fs.writeFileSync(filePath, buffer);

    secureLog('UPLOAD', 'Archivo subido exitosamente', { userId: req.userId, filename: uniqueName });

    // Retornar URL relativa
    const imageUrl = `/uploads/${uniqueName}`;
    res.json({ url: imageUrl });
  } catch (err) {
    secureLog('ERROR', 'Error al procesar upload', { userId: req.userId, error: err.message.substring(0, 50) });
    res.status(500).json({ error: 'Error al procesar imagen. Intenta más tarde.' });
  }
});

// ---------- API: Proyectos (con autenticación) ----------
app.get('/api/projects', authMiddleware, (req, res) => {
  const { vaultId } = req.query;
  const data = loadData();
  let projects = data.projects || [];

  // Filtrar por usuario
  projects = projects.filter(p => p.userId === req.userId);

  // Si se especifica una bóveda, filtrar solo proyectos de esa bóveda
  if (vaultId && vaultId !== 'all') {
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

  // SEGURIDAD (ALTO): Validación más fuerte de contraseña para bóvedas
  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
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

// ---------- API: Notas (con autenticación y SEGURIDAD DE INPUT) ----------
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
    // SEGURIDAD (ALTO): Sanitizar entrada de búsqueda
    const t = sanitizeInput(String(tag)).toLowerCase();
    notes = notes.filter(n => (n.tags || []).map(x => x.toLowerCase()).includes(t));
  }
  if (q) {
    // SEGURIDAD (ALTO): Sanitizar entrada de búsqueda
    const needle = sanitizeInput(String(q)).toLowerCase();
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

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'El título es obligatorio' });
  }
  const data = loadData();

  // Validar proyecto O bóveda (deben pertenecerle al usuario)
  if (projectId) {
    const project = (data.projects || []).find(
      p => p.id === projectId && p.userId === req.userId
    );
    if (!project) {
      return res.status(400).json({ error: 'Proyecto no válido' });
    }

    if (vaultId && project.vaultId !== vaultId) {
      return res.status(400).json({ error: 'El proyecto no pertenece a esa bóveda' });
    }
    if (!vaultId && project.vaultId) {
      return res.status(400).json({ error: 'No puedes usar un proyecto de bóveda fuera de la bóveda' });
    }
  }
  if (vaultId) {
    const validVault = (data.vaults || []).some(
      v => v.id === vaultId && v.userId === req.userId
    );
    if (!validVault) {
      return res.status(400).json({ error: 'Bóveda no válida' });
    }
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
  console.log('\n🔒 ========== DIARIO WEB (MULTI-USUARIO CON SEGURIDAD MEJORADA) ==========');
  console.log(`📓 Corriendo en http://localhost:${PORT}`);
  console.log(`🔐 Modo: ${NODE_ENV === 'production' ? '🛡️  PRODUCCIÓN' : '🧪 DESARROLLO'}`);
  console.log('');
  console.log('✅ MEJORAS DE SEGURIDAD IMPLEMENTADAS:');
  console.log('   🔴 CRÍTICAS:');
  console.log('      ✓ JWT_SECRET desde variable de entorno (obligatorio)');
  console.log('      ✓ Validación de magic bytes en uploads');
  console.log('      ✓ CORS configurado explícitamente');
  console.log('      ✓ Rate limiting en auth endpoints');
  console.log('');
  console.log('   🟠 ALTAS:');
  console.log('      ✓ Sanitización de inputs en búsquedas');
  console.log('      ✓ Requisitos de contraseña más fuertes (12 chars + complejidad)');
  console.log('      ✓ Helmet para headers HTTP seguros');
  console.log('      ✓ Logging seguro');
  console.log('');
  console.log('⚠️  IMPORTANTE:');
  console.log('   1. Configura el archivo .env con JWT_SECRET');
  console.log('   2. Genera una clave: openssl rand -base64 32');
  console.log('   3. Ejecuta: npm install');
  console.log('   4. En producción: establece NODE_ENV=production\n');
});
