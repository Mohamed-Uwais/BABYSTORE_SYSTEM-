-- Expense tracking tables

CREATE TABLE IF NOT EXISTS expense_categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS expenses (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id INT UNSIGNED NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  expense_date DATE NOT NULL,
  description VARCHAR(255),
  payment_method ENUM('cash','card','bank_transfer','other') DEFAULT 'cash',
  receipt_url VARCHAR(500),
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  recurring_day TINYINT UNSIGNED NULL,
  created_by INT UNSIGNED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES expense_categories(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_expense_date (expense_date)
);

-- Seed default categories
INSERT INTO expense_categories (name, is_recurring) VALUES
  ('Rent', TRUE),
  ('Electricity', TRUE),
  ('Water', TRUE),
  ('Internet/Phone', TRUE),
  ('Transport/Fuel', FALSE),
  ('Packaging Materials', FALSE),
  ('Courier Charges', FALSE),
  ('Staff Salary', TRUE),
  ('Marketing/Ads', FALSE),
  ('Bank Charges', TRUE),
  ('Maintenance', FALSE),
  ('Miscellaneous', FALSE);
