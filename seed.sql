ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;

CREATE TABLE IF NOT EXISTS drivers (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  license_number TEXT,
  license_expiry_date DATE,
  approval_status TEXT DEFAULT 'approved',
  is_approved BOOLEAN DEFAULT true,
  is_online BOOLEAN DEFAULT false,
  rating_average NUMERIC DEFAULT 4.8,
  rating_count INT DEFAULT 0,
  subscription_status TEXT DEFAULT 'active',
  total_earnings NUMERIC DEFAULT 0,
  total_trips INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY, driver_id TEXT, make TEXT, model TEXT, plate_number TEXT, created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS rides (
  id TEXT PRIMARY KEY, passenger_id TEXT, driver_id TEXT,
  status TEXT, ride_type TEXT DEFAULT 'standard',
  origin_address TEXT, destination_address TEXT,
  proposed_price NUMERIC, final_price NUMERIC, currency TEXT DEFAULT 'MXN',
  distance_meters INT, duration_seconds INT, message TEXT,
  payment_method TEXT DEFAULT 'card', payment_status TEXT DEFAULT 'paid',
  cancel_reason TEXT, canceled_at TIMESTAMPTZ, completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- demo passengers
INSERT INTO users (id,email,name,role,phone,created_at) VALUES
 ('rm_u1','ana@rideme.ink','Ana Torres','user','+52 55 1111 1111', now()-interval '12 days'),
 ('rm_u2','luis@rideme.ink','Luis Pérez','user','+52 55 2222 2222', now()-interval '8 days'),
 ('rm_u3','marta@rideme.ink','Marta Díaz','user','+52 55 3333 3333', now()-interval '3 days'),
 ('rm_d1','carlos@rideme.ink','Carlos Gómez','driver','+52 55 4444 4444', now()-interval '40 days'),
 ('rm_d2','sofia@rideme.ink','Sofía Ruiz','driver','+52 55 5555 5555', now()-interval '25 days'),
 ('rm_d3','jorge@rideme.ink','Jorge Lara','driver','+52 55 6666 6666', now()-interval '15 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO drivers (id,user_id,license_number,license_expiry_date,approval_status,is_approved,is_online,rating_average,rating_count,subscription_status,total_earnings,total_trips,created_at) VALUES
 ('rm_drv1','rm_d1','LIC-8841','2028-05-01','approved',true,true,4.9,212,'active',48230,212, now()-interval '40 days'),
 ('rm_drv2','rm_d2','LIC-7720','2027-11-01','approved',true,true,4.8,154,'active',33110,154, now()-interval '25 days'),
 ('rm_drv3','rm_d3','LIC-5532','2026-09-01','pending',false,false,4.6,12,'trial',1450,12, now()-interval '15 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO vehicles (id,driver_id,make,model,plate_number) VALUES
 ('rm_v1','rm_drv1','Toyota','Camry','ABC-123'),
 ('rm_v2','rm_drv2','Honda','Accord','XYZ-789'),
 ('rm_v3','rm_drv3','Nissan','Sentra','JKL-456')
ON CONFLICT (id) DO NOTHING;

INSERT INTO rides (id,passenger_id,driver_id,status,origin_address,destination_address,proposed_price,final_price,distance_meters,duration_seconds,payment_status,completed_at,created_at) VALUES
 ('rm_r1','rm_u1','rm_drv1','completed','Polanco','Aeropuerto CDMX T1',180,180,14200,1500,'paid', now()-interval '1 day', now()-interval '1 day'),
 ('rm_r2','rm_u2','rm_drv2','completed','Condesa','Santa Fe',150,160,18000,2100,'paid', now()-interval '2 days', now()-interval '2 days'),
 ('rm_r3','rm_u3','rm_drv1','completed','Roma Norte','Coyoacán',120,120,9000,1200,'paid', now()-interval '3 hours', now()-interval '3 hours'),
 ('rm_r4','rm_u1','rm_drv2','in_progress','Reforma','Satélite',200,NULL,22000,2600,'pending',NULL, now()-interval '20 minutes'),
 ('rm_r5','rm_u2',NULL,'searching','Del Valle','Insurgentes Sur',90,NULL,5000,700,'pending',NULL, now()-interval '4 minutes'),
 ('rm_r6','rm_u3','rm_drv1','canceled','Narvarte','Tlalpan',110,NULL,8000,1000,'pending',NULL, now()-interval '5 days')
ON CONFLICT (id) DO NOTHING;
