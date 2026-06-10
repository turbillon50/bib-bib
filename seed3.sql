WITH p AS (
INSERT INTO users (name,email,phone,role,created_at,last_seen_at) VALUES
 ('Ana Torres','ana@rideme.ink','+52 55 1101 2201','passenger',now()-interval '40 days',now()-interval '2 hours'),
 ('Luis Pérez','luis.p@rideme.ink','+52 55 1102 2202','passenger',now()-interval '33 days',now()-interval '1 day'),
 ('Marta Díaz','marta@rideme.ink','+52 55 1103 2203','passenger',now()-interval '21 days',now()-interval '5 hours'),
 ('Diego Salas','diego@rideme.ink','+52 55 1104 2204','passenger',now()-interval '14 days',now()-interval '3 days'),
 ('Paola Mena','paola@rideme.ink','+52 55 1105 2205','passenger',now()-interval '9 days',now()-interval '6 hours'),
 (' Raúl Vega','raul@rideme.ink','+52 55 1106 2206','passenger',now()-interval '5 days',now()-interval '30 minutes'),
 ('Carla Ibarra','carla@rideme.ink','+52 55 1107 2207','passenger',now()-interval '2 days',now()-interval '10 minutes'),
 ('Carlos Gómez','carlos@rideme.ink','+52 55 4401 5501','driver',now()-interval '60 days',now()-interval '5 minutes'),
 ('Sofía Ruiz','sofia@rideme.ink','+52 55 4402 5502','driver',now()-interval '48 days',now()-interval '8 minutes'),
 ('Jorge Lara','jorge@rideme.ink','+52 55 4403 5503','driver',now()-interval '30 days',now()-interval '2 hours'),
 ('Elena Cruz','elena@rideme.ink','+52 55 4404 5504','driver',now()-interval '18 days',now()-interval '1 hour'),
 ('Miguel Soto','miguel@rideme.ink','+52 55 4405 5505','driver',now()-interval '7 days',now()-interval '40 minutes'),
 ('Admin RideMe','admin@rideme.ink','+52 55 9000 0000','admin',now()-interval '70 days',now())
RETURNING id,email,role)
SELECT 1;

INSERT INTO drivers (user_id,license_number,license_expiry_date,approval_status,is_approved,is_online,rating_average,rating_count,subscription_status,total_earnings,total_trips,created_at)
SELECT id,'LIC-'||substr(md5(email),1,6),'2028-05-01','approved',true,true,4.9,318,'active',72340,318,now()-interval '60 days' FROM users WHERE email='carlos@rideme.ink';
INSERT INTO drivers (user_id,license_number,license_expiry_date,approval_status,is_approved,is_online,rating_average,rating_count,subscription_status,total_earnings,total_trips,created_at)
SELECT id,'LIC-'||substr(md5(email),1,6),'2027-11-01','approved',true,true,4.8,201,'active',45120,201,now()-interval '48 days' FROM users WHERE email='sofia@rideme.ink';
INSERT INTO drivers (user_id,license_number,license_expiry_date,approval_status,is_approved,is_online,rating_average,rating_count,subscription_status,total_earnings,total_trips,created_at)
SELECT id,'LIC-'||substr(md5(email),1,6),'2027-03-01','approved',true,false,4.7,142,'active',31890,142,now()-interval '30 days' FROM users WHERE email='jorge@rideme.ink';
INSERT INTO drivers (user_id,license_number,license_expiry_date,approval_status,is_approved,is_online,rating_average,rating_count,subscription_status,total_earnings,total_trips,created_at)
SELECT id,'LIC-'||substr(md5(email),1,6),'2026-12-01','approved',true,true,4.6,77,'trial',12650,77,now()-interval '18 days' FROM users WHERE email='elena@rideme.ink';
INSERT INTO drivers (user_id,license_number,license_expiry_date,approval_status,is_approved,is_online,rating_average,rating_count,subscription_status,total_earnings,total_trips,created_at)
SELECT id,'LIC-'||substr(md5(email),1,6),'2026-09-01','pending',false,false,4.5,9,'trial',980,9,now()-interval '7 days' FROM users WHERE email='miguel@rideme.ink';

INSERT INTO vehicles (driver_id,make,model,plate_number,color,year)
SELECT d.id,v.make,v.model,v.plate,v.color,v.yr FROM drivers d
JOIN users u ON u.id=d.user_id
JOIN (VALUES
 ('carlos@rideme.ink','Toyota','Camry','ABC-1230','Negro',2023),
 ('sofia@rideme.ink','Honda','Accord','XYZ-7890','Blanco',2022),
 ('jorge@rideme.ink','Nissan','Sentra','JKL-4560','Gris',2021),
 ('elena@rideme.ink','Mazda','3','QRS-3210','Rojo',2023),
 ('miguel@rideme.ink','Volkswagen','Jetta','TUV-6540','Azul',2020)
) v(email,make,model,plate,color,yr) ON v.email=u.email;

-- rides: completed (varios dias), in_progress, searching, canceled
INSERT INTO rides (passenger_id,driver_id,status,origin_address,destination_address,proposed_price,final_price,distance_meters,duration_seconds,payment_status,completed_at,created_at)
SELECT pu.id, dr.id, x.status, x.o, x.dd, x.pp, x.fp, x.dm, x.ds, x.ps, x.comp, x.crt FROM
 (VALUES
  ('ana@rideme.ink','carlos@rideme.ink','completed','Polanco','Aeropuerto CDMX T1',180,180,14200,1500,'paid',now()-interval '1 day',now()-interval '1 day'),
  ('luis.p@rideme.ink','sofia@rideme.ink','completed','Condesa','Santa Fe',150,165,18000,2100,'paid',now()-interval '2 days',now()-interval '2 days'),
  ('marta@rideme.ink','carlos@rideme.ink','completed','Roma Norte','Coyoacán',120,120,9000,1200,'paid',now()-interval '3 hours',now()-interval '3 hours'),
  ('diego@rideme.ink','jorge@rideme.ink','completed','Del Valle','Polanco',140,140,11000,1400,'paid',now()-interval '5 days',now()-interval '5 days'),
  ('paola@rideme.ink','elena@rideme.ink','completed','Narvarte','Reforma 222',95,100,6500,900,'paid',now()-interval '6 days',now()-interval '6 days'),
  ('carla@rideme.ink','sofia@rideme.ink','completed','Satélite','Interlomas',160,160,15000,1900,'paid',now()-interval '8 days',now()-interval '8 days'),
  ('ana@rideme.ink','jorge@rideme.ink','completed','Coyoacán','UNAM',70,70,4200,650,'paid',now(),now()),
  ('luis.p@rideme.ink','elena@rideme.ink','in_progress','Reforma','Satélite',200,NULL,22000,2600,'pending',NULL,now()-interval '18 minutes'),
  ('diego@rideme.ink','carlos@rideme.ink','in_progress','Tlalpan','Centro Histórico',130,NULL,12500,1700,'pending',NULL,now()-interval '9 minutes'),
  ('paola@rideme.ink',NULL,'searching','Del Valle','Insurgentes Sur',90,NULL,5000,700,'pending',NULL,now()-interval '4 minutes'),
  ('carla@rideme.ink',NULL,'searching','Roma Sur','Lindavista',140,NULL,13000,1600,'pending',NULL,now()-interval '2 minutes'),
  ('raul@rideme.ink','sofia@rideme.ink','canceled','Narvarte','Tlalpan',110,NULL,8000,1000,'failed',NULL,now()-interval '4 days')
 ) x(pe,de,status,o,dd,pp,fp,dm,ds,ps,comp,crt)
 JOIN users pu ON pu.email=x.pe
 LEFT JOIN users du ON du.email=x.de
 LEFT JOIN drivers dr ON dr.user_id=du.id;

INSERT INTO invitations (code,email,role,status,created_at) VALUES
 ('RM-DRV-7781','nuevo.conductor@rideme.ink','driver','pending',now()-interval '2 days'),
 ('RM-DRV-3320','prospect@rideme.ink','driver','accepted',now()-interval '10 days'),
 ('RM-ADM-9001','op2@rideme.ink','admin','pending',now()-interval '1 day');
