CREATE TABLE IF NOT EXISTS website_stock_reservations (
  order_id INT UNSIGNED NOT NULL,
  variant_id INT UNSIGNED NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  state ENUM('active','consumed','released') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY(order_id,variant_id),
  KEY reservation_availability(variant_id,state),
  CONSTRAINT reservation_order FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT reservation_variant FOREIGN KEY(variant_id) REFERENCES product_variants(id)
) ENGINE=InnoDB;
