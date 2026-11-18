CREATE TABLE IF NOT EXISTS website_product_content (
  product_id INT UNSIGNED NOT NULL PRIMARY KEY,
  attribute_values JSON NOT NULL,
  media JSON NOT NULL,
  specifications TEXT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT website_product_content_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;
