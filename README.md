# Sistema de Tickets — Fase 0 (Cimientos)

Aplicación web del Help Desk interno. Ver el documento
**"Sistema de Tickets - Analisis y Arquitectura.docx"** para el diseño completo
(arquitectura, modelo de datos, roles, roadmap por fases).

## Stack

- Next.js 14 (App Router) + TypeScript
- TailwindCSS (modo oscuro por clase)
- Supabase (PostgreSQL + Auth + Storage) — proyecto `sistema-tickets`
- Despliegue: Vercel

## Estado de esta fase

- ✅ Esquema de base de datos completo en Supabase, con RLS y políticas por rol
  (administrador / agente / usuario final)
- ✅ Sistema de diseño base (layout, sidebar, modo oscuro, componentes UI)
- ✅ Conexión a Supabase configurada
- ⏳ Autenticación real (Fase 1)
- ⏳ CRUD de tickets (Fase 2)

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # ya trae la URL y la anon key del proyecto
npm run dev
```

## Variables de entorno

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública (segura para el navegador; el acceso real lo controla RLS) |

## Subir a GitHub

Este proyecto se generó sin conexión a GitHub (no había credenciales disponibles
en el entorno de trabajo). Para subirlo:

```bash
git init
git add .
git commit -m "Fase 0: cimientos del sistema de tickets"
git branch -M main
git remote add origin https://github.com/<tu-usuario>/sistema-tickets.git
git push -u origin main
```

Después, conecta el repositorio desde el dashboard de Vercel para activar
despliegues automáticos en cada push (ahora mismo el despliegue es manual).
