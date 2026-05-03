# Diario_web
A little website to take personal notes
=======
# Diario Web

Pequeña aplicación web hecha con Node.js + Express para llevar anotaciones de tus proyectos.

## Características

- Crear, editar y eliminar notas
- Organizar notas por proyecto
- Etiquetas (tags) para clasificar
- Buscador por título, contenido o tags
- **Soporte completo de Markdown** (negritas, listas, código, tablas, enlaces, blockquotes, etc.) con vista previa
- Persistencia en archivo `data.json` (sin base de datos)
- Interfaz en **modo oscuro**

## Cómo correrlo

```bash
# 1) Instalar dependencias (solo la primera vez)
npm install

# 2) Iniciar el servidor
npm start
```

Después abre tu navegador en: <http://localhost:3000>

## Estructura

```
.
├── server.js        # Servidor Express + API REST
├── data.json        # Tus datos (proyectos y notas)
├── package.json
└── public/
    └── index.html   # Interfaz web (HTML + CSS + JS en un solo archivo)
```

## API REST (por si quieres extenderla)

- `GET    /api/projects`           – Lista proyectos
- `POST   /api/projects`           – Crea proyecto `{ name }`
- `DELETE /api/projects/:id`       – Borra proyecto (y sus notas)
- `GET    /api/notes`              – Lista notas (filtros: `?projectId=&q=&tag=`)
- `POST   /api/notes`              – Crea nota `{ title, content, projectId, tags }`
- `PUT    /api/notes/:id`          – Edita nota
- `DELETE /api/notes/:id`          – Borra nota
