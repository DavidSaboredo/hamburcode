## HamburCode Web

Catálogo + carrito + checkout + panel admin para gestión de pedidos de una hamburguesería.

## Features

- Catálogo responsive (mobile-first) + carrito persistente (localStorage)
- Checkout con datos obligatorios + cálculo de envío
- Backend con Next.js API Routes (App Router)
- Prisma + Postgres (Supabase/Vercel Postgres)
- Admin con login, listado, detalle, auditoría y cambio de estado
- WhatsApp desde admin al confirmar recepción del pedido

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Prisma + Postgres (deploy) / Postgres (local recomendado)

## Desarrollo local

### 1) Instalación

Desde la carpeta `hamburcode-web`:

```bash
npm run dev
```

Si en tu Windows `npm` no se reconoce, usá la ruta completa:

```powershell
& "C:\Program Files\nodejs\npm.cmd" install
& "C:\Program Files\nodejs\npm.cmd" run dev
```

### 2) Base de datos (Prisma)

La primera vez, creá las tablas en la DB:

```powershell
& "C:\Program Files\nodejs\npx.cmd" prisma db push
```

### 3) Variables de entorno

Copiá `.env.example` a `.env.local` y completá lo mínimo:

- `DATABASE_URL` (Postgres)
- `DIRECT_URL` (Postgres, recomendado)
- `ADMIN_PASSWORD` (ej: hambur1)
- `ADMIN_SESSION_SECRET` (clave larga)
- `NEXT_PUBLIC_BASE_URL` (ej: http://localhost:3000)
- `NEXT_PUBLIC_STORE_WHATSAPP` (ej: 5493442462463)

`.env.local` está ignorado por git (no se sube a GitHub).

## Rutas principales

- Catálogo: `/`
- Checkout: `/checkout`
- Admin login: `/admin/login`
- Admin panel: `/admin`

## Flujo de pedido

1. El cliente arma el carrito en `/`.
2. Entra a `/checkout`, completa datos obligatorios y envía.
3. Se crea una orden en `POST /api/orders` con:
   - `orderNumber`, `status=PENDING`, totales, items
   - auditoría de eventos
   - validación de stock
4. El admin ve pedidos en `/admin` y gestiona estado desde el detalle.

## Notificaciones

- WhatsApp al confirmar “Pedido recibido”: se abre WhatsApp Web desde el panel admin.
- Webhook opcional al negocio: configurar `BUSINESS_WEBHOOK_URL` + `BUSINESS_WEBHOOK_SECRET`.
- Email opcional al cliente: configurar SMTP (variables `SMTP_*`).

## Scripts útiles

```bash
npm run lint
npm run build
```

## Seguridad / GitHub

- No subir secretos: `.env*` está ignorado.
- No subir DB local: `prisma/*.db` está ignorado.

## Deploy en Vercel

### 1) Importar repo

- En Vercel: Add New → Project → Import Git Repository
- Seleccionar `DavidSaboredo/hamburcode`
- Root Directory: `hamburcode-web`

### 2) Base de datos

Opciones recomendadas:

- Vercel Postgres (simple para demos)
- Supabase (Postgres)

Si usás Supabase:
- En Vercel vas a ver variables como `POSTGRES_PRISMA_URL` y `POSTGRES_URL_NON_POOLING`
- Prisma no las lee con esos nombres: tenés que crear/llenar estas 2 variables:
  - `DATABASE_URL` = pegar el valor completo de `POSTGRES_PRISMA_URL`
  - `DIRECT_URL` = pegar el valor completo de `POSTGRES_URL_NON_POOLING`

Variables que usa Prisma:

- `DATABASE_URL`
- `DIRECT_URL`

### 3) Variables del admin

Configurar en Vercel → Project → Settings → Environment Variables:

- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `NEXT_PUBLIC_BASE_URL` (el dominio de Vercel, ej: https://hamburcode.vercel.app)
- `NEXT_PUBLIC_STORE_WHATSAPP` (número internacional, ej: 5493442462463)

### 4) Build

El proyecto incluye script `vercel-build` que ejecuta:

- `prisma generate`
- `prisma db push`
- `next build`
