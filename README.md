# Bib-Bib — Premium Ride-Hailing "Name Your Price"

Bib-Bib (bib-bib.ink) es una aplicación de ride-hailing donde **el pasajero pone el precio**: propone su tarifa, los conductores la ven y deciden si la aceptan. Sin tarifa dinámica, sin sorpresas. Construida por Forge Labs (Vulcano) sobre Next.js 14 + Vercel + Neon + Clerk + Google Maps + Resend.

URL producción: https://bib-bib.ink · Deploy Vercel: proyecto `bib-bib` (luis-projects-48b011f9).

---

## Qué hace

- **Pasajero**: pide viaje en mapa, **propone su precio**, ve conductores cercanos, da seguimiento en vivo (tracking + SOS), paga, califica, revisa historial, ofertas y viajes programados.
- **Conductor**: recibe ofertas de viaje, acepta/contrapropone, ve ganancias (gráficas), gestiona perfil verificado y su suscripción (Stripe).
- **Admin**: dashboard dinámico con métricas, gestión de viajes, choferes, usuarios e invitaciones por rol, **soporte en tiempo real** y **personalización white-label** de la marca.

## Roles

| Rol | Ruta | Capacidades |
|-----|------|-------------|
| Público | `/` | Landing premium, botones de demo (usuario/conductor/admin) |
| Pasajero | `/app` | Solicitar viaje, name-your-price, tracking, SOS, historial, ofertas, agenda |
| Conductor | `/driver` | Ofertas entrantes, viaje activo, ganancias, perfil, suscripción |
| Admin | `/admin` | Dashboard, viajes, choferes, usuarios, invitaciones, soporte, branding |

## Módulos principales

- **Mapa y ruteo**: Google Maps (`/api/maps/directions|distance|geocode`, server-side, llave protegida).
- **Name your price**: el pasajero fija tarifa; matching conductor–pasajero por oferta.
- **Tracking + seguridad**: seguimiento en vivo, botón SOS, compartir ruta.
- **Pagos**: Stripe (suscripción de conductor + cobros).
- **Invitaciones por rol**: alta jerárquica (owner → admin → conductor).
- **Soporte in-app** (estándar Forge): botón flotante "Reportar" en todas las vistas → `POST /api/support` → tabla Neon `support_tickets` → el admin las ve en `/admin/support` (polling en tiempo real) y responde por correo (Resend).
- **White-label / branding dinámico** (estándar Forge): `/admin/branding` permite cambiar nombre de la app, colores primario/acento, logo e icono, y tema día/noche por defecto; se guarda en Neon `app_branding` y se aplica vía `BrandingProvider` (CSS vars + título + favicon).
- **PWA real**: `manifest.json` (standalone, iconos 192/512 maskable, apple-touch), service worker (next-pwa), instalable.

## Stack

- **Frontend/Backend**: Next.js 14 (App Router), React 18, TypeScript estricto, Tailwind, framer-motion, Zustand, React Query.
- **Auth**: Clerk (degrada a **modo demo abierto** si no hay llave real configurada).
- **DB**: Neon Postgres (HTTP serverless). Tablas compartidas: `support_tickets`, `app_branding`.
- **Email**: Resend. **Mapas**: Google Maps. **Pagos**: Stripe.
- **Iconos**: SVG propios en `src/components/icons.tsx` (cero lucide-react).
- **Infra**: Vercel (región iad1), monorepo Turborepo (`apps/web`, `apps/api`, `packages/shared-types`).

## Cómo usar la demo

1. Entra a la landing `/`.
2. Botones **Ver demo** (pasajero), **Demo conductor**, **Demo admin** → fijan la cookie `bib-bib_demo=1` y entran sin login.
3. La ruta `/demo?to=/app|/driver|/admin` activa el modo demo a cualquier vista.

## Cómo operar el ADMIN

- **Dashboard** (`/admin`): métricas generales.
- **Viajes / Choferes / Usuarios**: tablas de gestión.
- **Invitaciones** (`/admin/invitations`): alta de usuarios por rol; botón "Inicializar" corre `db-init`.
- **Soporte** (`/admin/support`): lista tickets en tiempo real (polling 5s); responder/resolver envía correo al usuario vía Resend.
- **Personalización** (`/admin/branding`): cambia nombre, colores, logo, icono y tema; impacta toda la app (white-label).

## Variables de entorno

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY   # si falta/placeholder → modo demo abierto
CLERK_SECRET_KEY
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
DATABASE_URL                         # Neon (app)
SUPPORT_DATABASE_URL                 # Neon para support_tickets + app_branding
RESEND_API_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY / STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET
ADMIN_EMAILS                         # allowlist de admins (coma-separado)
```

## Desarrollo

```bash
npm install --legacy-peer-deps
npm run build      # turbo build
cd apps/web && npm run dev
```

## Deploy

Vercel (proyecto `bib-bib`), build en la nube con `npm install --legacy-peer-deps`. Para forzar: `vercel deploy --prod --yes`. Si BLOCKED: `vercel --prebuilt --prod`.

---

_Forge Labs · Vulcano · build premium 2026._
