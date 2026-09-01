-- Removes the placeholder room_type/meal_time rows (Single Room/Double
-- Room/Dormitory; Breakfast/Lunch/Dinner) now that real business data
-- for both has been imported (Kamar A/Kamar B; PAGI/SIANG/MALAM/SUPPER).
-- Same situation as service_type's earlier placeholder replacement -
-- confirmed via psql that nothing references either set of placeholder
-- codes.

begin;

delete from timesheet_shorebase.room_type where code in ('SGL', 'DBL', 'DORM');
delete from timesheet_shorebase.meal_time where code in ('BF', 'LU', 'DI');

commit;
