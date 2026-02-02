CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  neon_auth_id VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  phone_number VARCHAR(20),
  role VARCHAR(50),
  created_at TIMESTAMP
);

CREATE TABLE apartments (
  id INTEGER PRIMARY KEY,
  unit_number VARCHAR(50) NOT NULL,
  floor_number INTEGER,
  block_name VARCHAR(50),
  owner_id INTEGER,
  area_sqm DECIMAL(10,2),
  created_at TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE fee_types (
  id INTEGER PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  unit_price DECIMAL(10,2),
  measure_unit VARCHAR(50),
  is_recurring BOOLEAN
);

CREATE TABLE bills (
  id INTEGER PRIMARY KEY,
  apartment_id INTEGER,
  fee_type_id INTEGER,
  title VARCHAR(255) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  period DATE NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(50),
  created_at TIMESTAMP,
  paid_at TIMESTAMP,
  FOREIGN KEY (apartment_id) REFERENCES apartments(id),
  FOREIGN KEY (fee_type_id) REFERENCES fee_types(id)
);

CREATE TABLE transactions (
  id INTEGER PRIMARY KEY,
  bill_id INTEGER,
  user_id INTEGER,
  paid_amount DECIMAL(15,2) NOT NULL,
  payment_date TIMESTAMP,
  payment_method VARCHAR(50),
  transaction_ref VARCHAR(100),
  notes TEXT,
  FOREIGN KEY (bill_id) REFERENCES bills(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE notifications (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(50),
  is_read BOOLEAN,
  related_bill_id INTEGER,
  created_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (related_bill_id) REFERENCES bills(id)
);

CREATE TABLE visitors (
  id INTEGER PRIMARY KEY,
  resident_id INTEGER,
  guest_name VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20),
  vehicle_plate VARCHAR(20),
  expected_arrival TIMESTAMP NOT NULL,
  expected_departure TIMESTAMP,
  purpose VARCHAR(255),
  access_code VARCHAR(100) NOT NULL,
  qr_image_url TEXT,
  status VARCHAR(50),
  check_in_at TIMESTAMP,
  check_out_at TIMESTAMP,
  created_at TIMESTAMP,
  FOREIGN KEY (resident_id) REFERENCES users(id)
);

CREATE TABLE facilities (
  id INTEGER PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  location VARCHAR(100),
  capacity INTEGER,
  image_url TEXT,
  is_active BOOLEAN
);

CREATE TABLE bookings (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  facility_id INTEGER,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  status VARCHAR(50),
  purpose VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (facility_id) REFERENCES facilities(id)
);
