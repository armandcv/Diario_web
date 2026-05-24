# ⚡ INICIO RÁPIDO - Diario Web

## 🚀 3 Pasos para Empezar

### 1️⃣ Clonar/Descargar el proyecto
```bash
cd tu-carpeta
git clone <url-del-repo>  # o descargar ZIP
cd Diario_web
```

### 2️⃣ Ejecutar setup automático
```bash
npm run setup
```

Esto hace automáticamente:
- ✅ Genera JWT_SECRET seguro
- ✅ Crea archivo .env
- ✅ Crea carpeta de uploads
- ✅ Verifica dependencias

### 3️⃣ Instalar y arrancar
```bash
npm install
npm start
```

**¡Listo!** Abre http://localhost:3000 en tu navegador

---

## 📱 Crear tu primera cuenta

**Usuario:** Cualquier nombre (ej: `miusuario`)  
**Contraseña:** Debe tener:
- ✓ Mínimo **12 caracteres**
- ✓ **Mayúsculas** (A-Z)
- ✓ **Minúsculas** (a-z)
- ✓ **Números** (0-9)
- ✓ **Caracteres especiales** (!@#$%^&*)

**Ejemplos válidos:**
- ✅ `MyDiario2025!`
- ✅ `Hola@Mundo123`
- ✅ `Secure#Pass99`

**Ejemplos inválidos:**
- ❌ `password123` (sin mayúsculas)
- ❌ `PASSWORD123` (sin minúsculas)
- ❌ `Pass123!` (solo 8 caracteres)

---

## 🆘 Si hay problemas

### Error: "JWT_SECRET no está configurada"
**Solución:** Ejecuta `npm run setup` nuevamente

### Error: "Port 3000 is already in use"
**Solución:** 
```bash
# Cambia el puerto en .env
# O detén lo que esté usando el puerto 3000
```

### Error: "Cannot find module"
**Solución:** 
```bash
npm install
```

---

## 📚 Más información

- **Guía de seguridad:** Lee `SETUP_SEGURIDAD.md`
- **Detalles técnicos:** Lee `SECURITY_IMPROVEMENTS.md`
- **Análisis de vulnerabilidades:** Lee `SECURITY_AUDIT.md`

---

## ✨ Características

✅ Múltiples usuarios con autenticación JWT  
✅ Proyectos y bóvedas cifradas  
✅ Editor Markdown con vista previa  
✅ Subida de imágenes  
✅ Búsqueda y filtrado  
✅ Tags y clasificación  
✅ Interfaz oscura moderna  
✅ Almacenamiento en servidor  

---

## 🔐 Seguridad

- ✅ Contraseñas con bcrypt (10 rounds)
- ✅ Tokens JWT (7 días de validez)
- ✅ Rate limiting (máximo 5 intentos login/15min)
- ✅ Validación de uploads (magic bytes)
- ✅ CORS configurado
- ✅ Headers HTTP seguros (Helmet)
- ✅ Sanitización de inputs

---

**¡Disfruta tu Diario Web!** 📓✨
