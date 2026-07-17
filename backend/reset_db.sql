SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE blog_posts;
TRUNCATE TABLE brands;
TRUNCATE TABLE categories;
TRUNCATE TABLE chatbot_conversations;
TRUNCATE TABLE chatbot_messages;
TRUNCATE TABLE couriers;
TRUNCATE TABLE customer_ledger;
TRUNCATE TABLE customers;
TRUNCATE TABLE delivery_weight_tiers;
TRUNCATE TABLE delivery_zones;
TRUNCATE TABLE order_deliveries;
TRUNCATE TABLE order_items;
TRUNCATE TABLE order_payments;
TRUNCATE TABLE order_returns;
TRUNCATE TABLE order_status_history;
TRUNCATE TABLE orders;
TRUNCATE TABLE product_tags;
TRUNCATE TABLE product_variants;
TRUNCATE TABLE products;
TRUNCATE TABLE purchase_order_items;
TRUNCATE TABLE purchase_orders;
TRUNCATE TABLE stock_batches;
TRUNCATE TABLE stock_movements;
TRUNCATE TABLE store_settings;
TRUNCATE TABLE suppliers;
TRUNCATE TABLE tags;
TRUNCATE TABLE users;

SET FOREIGN_KEY_CHECKS = 1;

-- Owner user (password: admin 123)
INSERT INTO users (username, password_hash, full_name, role)
VALUES ('owner', '$2b$10$gRyylkPS/I/2nNbYmBMV0emen/ue5HuJX0ag/SjCSISkfaA6Aftr2', 'Owner', 'owner');

-- Couriers
INSERT INTO couriers (code, name, has_api, tracking_url_template, is_active) VALUES
  ('koombiyo', 'Koombiyo Delivery', 1, NULL, 1),
  ('fardar', 'Fardar Express', 0, 'https://trackmate.lk/fardar/{tracking_number}', 1);

-- Default store settings
INSERT INTO store_settings (id, store_name, receipt_footer)
VALUES (1, 'MORE BY MO', 'Thank you for shopping with us!');
