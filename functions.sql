-- Property Rental Management System Functions
-- PostgreSQL Version

-- Function to search properties for rent by locality
CREATE OR REPLACE FUNCTION search_property_for_rent(p_locality VARCHAR)
RETURNS TABLE(
    property_id VARCHAR(12),
    owner_id VARCHAR(12),
    available_from_date DATE,
    available_till_date DATE,
    area DECIMAL,
    plinth_area DECIMAL,
    rent DECIMAL,
    hike DECIMAL,
    floor_no VARCHAR(12),
    locality VARCHAR,
    address VARCHAR,
    year_of_construction VARCHAR(12)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.property_id,
        p.owner_id,
        p.available_from_date,
        p.available_till_date,
        p.area,
        p.plinth_area,
        p.rent,
        p.hike,
        p.floor_no,
        p.locality,
        p.address,
        p.year_of_construction
    FROM property p
    WHERE p.locality = p_locality;
END;
$$ LANGUAGE plpgsql;

-- Function to get rent history for a property
CREATE OR REPLACE FUNCTION get_rent_history(p_property_id VARCHAR(12))
RETURNS TABLE(
    tenant_id VARCHAR(12),
    property_id VARCHAR(12),
    start_date DATE,
    end_date DATE,
    rent_hike DECIMAL,
    monthly_rent DECIMAL,
    commission DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.tenant_id,
        r.property_id,
        r.start_date,
        r.end_date,
        r.rent_hike,
        r.monthly_rent,
        r.commission
    FROM rental r
    WHERE r.property_id = p_property_id AND r.end_date IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to insert a new property record
CREATE OR REPLACE FUNCTION insert_property_record(
    p_owner_id VARCHAR,
    p_available_from_date DATE,
    p_available_till_date DATE,
    p_area NUMERIC,
    p_plinth_area NUMERIC,
    p_rent NUMERIC,
    p_hike NUMERIC,
    p_floor_no VARCHAR,
    p_locality VARCHAR,
    p_address VARCHAR,
    p_year_of_construction VARCHAR
)
RETURNS TEXT AS $$
DECLARE
    v_property_id TEXT;
BEGIN
    -- Generate new property ID with correct type casting for LPAD
    SELECT 'PROP' || LPAD(
        (COALESCE(MAX(CAST(SUBSTRING(property_id FROM 5) AS INTEGER)), 0) + 1)::TEXT,
        3,
        '0'
    )
    INTO v_property_id
    FROM property;

    -- Insert the new property record
    INSERT INTO property (
        property_id,
        owner_id,
        available_from_date,
        available_till_date,
        area,
        plinth_area,
        rent,
        hike,
        floor_no,
        locality,
        address,
        year_of_construction
    ) VALUES (
        v_property_id,
        p_owner_id,
        p_available_from_date,
        p_available_till_date,
        p_area,
        p_plinth_area,
        p_rent,
        p_hike,
        p_floor_no,
        p_locality,
        p_address,
        p_year_of_construction
    );

    RETURN v_property_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create a new user
CREATE OR REPLACE FUNCTION create_new_user(
    p_aadhar VARCHAR(12),
    p_name VARCHAR,
    p_age VARCHAR(12),
    p_password VARCHAR,
    p_door_no VARCHAR(12),
    p_street VARCHAR,
    p_state VARCHAR,
    p_pincode VARCHAR(12),
    p_username VARCHAR
) RETURNS VOID AS $$
BEGIN
    INSERT INTO users (aadhar, name, age, password, door_no, street, state, pincode, username)
    VALUES (p_aadhar, p_name, p_age, p_password, p_door_no, p_street, p_state, p_pincode, p_username);
END;
$$ LANGUAGE plpgsql;

-- Function to get property records by owner
CREATE OR REPLACE FUNCTION get_property_records(p_owner_id VARCHAR(12))
RETURNS TABLE(
    property_id VARCHAR(12),
    available_from_date DATE,
    available_till_date DATE,
    area DECIMAL,
    plinth_area DECIMAL,
    rent DECIMAL,
    hike DECIMAL,
    floor_no VARCHAR(12),
    locality VARCHAR,
    address VARCHAR,
    year_of_construction VARCHAR(12)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.property_id,
        p.available_from_date,
        p.available_till_date,
        p.area,
        p.plinth_area,
        p.rent,
        p.hike,
        p.floor_no,
        p.locality,
        p.address,
        p.year_of_construction
    FROM property p
    WHERE p.owner_id = p_owner_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get tenant details for a property
CREATE OR REPLACE FUNCTION get_tenant_details(p_property_id VARCHAR(12))
RETURNS TABLE(
    aadhar VARCHAR(12),
    name VARCHAR,
    age VARCHAR(12),
    door_no VARCHAR(12),
    street VARCHAR,
    state VARCHAR,
    pincode VARCHAR(12),
    username VARCHAR
) AS $$
DECLARE
    tenant_aadhar VARCHAR(12);
BEGIN
    -- Get current tenant (no end date)
    SELECT r.tenant_id INTO tenant_aadhar
    FROM rental r
    WHERE r.property_id = p_property_id AND r.end_date IS NULL
    LIMIT 1;

    IF tenant_aadhar IS NOT NULL THEN
        RETURN QUERY
        SELECT
            u.aadhar,
            u.name,
            u.age,
            u.door_no,
            u.street,
            u.state,
            u.pincode,
            u.username
        FROM users u
        WHERE u.aadhar = tenant_aadhar;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to assign user role (owner, tenant, or manager)
CREATE OR REPLACE FUNCTION assign_user_role(p_aadhar VARCHAR(12), p_role VARCHAR)
RETURNS VOID AS $$
BEGIN
    IF p_role = 'owner' THEN
        INSERT INTO owner (owner_id) VALUES (p_aadhar);
    ELSIF p_role = 'tenant' THEN
        INSERT INTO tenant (tenant_id) VALUES (p_aadhar);
    ELSIF p_role = 'manager' THEN
        INSERT INTO manager (manager_id) VALUES (p_aadhar);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to create rental agreement
CREATE OR REPLACE FUNCTION create_rental_agreement(
    p_tenant_id VARCHAR(12),
    p_property_id VARCHAR(12),
    p_start_date DATE,
    p_monthly_rent DECIMAL,
    p_commission DECIMAL DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO rental (
        tenant_id,
        property_id,
        start_date,
        monthly_rent,
        commission
    ) VALUES (
        p_tenant_id,
        p_property_id,
        p_start_date,
        p_monthly_rent,
        p_commission
    );
END;
$$ LANGUAGE plpgsql;

-- Function to end rental agreement
CREATE OR REPLACE FUNCTION end_rental_agreement(
    p_tenant_id VARCHAR(12),
    p_property_id VARCHAR(12),
    p_start_date DATE,
    p_end_date DATE
) RETURNS VOID AS $$
BEGIN
    UPDATE rental
    SET end_date = p_end_date
    WHERE tenant_id = p_tenant_id
      AND property_id = p_property_id
      AND start_date = p_start_date;
END;
$$ LANGUAGE plpgsql;
