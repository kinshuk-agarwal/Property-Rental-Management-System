-- Property Rental Management System Database Schema
-- PostgreSQL Version

-- Users table (base table for all users)
CREATE TABLE users (
    aadhar VARCHAR(12) PRIMARY KEY,
    name VARCHAR(15) NOT NULL,
    age VARCHAR(12) NOT NULL,
    password VARCHAR(255) NOT NULL, -- Increased for hashed passwords
    door_no VARCHAR(12) NOT NULL,
    street VARCHAR(50) NOT NULL,
    state VARCHAR(15) NOT NULL,
    pincode VARCHAR(12) NOT NULL,
    username VARCHAR(20) UNIQUE NOT NULL
);

-- Phone numbers table
CREATE TABLE phone (
    aadhar_no VARCHAR(12) NOT NULL,
    phone_no VARCHAR(12) NOT NULL,
    PRIMARY KEY (aadhar_no, phone_no),
    FOREIGN KEY (aadhar_no) REFERENCES users(aadhar) ON DELETE CASCADE
);

-- Role-specific tables
CREATE TABLE owner (
    owner_id VARCHAR(12) PRIMARY KEY,
    FOREIGN KEY (owner_id) REFERENCES users(aadhar) ON DELETE CASCADE
);

CREATE TABLE tenant (
    tenant_id VARCHAR(12) PRIMARY KEY,
    FOREIGN KEY (tenant_id) REFERENCES users(aadhar) ON DELETE CASCADE
);

CREATE TABLE manager (
    manager_id VARCHAR(12) PRIMARY KEY,
    FOREIGN KEY (manager_id) REFERENCES users(aadhar) ON DELETE CASCADE
);

-- Properties table
CREATE TABLE property (
    property_id VARCHAR(12) PRIMARY KEY,
    owner_id VARCHAR(12) NOT NULL,
    available_from_date DATE NOT NULL,
    available_till_date DATE NOT NULL,
    area DECIMAL(10,2) NOT NULL,
    plinth_area DECIMAL(10,2) NOT NULL,
    rent DECIMAL(10,2) NOT NULL,
    hike DECIMAL(5,2) NOT NULL,
    floor_no VARCHAR(12) NOT NULL,
    locality VARCHAR(20) NOT NULL,
    address VARCHAR(100) NOT NULL,
    year_of_construction VARCHAR(12) NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES owner(owner_id) ON DELETE CASCADE
);

-- Property facilities
CREATE TABLE other_facilities (
    property_id VARCHAR(12) NOT NULL,
    facilities VARCHAR(40) NOT NULL,
    PRIMARY KEY (property_id, facilities),
    FOREIGN KEY (property_id) REFERENCES property(property_id) ON DELETE CASCADE
);

-- Residential property details
CREATE TABLE residential_property (
    property_id VARCHAR(12) PRIMARY KEY,
    type VARCHAR(20) NOT NULL,
    number_of_beds VARCHAR(12) NOT NULL,
    FOREIGN KEY (property_id) REFERENCES property(property_id) ON DELETE CASCADE
);

-- Commercial property details
CREATE TABLE commercial_property (
    property_id VARCHAR(12) PRIMARY KEY,
    type VARCHAR(20) NOT NULL,
    FOREIGN KEY (property_id) REFERENCES property(property_id) ON DELETE CASCADE
);

-- Ownership tracking table
CREATE TABLE ownership_table (
    owner_id VARCHAR(12) NOT NULL,
    property_id VARCHAR(12) NOT NULL,
    registered CHAR(1) DEFAULT 'N' CHECK (registered IN ('Y', 'N')),
    PRIMARY KEY (owner_id, property_id),
    FOREIGN KEY (property_id) REFERENCES property(property_id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES owner(owner_id) ON DELETE CASCADE
);

-- Rental agreements table
CREATE TABLE rental (
    tenant_id VARCHAR(12) NOT NULL,
    property_id VARCHAR(12) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    rent_hike DECIMAL(5,2),
    monthly_rent DECIMAL(10,2) NOT NULL,
    commission DECIMAL(10,2),
    PRIMARY KEY (tenant_id, property_id, start_date),
    FOREIGN KEY (property_id) REFERENCES property(property_id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id) ON DELETE CASCADE
);

-- Rental requests table
CREATE TABLE rental_requests (
    request_id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(12) NOT NULL,
    property_id VARCHAR(12) NOT NULL,
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by VARCHAR(12),
    reviewed_at TIMESTAMP,
    rejection_reason TEXT,
    FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES property(property_id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES manager(manager_id) ON DELETE SET NULL
);

-- Notifications table for in-app notifications
CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id VARCHAR(12) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(aadhar) ON DELETE CASCADE
);

-- Audit logs table for activity tracking
CREATE TABLE audit_logs (
    log_id SERIAL PRIMARY KEY,
    user_id VARCHAR(12),
    route TEXT NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(aadhar) ON DELETE SET NULL
);

-- Indexes for better performance
CREATE INDEX idx_property_locality ON property(locality);
CREATE INDEX idx_property_owner ON property(owner_id);
CREATE INDEX idx_rental_property ON rental(property_id);
CREATE INDEX idx_rental_tenant ON rental(tenant_id);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_rental_requests_status ON rental_requests(status);
CREATE INDEX idx_rental_requests_tenant ON rental_requests(tenant_id);
CREATE INDEX idx_rental_requests_property ON rental_requests(property_id);

-- Indexes for notifications and audit logs
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
