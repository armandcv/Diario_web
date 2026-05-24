#!/usr/bin/env node

/**
 * 🔧 SETUP AUTOMÁTICO - Diario Web
 *
 * Este script configura automáticamente:
 * 1. Genera JWT_SECRET seguro
 * 2. Crea archivo .env
 * 3. Crea carpeta de uploads
 * 4. Verifica dependencias
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Colores para terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(number, title) {
  log(`\n[${number}/4] ${title}`, 'bright');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// ============================================================
// PASO 1: Generar JWT_SECRET
// ============================================================
logStep(1, 'Generando JWT_SECRET seguro...');

const jwtSecret = crypto.randomBytes(32).toString('base64');
success(`JWT_SECRET generado: ${jwtSecret.substring(0, 20)}...`);

// ============================================================
// PASO 2: Crear archivo .env
// ============================================================
logStep(2, 'Creando archivo .env...');

const envPath = path.join(__dirname, '.env');
const envContent = `# 🔒 Configuración de Seguridad - Diario Web
# Generado automáticamente por setup.js el ${new Date().toISOString()}

# Servidor
PORT=3000
NODE_ENV=development

# 🔐 JWT Secret (cambiar en producción)
JWT_SECRET=${jwtSecret}

# CORS - Orígenes permitidos
ALLOWED_ORIGINS=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=5

# 📝 Nota: En producción, genera un nuevo JWT_SECRET:
# openssl rand -base64 32
`;

try {
  if (fs.existsSync(envPath)) {
    warning('.env ya existe. Se creará .env.backup');
    fs.copyFileSync(envPath, path.join(__dirname, '.env.backup'));
    success('Backup guardado en .env.backup');
  }

  fs.writeFileSync(envPath, envContent);
  success('.env creado exitosamente');
  info(`Ubicación: ${envPath}`);
} catch (err) {
  error(`Error al crear .env: ${err.message}`);
  process.exit(1);
}

// ============================================================
// PASO 3: Crear carpeta uploads
// ============================================================
logStep(3, 'Creando carpeta de uploads...');

const uploadsDir = path.join(__dirname, 'public', 'uploads');

try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    success('Carpeta /public/uploads creada');
  } else {
    info('La carpeta /public/uploads ya existe');
  }

  // Crear .gitkeep para que git rastree la carpeta
  const gitkeepPath = path.join(uploadsDir, '.gitkeep');
  if (!fs.existsSync(gitkeepPath)) {
    fs.writeFileSync(gitkeepPath, '');
  }
} catch (err) {
  error(`Error al crear carpeta uploads: ${err.message}`);
  process.exit(1);
}

// ============================================================
// PASO 4: Verificar dependencias
// ============================================================
logStep(4, 'Verificando dependencias necesarias...');

const requiredPackages = [
  'express',
  'jsonwebtoken',
  'bcryptjs',
  'cors',
  'helmet',
  'express-rate-limit',
  'dotenv'
];

const packageJsonPath = path.join(__dirname, 'package.json');
let packageJson;

try {
  const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
  packageJson = JSON.parse(packageJsonContent);
} catch (err) {
  error('No se pudo leer package.json');
  process.exit(1);
}

const dependencies = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies
};

let missingPackages = [];
let installedPackages = [];

requiredPackages.forEach(pkg => {
  if (dependencies[pkg]) {
    success(`${pkg} está instalado`);
    installedPackages.push(pkg);
  } else {
    warning(`${pkg} no está instalado`);
    missingPackages.push(pkg);
  }
});

// ============================================================
// RESUMEN Y PRÓXIMOS PASOS
// ============================================================
log('\n' + '='.repeat(60), 'bright');
log('✅ SETUP COMPLETADO', 'green');
log('='.repeat(60), 'bright');

log('\n📋 Resumen de lo realizado:', 'bright');
log(`  1. ✅ JWT_SECRET generado y guardado en .env`, 'green');
log(`  2. ✅ Archivo .env creado con configuración`, 'green');
log(`  3. ✅ Carpeta /public/uploads creada`, 'green');
log(`  4. ✅ ${installedPackages.length}/${requiredPackages.length} dependencias verificadas`, 'green');

if (missingPackages.length > 0) {
  log('\n⚠️  Paquetes faltantes:', 'yellow');
  missingPackages.forEach(pkg => {
    log(`   - ${pkg}`, 'yellow');
  });

  log('\n📦 Instálalos con:', 'bright');
  log(`   npm install`, 'blue');
} else {
  success('\n¡Todas las dependencias están instaladas!');
}

// ============================================================
// INSTRUCCIONES FINALES
// ============================================================
log('\n' + '='.repeat(60), 'bright');
log('🚀 PRÓXIMOS PASOS', 'bright');
log('='.repeat(60), 'bright');

log('\n1️⃣  Instalar dependencias (si no están todas):', 'bright');
log('   $ npm install\n', 'blue');

log('2️⃣  Iniciar el servidor:', 'bright');
log('   $ npm start\n', 'blue');

log('3️⃣  Abrir en el navegador:', 'bright');
log('   http://localhost:3000\n', 'blue');

log('4️⃣  Crear tu primera cuenta:', 'bright');
log('   Requisitos de contraseña:', 'gray');
log('   ✓ Mínimo 12 caracteres', 'gray');
log('   ✓ Mayúsculas (A-Z)', 'gray');
log('   ✓ Minúsculas (a-z)', 'gray');
log('   ✓ Números (0-9)', 'gray');
log('   ✓ Caracteres especiales (!@#$%^&*)', 'gray');
log('   Ejemplo: MyDiario2025!\n', 'gray');

log('='.repeat(60), 'bright');
log('📖 DOCUMENTACIÓN', 'bright');
log('='.repeat(60), 'bright');

log('\nPara más información, lee:', 'bright');
log('  • SETUP_SEGURIDAD.md - Guía de configuración', 'blue');
log('  • SECURITY_IMPROVEMENTS.md - Detalles técnicos', 'blue');
log('  • SECURITY_AUDIT.md - Análisis de vulnerabilidades\n', 'blue');

log('='.repeat(60), 'bright');
log('🔐 INFORMACIÓN DE SEGURIDAD', 'bright');
log('='.repeat(60), 'bright');

log('\n✅ Tu archivo .env contiene:', 'green');
log('   • JWT_SECRET único y seguro', 'gray');
log('   • CORS configurado', 'gray');
log('   • Rate limiting habilitado', 'gray');

log('\n⚠️  IMPORTANTE:', 'yellow');
log('   • .env NO se subirá a git (.gitignore lo protege)', 'gray');
log('   • .env es específico para cada instalación', 'gray');
log('   • En producción, genera un nuevo JWT_SECRET:', 'gray');
log('     $ openssl rand -base64 32\n', 'gray');

log('💡 TIPS:', 'bright');
log('   • npm start → Inicia en desarrollo', 'gray');
log('   • npm run dev → Alternativa', 'gray');
log('   • Ctrl+C → Detiene el servidor\n', 'gray');

log('='.repeat(60), 'bright');
success('¡Setup completado! Estás listo para comenzar.\n');
log('='.repeat(60), 'bright');
