## HamburCode Web

Catálogo + carrito + checkout + panel admin para gestión de pedidos de una hamburguesería.

### Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Prisma + SQLite (dev local)

## Getting Started

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

La primera vez, generá y migrá la DB:

```powershell
& "C:\Program Files\nodejs\npx.cmd" prisma migrate dev --name init
```

### 3) Variables de entorno

Copiá `.env.example` a `.env.local` y completá lo mínimo:

- `ADMIN_PASSWORD` (ej: hambur1)
- `ADMIN_SESSION_SECRET` (clave larga)
- `NEXT_PUBLIC_BASE_URL` (ej: http://localhost:3000)

`.env.local` está ignorado por git (no se sube a GitHub).

### Rutas principales

- Catálogo: `/`
- Checkout: `/checkout`
- Admin login: `/admin/login`
- Admin panel: `/admin`

### Flujo de pedido

1. El cliente arma el carrito en `/`.
2. Entra a `/checkout`, completa datos obligatorios y envía.
3. Se crea una orden en `POST /api/orders` con:
   - `orderNumber`, `status=PENDING`, totales, items
   - auditoría de eventos
   - validación de stock
4. El admin ve pedidos en `/admin` y gestiona estado desde el detalle.

### Notificaciones

- WhatsApp al confirmar “Pedido recibido”: se abre WhatsApp Web desde el panel admin.
- Webhook opcional al negocio: configurar `BUSINESS_WEBHOOK_URL` + `BUSINESS_WEBHOOK_SECRET`.
- Email opcional al cliente: configurar SMTP (variables `SMTP_*`).

### Scripts útiles

```bash
npm run lint
npm run build
```

### Seguridad / GitHub

- No subir secretos: `.env*` está ignorado.
- No subir DB local: `prisma/*.db` está ignorado.
