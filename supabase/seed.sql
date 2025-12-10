INSERT INTO auth.users (id, email, encrypted_password, role, aud) VALUES ('00000000-0000-0000-0000-000000000001', 'michael.johnson1@example.com', '$2a$10$dummy.hash.for.testing', 'authenticated', 'authenticated');
UPDATE public.profiles SET first_name = 'Michael', last_name = 'Johnson', role = 'driver', city = 'San Francisco', state = 'CA', bio = 'Professional driver, very reliable.' WHERE id = '00000000-0000-0000-0000-000000000001';
UPDATE public.profiles SET pronouns = 'he/him' WHERE id = '00000000-0000-0000-0000-000000000001';

INSERT INTO auth.users (id, email, encrypted_password, role, aud) VALUES ('00000000-0000-0000-0000-000000000002', 'emily.chen2@example.com', '$2a$10$dummy.hash.for.testing', 'authenticated', 'authenticated');
UPDATE public.profiles SET first_name = 'Emily', last_name = 'Chen', role = 'driver', city = 'Oakland', state = 'CA', bio = 'First time to Tahoe, excited!' WHERE id = '00000000-0000-0000-0000-000000000002';
UPDATE public.profiles SET pronouns = 'she/her' WHERE id = '00000000-0000-0000-0000-000000000002';

INSERT INTO auth.users (id, email, encrypted_password, role, aud) VALUES ('00000000-0000-0000-0000-000000000003', 'david.lee3@example.com', '$2a$10$dummy.hash.for.testing', 'authenticated', 'authenticated');
UPDATE public.profiles SET first_name = 'David', last_name = 'Lee', role = 'passenger', city = 'San Jose', state = 'CA', bio = 'EV driver, charging stops included.' WHERE id = '00000000-0000-0000-0000-000000000003';
UPDATE public.profiles SET pronouns = 'they/them' WHERE id = '00000000-0000-0000-0000-000000000003';

INSERT INTO auth.users (id, email, encrypted_password, role, aud) VALUES ('00000000-0000-0000-0000-000000000004', 'jessica.rodriguez4@example.com', '$2a$10$dummy.hash.for.testing', 'authenticated', 'authenticated');
UPDATE public.profiles SET first_name = 'Jessica', last_name = 'Rodriguez', role = 'driver', city = 'Sacramento', state = 'CA', bio = 'Love weekend trips to Tahoe!' WHERE id = '00000000-0000-0000-0000-000000000004';
UPDATE public.profiles SET pronouns = 'prefer not to answer' WHERE id = '00000000-0000-0000-0000-000000000004';

INSERT INTO auth.users (id, email, encrypted_password, role, aud) VALUES ('00000000-0000-0000-0000-000000000005', 'alex.wang5@example.com', '$2a$10$dummy.hash.for.testing', 'authenticated', 'authenticated');
-- Pronouns left null intentionally because Alex did not share them in this seed data set.
UPDATE public.profiles SET first_name = 'Alex', last_name = 'Wang', role = 'driver', city = 'Palo Alto', state = 'CA', bio = 'Music lover, bring your playlist!' WHERE id = '00000000-0000-0000-0000-000000000005';

INSERT INTO auth.users (id, email, encrypted_password, role, aud) VALUES ('00000000-0000-0000-0000-000000000006', 'ryan.kim6@example.com', '$2a$10$dummy.hash.for.testing', 'authenticated', 'authenticated');
UPDATE public.profiles SET first_name = 'Ryan', last_name = 'Kim', role = 'passenger', city = 'Davis', state = 'CA', bio = 'Music lover, bring your playlist!' WHERE id = '00000000-0000-0000-0000-000000000006';

INSERT INTO auth.users (id, email, encrypted_password, role, aud) VALUES ('00000000-0000-0000-0000-000000000007', 'maria.garcia7@example.com', '$2a$10$dummy.hash.for.testing', 'authenticated', 'authenticated');
UPDATE public.profiles SET first_name = 'Maria', last_name = 'Garcia', role = 'driver', city = 'Reno', state = 'NV', bio = 'Love weekend trips to Tahoe!' WHERE id = '00000000-0000-0000-0000-000000000007';

INSERT INTO auth.users (id, email, encrypted_password, role, aud) VALUES ('00000000-0000-0000-0000-000000000008', 'kenji.tanaka8@example.com', '$2a$10$dummy.hash.for.testing', 'authenticated', 'authenticated');
UPDATE public.profiles SET first_name = 'Kenji', last_name = 'Tanaka', role = 'driver', city = 'Fremont', state = 'CA', bio = 'Chill driver, pet-friendly vehicle.' WHERE id = '00000000-0000-0000-0000-000000000008';

INSERT INTO auth.users (id, email, encrypted_password, role, aud) VALUES ('00000000-0000-0000-0000-000000000009', 'chloe.miller9@example.com', '$2a$10$dummy.hash.for.testing', 'authenticated', 'authenticated');
UPDATE public.profiles SET first_name = 'Chloe', last_name = 'Miller', role = 'passenger', city = 'San Mateo', state = 'CA', bio = 'Always happy to share the ride and costs.' WHERE id = '00000000-0000-0000-0000-000000000009';

INSERT INTO auth.users (id, email, encrypted_password, role, aud) VALUES ('00000000-0000-0000-0000-000000000010', 'ben.carter10@example.com', '$2a$10$dummy.hash.for.testing', 'authenticated', 'authenticated');
UPDATE public.profiles SET first_name = 'Ben', last_name = 'Carter', role = 'driver', city = 'Berkeley', state = 'CA', bio = 'Chill driver, pet-friendly vehicle.' WHERE id = '00000000-0000-0000-0000-000000000010';

INSERT INTO auth.users (id, email, encrypted_password, role, aud) VALUES ('00000000-0000-0000-0000-000000000011', 'hannah.nguyen11@example.com', '$2a$10$dummy.hash.for.testing', 'authenticated', 'authenticated');
UPDATE public.profiles SET first_name = 'Hannah', last_name = 'Nguyen', role = 'driver', city = 'San Francisco', state = 'CA', bio = 'Regular at Heavenly and Kirkwood.' WHERE id = '00000000-0000-0000-0000-000000000011';

INSERT INTO auth.users (id, email, encrypted_password, role, aud) VALUES ('00000000-0000-0000-0000-000000000012', 'diego.perez12@example.com', '$2a$10$dummy.hash.for.testing', 'authenticated', 'authenticated');
UPDATE public.profiles SET first_name = 'Diego', last_name = 'Perez', role = 'passenger', city = 'Oakland', state = 'CA', bio = 'Flexible with times and pickup locations.' WHERE id = '00000000-0000-0000-0000-000000000012';

INSERT INTO auth.users (id, email, encrypted_password, role, aud) VALUES ('00000000-0000-0000-0000-000000000013', 'priya.patel13@example.com', '$2a$10$dummy.hash.for.testing', 'authenticated', 'authenticated');
UPDATE public.profiles SET first_name = 'Priya', last_name = 'Patel', role = 'driver', city = 'San Jose', state = 'CA', bio = 'Love weekend trips to Tahoe!' WHERE id = '00000000-0000-0000-0000-000000000013';

INSERT INTO auth.users (id, email, encrypted_password, role, aud) VALUES ('00000000-0000-0000-0000-000000000014', 'marcus.williams14@example.com', '$2a$10$dummy.hash.for.testing', 'authenticated', 'authenticated');
UPDATE public.profiles SET first_name = 'Marcus', last_name = 'Williams', role = 'driver', city = 'Sacramento', state = 'CA', bio = 'Professional driver, very reliable.' WHERE id = '00000000-0000-0000-0000-000000000014';

INSERT INTO auth.users (id, email, encrypted_password, role, aud) VALUES ('00000000-0000-0000-0000-000000000015', 'olivia.brown15@example.com', '$2a$10$dummy.hash.for.testing', 'authenticated', 'authenticated');
UPDATE public.profiles SET first_name = 'Olivia', last_name = 'Brown', role = 'passenger', city = 'Palo Alto', state = 'CA', bio = 'EV driver, charging stops included.' WHERE id = '00000000-0000-0000-0000-000000000015';

INSERT INTO auth.users (id, email, encrypted_password, role, aud) VALUES ('00000000-0000-0000-0000-000000000016', 'elijah.davis16@example.com', '$2a$10$dummy.hash.for.testing', 'authenticated', 'authenticated');
UPDATE public.profiles SET first_name = 'Elijah', last_name = 'Davis', role = 'driver', city = 'Davis', state = 'CA', bio = 'Professional driver, very reliable.' WHERE id = '00000000-0000-0000-0000-000000000016';

INSERT INTO auth.users (id, email, encrypted_password, role, aud) VALUES ('00000000-0000-0000-0000-000000000017', 'sophia.wilson17@example.com', '$2a$10$dummy.hash.for.testing', 'authenticated', 'authenticated');
UPDATE public.profiles SET first_name = 'Sophia', last_name = 'Wilson', role = 'driver', city = 'Reno', state = 'NV', bio = 'Can help with driving if needed.' WHERE id = '00000000-0000-0000-0000-000000000017';

INSERT INTO auth.users (id, email, encrypted_password, role, aud) VALUES ('00000000-0000-0000-0000-000000000018', 'liam.moore18@example.com', '$2a$10$dummy.hash.for.testing', 'authenticated', 'authenticated');
UPDATE public.profiles SET first_name = 'Liam', last_name = 'Moore', role = 'passenger', city = 'Fremont', state = 'CA', bio = 'Chill driver, pet-friendly vehicle.' WHERE id = '00000000-0000-0000-0000-000000000018';

INSERT INTO auth.users (id, email, encrypted_password, role, aud) VALUES ('00000000-0000-0000-0000-000000000019', 'emma.taylor19@example.com', '$2a$10$dummy.hash.for.testing', 'authenticated', 'authenticated');
UPDATE public.profiles SET first_name = 'Emma', last_name = 'Taylor', role = 'driver', city = 'San Mateo', state = 'CA', bio = 'Love weekend trips to Tahoe!' WHERE id = '00000000-0000-0000-0000-000000000019';

INSERT INTO auth.users (id, email, encrypted_password, role, aud) VALUES ('00000000-0000-0000-0000-000000000020', 'sarah.martinez20@example.com', '$2a$10$dummy.hash.for.testing', 'authenticated', 'authenticated');
UPDATE public.profiles SET first_name = 'Sarah', last_name = 'Martinez', role = 'driver', city = 'Berkeley', state = 'CA', bio = 'Flexible with times and pickup locations.' WHERE id = '00000000-0000-0000-0000-000000000020';

INSERT INTO public.vehicles (id, owner_id, make, model, year, color, license_plate) VALUES ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Tesla', 'Model Y', 2018, 'White', '0LNZ731');
INSERT INTO public.vehicles (id, owner_id, make, model, year, color, license_plate) VALUES ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Honda', 'CR-V', 2019, 'Red', '5FDW608');
INSERT INTO public.vehicles (id, owner_id, make, model, year, color, license_plate) VALUES ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004', 'Jeep', 'Grand Cherokee', 2021, 'Red', '8AAK392');
INSERT INTO public.vehicles (id, owner_id, make, model, year, color, license_plate) VALUES ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000005', 'Toyota', '4Runner', 2022, 'Silver', '3URI938');
INSERT INTO public.vehicles (id, owner_id, make, model, year, color, license_plate) VALUES ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000007', 'Toyota', '4Runner', 2017, 'Silver', '7WFT875');
INSERT INTO public.vehicles (id, owner_id, make, model, year, color, license_plate) VALUES ('20000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000008', 'Subaru', 'Outback', 2018, 'Silver', '1XCK209');
INSERT INTO public.vehicles (id, owner_id, make, model, year, color, license_plate) VALUES ('20000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000010', 'Jeep', 'Grand Cherokee', 2020, 'Black', '5NQI131');
INSERT INTO public.vehicles (id, owner_id, make, model, year, color, license_plate) VALUES ('20000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000011', 'Subaru', 'Outback', 2021, 'Blue', '2RXV448');
INSERT INTO public.vehicles (id, owner_id, make, model, year, color, license_plate) VALUES ('20000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000013', 'Subaru', 'Outback', 2023, 'Green', '4TJW053');
INSERT INTO public.vehicles (id, owner_id, make, model, year, color, license_plate) VALUES ('20000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000014', 'Tesla', 'Model Y', 2017, 'White', '2TSC355');
INSERT INTO public.vehicles (id, owner_id, make, model, year, color, license_plate) VALUES ('20000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000016', 'Jeep', 'Grand Cherokee', 2019, 'Red', '4OHA241');
INSERT INTO public.vehicles (id, owner_id, make, model, year, color, license_plate) VALUES ('20000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000017', 'Honda', 'CR-V', 2020, 'Gray', '1IBR630');
INSERT INTO public.vehicles (id, owner_id, make, model, year, color, license_plate) VALUES ('20000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000019', 'Toyota', '4Runner', 2022, 'White', '6AIJ896');
INSERT INTO public.vehicles (id, owner_id, make, model, year, color, license_plate) VALUES ('20000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000020', 'Nissan', 'Pathfinder', 2023, 'Black', '6EUI107');

INSERT INTO public.rides (id, poster_id, posting_type, start_location, end_location, start_lat, start_lng, end_lat, end_lng, departure_date, departure_time, pricing_type, price_per_seat, total_seats, available_seats, car_type, has_awd, title, description, status) VALUES ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'driver', 'San Francisco, CA', 'Heavenly, CA', 37.7749, -122.4194, 38.9353, -119.94, CURRENT_DATE + INTERVAL '2 days', '07:15:00', 'per_seat', 40.00, 4, 2, 'Mazda CX-5', false, 'Ride to Heavenly', 'Heading up for snowboarding! Coffee provided!', 'active');
INSERT INTO public.rides (id, poster_id, posting_type, start_location, end_location, start_lat, start_lng, end_lat, end_lng, departure_date, departure_time, title, description, status) VALUES ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'passenger', 'Oakland, CA', 'Northstar, CA', 37.8044, -122.2712, 39.2746, -120.1211, CURRENT_DATE + INTERVAL '3 days', '08:30:00', 'Looking for ride to Northstar', 'Can help with gas and great company! Flexible times.', 'active');
INSERT INTO public.rides (id, poster_id, posting_type, start_location, end_location, start_lat, start_lng, end_lat, end_lng, departure_date, departure_time, pricing_type, price_per_seat, total_seats, available_seats, car_type, has_awd, title, description, status) VALUES ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004', 'driver', 'San Jose, CA', 'Kirkwood, CA', 37.3382, -121.8863, 38.68, -120.0768, CURRENT_DATE + INTERVAL '4 days', '09:45:00', 'per_seat', 60.00, 3, 1, 'Subaru Outback', false, 'Ride to Kirkwood', 'Heading up for snowboarding! Pet friendly!', 'active');
INSERT INTO public.rides (id, poster_id, posting_type, start_location, end_location, start_lat, start_lng, end_lat, end_lng, departure_date, departure_time, pricing_type, price_per_seat, total_seats, available_seats, car_type, has_awd, title, description, status) VALUES ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000005', 'driver', 'Sacramento, CA', 'Olympic Valley (Palisades Tahoe), CA', 38.5816, -121.4944, 39.1979, -120.2464, CURRENT_DATE + INTERVAL '5 days', '10:00:00', 'per_seat', 70.00, 4, 1, 'Nissan Pathfinder', true, 'Ride to Olympic Valley (Palisades Tahoe)', 'Heading up for skiing! Pet friendly!', 'active');
INSERT INTO public.rides (id, poster_id, posting_type, start_location, end_location, start_lat, start_lng, end_lat, end_lng, departure_date, departure_time, title, description, status) VALUES ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000006', 'passenger', 'Palo Alto, CA', 'Truckee, CA', 37.4419, -122.143, 39.3276, -120.1834, CURRENT_DATE + INTERVAL '6 days', '11:15:00', 'Looking for ride to Truckee', 'Can help with gas and great company! Flexible times.', 'active');
INSERT INTO public.rides (id, poster_id, posting_type, start_location, end_location, start_lat, start_lng, end_lat, end_lng, departure_date, departure_time, pricing_type, price_per_seat, total_seats, available_seats, car_type, has_awd, title, description, status) VALUES ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000007', 'driver', 'Davis, CA', 'Tahoe City, CA', 38.5449, -121.7405, 39.1652, -120.1468, CURRENT_DATE + INTERVAL '7 days', '12:30:00', 'per_seat', 90.00, 3, 1, 'Mazda CX-5', true, 'Ride to Tahoe City', 'Heading up for skiing! Great music!', 'active');
INSERT INTO public.rides (id, poster_id, posting_type, start_location, end_location, start_lat, start_lng, end_lat, end_lng, departure_date, departure_time, pricing_type, price_per_seat, total_seats, available_seats, car_type, has_awd, title, description, status) VALUES ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000008', 'driver', 'Reno, NV', 'Soda Springs, CA', 39.5296, -119.8138, 39.3087, -120.3541, CURRENT_DATE + INTERVAL '8 days', '13:45:00', 'per_seat', 100.00, 4, 4, 'Nissan Pathfinder', false, 'Ride to Soda Springs', 'Heading up for snowboarding! Great music!', 'active');
INSERT INTO public.rides (id, poster_id, posting_type, start_location, end_location, start_lat, start_lng, end_lat, end_lng, departure_date, departure_time, title, description, status) VALUES ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000009', 'passenger', 'Fremont, CA', 'South Lake Tahoe, CA', 37.5483, -121.9886, 38.9399, -119.9772, CURRENT_DATE + INTERVAL '9 days', '14:00:00', 'Looking for ride to South Lake Tahoe', 'Can help with gas and great company! Have gear.', 'active');
INSERT INTO public.rides (id, poster_id, posting_type, start_location, end_location, start_lat, start_lng, end_lat, end_lng, departure_date, departure_time, pricing_type, price_per_seat, total_seats, available_seats, car_type, has_awd, title, description, status) VALUES ('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000010', 'driver', 'San Mateo, CA', 'Heavenly, CA', 37.563, -122.3255, 38.9353, -119.94, CURRENT_DATE + INTERVAL '10 days', '15:15:00', 'per_seat', 120.00, 3, 1, 'Nissan Pathfinder', false, 'Ride to Heavenly', 'Heading up for snowboarding! Early departure!', 'active');
INSERT INTO public.rides (id, poster_id, posting_type, start_location, end_location, start_lat, start_lng, end_lat, end_lng, departure_date, departure_time, pricing_type, price_per_seat, total_seats, available_seats, car_type, has_awd, title, description, status) VALUES ('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000011', 'driver', 'Berkeley, CA', 'Northstar, CA', 37.8715, -122.273, 39.2746, -120.1211, CURRENT_DATE + INTERVAL '11 days', '16:30:00', 'per_seat', 30.00, 4, 3, 'Honda CR-V', true, 'Ride to Northstar', 'Heading up for skiing! Great music!', 'active');
INSERT INTO public.rides (id, poster_id, posting_type, start_location, end_location, start_lat, start_lng, end_lat, end_lng, departure_date, departure_time, title, description, status) VALUES ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000012', 'passenger', 'San Francisco, CA', 'Kirkwood, CA', 37.7749, -122.4194, 38.68, -120.0768, CURRENT_DATE + INTERVAL '12 days', '17:45:00', 'Looking for ride to Kirkwood', 'Can help with gas and great company! Light luggage.', 'active');
INSERT INTO public.rides (id, poster_id, posting_type, start_location, end_location, start_lat, start_lng, end_lat, end_lng, departure_date, departure_time, pricing_type, price_per_seat, total_seats, available_seats, car_type, has_awd, title, description, status) VALUES ('10000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000013', 'driver', 'Oakland, CA', 'Olympic Valley (Palisades Tahoe), CA', 37.8044, -122.2712, 39.1979, -120.2464, CURRENT_DATE + INTERVAL '13 days', '06:00:00', 'per_seat', 50.00, 3, 1, 'Ford Explorer', true, 'Ride to Olympic Valley (Palisades Tahoe)', 'Heading up for skiing! Coffee provided!', 'active');
INSERT INTO public.rides (id, poster_id, posting_type, start_location, end_location, start_lat, start_lng, end_lat, end_lng, departure_date, departure_time, pricing_type, price_per_seat, total_seats, available_seats, car_type, has_awd, title, description, status) VALUES ('10000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000014', 'driver', 'San Jose, CA', 'Truckee, CA', 37.3382, -121.8863, 39.3276, -120.1834, CURRENT_DATE + INTERVAL '14 days', '07:15:00', 'per_seat', 60.00, 4, 2, 'Toyota 4Runner', false, 'Ride to Truckee', 'Heading up for snowboarding! Great music!', 'active');
INSERT INTO public.rides (id, poster_id, posting_type, start_location, end_location, start_lat, start_lng, end_lat, end_lng, departure_date, departure_time, title, description, status) VALUES ('10000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000015', 'passenger', 'Sacramento, CA', 'Tahoe City, CA', 38.5816, -121.4944, 39.1652, -120.1468, CURRENT_DATE + INTERVAL '15 days', '08:30:00', 'Looking for ride to Tahoe City', 'Can help with gas and great company! Flexible times.', 'active');
INSERT INTO public.rides (id, poster_id, posting_type, start_location, end_location, start_lat, start_lng, end_lat, end_lng, departure_date, departure_time, pricing_type, price_per_seat, total_seats, available_seats, car_type, has_awd, title, description, status) VALUES ('10000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000016', 'driver', 'Palo Alto, CA', 'Soda Springs, CA', 37.4419, -122.143, 39.3087, -120.3541, CURRENT_DATE + INTERVAL '1 days', '09:45:00', 'per_seat', 80.00, 3, 1, 'Ford Explorer', false, 'Ride to Soda Springs', 'Heading up for snowboarding! Great music!', 'active');
INSERT INTO public.rides (id, poster_id, posting_type, start_location, end_location, start_lat, start_lng, end_lat, end_lng, departure_date, departure_time, pricing_type, price_per_seat, total_seats, available_seats, car_type, has_awd, title, description, status) VALUES ('10000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000017', 'driver', 'Davis, CA', 'South Lake Tahoe, CA', 38.5449, -121.7405, 38.9399, -119.9772, CURRENT_DATE + INTERVAL '2 days', '10:00:00', 'per_seat', 90.00, 4, 1, 'Toyota 4Runner', true, 'Ride to South Lake Tahoe', 'Heading up for skiing! Pet friendly!', 'active');
INSERT INTO public.rides (id, poster_id, posting_type, start_location, end_location, start_lat, start_lng, end_lat, end_lng, departure_date, departure_time, title, description, status) VALUES ('10000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000018', 'passenger', 'Reno, NV', 'Heavenly, CA', 39.5296, -119.8138, 38.9353, -119.94, CURRENT_DATE + INTERVAL '3 days', '11:15:00', 'Looking for ride to Heavenly', 'Can help with gas and great company! Can meet anywhere.', 'active');
INSERT INTO public.rides (id, poster_id, posting_type, start_location, end_location, start_lat, start_lng, end_lat, end_lng, departure_date, departure_time, pricing_type, price_per_seat, total_seats, available_seats, car_type, has_awd, title, description, status) VALUES ('10000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000019', 'driver', 'Fremont, CA', 'Northstar, CA', 37.5483, -121.9886, 39.2746, -120.1211, CURRENT_DATE + INTERVAL '4 days', '12:30:00', 'per_seat', 110.00, 3, 1, 'Mazda CX-5', true, 'Ride to Northstar', 'Heading up for skiing! Pet friendly!', 'active');
INSERT INTO public.rides (id, poster_id, posting_type, start_location, end_location, start_lat, start_lng, end_lat, end_lng, departure_date, departure_time, pricing_type, price_per_seat, total_seats, available_seats, car_type, has_awd, title, description, status) VALUES ('10000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000020', 'driver', 'San Mateo, CA', 'Kirkwood, CA', 37.563, -122.3255, 38.68, -120.0768, CURRENT_DATE + INTERVAL '5 days', '13:45:00', 'per_seat', 120.00, 4, 4, 'Mazda CX-5', false, 'Ride to Kirkwood', 'Heading up for snowboarding! Early departure!', 'active');
INSERT INTO public.rides (id, poster_id, posting_type, start_location, end_location, start_lat, start_lng, end_lat, end_lng, departure_date, departure_time, pricing_type, price_per_seat, total_seats, available_seats, car_type, has_awd, title, description, status) VALUES ('10000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'driver', 'Berkeley, CA', 'Olympic Valley (Palisades Tahoe), CA', 37.8715, -122.273, 39.1979, -120.2464, CURRENT_DATE + INTERVAL '6 days', '14:00:00', 'per_seat', 30.00, 5, 1, 'Honda CR-V', true, 'Ride to Olympic Valley (Palisades Tahoe)', 'Heading up for skiing! Great music!', 'active');
INSERT INTO public.rides (id, poster_id, posting_type, start_location, end_location, start_lat, start_lng, end_lat, end_lng, departure_date, departure_time, pricing_type, price_per_seat, total_seats, available_seats, car_type, has_awd, title, description, status) VALUES ('10000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000002', 'driver', 'San Francisco, CA', 'Truckee, CA', 37.7749, -122.4194, 39.3276, -120.1834, CURRENT_DATE + INTERVAL '7 days', '15:15:00', 'per_seat', 40.00, 3, 1, 'Nissan Pathfinder', false, 'Ride to Truckee', 'Heading up for snowboarding! Great music!', 'active');
INSERT INTO public.rides (id, poster_id, posting_type, start_location, end_location, start_lat, start_lng, end_lat, end_lng, departure_date, departure_time, title, description, status) VALUES ('10000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000003', 'passenger', 'Oakland, CA', 'Tahoe City, CA', 37.8044, -122.2712, 39.1652, -120.1468, CURRENT_DATE + INTERVAL '8 days', '16:30:00', 'Looking for ride to Tahoe City', 'Can help with gas and great company! Light luggage.', 'active');
INSERT INTO public.rides (id, poster_id, posting_type, start_location, end_location, start_lat, start_lng, end_lat, end_lng, departure_date, departure_time, pricing_type, price_per_seat, total_seats, available_seats, car_type, has_awd, title, description, status) VALUES ('10000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000004', 'driver', 'San Jose, CA', 'Soda Springs, CA', 37.3382, -121.8863, 39.3087, -120.3541, CURRENT_DATE + INTERVAL '9 days', '17:45:00', 'per_seat', 60.00, 5, 4, 'Nissan Pathfinder', false, 'Ride to Soda Springs', 'Heading up for snowboarding! Early departure!', 'active');
INSERT INTO public.rides (id, poster_id, posting_type, start_location, end_location, start_lat, start_lng, end_lat, end_lng, departure_date, departure_time, pricing_type, price_per_seat, total_seats, available_seats, car_type, has_awd, title, description, status) VALUES ('10000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000005', 'driver', 'Sacramento, CA', 'South Lake Tahoe, CA', 38.5816, -121.4944, 38.9399, -119.9772, CURRENT_DATE + INTERVAL '10 days', '06:00:00', 'per_seat', 70.00, 3, 1, 'Nissan Pathfinder', true, 'Ride to South Lake Tahoe', 'Heading up for skiing! Great music!', 'active');
INSERT INTO public.rides (id, poster_id, posting_type, start_location, end_location, start_lat, start_lng, end_lat, end_lng, departure_date, departure_time, title, description, status) VALUES ('10000000-0000-0000-0000-000000000025', '00000000-0000-0000-0000-000000000006', 'passenger', 'Palo Alto, CA', 'Heavenly, CA', 37.4419, -122.143, 38.9353, -119.94, CURRENT_DATE + INTERVAL '11 days', '07:15:00', 'Looking for ride to Heavenly', 'Can help with gas and great company! Light luggage.', 'active');
INSERT INTO public.rides (id, poster_id, posting_type, start_location, end_location, start_lat, start_lng, end_lat, end_lng, departure_date, departure_time, pricing_type, price_per_seat, total_seats, available_seats, car_type, has_awd, title, description, status) VALUES ('10000000-0000-0000-0000-000000000026', '00000000-0000-0000-0000-000000000007', 'driver', 'Davis, CA', 'Northstar, CA', 38.5449, -121.7405, 39.2746, -120.1211, CURRENT_DATE + INTERVAL '12 days', '08:30:00', 'per_seat', 90.00, 5, 2, 'Ford Explorer', true, 'Ride to Northstar', 'Heading up for skiing! Coffee provided!', 'active');
INSERT INTO public.rides (id, poster_id, posting_type, start_location, end_location, start_lat, start_lng, end_lat, end_lng, departure_date, departure_time, pricing_type, price_per_seat, total_seats, available_seats, car_type, has_awd, title, description, status) VALUES ('10000000-0000-0000-0000-000000000027', '00000000-0000-0000-0000-000000000008', 'driver', 'Reno, NV', 'Kirkwood, CA', 39.5296, -119.8138, 38.68, -120.0768, CURRENT_DATE + INTERVAL '13 days', '09:45:00', 'per_seat', 100.00, 3, 1, 'Tesla Model Y', false, 'Ride to Kirkwood', 'Heading up for snowboarding! Coffee provided!', 'active');
INSERT INTO public.rides (id, poster_id, posting_type, start_location, end_location, start_lat, start_lng, end_lat, end_lng, departure_date, departure_time, title, description, status) VALUES ('10000000-0000-0000-0000-000000000028', '00000000-0000-0000-0000-000000000009', 'passenger', 'Fremont, CA', 'Olympic Valley (Palisades Tahoe), CA', 37.5483, -121.9886, 39.1979, -120.2464, CURRENT_DATE + INTERVAL '14 days', '10:00:00', 'Looking for ride to Olympic Valley (Palisades Tahoe)', 'Can help with gas and great company! Can meet anywhere.', 'active');
INSERT INTO public.rides (id, poster_id, posting_type, start_location, end_location, start_lat, start_lng, end_lat, end_lng, departure_date, departure_time, pricing_type, price_per_seat, total_seats, available_seats, car_type, has_awd, title, description, status) VALUES ('10000000-0000-0000-0000-000000000029', '00000000-0000-0000-0000-000000000010', 'driver', 'San Mateo, CA', 'Truckee, CA', 37.563, -122.3255, 39.3276, -120.1834, CURRENT_DATE + INTERVAL '15 days', '11:15:00', 'per_seat', 120.00, 5, 5, 'Tesla Model Y', false, 'Ride to Truckee', 'Heading up for snowboarding! Flexible pickup!', 'active');
INSERT INTO public.rides (id, poster_id, posting_type, start_location, end_location, start_lat, start_lng, end_lat, end_lng, departure_date, departure_time, pricing_type, price_per_seat, total_seats, available_seats, car_type, has_awd, title, description, status) VALUES ('10000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000011', 'driver', 'Berkeley, CA', 'Tahoe City, CA', 37.8715, -122.273, 39.1652, -120.1468, CURRENT_DATE + INTERVAL '1 days', '12:30:00', 'per_seat', 30.00, 3, 1, 'Mazda CX-5', true, 'Ride to Tahoe City', 'Heading up for skiing! Early departure!', 'active');
INSERT INTO public.rides (id, poster_id, posting_type, start_location, end_location, start_lat, start_lng, end_lat, end_lng, departure_date, departure_time, title, description, status) VALUES ('10000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000012', 'passenger', 'San Francisco, CA', 'Soda Springs, CA', 37.7749, -122.4194, 39.3087, -120.3541, CURRENT_DATE + INTERVAL '2 days', '13:45:00', 'Looking for ride to Soda Springs', 'Can help with gas and great company! Flexible times.', 'active');
INSERT INTO public.rides (id, poster_id, posting_type, start_location, end_location, start_lat, start_lng, end_lat, end_lng, departure_date, departure_time, pricing_type, price_per_seat, total_seats, available_seats, car_type, has_awd, title, description, status) VALUES ('10000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000013', 'driver', 'Oakland, CA', 'South Lake Tahoe, CA', 37.8044, -122.2712, 38.9399, -119.9772, CURRENT_DATE + INTERVAL '3 days', '14:00:00', 'per_seat', 50.00, 5, 3, 'Mazda CX-5', true, 'Ride to South Lake Tahoe', 'Heading up for skiing! Pet friendly!', 'active');
INSERT INTO public.rides (id, poster_id, posting_type, start_location, end_location, start_lat, start_lng, end_lat, end_lng, departure_date, departure_time, pricing_type, price_per_seat, total_seats, available_seats, car_type, has_awd, title, description, status) VALUES ('10000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-000000000014', 'driver', 'San Jose, CA', 'Heavenly, CA', 37.3382, -121.8863, 38.9353, -119.94, CURRENT_DATE + INTERVAL '4 days', '15:15:00', 'per_seat', 60.00, 3, 1, 'Nissan Pathfinder', false, 'Ride to Heavenly', 'Heading up for snowboarding! Flexible pickup!', 'active');
INSERT INTO public.rides (id, poster_id, posting_type, start_location, end_location, start_lat, start_lng, end_lat, end_lng, departure_date, departure_time, title, description, status) VALUES ('10000000-0000-0000-0000-000000000034', '00000000-0000-0000-0000-000000000015', 'passenger', 'Sacramento, CA', 'Northstar, CA', 38.5816, -121.4944, 39.2746, -120.1211, CURRENT_DATE + INTERVAL '5 days', '16:30:00', 'Looking for ride to Northstar', 'Can help with gas and great company! Flexible times.', 'active');
INSERT INTO public.rides (id, poster_id, posting_type, start_location, end_location, start_lat, start_lng, end_lat, end_lng, departure_date, departure_time, pricing_type, price_per_seat, total_seats, available_seats, car_type, has_awd, title, description, status) VALUES ('10000000-0000-0000-0000-000000000035', '00000000-0000-0000-0000-000000000016', 'driver', 'Palo Alto, CA', 'Kirkwood, CA', 37.4419, -122.143, 38.68, -120.0768, CURRENT_DATE + INTERVAL '6 days', '17:45:00', 'per_seat', 80.00, 5, 1, 'Jeep Grand Cherokee', false, 'Ride to Kirkwood', 'Heading up for snowboarding! Great music!', 'active');
INSERT INTO public.rides (id, poster_id, posting_type, start_location, end_location, start_lat, start_lng, end_lat, end_lng, departure_date, departure_time, pricing_type, price_per_seat, total_seats, available_seats, car_type, has_awd, title, description, status) VALUES ('10000000-0000-0000-0000-000000000036', '00000000-0000-0000-0000-000000000017', 'driver', 'Davis, CA', 'Olympic Valley (Palisades Tahoe), CA', 38.5449, -121.7405, 39.1979, -120.2464, CURRENT_DATE + INTERVAL '7 days', '06:00:00', 'per_seat', 90.00, 3, 1, 'Nissan Pathfinder', true, 'Ride to Olympic Valley (Palisades Tahoe)', 'Heading up for skiing! Great music!', 'active');
INSERT INTO public.rides (id, poster_id, posting_type, start_location, end_location, start_lat, start_lng, end_lat, end_lng, departure_date, departure_time, title, description, status) VALUES ('10000000-0000-0000-0000-000000000037', '00000000-0000-0000-0000-000000000018', 'passenger', 'Reno, NV', 'Truckee, CA', 39.5296, -119.8138, 39.3276, -120.1834, CURRENT_DATE + INTERVAL '8 days', '07:15:00', 'Looking for ride to Truckee', 'Can help with gas and great company! Have gear.', 'active');
INSERT INTO public.rides (id, poster_id, posting_type, start_location, end_location, start_lat, start_lng, end_lat, end_lng, departure_date, departure_time, pricing_type, price_per_seat, total_seats, available_seats, car_type, has_awd, title, description, status) VALUES ('10000000-0000-0000-0000-000000000038', '00000000-0000-0000-0000-000000000019', 'driver', 'Fremont, CA', 'Tahoe City, CA', 37.5483, -121.9886, 39.1652, -120.1468, CURRENT_DATE + INTERVAL '9 days', '08:30:00', 'per_seat', 110.00, 5, 4, 'Tesla Model Y', true, 'Ride to Tahoe City', 'Heading up for skiing! Pet friendly!', 'active');
INSERT INTO public.rides (id, poster_id, posting_type, start_location, end_location, start_lat, start_lng, end_lat, end_lng, departure_date, departure_time, pricing_type, price_per_seat, total_seats, available_seats, car_type, has_awd, title, description, status) VALUES ('10000000-0000-0000-0000-000000000039', '00000000-0000-0000-0000-000000000020', 'driver', 'San Mateo, CA', 'Soda Springs, CA', 37.563, -122.3255, 39.3087, -120.3541, CURRENT_DATE + INTERVAL '10 days', '09:45:00', 'per_seat', 120.00, 3, 1, 'Nissan Pathfinder', false, 'Ride to Soda Springs', 'Heading up for snowboarding! Coffee provided!', 'active');
INSERT INTO public.rides (id, poster_id, posting_type, start_location, end_location, start_lat, start_lng, end_lat, end_lng, departure_date, departure_time, pricing_type, price_per_seat, total_seats, available_seats, car_type, has_awd, title, description, status) VALUES ('10000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000001', 'driver', 'Berkeley, CA', 'South Lake Tahoe, CA', 37.8715, -122.273, 38.9399, -119.9772, CURRENT_DATE + INTERVAL '11 days', '10:00:00', 'per_seat', 30.00, 4, 1, 'Nissan Pathfinder', true, 'Ride to South Lake Tahoe', 'Heading up for skiing! Flexible pickup!', 'active');

-- Enhance a few rides with extra metadata so the UI shows the new fields
UPDATE public.rides
SET
    driving_arrangement = 'Meet at Salesforce Transit Center west entrance',
    music_preference = 'Indie folk & acoustic vibes only',
    conversation_preference = 'Friendly chat, headphones ok after 9 PM',
    special_instructions = 'Bring reusable water and warm layers.'
WHERE id = '10000000-0000-0000-0000-000000000001';

UPDATE public.rides
SET
    driving_arrangement = 'Circle the Civic Center BART pickup zone',
    music_preference = 'Alternative rock, no heavy bass',
    conversation_preference = 'Chatty in the city, quiet near Tahoe',
    special_instructions = 'Pack light; we have limited trunk space.'
WHERE id = '10000000-0000-0000-0000-000000000006';

-- Round Trip Example (Departure)
INSERT INTO public.rides (
    id, poster_id, posting_type, 
    start_location, end_location, 
    start_lat, start_lng, end_lat, end_lng, 
    departure_date, departure_time, 
    return_date, return_time,
    is_round_trip, trip_direction, round_trip_group_id,
    pricing_type, price_per_seat, total_seats, available_seats, 
    car_type, has_awd, title, description, status
) VALUES (
    '10000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000001', 'driver',
    'San Francisco, CA', 'Heavenly, CA',
    37.7749, -122.4194, 38.9353, -119.94,
    CURRENT_DATE + INTERVAL '20 days', '08:00:00',
    CURRENT_DATE + INTERVAL '22 days', '16:00:00',
    true, 'departure', '30000000-0000-0000-0000-000000000001',
    'per_seat', 45.00, 4, 3,
    'Tesla Model Y', false, 'Weekend Trip to Heavenly', 'Leaving Friday morning, returning Sunday afternoon.', 'active'
);

-- Round Trip Example (Return)
INSERT INTO public.rides (
    id, poster_id, posting_type, 
    start_location, end_location, 
    start_lat, start_lng, end_lat, end_lng, 
    departure_date, departure_time, 
    return_date, return_time,
    is_round_trip, trip_direction, round_trip_group_id,
    pricing_type, price_per_seat, total_seats, available_seats, 
    car_type, has_awd, title, description, status
) VALUES (
    '10000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'driver',
    'Heavenly, CA', 'San Francisco, CA',
    38.9353, -119.94, 37.7749, -122.4194,
    CURRENT_DATE + INTERVAL '22 days', '16:00:00',
    CURRENT_DATE + INTERVAL '20 days', '08:00:00',
    true, 'return', '30000000-0000-0000-0000-000000000001',
    'per_seat', 45.00, 4, 3,
    'Tesla Model Y', false, 'Return: Weekend Trip to Heavenly', 'Heading back to SF.', 'active'
);

UPDATE public.rides
SET
    driving_arrangement = 'Meet at Embarcadero BART platform 1',
    music_preference = 'Chill electronic with light vocals',
    conversation_preference = 'Friendly vibes, happy to chat',
    special_instructions = 'Pack your own snacks; space is tight in the trunk.'
WHERE id = '10000000-0000-0000-0000-000000000100';

UPDATE public.rides
SET
    driving_arrangement = 'Heavenly parking lot C (carpool row)',
    music_preference = 'Acoustic & lo-fi mixes',
    conversation_preference = 'Quiet ride back (feel free to nap)',
    special_instructions = 'Bring a jacket for the late-afternoon chill.'
WHERE id = '10000000-0000-0000-0000-000000000101';


-- Socials Seed Data
INSERT INTO public.profile_socials (user_id, instagram_url) VALUES ('00000000-0000-0000-0000-000000000002', 'https://instagram.com/@tahoe_rider');
INSERT INTO public.profile_socials (user_id, facebook_url) VALUES ('00000000-0000-0000-0000-000000000003', 'https://facebook.com/david.lee');
INSERT INTO public.profile_socials (user_id, instagram_url) VALUES ('00000000-0000-0000-0000-000000000004', 'https://instagram.com/@weekend_warrior');
INSERT INTO public.profile_socials (user_id, facebook_url, instagram_url) VALUES ('00000000-0000-0000-0000-000000000006', 'https://facebook.com/ryan.kim', 'https://instagram.com/@powder_hunter');
INSERT INTO public.profile_socials (user_id, instagram_url) VALUES ('00000000-0000-0000-0000-000000000008', 'https://instagram.com/@snow_chaser');
INSERT INTO public.profile_socials (user_id, facebook_url) VALUES ('00000000-0000-0000-0000-000000000009', 'https://facebook.com/chloe.miller');
INSERT INTO public.profile_socials (user_id, instagram_url) VALUES ('00000000-0000-0000-0000-000000000010', 'https://instagram.com/@mountain_traveler');
INSERT INTO public.profile_socials (user_id, facebook_url, instagram_url) VALUES ('00000000-0000-0000-0000-000000000012', 'https://facebook.com/diego.perez', 'https://instagram.com/@tahoe_rider');
INSERT INTO public.profile_socials (user_id, instagram_url) VALUES ('00000000-0000-0000-0000-000000000014', 'https://instagram.com/@ski_buddy');
INSERT INTO public.profile_socials (user_id, facebook_url) VALUES ('00000000-0000-0000-0000-000000000015', 'https://facebook.com/olivia.brown');
INSERT INTO public.profile_socials (user_id, instagram_url) VALUES ('00000000-0000-0000-0000-000000000016', 'https://instagram.com/@weekend_warrior');
INSERT INTO public.profile_socials (user_id, facebook_url, instagram_url) VALUES ('00000000-0000-0000-0000-000000000018', 'https://facebook.com/liam.moore', 'https://instagram.com/@bay_to_tahoe');
INSERT INTO public.profile_socials (user_id, instagram_url) VALUES ('00000000-0000-0000-0000-000000000020', 'https://instagram.com/@snow_chaser');
