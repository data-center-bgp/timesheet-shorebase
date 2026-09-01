-- Imports real Person master data from the staging system
-- (staging-shorebase.barokahmarineconsulting.com). staff_type already
-- matches (S=Staff, N=Non Staff), no changes needed there. One person
-- (PAK ARDIANSYAH) is already inactive on the source - imported as
-- inactive here too, ended_at left null since the source shows no end
-- date for any person, just an active/inactive toggle.

begin;

insert into timesheet_shorebase.person (staff_type_code, company_id, name, is_active)
select 'S', id, 'PAK ARIF', true
from timesheet_shorebase.company where name = 'PT. PERTAMINA HULU MAHAKAM';

insert into timesheet_shorebase.person (staff_type_code, company_id, name, is_active)
select 'S', id, 'PAK KARIM', true
from timesheet_shorebase.company where name = 'PT. PERTAMINA HULU MAHAKAM';

insert into timesheet_shorebase.person (staff_type_code, company_id, name, is_active)
select 'S', id, 'PAK JULIDAR', true
from timesheet_shorebase.company where name = 'PT. DOWELL ANADRILL SCHLUMBERGER';

insert into timesheet_shorebase.person (staff_type_code, company_id, name, is_active)
select 'S', id, 'PAK ARDIANSYAH', false
from timesheet_shorebase.company where name = 'PT. PERTAMINA HULU MAHAKAM';

commit;
