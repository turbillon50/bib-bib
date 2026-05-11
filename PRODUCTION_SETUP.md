# RideMe Production Setup - rideme.ink

## Quick Start Checklist

Este es tu checklist completo para llevar RideMe a producción en rideme.ink.

### 1. Obtener Credenciales de Servicios Externos

Necesitas estos valores para configurar el proyecto:

```
From Name.com:
├── API Token (para DNS automation)

From Neon:
├── DATABASE_URL (PostgreSQL connection)

From Clerk:
├── NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (pk_live_...)
├── CLERK_SECRET_KEY (sk_live_...)

From Resend:
├── RESEND_API_KEY (re_...)
├── RESEND_FROM_EMAIL (noreply@rideme.ink)

From Stripe:
├── STRIPE_SECRET_KEY (sk_live_...)
├── NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (pk_live_...)
├── STRIPE_WEBHOOK_SECRET (whsec_...)
├── STRIPE_MONTHLY_PRICE_ID (price_...)

From Google Cloud:
├── NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (AIza...)

From AWS:
├── AWS_ACCESS_KEY_ID (AKIA...)
├── AWS_SECRET_ACCESS_KEY
├── AWS_REGION (us-east-1)
├── AWS_S3_BUCKET (rideme-docs)
```

### 2. Configurar DNS en Name.com

**Pasos:**
1. Ve a name.com > Manage Domain > DNS
2. Agrega estos registros:

```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
TTL: 3600

Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600

Type: CNAME (for API subdomain)
Name: api
Value: cname.vercel-dns.com
TTL: 3600

Type: TXT (SPF - de Resend)
Name: @
Value: v=spf1 include:resend.com ~all

Type: CNAME (DKIM - Resend te generará esto)
Name: [resend-key]._domainkey
Value: [resend-cname-value]

Type: TXT (DMARC - de Resend)
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:noreply@rideme.ink
```

### 3. Configurar en Vercel

**Frontend:**
1. Ve a vercel.com > RideMe project
2. Settings > Environment Variables
3. Agrega estas variables:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/choose-role
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
NEXT_PUBLIC_API_URL=https://api.rideme.ink
```

**Backend:**
4. Settings > Environment Variables (for API)
5. Agrega estas variables:

```
DATABASE_URL=postgresql://...
CLERK_SECRET_KEY=sk_live_...
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@rideme.ink
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MONTHLY_PRICE_ID=price_...
STRIPE_PER_TRIP_AMOUNT=150
GOOGLE_MAPS_API_KEY=AIza...
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=rideme-docs
REDIS_URL=redis://...
JWT_ACCESS_SECRET=[generate: openssl rand -base64 32]
JWT_REFRESH_SECRET=[generate: openssl rand -base64 32]
FRONTEND_URL=https://rideme.ink
API_URL=https://api.rideme.ink
CORS_ORIGINS=https://rideme.ink,https://www.rideme.ink
NODE_ENV=production
```

### 4. Configurar Stripe Webhooks

1. Ve a stripe.com > Developers > Webhooks
2. Click "Add an endpoint"
3. URL: `https://api.rideme.ink/api/v1/webhooks/stripe`
4. Events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copia el "Signing secret" → `STRIPE_WEBHOOK_SECRET`

### 5. Ejecutar Migraciones de Base de Datos

Después de configurar Neon:

```bash
cd apps/api
DATABASE_URL="postgresql://..." npm run migrate
```

Esto ejecutará todas las migraciones, incluyendo la nueva de Clerk.

### 6. Desplegar en Vercel

```bash
# Frontend
git push origin main  # or your main branch

# Backend
git push origin main  # Vercel auto-deploys
```

### 7. Verificar en Producción

1. **Clerk Sign-in:**
   - Ve a https://rideme.ink/sign-in
   - Intenta crear una cuenta
   - Verifica que recibas email

2. **Email Verification:**
   - Verifica que llegue el email a tu bandeja de entrada
   - Click en el enlace de verificación

3. **Dashboard Access:**
   - Después de verificar, debes ver el dashboard
   - URL: https://rideme.ink/dashboard

4. **Ride Creation:**
   - Intenta crear un viaje
   - Verifica que funcione el mapeo
   - Stripe debe estar listo

5. **Stripe Testing:**
   - En el dashboard, intenta suscribirse como conductor
   - Usa tarjeta de prueba: 4242 4242 4242 4242
   - Expiry: cualquier fecha futura
   - CVC: cualquier 3 dígitos

## Variables de Ambiente Generadas

**JWT Secrets** (Generar localmente):
```bash
# En tu terminal:
openssl rand -base64 32  # Copia para JWT_ACCESS_SECRET
openssl rand -base64 32  # Copia para JWT_REFRESH_SECRET
```

## URLs importantes

- **Frontend:** https://rideme.ink
- **API:** https://api.rideme.ink
- **Clerk:** https://dashboard.clerk.com
- **Resend:** https://resend.com
- **Stripe:** https://dashboard.stripe.com
- **Google Cloud:** https://console.cloud.google.com
- **AWS:** https://console.aws.amazon.com
- **Vercel:** https://vercel.com/dashboard

## Troubleshooting

### "CLERK_SECRET_KEY not found"
- Asegúrate de agregarlo a Vercel Settings > Environment Variables
- Redeploy después de agregar

### "Email not sent"
- Verifica que Resend SPF, DKIM, DMARC estén configurados en DNS
- Espera 24-48 horas para que se propague
- Revisa logs de Resend

### "Stripe webhook not received"
- Verifica que la URL sea exacta en Stripe
- Asegúrate que `STRIPE_WEBHOOK_SECRET` sea correcto
- Check API logs en Vercel

### "Database connection error"
- Verifica `DATABASE_URL` en Vercel
- Asegúrate que Neon esté corriendo
- Prueba la conexión localmente primero

## Support

Para más ayuda:
- Clerk Docs: https://clerk.com/docs
- Resend Docs: https://resend.com/docs
- Stripe Docs: https://stripe.com/docs
- Vercel Docs: https://vercel.com/docs
