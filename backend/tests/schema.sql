-- TEST-ONLY schema, reconstructed from the queries in the backend.
-- Deliberately has NO unique index on users.email, so the suite also
-- verifies sql/001_users_unique_email.sql.

DROP TABLE IF EXISTS blood_allocations;
DROP TABLE IF EXISTS stock_movements;
DROP TABLE IF EXISTS hospital_requests;
DROP TABLE IF EXISTS blood_units;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  Name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  contact VARCHAR(20) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('ADMIN','HOSPITAL') NOT NULL DEFAULT 'HOSPITAL',
  hospital_name VARCHAR(150) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE blood_units (
  unit_id INT AUTO_INCREMENT PRIMARY KEY,
  unit_code VARCHAR(50) NOT NULL,
  blood_group VARCHAR(5) NOT NULL,
  collection_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  batch_number VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE'
);

CREATE TABLE hospital_requests (
  request_id INT AUTO_INCREMENT PRIMARY KEY,
  request_code VARCHAR(50) NOT NULL,
  hospital_id INT NOT NULL,
  blood_group VARCHAR(5) NOT NULL,
  quantity INT NOT NULL,
  priority VARCHAR(20) NOT NULL,
  required_date DATE NOT NULL,
  reason VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'WAITING',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL
);

CREATE TABLE stock_movements (
  movement_id INT AUTO_INCREMENT PRIMARY KEY,
  unit_id INT NULL,
  movement_type VARCHAR(20) NOT NULL,
  reference_type VARCHAR(20),
  reference_id INT,
  quantity INT NOT NULL DEFAULT 1,
  remarks VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE blood_allocations (
  allocation_id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  unit_id INT NOT NULL,
  allocated_at DATETIME NOT NULL
);
