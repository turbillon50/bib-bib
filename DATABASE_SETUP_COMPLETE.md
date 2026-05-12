# Base de Datos - Setup Completado

## Status: ✅ COMPLETADO

La base de datos en Neon ha sido configurada exitosamente con todas las migraciones aplicadas.

---

## Lo que se hizo

### 1. Conexión a Neon PostgreSQL
- **Database URL Configurada:**
  ```
  postgresql://neondb_owner:npg_PtvDMoYKVp65@ep-calm-king-aqvmblif.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require
  ```

### 2. Migraciones Ejecutadas

#### Migration 001: Schema Inicial
Creó las siguientes tablas:
- `users` - Usuarios (pasajeros y conductores)
- `drivers` - Información adicional de conductores
- `rides` - Viajes
- `ratings` - Calificaciones
- `ride_offers` - Ofertas de conductores para viajes
- `wallets` - Monederos de usuarios
- `transactions` - Historial de transacciones
- `driver_documents` - Documentos de conductores (verificación)
- `notifications` - Notificaciones del sistema
- `support_tickets` - Tickets de soporte

#### Migration 002: Clerk Integration
Agregó columnas para integración con Clerk:
- `clerk_id` - ID único de Clerk por usuario
- `email` - Email del usuario
- `email_verified_at` - Timestamp de verificación de email
- `last_login` - Último login
- `image_url` - Avatar/foto del usuario

Removió columnas obsoletas:
- `password_hash` (Clerk maneja autenticación)
- `fcm_token` (usando Resend para email)

Creó nuevas tablas:
- `notification_logs` - Log de notificaciones enviadas
- `auth_sessions` - Sesiones de usuario

---

## Tablas y Campos

### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id VARCHAR(255) UNIQUE,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone_number VARCHAR(20),
  avatar_url TEXT,
  country_code VARCHAR(2),
  birth_date DATE,
  gender VARCHAR(10),
  role VARCHAR(20) DEFAULT 'passenger', -- 'passenger', 'driver', 'admin'
  email_verified_at TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### drivers
```sql
CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id),
  license_number VARCHAR(50) UNIQUE,
  license_expiry DATE,
  vehicle_type VARCHAR(50),
  vehicle_make VARCHAR(100),
  vehicle_model VARCHAR(100),
  vehicle_year INTEGER,
  license_plate VARCHAR(20) UNIQUE,
  is_verified BOOLEAN DEFAULT FALSE,
  stripe_account_id VARCHAR(255),
  rating DECIMAL(3,2) DEFAULT 0,
  total_rides INTEGER DEFAULT 0,
  cancellation_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### rides
```sql
CREATE TABLE rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id UUID NOT NULL REFERENCES users(id),
  driver_id UUID REFERENCES drivers(id),
  pickup_location POINT NOT NULL,
  pickup_address TEXT NOT NULL,
  destination_location POINT NOT NULL,
  destination_address TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, completed, cancelled
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  distance_km DECIMAL(10,2),
  duration_minutes INTEGER,
  base_price DECIMAL(10,2),
  base_currency VARCHAR(3) DEFAULT 'USD',
  final_price DECIMAL(10,2),
  payment_method VARCHAR(50),
  payment_status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### drivers (documentos)
```sql
CREATE TABLE driver_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES drivers(id),
  document_type VARCHAR(50), -- 'license', 'insurance', 'registration', 'background_check'
  document_url TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, verified, rejected
  rejection_reason TEXT,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Próximos Pasos

Con la base de datos lista, los siguientes pasos para producción son:

### 1. Obtener Credenciales de Servicios

**Clerk:**
- `CLERK_SECRET_KEY` (comienza con `sk_live_` o `sk_test_`)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (comienza con `pk_live_` o `pk_test_`)

**Resend:**
- `RESEND_API_KEY` (comienza con `re_`)
- `RESEND_FROM_EMAIL` (ej: noreply@rideme.ink)

**Stripe:**
- `STRIPE_SECRET_KEY` (comienza con `sk_live_` o `sk_test_`)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (comienza con `pk_live_` o `pk_test_`)
- `STRIPE_WEBHOOK_SECRET` (comienza con `whsec_`)
- `STRIPE_MONTHLY_PRICE_ID` (ej: price_1234567890)

**Google Maps:**
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

**JWT Secrets (generar localmente):**
```bash
openssl rand -base64 32  # JWT_ACCESS_SECRET
openssl rand -base64 32  # JWT_REFRESH_SECRET
```

### 2. Configurar en Vercel

Ve a [vercel.com/dashboard](https://vercel.com/dashboard)
- Settings > Environment Variables
- Agrega todas las variables de arriba
- Deploy

### 3. Configurar DNS en Name.com

Agrega estos registros DNS:
```
CNAME @ -> cname.vercel-dns.com
CNAME api -> cname.vercel-dns.com
TXT @ (SPF de Resend) -> v=spf1 include:resend.com ~all
CNAME (DKIM de Resend) -> [resend-generated-cname]
TXT _dmarc -> v=DMARC1; p=quarantine; rua=mailto:noreply@rideme.ink
```

### 4. Configurar Webhooks

**Stripe Webhook:**
- URL: `https://rideme.ink/api/v1/webhooks/stripe`
- Events: payment_intent.succeeded, subscription.created, etc.

---

## Verificar la Conexión

Para verificar que todo está funcionando:

```bash
cd /vercel/share/v0-project/apps/api

# Con DATABASE_URL configurada en .env o Vercel:
npm run migrate
```

Si ves "All migrations complete." sin errores, todo está bien!

---

## Soporte

Si tienes problemas de conexión a Neon:
1. Verifica la DATABASE_URL (debe ser exacta)
2. Verifica que el firewall de Neon permita conexiones desde tu IP
3. En Neon Dashboard, ve a Settings > Connection limits y aumenta si es necesario

---

**Siguiente:** Cuando tengas las credenciales de Clerk, Resend, Stripe y Google Maps, avísame para configurar esos servicios en Vercel.
