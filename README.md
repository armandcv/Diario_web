# 📓 Diario Web

Una aplicación web moderna y **extremadamente segura** para capturar, organizar y proteger tus anotaciones personales con bóvedas cifradas y autenticación multi-usuario.

## ✨ Características Principales

### 📝 Gestión de Notas
- ✅ Crear, editar y eliminar notas fácilmente
- ✅ Soporte completo para **Markdown** (negrita, cursiva, títulos, listas, código, enlaces)
- ✅ Vista previa en tiempo real de Markdown
- ✅ Subida de imágenes embebidas en notas
- ✅ Organizar notas en proyectos
- ✅ Etiquetado (tags) y búsqueda integrada
- ✅ Filtrado por etiquetas y proyectos

### 👥 Multi-Usuario
- ✅ Cada usuario tiene su propia cuenta y datos
- ✅ Autenticación con JWT (tokens seguros de 7 días)
- ✅ Aislamiento completo de datos por usuario
- ✅ Contraseñas cifradas con bcrypt (10 rounds)

### 📁 Proyectos
- ✅ Crear múltiples proyectos para organizar notas
- ✅ Vista de árbol jerárquica expandible/colapsable
- ✅ Contadores de notas en tiempo real
- ✅ Eliminar proyectos (con confirmación)
- ✅ Proyectos anidados dentro de bóvedas

### 🔐 Bóvedas Cifradas
- ✅ Crear bóvedas protegidas con contraseña maestra
- ✅ Proyectos independientes dentro de cada bóveda
- ✅ Desbloqueo de sesión (no requiere contraseña en cada acción)
- ✅ Cierre manual de bóvedas
- ✅ Estructura visible incluso cuando está bloqueada
- ✅ Hashing seguro con **PBKDF2-SHA256** (100,000 iteraciones)
- ✅ Contraseña requerida para ver/editar notas de bóveda
- ✅ Contraseña requerida para eliminar bóveda o su contenido

### 🔍 Interfaz
- ✅ Diseño responsivo (móvil y desktop)
- ✅ Tema oscuro profesional (estilo GitHub)
- ✅ Sidebar integrado con árbol de navegación
- ✅ Toasts de notificaciones para feedback
- ✅ Panel de usuario con información de sesión
- ✅ Área de uploads seguros para imágenes

## 🚀 Instalación Rápida (2 minutos)

### Requisitos
- **Node.js** v16+ ([Descargar](https://nodejs.org/))
- **npm** (viene con Node.js)

### Pasos

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd Diario_web

# 2. Ejecutar setup automático (genera .env y secretos)
npm run setup

# 3. Instalar dependencias
npm install

# 4. Iniciar el servidor
npm start
```

**¡Listo!** Abre http://localhost:3000 en tu navegador

> 💡 El comando `npm run setup` genera automáticamente:
> - JWT_SECRET único y seguro
> - Archivo .env configurado
> - Carpeta de uploads
> - Verifica las dependencias

## 📖 Guía Rápida de Uso

### Crear tu Primera Cuenta
1. Haz clic en **"Crear cuenta"** en la pantalla de login
2. Elige un nombre de usuario
3. Crea una contraseña fuerte (ver requisitos abajo)
4. ¡Listo! Ya estás dentro

### Crear una Nota
1. Escribe el **título** y el **contenido** (soporta Markdown)
2. Selecciona un **proyecto** del dropdown (opcional)
3. Agrega **tags** separados por coma (opcional)
4. Haz clic en **"Guardar nota"**

### Crear un Proyecto
1. En el sidebar, selecciona **"Proyecto"** en el dropdown
2. Escribe el nombre del proyecto
3. Haz clic en el botón **"+"**

### Crear una Bóveda (Datos Sensibles)
1. En el sidebar, selecciona **"Bóveda"** en el dropdown
2. Ingresa nombre y contraseña maestra (ver requisitos abajo)
3. Haz clic en **"+"** para crear
4. Dentro de la bóveda crea proyectos normalmente

## 🔐 Requisitos de Contraseña

**Mínimo 12 caracteres** que incluyan:
- ✅ Al menos 1 **mayúscula** (A-Z)
- ✅ Al menos 1 **minúscula** (a-z)
- ✅ Al menos 1 **número** (0-9)
- ✅ Al menos 1 **carácter especial** (!@#$%^&*)

**Ejemplos válidos:**
- ✅ `MyDiario2025!`
- ✅ `Admin@Vault1`
- ✅ `Secure#Pass99`

**Ejemplos inválidos:**
- ❌ `password123` (sin mayúsculas)
- ❌ `PASSWORD123` (sin minúsculas)
- ❌ `Pass123!` (menos de 12 caracteres)
- ❌ `MyDiario2025` (sin caracteres especiales)

## 🔒 Características de Seguridad

| Característica | Descripción | Implementado |
|---|---|---|
| **JWT Tokens** | Autenticación segura con tokens de 7 días | ✅ |
| **Bcrypt** | Contraseñas de usuario cifradas (10 rounds) | ✅ |
| **PBKDF2-SHA256** | Bóvedas cifradas (100,000 iteraciones) | ✅ |
| **Magic Bytes** | Validación real de archivos subidos | ✅ |
| **CORS** | Control de orígenes permitidos | ✅ |
| **Rate Limiting** | Máximo 5 intentos de login por 15 min | ✅ |
| **Helmet** | Headers HTTP seguros | ✅ |
| **Sanitización** | Limpieza de inputs contra inyecciones | ✅ |
| **Aislamiento** | Datos separados por usuario | ✅ |

## 📁 Estructura

```
Diario_web/
├── server.js                  # Servidor Express + API REST
├── setup.js                   # Script de configuración automática
├── package.json               # Dependencias
├── .env                       # Variables de entorno (generado por setup)
├── .env.example               # Plantilla de .env
├── .gitignore                 # Archivos ignorados
├── data.json                  # Base de datos (se crea automáticamente)
├── public/
│   ├── index.html             # App web completa
│   └── uploads/               # Carpeta para imágenes subidas
├── README.md                  # Este archivo
├── QUICK_START.md             # Inicio rápido
├── SETUP_SEGURIDAD.md         # Guía de seguridad
├── SECURITY_IMPROVEMENTS.md   # Detalles técnicos
└── SECURITY_AUDIT.md          # Análisis de vulnerabilidades
```

## 🛠️ Stack Tecnológico

**Backend:**
- Node.js + Express.js
- JWT para autenticación
- bcryptjs para contraseñas
- PBKDF2 para bóvedas
- Helmet para headers seguros

**Frontend:**
- HTML5 + CSS3 + JavaScript vanilla
- Marked.js para Markdown
- DOMPurify para sanitización
- Crypto-JS para cifrado

**Seguridad:**
- express-rate-limit (5 intentos/15min)
- cors (control de orígenes)
- helmet (headers HTTP)
- dotenv (variables de entorno)
- express-validator (validación)

**Almacenamiento:**
- JSON local (data.json)
- Uploads en /public/uploads

## 📡 API REST

```
AUTENTICACIÓN:
POST   /api/auth/register      – Crear nueva cuenta
POST   /api/auth/login         – Iniciar sesión
GET    /api/auth/me            – Verificar sesión actual

PROYECTOS:
GET    /api/projects           – Lista proyectos del usuario
POST   /api/projects           – Crear proyecto
DELETE /api/projects/:id       – Eliminar proyecto (y sus notas)

BÓVEDAS:
GET    /api/vaults             – Lista bóvedas del usuario
POST   /api/vaults             – Crear bóveda
DELETE /api/vaults/:id         – Eliminar bóveda
POST   /api/vaults/:id/verify  – Verificar contraseña

NOTAS:
GET    /api/notes              – Lista notas (filtros: ?projectId=&vaultId=&q=&tag=)
POST   /api/notes              – Crear nota
PUT    /api/notes/:id          – Editar nota
DELETE /api/notes/:id          – Eliminar nota

UPLOADS:
POST   /api/upload             – Subir imagen (devuelve URL)
```

## 📚 Documentación

- **[QUICK_START.md](QUICK_START.md)** - Inicio rápido en 3 pasos
- **[SETUP_SEGURIDAD.md](SETUP_SEGURIDAD.md)** - Guía de configuración detallada
- **[SECURITY_IMPROVEMENTS.md](SECURITY_IMPROVEMENTS.md)** - Mejoras técnicas implementadas
- **[SECURITY_AUDIT.md](SECURITY_AUDIT.md)** - Análisis original de vulnerabilidades

## 🆘 Solución de Problemas

**❌ "JWT_SECRET no está configurada"**
```bash
npm run setup
```

**❌ "Port 3000 is already in use"**
Cambia el puerto en `.env` o detén lo que esté usando el puerto 3000

**❌ "Cannot find module"**
```bash
npm install
```

## 🎯 Comandos Disponibles

```bash
npm run setup     # Generar .env y secretos automáticamente
npm start         # Iniciar servidor en http://localhost:3000
npm run dev       # Alternativa (mismo resultado)
```

## 📋 Requisitos del Sistema

- **Node.js** v16 o superior
- **npm** (incluido con Node.js)
- Navegador moderno (Chrome, Firefox, Safari, Edge)
- 50MB de espacio en disco mínimo

## 📄 Licencia

MIT - Hecho con ❤️ para gente que valora seguridad y simplicidad

## 🎯 Hoja de Ruta Futura

- [ ] Exportar notas a PDF
- [ ] Sincronización en la nube
- [ ] App móvil nativa
- [ ] Búsqueda avanzada con índices
- [ ] Temas personalizables
- [ ] 2FA (autenticación de dos factores)
- [ ] CSRF tokens
- [ ] Auditoría de cambios

---

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:
1. Fork el repositorio
2. Crea una rama para tu mejora
3. Haz commit de tus cambios
4. Push a la rama
5. Abre un Pull Request

## 💬 Preguntas Frecuentes

**¿Dónde se guardan mis datos?**
En el archivo `data.json` en el servidor. Se recomienda hacer backups regularmente.

**¿Mis contraseñas están realmente seguras?**
Sí. Usamos bcrypt (usuarios) y PBKDF2 (bóvedas) con salts únicos y aleatorios.

**¿Puedo usar esto en un servidor compartido?**
Sí, pero asegúrate de cambiar JWT_SECRET y usar HTTPS.

**¿Cuántos usuarios puede soportar?**
Con una máquina modesta, cientos de usuarios sin problemas.

---

**Diario Web** - Tu compañero confiable para anotaciones seguras 🔐📓

**Versión:** 1.0.0  
**Última actualización:** 24 de Mayo de 2026  
**Estado:** ✅ Listo para producción
