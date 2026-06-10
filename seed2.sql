INSERT INTO users (id,email,name,role,phone,is_blocked,created_at) VALUES
 (gen_random_uuid(),'ana@rideme.ink','Ana Torres','user','+52 55 1111 1111',false, now()-interval '12 days'),
 (gen_random_uuid(),'luis@rideme.ink','Luis Pérez','user','+52 55 2222 2222',false, now()-interval '8 days'),
 (gen_random_uuid(),'marta@rideme.ink','Marta Díaz','user','+52 55 3333 3333',false, now()-interval '3 days'),
 (gen_random_uuid(),'carlos@rideme.ink','Carlos Gómez','driver','+52 55 4444 4444',false, now()-interval '40 days'),
 (gen_random_uuid(),'sofia@rideme.ink','Sofía Ruiz','driver','+52 55 5555 5555',false, now()-interval '25 days'),
 (gen_random_uuid(),'jorge@rideme.ink','Jorge Lara','driver','+52 55 6666 6666',false, now()-interval '15 days')
ON CONFLICT DO NOTHING;

UPDATE drivers SET user_id=(SELECT id::text FROM users WHERE email='carlos@rideme.ink' LIMIT 1) WHERE id='rm_drv1';
UPDATE drivers SET user_id=(SELECT id::text FROM users WHERE email='sofia@rideme.ink' LIMIT 1) WHERE id='rm_drv2';
UPDATE drivers SET user_id=(SELECT id::text FROM users WHERE email='jorge@rideme.ink' LIMIT 1) WHERE id='rm_drv3';
UPDATE rides SET passenger_id=(SELECT id::text FROM users WHERE email='ana@rideme.ink' LIMIT 1) WHERE id IN ('rm_r1','rm_r4');
UPDATE rides SET passenger_id=(SELECT id::text FROM users WHERE email='luis@rideme.ink' LIMIT 1) WHERE id IN ('rm_r2','rm_r5');
UPDATE rides SET passenger_id=(SELECT id::text FROM users WHERE email='marta@rideme.ink' LIMIT 1) WHERE id IN ('rm_r3','rm_r6');
