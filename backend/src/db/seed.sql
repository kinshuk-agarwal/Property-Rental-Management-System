-- Seed data for Property Rental Management System

-- Insert sample users
INSERT INTO users (aadhar, name, age, password, door_no, street, state, pincode, username) VALUES
('100000000001', 'John Smith', 35, '$2a$10$hashedpassword1', 123, 'Main Street', 'California', 90210, 'john_smith'),
('100000000002', 'Sarah Johnson', 28, '$2a$10$hashedpassword2', 456, 'Oak Avenue', 'Texas', 75001, 'sarah_j'),
('100000000003', 'Mike Davis', 42, '$2a$10$hashedpassword3', 789, 'Pine Road', 'Florida', 33101, 'mike_d'),
('100000000004', 'Emily Wilson', 31, '$2a$10$hashedpassword4', 321, 'Elm Street', 'New York', 10001, 'emily_w'),
('100000000005', 'Admin User', 40, '$2a$10$hashedpassword5', 999, 'Admin Blvd', 'California', 90211, 'admin');

-- Insert phone numbers
INSERT INTO phone (aadhar_no, phone_no) VALUES
('100000000001', 5551234567),
('100000000002', 5552345678),
('100000000003', 5553456789),
('100000000004', 5554567890),
('100000000005', 5555678901);

-- Assign roles
INSERT INTO owner (owner_id) VALUES ('100000000001'), ('100000000003');
INSERT INTO tenant (tenant_id) VALUES ('100000000002'), ('100000000004');
INSERT INTO manager (manager_id) VALUES ('100000000005');

-- Insert sample properties
INSERT INTO property (property_id, owner_id, available_from_date, available_till_date, area, plinth_area, rent, hike, floor_no, locality, address, year_of_construction) VALUES
('PROP001', '100000000001', '2025-01-01', '2025-12-31', 1200.50, 1100.25, 2500.00, 5.00, '2', 'Downtown', '123 Business District, CA', '2018'),
('PROP002', '100000000001', '2025-02-01', '2025-11-30', 950.75, 900.00, 1800.00, 3.50, '1', 'Midtown', '456 Residential Area, CA', '2020'),
('PROP003', '100000000003', '2025-03-01', '2026-02-28', 1500.00, 1400.00, 3200.00, 4.00, '3', 'Uptown', '789 Luxury Apartments, FL', '2019'),
('PROP004', '100000000003', '2025-01-15', '2025-12-15', 800.25, 750.50, 1500.00, 2.50, '0', 'Suburb', '321 Family Homes, FL', '2021');

-- Insert property facilities
INSERT INTO other_facilities (property_id, facilities) VALUES
('PROP001', 'Parking'),
('PROP001', 'Gym'),
('PROP001', 'Swimming Pool'),
('PROP002', 'Parking'),
('PROP002', 'Garden'),
('PROP003', 'Parking'),
('PROP003', 'Gym'),
('PROP003', 'Security'),
('PROP003', 'Elevator'),
('PROP004', 'Parking'),
('PROP004', 'Garden');

-- Insert residential property details
INSERT INTO residential_property (property_id, type, number_of_beds) VALUES
('PROP002', 'Apartment', '2'),
('PROP004', 'House', '3');

-- Insert commercial property details
INSERT INTO commercial_property (property_id, type) VALUES
('PROP001', 'Office Space'),
('PROP003', 'Retail Space');

-- Insert ownership records
INSERT INTO ownership_table (owner_id, property_id, registered) VALUES
('100000000001', 'PROP001', 'Y'),
('100000000001', 'PROP002', 'Y'),
('100000000003', 'PROP003', 'Y'),
('100000000003', 'PROP004', 'Y');

-- Insert rental agreements (some active, some ended)
INSERT INTO rental (tenant_id, property_id, start_date, end_date, rent_hike, monthly_rent, commission) VALUES
('100000000002', 'PROP002', '2024-06-01', '2024-11-30', 2.00, 1800.00, 180.00),
('100000000004', 'PROP004', '2024-08-01', NULL, NULL, 1500.00, 150.00); -- Active rental
