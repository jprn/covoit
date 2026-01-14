-- Seed MySQL minimal pour SportRide (à exécuter sur une base vide)
-- ATTENTION: suppose que les tables sont vides et que les IDs auto-incrémentés commencent à 1.

INSERT INTO users (email, password_hash, first_name, last_name, city, phone) VALUES
('alice@example.com', NULL, 'Alice','Martin','Lyon','+33600000001'),
('bruno@example.com', NULL, 'Bruno','Lefevre','Grenoble','+33600000002'),
('camille@example.com', NULL, 'Camille','Durand','Annecy','+33600000003'),
('david@example.com', NULL, 'David','Lopez','Chambéry','+33600000004'),
('emma@example.com', NULL, 'Emma','Petit','Lyon','+33600000005'),
('fanny@example.com', NULL, 'Fanny','Morel','Valence','+33600000006'),
('gabriel@example.com', NULL, 'Gabriel','Garcia','Clermont-Ferrand','+33600000007'),
('hugo@example.com', NULL, 'Hugo','Rossi','Saint-Étienne','+33600000008');

INSERT INTO events (name, sport, date, city, location, dest_lat, dest_lng) VALUES
('Trail des Cimes','trail', DATE_ADD(CURDATE(), INTERVAL 20 DAY), 'Annecy', 'Lac d''Annecy', 45.8992, 6.1296),
('Triathlon du Lac','triathlon', DATE_ADD(CURDATE(), INTERVAL 35 DAY), 'Aix-les-Bains', 'Esplanade du lac', 45.6896, 5.9087);

-- Rides: drivers: users 1..5
INSERT INTO rides (user_id, event_id, ride_type, depart_at, origin_text, origin_lat, origin_lng, seats_total, max_detour_km, price_suggested, note, rules, status)
VALUES
(1, 1, 'go', DATE_ADD(NOW(), INTERVAL 10 DAY) + INTERVAL '07:30' HOUR_MINUTE, 'Lyon Part-Dieu', 45.7600, 4.8610, 4, 10, 10, 'Je passe par Bourgoin', JSON_OBJECT('music', true, 'luggage', true), 'active'),
(2, 1, 'return', DATE_ADD(NOW(), INTERVAL 10 DAY) + INTERVAL '17:00' HOUR_MINUTE, 'Annecy centre', 45.9000, 6.1167, 3, 5, 0, 'Retour après la course', JSON_OBJECT('pets', false), 'active'),
(3, 1, 'go', DATE_ADD(NOW(), INTERVAL 10 DAY) + INTERVAL '06:45' HOUR_MINUTE, 'Chambéry Gare', 45.5700, 5.9200, 3, 15, 5, NULL, JSON_OBJECT('smoking', false), 'active'),
(4, 2, 'go', DATE_ADD(NOW(), INTERVAL 25 DAY) + INTERVAL '08:00' HOUR_MINUTE, 'Grenoble Victor Hugo', 45.1860, 5.7266, 4, 20, 8, 'Départ à l''heure', JSON_OBJECT('music', true), 'active'),
(5, 2, 'return', DATE_ADD(NOW(), INTERVAL 25 DAY) + INTERVAL '18:00' HOUR_MINUTE, 'Aix-les-Bains', 45.6900, 5.9100, 2, 10, 0, NULL, JSON_OBJECT('luggage', true), 'active');
