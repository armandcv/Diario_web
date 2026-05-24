# Diario Web 📓

Una aplicación web moderna y segura para capturar, organizar y proteger tus anotaciones personales con bóvedas cifradas.

## ✨ Características

### 📝 Gestión de Notas
- ✅ Crear, editar y eliminar notas fácilmente
- ✅ Soporte completo para **Markdown** (negrita, cursiva, títulos, listas, código, enlaces)
- ✅ Vista previa en tiempo real de Markdown
- ✅ Organizar notas en proyectos
- ✅ Etiquetado (tags) y búsqueda integrada
- ✅ Filtrado por etiquetas

### 📁 Proyectos
- ✅ Crear múltiples proyectos para organizar notas
- ✅ Vista de árbol jerárquica expandible/colapsable
- ✅ Contadores de notas en tiempo real
- ✅ Eliminar proyectos (con confirmación de contraseña si están en bóveda)

### 🔐 Bóvedas Cifradas
- ✅ Crear bóvedas protegidas con contraseña
- ✅ Proyectos independientes dentro de cada bóveda
- ✅ Desbloqueo de sesión (no requiere contraseña en cada acción)
- ✅ Cierre manual de bóvedas
- ✅ Estructura visible incluso cuando está bloqueada
- ✅ Hashing seguro con **PBKDF2** (100,000 iteraciones)
- ✅ Contraseña requerida para ver/editar notas de bóveda
- ✅ Contraseña requerida para eliminar bóveda o su contenido

### 🔍 Interfaz
- ✅ Diseño responsivo (móvil y desktop)
- ✅ Tema oscuro profesional
- ✅ Sidebar integrado con árbol de navegación
- ✅ Toasts notificaciones para feedback
- ✅ Persistencia de estado (localStorage)

## 🚀 Instalación

### Requisitos
- Node.js 14+
- npm o yarn

### Pasos

1. **Clonar el repositorio**
```bash
git clone https://github.com/tu-usuario/diario-web.git
cd diario-web
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Iniciar el servidor**
```bash
npm start
```

4. **Abrir en navegador**
```
http://localhost:3000
```

## 📖 Guía Rápida

### Crear una Nota
1. Escribe el **título** y el **contenido** (soporta Markdown)
2. Selecciona un **proyecto** del dropdown
3. Haz clic en **"Guardar nota"** o presiona `Ctrl+Enter` / `Cmd+Enter`

### Usar Proyectos
1. En el sidebar, expande **"📁 Proyectos"**
2. Haz clic en un proyecto para filtrar notas
3. Haz clic en **"+"** para crear un nuevo proyecto

### Crear una Bóveda
1. Selecciona **"🔐 Bóveda"** en el dropdown "Nuevo contenedor"
2. Ingresa nombre y contraseña (mín. 4 caracteres)
3. Haz clic en **"🔒"** para crear

### Desbloquear una Bóveda
1. En el sidebar, haz clic en una bóveda **"🔒"** (cerrada)
2. Ingresa la contraseña en el modal
3. Se desbloqueará para esta sesión

## 🔒 Seguridad

- **PBKDF2-SHA256** con 100,000 iteraciones para hashing
- Cada contraseña tiene su propio salt aleatorio
- Las contraseñas **nunca** se almacenan en texto plano
- Desbloqueo por sesión (al refrescar se bloquea)
- Contraseña requerida para eliminar bóvedas

## 📁 Estructura

```
diario-web/
├── server.js           # Servidor Express + API REST
├── data.json           # Base de datos JSON
├── package.json        # Dependencias
└── public/
    └── index.html      # App completa (HTML + CSS + JS)
```

## 🛠️ Stack Tecnológico

- **Backend**: Node.js + Express.js
- **Frontend**: HTML5 + CSS3 + Vanilla JavaScript
- **Markdown**: Marked.js
- **Sanitización**: DOMPurify
- **Hashing**: Node.js crypto (PBKDF2)
- **Almacenamiento**: JSON local

## 📡 API REST

```
GET    /api/projects                  – Lista proyectos
POST   /api/projects                  – Crea proyecto
DELETE /api/projects/:id              – Borra proyecto (y sus notas)

GET    /api/vaults                    – Lista bóvedas
POST   /api/vaults                    – Crea bóveda
DELETE /api/vaults/:id                – Borra bóveda (y su contenido)
POST   /api/vaults/:id/verify         – Verifica contraseña

GET    /api/notes                     – Lista notas (filtros: ?projectId=&vaultId=&q=&tag=)
POST   /api/notes                     – Crea nota
PUT    /api/notes/:id                 – Edita nota
DELETE /api/notes/:id                 – Borra nota
```

## 📄 Licencia

MIT - Hecho con ❤️

## 🎯 Características Futuras

- [ ] Exportar notas a PDF
- [ ] Soporte para múltiples usuarios
- [ ] Sincronización en la nube
- [ ] App móvil nativa
- [ ] Búsqueda avanzada
- [ ] Temas personalizables

---

**Diario Web** - Tu compañero confiable para anotaciones seguras 🔐📓
