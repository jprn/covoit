-- Seed data (requires existing auth users for profiles)
-- Users (create via Supabase Auth; then upsert profiles with matching auth.user.id)
-- Example profiles with placeholder UUIDs - replace with real user IDs after creating accounts
insert into public.profiles (id, first_name, last_name, city, phone) values
  ('00000000-0000-0000-0000-000000000001','Alice','Martin','Lyon','+33600000001'),
  ('00000000-0000-0000-0000-000000000002','Bruno','Lefevre','Grenoble','+33600000002'),
  ('00000000-0000-0000-0000-000000000003','Camille','Durand','Annecy','+33600000003'),
  ('00000000-0000-0000-0000-000000000004','David','Lopez','Chambéry','+33600000004'),
  ('00000000-0000-0000-0000-000000000005','Emma','Petit','Lyon','+33600000005'),
  ('00000000-0000-0000-0000-000000000006','Fanny','Morel','Valence','+33600000006'),
  ('00000000-0000-0000-0000-000000000007','Gabriel','Garcia','Clermont-Ferrand','+33600000007'),
  ('00000000-0000-0000-0000-000000000008','Hugo','Rossi','Saint-Étienne','+33600000008');

insert into public.events (name, sport, date, city, location, dest_lat, dest_lng) values
  ('Trail des Cimes','trail', (current_date + interval '20 days')::date, 'Annecy', 'Lac d\'Annecy', 45.8992, 6.1296),
  ('Triathlon du Lac','triathlon', (current_date + interval '35 days')::date, 'Aix-les-Bains', 'Esplanade du lac', 45.6896, 5.9087);

-- Rides (use the first three users as drivers)
insert into public.rides (user_id, event_id, ride_type, depart_at, origin_text, origin_lat, origin_lng, seats_total, max_detour_km, price_suggested, note, rules, status)
values
  ('00000000-0000-0000-0000-000000000001', 1, 'go', now() + interval '10 days 07:30', 'Lyon Part-Dieu', 45.7600, 4.8610, 4, 10, 10, 'Je passe par Bourgoin', '{"music":true,"luggage":true}', 'active'),
  ('00000000-0000-0000-0000-000000000002', 1, 'return', now() + interval '10 days 17:00', 'Annecy centre', 45.9000, 6.1167, 3, 5, 0, 'Retour après la course', '{"pets":false}', 'active'),
  ('00000000-0000-0000-0000-000000000003', 1, 'go', now() + interval '10 days 06:45', 'Chambéry Gare', 45.5700, 5.9200, 3, 15, 5, null, '{"smoking":false}', 'active'),
  ('00000000-0000-0000-0000-000000000004', 2, 'go', now() + interval '25 days 08:00', 'Grenoble Victor Hugo', 45.1860, 5.7266, 4, 20, 8, 'Départ à l\'heure', '{"music":true}', 'active'),
  ('00000000-0000-0000-0000-000000000005', 2, 'return', now() + interval '25 days 18:00', 'Aix-les-Bains', 45.6900, 5.9100, 2, 10, 0, null, '{"luggage":true}', 'active');
