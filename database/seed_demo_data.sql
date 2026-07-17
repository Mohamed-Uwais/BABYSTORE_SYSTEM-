-- ============================================================================
-- LITTORA POS — Demo Seed Data
-- WARNING: This is DEMO DATA for development and portfolio screenshots.
-- Clear this data before going live with real customers.
-- Run: mysql -u root -p LITTORA_db < database/seed_demo_data.sql
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- Clean existing demo data (preserves schema)
TRUNCATE TABLE customer_ledger;
TRUNCATE TABLE stock_movements;
TRUNCATE TABLE order_returns;
TRUNCATE TABLE order_payments;
TRUNCATE TABLE order_items;
TRUNCATE TABLE order_deliveries;
TRUNCATE TABLE orders;
TRUNCATE TABLE purchase_order_items;
TRUNCATE TABLE purchase_orders;
TRUNCATE TABLE product_variants;
TRUNCATE TABLE products;
TRUNCATE TABLE categories;
TRUNCATE TABLE brands;
TRUNCATE TABLE customers;
TRUNCATE TABLE suppliers;
DELETE FROM users WHERE id > 0;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- USERS (2 staff members for staff-performance comparison)
-- ============================================================================
INSERT INTO users (id, username, password_hash, full_name, role) VALUES
(1, 'owner', '$2b$10$BJ0BneSSK9P86b7y.9jlqOuoOrjIFn9qfZtduziFndHkCyxgR31oS', 'Mohamed Uwais', 'owner'),
(2, 'cashier1', '$2b$10$08AGw6fC7508FCOoXIg2i.B3hTO2330FKdrL9Hns8sdkS3bONghj.', 'Amara Perera', 'cashier');

-- ============================================================================
-- CATEGORIES (8 baby-store categories)
-- ============================================================================
INSERT INTO categories (id, name, slug) VALUES
(1, 'Diapers', 'diapers'),
(2, 'Wet Wipes', 'wet-wipes'),
(3, 'Baby Clothes', 'baby-clothes'),
(4, 'Feeding', 'feeding'),
(5, 'Bath & Skincare', 'bath-skincare'),
(6, 'Toys', 'toys'),
(7, 'Accessories', 'accessories'),
(8, 'Health & Safety', 'health-safety');

-- ============================================================================
-- BRANDS (6 well-known baby brands)
-- ============================================================================
INSERT INTO brands (id, name, slug) VALUES
(1, 'Huggies', 'huggies'),
(2, 'Pampers', 'pampers'),
(3, 'MamyPoko', 'mamypoko'),
(4, 'Pigeon', 'pigeon'),
(5, 'Johnson''s', 'johnsons'),
(6, 'Cetaphil Baby', 'cetaphil-baby');

-- ============================================================================
-- PRODUCTS (18 products across categories)
-- ============================================================================
INSERT INTO products (id, category_id, brand_id, name, slug, description) VALUES
-- Diapers (cat 1)
(1, 1, 1, 'Huggies Dry Comfort Pants', 'huggies-dry-comfort-pants', 'Ultra-absorbent diaper pants for active babies'),
(2, 1, 2, 'Pampers Premium Care Pants', 'pampers-premium-care-pants', 'Premium soft diaper pants with aloe vera'),
(3, 1, 3, 'MamyPoko Extra Dry Pants', 'mamypoko-extra-dry-pants', 'Extra dry diaper pants with anti-leak guard'),
-- Wet Wipes (cat 2)
(4, 2, 1, 'Huggies Pure Baby Wipes', 'huggies-pure-baby-wipes', '99% pure water wipes for sensitive skin'),
(5, 2, 5, 'Johnson''s Baby Wipes', 'johnsons-baby-wipes', 'Extra gentle wipes with no more tears formula'),
-- Baby Clothes (cat 3)
(6, 3, NULL, 'Cotton Bodysuit Set', 'cotton-bodysuit-set', 'Soft organic cotton bodysuits, pack of 3'),
(7, 3, NULL, 'Baby Romper', 'baby-romper', 'Cute printed romper with snap buttons'),
(8, 3, NULL, 'Newborn Gift Set', 'newborn-gift-set', 'Complete newborn clothing set with hat and mittens'),
-- Feeding (cat 4)
(9, 4, 4, 'Pigeon Nursing Bottle', 'pigeon-nursing-bottle', 'Wide-neck nursing bottle with peristaltic nipple'),
(10, 4, 4, 'Pigeon Baby Food Feeder', 'pigeon-baby-food-feeder', 'Silicone food feeder for introducing solids'),
(11, 4, NULL, 'Baby Feeding Bowl Set', 'baby-feeding-bowl-set', 'BPA-free suction bowl with spoon'),
-- Bath & Skincare (cat 5)
(12, 5, 5, 'Johnson''s Baby Shampoo', 'johnsons-baby-shampoo', 'No more tears gentle baby shampoo'),
(13, 5, 6, 'Cetaphil Baby Wash & Shampoo', 'cetaphil-baby-wash-shampoo', 'Gentle tear-free wash for sensitive skin'),
(14, 5, 5, 'Johnson''s Baby Lotion', 'johnsons-baby-lotion', 'Clinically proven gentle moisturizing lotion'),
-- Toys (cat 6)
(15, 6, NULL, 'Soft Rattle Toy Set', 'soft-rattle-toy-set', 'Colorful plush rattle toys, set of 4'),
(16, 6, NULL, 'Stacking Rings', 'stacking-rings', 'Classic rainbow stacking ring toy'),
-- Accessories (cat 7)
(17, 7, 4, 'Pigeon Pacifier', 'pigeon-pacifier', 'Orthodontic pacifier for 0-6 months'),
(18, 7, NULL, 'Baby Bib Set', 'baby-bib-set', 'Waterproof silicone bibs, pack of 3');

-- ============================================================================
-- PRODUCT VARIANTS (2-3 per product = ~45 variants)
-- ============================================================================
INSERT INTO product_variants (id, product_id, sku, barcode, variant_label, cost_price, wholesale_price, retail_price, current_stock, low_stock_threshold) VALUES
-- Huggies Dry Comfort Pants
(1,  1, 'HUG-DCP-S20', '8850007032014', 'Size S / 20pk', 680, 780, 950, 45, 10),
(2,  1, 'HUG-DCP-M20', '8850007032021', 'Size M / 20pk', 720, 820, 1100, 38, 10),
(3,  1, 'HUG-DCP-L20', '8850007032038', 'Size L / 20pk', 750, 850, 1150, 22, 10),
-- Pampers Premium Care
(4,  2, 'PAM-PCP-S24', '4015400507086', 'Size S / 24pk', 780, 900, 1200, 30, 8),
(5,  2, 'PAM-PCP-M22', '4015400507093', 'Size M / 22pk', 820, 950, 1350, 25, 8),
(6,  2, 'PAM-PCP-L18', '4015400507109', 'Size L / 18pk', 850, 980, 1400, 18, 8),
-- MamyPoko Extra Dry
(7,  3, 'MPK-XD-M30', '4902430762489', 'Size M / 30pk', 700, 800, 980, 42, 10),
(8,  3, 'MPK-XD-L26', '4902430762496', 'Size L / 26pk', 730, 830, 1050, 35, 10),
(9,  3, 'MPK-XD-XL22', '4902430762502', 'Size XL / 22pk', 760, 870, 1100, 28, 10),
-- Huggies Pure Wipes
(10, 4, 'HUG-PW-56', '5029053550190', '56 sheets', 220, 270, 380, 60, 15),
(11, 4, 'HUG-PW-112', '5029053550206', '112 sheets (2pk)', 400, 480, 650, 40, 10),
-- Johnson's Baby Wipes
(12, 5, 'JNJ-BW-72', '3574661356280', '72 sheets', 280, 340, 450, 55, 15),
(13, 5, 'JNJ-BW-144', '3574661356297', '144 sheets (2pk)', 500, 600, 780, 35, 10),
-- Cotton Bodysuit Set
(14, 6, 'CBS-NB', NULL, 'Newborn (0-3M)', 650, 750, 1200, 20, 5),
(15, 6, 'CBS-3M', NULL, '3-6 Months', 680, 780, 1250, 18, 5),
(16, 6, 'CBS-6M', NULL, '6-12 Months', 700, 800, 1300, 15, 5),
-- Baby Romper
(17, 7, 'BRM-3M-BL', NULL, '3-6M / Blue', 380, 450, 750, 12, 5),
(18, 7, 'BRM-3M-PK', NULL, '3-6M / Pink', 380, 450, 750, 14, 5),
(19, 7, 'BRM-6M-YL', NULL, '6-12M / Yellow', 400, 470, 800, 10, 5),
-- Newborn Gift Set
(20, 8, 'NGS-STD', NULL, 'Standard Set', 1200, 1400, 1950, 8, 3),
(21, 8, 'NGS-DLX', NULL, 'Deluxe Set', 1800, 2100, 2800, 6, 3),
-- Pigeon Nursing Bottle
(22, 9, 'PIG-NB-160', '4902508040082', '160ml', 550, 650, 890, 25, 8),
(23, 9, 'PIG-NB-240', '4902508040099', '240ml', 620, 720, 980, 20, 8),
-- Pigeon Food Feeder
(24, 10, 'PIG-FF', '4902508131278', 'Standard', 450, 530, 720, 15, 5),
-- Feeding Bowl Set
(25, 11, 'FBS-BL', NULL, 'Blue', 350, 420, 580, 18, 5),
(26, 11, 'FBS-PK', NULL, 'Pink', 350, 420, 580, 16, 5),
-- Johnson's Baby Shampoo
(27, 12, 'JNJ-BS-200', '3574660023619', '200ml', 380, 450, 620, 40, 10),
(28, 12, 'JNJ-BS-500', '3574660023626', '500ml', 650, 750, 980, 25, 8),
-- Cetaphil Baby Wash
(29, 13, 'CET-BW-230', '3499320063227', '230ml', 680, 780, 1050, 20, 8),
(30, 13, 'CET-BW-400', '3499320063234', '400ml', 980, 1100, 1450, 15, 5),
-- Johnson's Baby Lotion
(31, 14, 'JNJ-BL-200', '3574660020618', '200ml', 350, 420, 580, 35, 10),
(32, 14, 'JNJ-BL-500', '3574660020625', '500ml', 600, 700, 920, 22, 8),
-- Soft Rattle Toy Set
(33, 15, 'SRT-4PK', NULL, '4-piece set', 550, 650, 950, 12, 5),
-- Stacking Rings
(34, 16, 'STK-RNG', NULL, 'Classic Rainbow', 320, 400, 650, 20, 5),
-- Pigeon Pacifier
(35, 17, 'PIG-PAC-S', '4902508133395', '0-6 Months', 280, 340, 480, 30, 8),
(36, 17, 'PIG-PAC-M', '4902508133401', '6-18 Months', 300, 360, 520, 25, 8),
-- Baby Bib Set
(37, 18, 'BIB-3PK-A', NULL, 'Set A (Blue/Green/Grey)', 420, 500, 750, 15, 5),
(38, 18, 'BIB-3PK-B', NULL, 'Set B (Pink/Purple/White)', 420, 500, 750, 14, 5);

-- ============================================================================
-- SUPPLIERS (3 suppliers)
-- ============================================================================
INSERT INTO suppliers (id, name, contact_person, phone, email, address) VALUES
(1, 'Lanka Baby Distributors', 'Kamal Silva', '0112345678', 'kamal@lankababydist.lk', 'No. 45, Galle Road, Colombo 03'),
(2, 'Island Kids Trading', 'Priya Fernando', '0119876543', 'priya@islandkids.lk', 'No. 12, Kandy Road, Kadawatha'),
(3, 'Little Angels Imports', 'Ravi Jayawardena', '0117654321', 'ravi@littleangels.lk', 'No. 78, Duplication Road, Colombo 04');

-- ============================================================================
-- CUSTOMERS (25 customers — mix of walk_in and loyalty with tiers)
-- ============================================================================
INSERT INTO customers (id, phone, full_name, email, address, city, customer_type, loyalty_tier, loyalty_points_balance, credit_balance, source_channel, created_at) VALUES
(1,  '0771234501', 'Nishantha Perera',    'nishantha@gmail.com', '45 Temple Rd', 'Colombo', 'loyalty', 'gold', 420, 0, 'pos', DATE_SUB(NOW(), INTERVAL 90 DAY)),
(2,  '0771234502', 'Samanthi Fernando',   'samanthi.f@yahoo.com', '12 Lake Dr', 'Kandy', 'loyalty', 'platinum', 890, 0, 'pos', DATE_SUB(NOW(), INTERVAL 120 DAY)),
(3,  '0771234503', 'Kasun Bandara',       NULL, '78 Main St', 'Galle', 'loyalty', 'silver', 150, 1500, 'pos', DATE_SUB(NOW(), INTERVAL 60 DAY)),
(4,  '0771234504', 'Dilani Jayasinghe',   'dilani.j@gmail.com', '23 Park Ave', 'Negombo', 'loyalty', 'gold', 380, 0, 'pos', DATE_SUB(NOW(), INTERVAL 75 DAY)),
(5,  '0771234505', 'Ruwan Dissanayake',   NULL, NULL, 'Colombo', 'loyalty', 'silver', 95, 0, 'pos', DATE_SUB(NOW(), INTERVAL 45 DAY)),
(6,  '0771234506', 'Hashini De Silva',    'hashini@hotmail.com', '56 Beach Rd', 'Matara', 'loyalty', 'silver', 210, 2200, 'pos', DATE_SUB(NOW(), INTERVAL 55 DAY)),
(7,  '0771234507', 'Chaminda Rajapaksa',  NULL, '89 Hill St', 'Kurunegala', 'walk_in', 'none', 0, 0, 'pos', DATE_SUB(NOW(), INTERVAL 30 DAY)),
(8,  '0771234508', 'Anusha Wickramasinghe', 'anusha.w@gmail.com', '34 River Ln', 'Colombo', 'loyalty', 'gold', 560, 0, 'pos', DATE_SUB(NOW(), INTERVAL 100 DAY)),
(9,  '0771234509', 'Lahiru Gamage',       NULL, NULL, NULL, 'walk_in', 'none', 0, 0, 'pos', DATE_SUB(NOW(), INTERVAL 20 DAY)),
(10, '0771234510', 'Nimali Senanayake',   'nimali@gmail.com', '67 School Rd', 'Colombo', 'loyalty', 'silver', 120, 0, 'pos', DATE_SUB(NOW(), INTERVAL 40 DAY)),
(11, '0771234511', 'Dinesh Pathirana',    NULL, '11 Station Rd', 'Gampaha', 'walk_in', 'none', 0, 0, 'pos', DATE_SUB(NOW(), INTERVAL 15 DAY)),
(12, '0771234512', 'Iresha Gunasekara',   'iresha.g@yahoo.com', '45 Temple St', 'Kandy', 'loyalty', 'silver', 180, 0, 'pos', DATE_SUB(NOW(), INTERVAL 50 DAY)),
(13, '0771234513', 'Suresh Herath',       NULL, NULL, 'Ratnapura', 'walk_in', 'none', 0, 0, 'pos', DATE_SUB(NOW(), INTERVAL 10 DAY)),
(14, '0771234514', 'Malini Abeysekara',   'malini@gmail.com', '22 Garden Rd', 'Colombo', 'loyalty', 'platinum', 720, 0, 'pos', DATE_SUB(NOW(), INTERVAL 110 DAY)),
(15, '0771234515', 'Asanka Liyanage',     NULL, '90 Market St', 'Matale', 'walk_in', 'none', 0, 0, 'pos', DATE_SUB(NOW(), INTERVAL 8 DAY)),
(16, '0771234516', 'Gayani Rathnayake',   'gayani.r@gmail.com', '15 Flower Ln', 'Colombo', 'loyalty', 'gold', 340, 0, 'pos', DATE_SUB(NOW(), INTERVAL 85 DAY)),
(17, '0771234517', 'Pradeep Kumara',      NULL, NULL, NULL, 'walk_in', 'none', 0, 0, 'pos', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(18, '0771234518', 'Sachini Wijesundara', 'sachini@hotmail.com', '33 Oak St', 'Nugegoda', 'loyalty', 'silver', 75, 800, 'pos', DATE_SUB(NOW(), INTERVAL 35 DAY)),
(19, '0771234519', 'Isuru Weerasinghe',   NULL, '71 Palm Ave', 'Dehiwala', 'walk_in', 'none', 0, 0, 'pos', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(20, '0771234520', 'Thilini Nanayakkara', 'thilini.n@gmail.com', '44 Rose Rd', 'Colombo', 'loyalty', 'silver', 200, 0, 'pos', DATE_SUB(NOW(), INTERVAL 65 DAY)),
(21, '0771234521', 'Manjula Karunaratne', NULL, NULL, 'Panadura', 'walk_in', 'none', 0, 0, 'pos', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(22, '0771234522', 'Renuka Jayawardena',  'renuka.j@gmail.com', '55 Lotus Ln', 'Colombo', 'loyalty', 'gold', 480, 0, 'pos', DATE_SUB(NOW(), INTERVAL 95 DAY)),
(23, '0771234523', 'Chathura Silva',      NULL, '88 Kings Rd', 'Kaduwela', 'walk_in', 'none', 0, 0, 'pos', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(24, '0771234524', 'Sanduni Amarasinghe', 'sanduni@yahoo.com', '19 Queen St', 'Moratuwa', 'loyalty', 'silver', 60, 0, 'pos', DATE_SUB(NOW(), INTERVAL 25 DAY)),
(25, '0771234525', 'Ravindu Gunawardana', NULL, NULL, NULL, 'walk_in', 'none', 0, 0, 'pos', DATE_SUB(NOW(), INTERVAL 1 DAY));

-- ============================================================================
-- ORDERS (75 orders spread over last 30 days, varying cashiers and customers)
-- Each order block: INSERT order, then items, then payments
-- ============================================================================

-- Helper: We'll use a procedure-like approach with individual inserts
-- Orders are numbered ORD-2026-000001 through ORD-2026-000075

-- Day -30 (3 orders)
INSERT INTO orders (id, order_number, channel, customer_id, cashier_id, status, subtotal, discount_total, delivery_fee, grand_total, fulfillment_type, created_at) VALUES
(1,  'ORD-2026-000001', 'pos', 1,  1, 'completed', 2250, 0, 0, 2250, 'pickup', DATE_SUB(NOW(), INTERVAL 30 DAY) + INTERVAL 9 HOUR),
(2,  'ORD-2026-000002', 'pos', 2,  2, 'completed', 3150, 0, 0, 3150, 'pickup', DATE_SUB(NOW(), INTERVAL 30 DAY) + INTERVAL 11 HOUR),
(3,  'ORD-2026-000003', 'pos', NULL, 1, 'completed', 1580, 0, 0, 1580, 'pickup', DATE_SUB(NOW(), INTERVAL 30 DAY) + INTERVAL 14 HOUR);

INSERT INTO order_items (order_id, variant_id, quantity, unit_price, discount_amount, line_total) VALUES
(1, 2, 1, 1100, 0, 1100), (1, 3, 1, 1150, 0, 1150),
(2, 5, 2, 1350, 0, 2700), (2, 12, 1, 450, 0, 450),
(3, 10, 2, 380, 0, 760), (3, 27, 1, 620, 0, 620), (3, 35, 1, 480, 0, 480);

INSERT INTO order_payments (order_id, payment_method, amount) VALUES
(1, 'cash', 2250), (2, 'card', 3150), (3, 'cash', 1580);

-- Day -28 (3 orders)
INSERT INTO orders (id, order_number, channel, customer_id, cashier_id, status, subtotal, discount_total, delivery_fee, grand_total, fulfillment_type, created_at) VALUES
(4,  'ORD-2026-000004', 'pos', 4,  2, 'completed', 1870, 0, 0, 1870, 'pickup', DATE_SUB(NOW(), INTERVAL 28 DAY) + INTERVAL 10 HOUR),
(5,  'ORD-2026-000005', 'pos', NULL, 1, 'completed', 2960, 0, 0, 2960, 'pickup', DATE_SUB(NOW(), INTERVAL 28 DAY) + INTERVAL 13 HOUR),
(6,  'ORD-2026-000006', 'pos', 3,  2, 'completed', 4150, 0, 0, 4150, 'pickup', DATE_SUB(NOW(), INTERVAL 28 DAY) + INTERVAL 16 HOUR);

INSERT INTO order_items (order_id, variant_id, quantity, unit_price, discount_amount, line_total) VALUES
(4, 7, 1, 980, 0, 980), (4, 22, 1, 890, 0, 890),
(5, 1, 2, 950, 0, 1900), (5, 27, 1, 620, 0, 620), (5, 12, 1, 450, 0, 450),
(6, 20, 1, 1950, 0, 1950), (6, 14, 1, 1200, 0, 1200), (6, 33, 1, 950, 0, 950);

INSERT INTO order_payments (order_id, payment_method, amount) VALUES
(4, 'cash', 1870), (5, 'card', 2960), (6, 'cash', 2000), (6, 'card', 2150);

-- Day -26 (2 orders)
INSERT INTO orders (id, order_number, channel, customer_id, cashier_id, status, subtotal, discount_total, delivery_fee, grand_total, fulfillment_type, created_at) VALUES
(7,  'ORD-2026-000007', 'pos', 8,  1, 'completed', 5400, 0, 0, 5400, 'pickup', DATE_SUB(NOW(), INTERVAL 26 DAY) + INTERVAL 10 HOUR),
(8,  'ORD-2026-000008', 'pos', 5,  2, 'completed', 1730, 0, 0, 1730, 'pickup', DATE_SUB(NOW(), INTERVAL 26 DAY) + INTERVAL 15 HOUR);

INSERT INTO order_items (order_id, variant_id, quantity, unit_price, discount_amount, line_total) VALUES
(7, 21, 1, 2800, 0, 2800), (7, 6, 1, 1400, 0, 1400), (7, 14, 1, 1200, 0, 1200),
(8, 8, 1, 1050, 0, 1050), (8, 34, 1, 650, 0, 650);

INSERT INTO order_payments (order_id, payment_method, amount) VALUES
(7, 'card', 5400), (8, 'cash', 1730);

-- Day -24 (3 orders)
INSERT INTO orders (id, order_number, channel, customer_id, cashier_id, status, subtotal, discount_total, delivery_fee, grand_total, fulfillment_type, created_at) VALUES
(9,  'ORD-2026-000009', 'pos', 10, 1, 'completed', 2580, 0, 0, 2580, 'pickup', DATE_SUB(NOW(), INTERVAL 24 DAY) + INTERVAL 9 HOUR),
(10, 'ORD-2026-000010', 'pos', NULL, 2, 'completed', 1850, 0, 0, 1850, 'pickup', DATE_SUB(NOW(), INTERVAL 24 DAY) + INTERVAL 12 HOUR),
(11, 'ORD-2026-000011', 'pos', 6,  1, 'completed', 3200, 0, 0, 3200, 'pickup', DATE_SUB(NOW(), INTERVAL 24 DAY) + INTERVAL 16 HOUR);

INSERT INTO order_items (order_id, variant_id, quantity, unit_price, discount_amount, line_total) VALUES
(9, 4, 1, 1200, 0, 1200), (9, 10, 2, 380, 0, 760), (9, 27, 1, 620, 0, 620),
(10, 17, 1, 750, 0, 750), (10, 2, 1, 1100, 0, 1100),
(11, 29, 1, 1050, 0, 1050), (11, 5, 1, 1350, 0, 1350), (11, 25, 1, 580, 0, 580);

INSERT INTO order_payments (order_id, payment_method, amount) VALUES
(9, 'cash', 2580), (10, 'card', 1850), (11, 'bank_transfer', 3200);

-- Day -22 (3 orders)
INSERT INTO orders (id, order_number, channel, customer_id, cashier_id, status, subtotal, discount_total, delivery_fee, grand_total, fulfillment_type, created_at) VALUES
(12, 'ORD-2026-000012', 'pos', 12, 2, 'completed', 1980, 0, 0, 1980, 'pickup', DATE_SUB(NOW(), INTERVAL 22 DAY) + INTERVAL 10 HOUR),
(13, 'ORD-2026-000013', 'pos', NULL, 1, 'completed', 4250, 0, 0, 4250, 'pickup', DATE_SUB(NOW(), INTERVAL 22 DAY) + INTERVAL 11 HOUR),
(14, 'ORD-2026-000014', 'pos', 14, 2, 'completed', 2350, 0, 0, 2350, 'pickup', DATE_SUB(NOW(), INTERVAL 22 DAY) + INTERVAL 15 HOUR);

INSERT INTO order_items (order_id, variant_id, quantity, unit_price, discount_amount, line_total) VALUES
(12, 9, 1, 1100, 0, 1100), (12, 22, 1, 890, 0, 890),
(13, 2, 3, 1100, 0, 3300), (13, 33, 1, 950, 0, 950),
(14, 30, 1, 1450, 0, 1450), (14, 23, 1, 980, 0, 980);

INSERT INTO order_payments (order_id, payment_method, amount) VALUES
(12, 'cash', 1980), (13, 'card', 4250), (14, 'cash', 2350);

-- Day -20 (4 orders — busy day)
INSERT INTO orders (id, order_number, channel, customer_id, cashier_id, status, subtotal, discount_total, delivery_fee, grand_total, fulfillment_type, created_at) VALUES
(15, 'ORD-2026-000015', 'pos', 1,  1, 'completed', 3680, 0, 0, 3680, 'pickup', DATE_SUB(NOW(), INTERVAL 20 DAY) + INTERVAL 9 HOUR),
(16, 'ORD-2026-000016', 'pos', 16, 2, 'completed', 2100, 0, 0, 2100, 'pickup', DATE_SUB(NOW(), INTERVAL 20 DAY) + INTERVAL 11 HOUR),
(17, 'ORD-2026-000017', 'pos', 7,  1, 'completed', 1450, 0, 0, 1450, 'pickup', DATE_SUB(NOW(), INTERVAL 20 DAY) + INTERVAL 14 HOUR),
(18, 'ORD-2026-000018', 'pos', NULL, 2, 'completed', 5200, 0, 0, 5200, 'pickup', DATE_SUB(NOW(), INTERVAL 20 DAY) + INTERVAL 17 HOUR);

INSERT INTO order_items (order_id, variant_id, quantity, unit_price, discount_amount, line_total) VALUES
(15, 2, 2, 1100, 0, 2200), (15, 10, 2, 380, 0, 760), (15, 36, 1, 520, 0, 520),
(16, 15, 1, 1250, 0, 1250), (16, 34, 1, 650, 0, 650),
(17, 7, 1, 980, 0, 980), (17, 35, 1, 480, 0, 480),
(18, 21, 1, 2800, 0, 2800), (18, 4, 1, 1200, 0, 1200), (18, 14, 1, 1200, 0, 1200);

INSERT INTO order_payments (order_id, payment_method, amount) VALUES
(15, 'cash', 3680), (16, 'card', 2100), (17, 'cash', 1450), (18, 'card', 5200);

-- Day -18 (3 orders)
INSERT INTO orders (id, order_number, channel, customer_id, cashier_id, status, subtotal, discount_total, delivery_fee, grand_total, fulfillment_type, created_at) VALUES
(19, 'ORD-2026-000019', 'pos', 2,  1, 'completed', 2680, 0, 0, 2680, 'pickup', DATE_SUB(NOW(), INTERVAL 18 DAY) + INTERVAL 10 HOUR),
(20, 'ORD-2026-000020', 'pos', 9,  2, 'completed', 1350, 0, 0, 1350, 'pickup', DATE_SUB(NOW(), INTERVAL 18 DAY) + INTERVAL 13 HOUR),
(21, 'ORD-2026-000021', 'pos', 20, 1, 'completed', 3950, 0, 0, 3950, 'pickup', DATE_SUB(NOW(), INTERVAL 18 DAY) + INTERVAL 16 HOUR);

INSERT INTO order_items (order_id, variant_id, quantity, unit_price, discount_amount, line_total) VALUES
(19, 5, 1, 1350, 0, 1350), (19, 28, 1, 980, 0, 980), (19, 10, 1, 380, 0, 380),
(20, 1, 1, 950, 0, 950), (20, 12, 1, 450, 0, 450),
(21, 20, 1, 1950, 0, 1950), (21, 29, 1, 1050, 0, 1050), (21, 33, 1, 950, 0, 950);

INSERT INTO order_payments (order_id, payment_method, amount) VALUES
(19, 'cash', 2680), (20, 'cash', 1350), (21, 'card', 3950);

-- Day -16 (2 orders)
INSERT INTO orders (id, order_number, channel, customer_id, cashier_id, status, subtotal, discount_total, delivery_fee, grand_total, fulfillment_type, created_at) VALUES
(22, 'ORD-2026-000022', 'pos', NULL, 2, 'completed', 1900, 0, 0, 1900, 'pickup', DATE_SUB(NOW(), INTERVAL 16 DAY) + INTERVAL 10 HOUR),
(23, 'ORD-2026-000023', 'pos', 4,  1, 'completed', 4580, 0, 0, 4580, 'pickup', DATE_SUB(NOW(), INTERVAL 16 DAY) + INTERVAL 14 HOUR);

INSERT INTO order_items (order_id, variant_id, quantity, unit_price, discount_amount, line_total) VALUES
(22, 3, 1, 1150, 0, 1150), (22, 18, 1, 750, 0, 750),
(23, 6, 2, 1400, 0, 2800), (23, 31, 1, 580, 0, 580), (23, 14, 1, 1200, 0, 1200);

INSERT INTO order_payments (order_id, payment_method, amount) VALUES
(22, 'cash', 1900), (23, 'bank_transfer', 4580);

-- Day -14 (4 orders — busy day)
INSERT INTO orders (id, order_number, channel, customer_id, cashier_id, status, subtotal, discount_total, delivery_fee, grand_total, fulfillment_type, created_at) VALUES
(24, 'ORD-2026-000024', 'pos', 8,  1, 'completed', 2750, 0, 0, 2750, 'pickup', DATE_SUB(NOW(), INTERVAL 14 DAY) + INTERVAL 9 HOUR),
(25, 'ORD-2026-000025', 'pos', 22, 2, 'completed', 1680, 0, 0, 1680, 'pickup', DATE_SUB(NOW(), INTERVAL 14 DAY) + INTERVAL 11 HOUR),
(26, 'ORD-2026-000026', 'pos', NULL, 1, 'completed', 3450, 0, 0, 3450, 'pickup', DATE_SUB(NOW(), INTERVAL 14 DAY) + INTERVAL 14 HOUR),
(27, 'ORD-2026-000027', 'pos', 10, 2, 'completed', 5100, 0, 0, 5100, 'pickup', DATE_SUB(NOW(), INTERVAL 14 DAY) + INTERVAL 17 HOUR);

INSERT INTO order_items (order_id, variant_id, quantity, unit_price, discount_amount, line_total) VALUES
(24, 2, 1, 1100, 0, 1100), (24, 23, 1, 980, 0, 980), (24, 34, 1, 650, 0, 650),
(25, 7, 1, 980, 0, 980), (25, 37, 1, 750, 0, 750),
(26, 4, 1, 1200, 0, 1200), (26, 5, 1, 1350, 0, 1350), (26, 27, 1, 620, 0, 620), (26, 35, 1, 480, 0, 480),
(27, 21, 1, 2800, 0, 2800), (27, 15, 1, 1250, 0, 1250), (27, 29, 1, 1050, 0, 1050);

INSERT INTO order_payments (order_id, payment_method, amount) VALUES
(24, 'card', 2750), (25, 'cash', 1680), (26, 'cash', 3450), (27, 'card', 5100);

-- Day -12 (3 orders)
INSERT INTO orders (id, order_number, channel, customer_id, cashier_id, status, subtotal, discount_total, delivery_fee, grand_total, fulfillment_type, created_at) VALUES
(28, 'ORD-2026-000028', 'pos', 3,  2, 'completed', 2100, 0, 0, 2100, 'pickup', DATE_SUB(NOW(), INTERVAL 12 DAY) + INTERVAL 10 HOUR),
(29, 'ORD-2026-000029', 'pos', 24, 1, 'completed', 1580, 0, 0, 1580, 'pickup', DATE_SUB(NOW(), INTERVAL 12 DAY) + INTERVAL 13 HOUR),
(30, 'ORD-2026-000030', 'pos', NULL, 2, 'completed', 3780, 0, 0, 3780, 'pickup', DATE_SUB(NOW(), INTERVAL 12 DAY) + INTERVAL 16 HOUR);

INSERT INTO order_items (order_id, variant_id, quantity, unit_price, discount_amount, line_total) VALUES
(28, 8, 1, 1050, 0, 1050), (28, 9, 1, 1100, 0, 1100),
(29, 1, 1, 950, 0, 950), (29, 27, 1, 620, 0, 620),
(30, 4, 1, 1200, 0, 1200), (30, 20, 1, 1950, 0, 1950), (30, 25, 1, 580, 0, 580);

INSERT INTO order_payments (order_id, payment_method, amount) VALUES
(28, 'cash', 2100), (29, 'cash', 1580), (30, 'card', 3780);

-- Day -10 (4 orders — another busy day)
INSERT INTO orders (id, order_number, channel, customer_id, cashier_id, status, subtotal, discount_total, delivery_fee, grand_total, fulfillment_type, created_at) VALUES
(31, 'ORD-2026-000031', 'pos', 14, 1, 'completed', 4200, 0, 0, 4200, 'pickup', DATE_SUB(NOW(), INTERVAL 10 DAY) + INTERVAL 9 HOUR),
(32, 'ORD-2026-000032', 'pos', 6,  2, 'completed', 1950, 0, 0, 1950, 'pickup', DATE_SUB(NOW(), INTERVAL 10 DAY) + INTERVAL 11 HOUR),
(33, 'ORD-2026-000033', 'pos', 11, 1, 'completed', 2850, 0, 0, 2850, 'pickup', DATE_SUB(NOW(), INTERVAL 10 DAY) + INTERVAL 14 HOUR),
(34, 'ORD-2026-000034', 'pos', 2,  2, 'completed', 6200, 0, 0, 6200, 'pickup', DATE_SUB(NOW(), INTERVAL 10 DAY) + INTERVAL 17 HOUR);

INSERT INTO order_items (order_id, variant_id, quantity, unit_price, discount_amount, line_total) VALUES
(31, 6, 2, 1400, 0, 2800), (31, 30, 1, 1450, 0, 1450),
(32, 2, 1, 1100, 0, 1100), (32, 12, 1, 450, 0, 450), (32, 35, 1, 480, 0, 480),
(33, 5, 1, 1350, 0, 1350), (33, 16, 1, 1300, 0, 1300),
(34, 21, 2, 2800, 0, 5600), (34, 12, 1, 450, 0, 450);

INSERT INTO order_payments (order_id, payment_method, amount) VALUES
(31, 'card', 4200), (32, 'cash', 1950), (33, 'bank_transfer', 2850), (34, 'card', 6200);

-- Day -8 (3 orders)
INSERT INTO orders (id, order_number, channel, customer_id, cashier_id, status, subtotal, discount_total, delivery_fee, grand_total, fulfillment_type, created_at) VALUES
(35, 'ORD-2026-000035', 'pos', 16, 1, 'completed', 3100, 0, 0, 3100, 'pickup', DATE_SUB(NOW(), INTERVAL 8 DAY) + INTERVAL 10 HOUR),
(36, 'ORD-2026-000036', 'pos', NULL, 2, 'completed', 2450, 0, 0, 2450, 'pickup', DATE_SUB(NOW(), INTERVAL 8 DAY) + INTERVAL 13 HOUR),
(37, 'ORD-2026-000037', 'pos', 18, 1, 'completed', 1780, 0, 0, 1780, 'pickup', DATE_SUB(NOW(), INTERVAL 8 DAY) + INTERVAL 16 HOUR);

INSERT INTO order_items (order_id, variant_id, quantity, unit_price, discount_amount, line_total) VALUES
(35, 2, 2, 1100, 0, 2200), (35, 22, 1, 890, 0, 890),
(36, 3, 1, 1150, 0, 1150), (36, 28, 1, 980, 0, 980), (36, 10, 1, 380, 0, 380),
(37, 7, 1, 980, 0, 980), (37, 19, 1, 800, 0, 800);

INSERT INTO order_payments (order_id, payment_method, amount) VALUES
(35, 'cash', 3100), (36, 'card', 2450), (37, 'cash', 1780);

-- Day -6 (3 orders)
INSERT INTO orders (id, order_number, channel, customer_id, cashier_id, status, subtotal, discount_total, delivery_fee, grand_total, fulfillment_type, created_at) VALUES
(38, 'ORD-2026-000038', 'pos', 1,  2, 'completed', 2580, 0, 0, 2580, 'pickup', DATE_SUB(NOW(), INTERVAL 6 DAY) + INTERVAL 9 HOUR),
(39, 'ORD-2026-000039', 'pos', 13, 1, 'completed', 1350, 0, 0, 1350, 'pickup', DATE_SUB(NOW(), INTERVAL 6 DAY) + INTERVAL 12 HOUR),
(40, 'ORD-2026-000040', 'pos', 22, 2, 'completed', 4800, 0, 0, 4800, 'pickup', DATE_SUB(NOW(), INTERVAL 6 DAY) + INTERVAL 15 HOUR);

INSERT INTO order_items (order_id, variant_id, quantity, unit_price, discount_amount, line_total) VALUES
(38, 4, 1, 1200, 0, 1200), (38, 11, 1, 650, 0, 650), (38, 38, 1, 750, 0, 750),
(39, 1, 1, 950, 0, 950), (39, 12, 1, 450, 0, 450),
(40, 20, 1, 1950, 0, 1950), (40, 5, 1, 1350, 0, 1350), (40, 15, 1, 1250, 0, 1250), (40, 35, 1, 480, 0, 480);

INSERT INTO order_payments (order_id, payment_method, amount) VALUES
(38, 'cash', 2580), (39, 'cash', 1350), (40, 'card', 4800);

-- Day -5 (5 orders — biggest day!)
INSERT INTO orders (id, order_number, channel, customer_id, cashier_id, status, subtotal, discount_total, delivery_fee, grand_total, fulfillment_type, created_at) VALUES
(41, 'ORD-2026-000041', 'pos', 4,  1, 'completed', 3200, 0, 0, 3200, 'pickup', DATE_SUB(NOW(), INTERVAL 5 DAY) + INTERVAL 9 HOUR),
(42, 'ORD-2026-000042', 'pos', NULL, 2, 'completed', 1580, 0, 0, 1580, 'pickup', DATE_SUB(NOW(), INTERVAL 5 DAY) + INTERVAL 10 HOUR),
(43, 'ORD-2026-000043', 'pos', 8,  1, 'completed', 5600, 0, 0, 5600, 'pickup', DATE_SUB(NOW(), INTERVAL 5 DAY) + INTERVAL 12 HOUR),
(44, 'ORD-2026-000044', 'pos', 15, 2, 'completed', 2300, 0, 0, 2300, 'pickup', DATE_SUB(NOW(), INTERVAL 5 DAY) + INTERVAL 15 HOUR),
(45, 'ORD-2026-000045', 'pos', 20, 1, 'completed', 4100, 0, 0, 4100, 'pickup', DATE_SUB(NOW(), INTERVAL 5 DAY) + INTERVAL 17 HOUR);

INSERT INTO order_items (order_id, variant_id, quantity, unit_price, discount_amount, line_total) VALUES
(41, 2, 2, 1100, 0, 2200), (41, 24, 1, 720, 0, 720), (41, 35, 1, 480, 0, 480),
(42, 1, 1, 950, 0, 950), (42, 27, 1, 620, 0, 620),
(43, 21, 2, 2800, 0, 5600),
(44, 8, 1, 1050, 0, 1050), (44, 29, 1, 1050, 0, 1050),
(45, 6, 1, 1400, 0, 1400), (45, 4, 1, 1200, 0, 1200), (45, 14, 1, 1200, 0, 1200), (45, 10, 1, 380, 0, 380);

INSERT INTO order_payments (order_id, payment_method, amount) VALUES
(41, 'cash', 3200), (42, 'cash', 1580), (43, 'card', 5600), (44, 'bank_transfer', 2300), (45, 'card', 4100);

-- Day -4 (3 orders)
INSERT INTO orders (id, order_number, channel, customer_id, cashier_id, status, subtotal, discount_total, delivery_fee, grand_total, fulfillment_type, created_at) VALUES
(46, 'ORD-2026-000046', 'pos', 12, 2, 'completed', 2680, 0, 0, 2680, 'pickup', DATE_SUB(NOW(), INTERVAL 4 DAY) + INTERVAL 10 HOUR),
(47, 'ORD-2026-000047', 'pos', 3,  1, 'completed', 1950, 0, 0, 1950, 'pickup', DATE_SUB(NOW(), INTERVAL 4 DAY) + INTERVAL 13 HOUR),
(48, 'ORD-2026-000048', 'pos', NULL, 2, 'completed', 3550, 0, 0, 3550, 'pickup', DATE_SUB(NOW(), INTERVAL 4 DAY) + INTERVAL 16 HOUR);

INSERT INTO order_items (order_id, variant_id, quantity, unit_price, discount_amount, line_total) VALUES
(46, 5, 1, 1350, 0, 1350), (46, 28, 1, 980, 0, 980), (46, 10, 1, 380, 0, 380),
(47, 7, 1, 980, 0, 980), (47, 33, 1, 950, 0, 950),
(48, 2, 2, 1100, 0, 2200), (48, 5, 1, 1350, 0, 1350);

INSERT INTO order_payments (order_id, payment_method, amount) VALUES
(46, 'card', 2680), (47, 'cash', 1950), (48, 'cash', 2000), (48, 'card', 1550);

-- Day -3 (4 orders)
INSERT INTO orders (id, order_number, channel, customer_id, cashier_id, status, subtotal, discount_total, delivery_fee, grand_total, fulfillment_type, created_at) VALUES
(49, 'ORD-2026-000049', 'pos', 14, 1, 'completed', 3850, 0, 0, 3850, 'pickup', DATE_SUB(NOW(), INTERVAL 3 DAY) + INTERVAL 9 HOUR),
(50, 'ORD-2026-000050', 'pos', 19, 2, 'completed', 2200, 0, 0, 2200, 'pickup', DATE_SUB(NOW(), INTERVAL 3 DAY) + INTERVAL 11 HOUR),
(51, 'ORD-2026-000051', 'pos', 6,  1, 'completed', 1580, 0, 0, 1580, 'pickup', DATE_SUB(NOW(), INTERVAL 3 DAY) + INTERVAL 14 HOUR),
(52, 'ORD-2026-000052', 'pos', NULL, 2, 'completed', 4500, 0, 0, 4500, 'pickup', DATE_SUB(NOW(), INTERVAL 3 DAY) + INTERVAL 17 HOUR);

INSERT INTO order_items (order_id, variant_id, quantity, unit_price, discount_amount, line_total) VALUES
(49, 30, 1, 1450, 0, 1450), (49, 4, 1, 1200, 0, 1200), (49, 14, 1, 1200, 0, 1200),
(50, 3, 1, 1150, 0, 1150), (50, 8, 1, 1050, 0, 1050),
(51, 10, 2, 380, 0, 760), (51, 27, 1, 620, 0, 620),
(52, 21, 1, 2800, 0, 2800), (52, 16, 1, 1300, 0, 1300), (52, 12, 1, 450, 0, 450);

INSERT INTO order_payments (order_id, payment_method, amount) VALUES
(49, 'card', 3850), (50, 'cash', 2200), (51, 'cash', 1580), (52, 'card', 4500);

-- Day -2 (4 orders)
INSERT INTO orders (id, order_number, channel, customer_id, cashier_id, status, subtotal, discount_total, delivery_fee, grand_total, fulfillment_type, created_at) VALUES
(53, 'ORD-2026-000053', 'pos', 2,  1, 'completed', 5800, 0, 0, 5800, 'pickup', DATE_SUB(NOW(), INTERVAL 2 DAY) + INTERVAL 9 HOUR),
(54, 'ORD-2026-000054', 'pos', 21, 2, 'completed', 1680, 0, 0, 1680, 'pickup', DATE_SUB(NOW(), INTERVAL 2 DAY) + INTERVAL 11 HOUR),
(55, 'ORD-2026-000055', 'pos', 10, 1, 'completed', 3200, 0, 0, 3200, 'pickup', DATE_SUB(NOW(), INTERVAL 2 DAY) + INTERVAL 14 HOUR),
(56, 'ORD-2026-000056', 'pos', 23, 2, 'completed', 2100, 0, 0, 2100, 'pickup', DATE_SUB(NOW(), INTERVAL 2 DAY) + INTERVAL 16 HOUR);

INSERT INTO order_items (order_id, variant_id, quantity, unit_price, discount_amount, line_total) VALUES
(53, 21, 1, 2800, 0, 2800), (53, 6, 1, 1400, 0, 1400), (53, 5, 1, 1350, 0, 1350), (53, 10, 1, 380, 0, 380),
(54, 7, 1, 980, 0, 980), (54, 37, 1, 750, 0, 750),
(55, 2, 2, 1100, 0, 2200), (55, 24, 1, 720, 0, 720), (55, 35, 1, 480, 0, 480),
(56, 3, 1, 1150, 0, 1150), (56, 33, 1, 950, 0, 950);

INSERT INTO order_payments (order_id, payment_method, amount) VALUES
(53, 'card', 5800), (54, 'cash', 1680), (55, 'cash', 1000), (55, 'card', 2200), (56, 'cash', 2100);

-- Day -1 (5 orders — yesterday, busy)
INSERT INTO orders (id, order_number, channel, customer_id, cashier_id, status, subtotal, discount_total, delivery_fee, grand_total, fulfillment_type, created_at) VALUES
(57, 'ORD-2026-000057', 'pos', 1,  1, 'completed', 2950, 0, 0, 2950, 'pickup', DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 9 HOUR),
(58, 'ORD-2026-000058', 'pos', 16, 2, 'completed', 4200, 0, 0, 4200, 'pickup', DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 10 HOUR),
(59, 'ORD-2026-000059', 'pos', NULL, 1, 'completed', 1850, 0, 0, 1850, 'pickup', DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 12 HOUR),
(60, 'ORD-2026-000060', 'pos', 5,  2, 'completed', 3100, 0, 0, 3100, 'pickup', DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 15 HOUR),
(61, 'ORD-2026-000061', 'pos', 14, 1, 'completed', 5450, 0, 0, 5450, 'pickup', DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 17 HOUR);

INSERT INTO order_items (order_id, variant_id, quantity, unit_price, discount_amount, line_total) VALUES
(57, 2, 1, 1100, 0, 1100), (57, 4, 1, 1200, 0, 1200), (57, 34, 1, 650, 0, 650),
(58, 21, 1, 2800, 0, 2800), (58, 30, 1, 1450, 0, 1450),
(59, 8, 1, 1050, 0, 1050), (59, 19, 1, 800, 0, 800),
(60, 5, 1, 1350, 0, 1350), (60, 2, 1, 1100, 0, 1100), (60, 34, 1, 650, 0, 650),
(61, 6, 2, 1400, 0, 2800), (61, 29, 1, 1050, 0, 1050), (61, 14, 1, 1200, 0, 1200), (61, 10, 1, 380, 0, 380);

INSERT INTO order_payments (order_id, payment_method, amount) VALUES
(57, 'cash', 2950), (58, 'card', 4200), (59, 'cash', 1850), (60, 'bank_transfer', 3100), (61, 'card', 5450);

-- Today (4 orders)
INSERT INTO orders (id, order_number, channel, customer_id, cashier_id, status, subtotal, discount_total, delivery_fee, grand_total, fulfillment_type, created_at) VALUES
(62, 'ORD-2026-000062', 'pos', 8,  1, 'completed', 3580, 0, 0, 3580, 'pickup', DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(63, 'ORD-2026-000063', 'pos', 25, 2, 'completed', 1950, 0, 0, 1950, 'pickup', DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(64, 'ORD-2026-000064', 'pos', 4,  1, 'completed', 2680, 0, 0, 2680, 'pickup', DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
(65, 'ORD-2026-000065', 'pos', NULL, 2, 'completed', 4100, 0, 0, 4100, 'pickup', DATE_SUB(NOW(), INTERVAL 10 MINUTE));

INSERT INTO order_items (order_id, variant_id, quantity, unit_price, discount_amount, line_total) VALUES
(62, 2, 2, 1100, 0, 2200), (62, 10, 2, 380, 0, 760), (62, 27, 1, 620, 0, 620),
(63, 7, 1, 980, 0, 980), (63, 33, 1, 950, 0, 950),
(64, 4, 1, 1200, 0, 1200), (64, 23, 1, 980, 0, 980), (64, 35, 1, 480, 0, 480),
(65, 20, 1, 1950, 0, 1950), (65, 5, 1, 1350, 0, 1350), (65, 19, 1, 800, 0, 800);

INSERT INTO order_payments (order_id, payment_method, amount) VALUES
(62, 'cash', 3580), (63, 'cash', 1950), (64, 'card', 2680), (65, 'card', 4100);

-- 3 refunded orders (for refund data)
INSERT INTO orders (id, order_number, channel, customer_id, cashier_id, status, subtotal, discount_total, delivery_fee, grand_total, fulfillment_type, created_at) VALUES
(66, 'ORD-2026-000066', 'pos', 9,  1, 'refunded', 1100, 0, 0, 1100, 'pickup', DATE_SUB(NOW(), INTERVAL 15 DAY) + INTERVAL 11 HOUR),
(67, 'ORD-2026-000067', 'pos', 11, 2, 'partially_refunded', 2350, 0, 0, 2350, 'pickup', DATE_SUB(NOW(), INTERVAL 7 DAY) + INTERVAL 14 HOUR);

INSERT INTO order_items (id, order_id, variant_id, quantity, unit_price, discount_amount, line_total) VALUES
(200, 66, 2, 1, 1100, 0, 1100),
(201, 67, 4, 1, 1200, 0, 1200), (202, 67, 3, 1, 1150, 0, 1150);

INSERT INTO order_payments (order_id, payment_method, amount) VALUES
(66, 'cash', 1100), (67, 'card', 2350);

INSERT INTO order_returns (order_id, order_item_id, quantity, reason, refund_amount, restock, processed_by, created_at) VALUES
(66, 200, 1, 'Wrong size ordered', 1100, 1, 1, DATE_SUB(NOW(), INTERVAL 14 DAY)),
(67, 201, 1, 'Damaged packaging', 1200, 1, 1, DATE_SUB(NOW(), INTERVAL 6 DAY));

-- ============================================================================
-- STOCK MOVEMENTS (initial stock-in for all variants)
-- ============================================================================
INSERT INTO stock_movements (variant_id, change_qty, reason, reference_type, created_by)
SELECT id, current_stock, 'manual_adjustment', 'manual', 1 FROM product_variants;

-- ============================================================================
-- CUSTOMER LEDGER ENTRIES (loyalty points earned from orders + credit transactions)
-- ============================================================================

-- Points earned from orders (1 point per 100 LKR)
INSERT INTO customer_ledger (customer_id, entry_type, points_delta, reference_type, reference_id, notes, created_by, created_at) VALUES
(1,  'points_earned', 22, 'order', 1,  'Points earned from order ORD-2026-000001', 1, DATE_SUB(NOW(), INTERVAL 30 DAY)),
(2,  'points_earned', 31, 'order', 2,  'Points earned from order ORD-2026-000002', 2, DATE_SUB(NOW(), INTERVAL 30 DAY)),
(4,  'points_earned', 18, 'order', 4,  'Points earned from order ORD-2026-000004', 2, DATE_SUB(NOW(), INTERVAL 28 DAY)),
(3,  'points_earned', 41, 'order', 6,  'Points earned from order ORD-2026-000006', 2, DATE_SUB(NOW(), INTERVAL 28 DAY)),
(8,  'points_earned', 54, 'order', 7,  'Points earned from order ORD-2026-000007', 1, DATE_SUB(NOW(), INTERVAL 26 DAY)),
(5,  'points_earned', 17, 'order', 8,  'Points earned from order ORD-2026-000008', 2, DATE_SUB(NOW(), INTERVAL 26 DAY)),
(10, 'points_earned', 25, 'order', 9,  'Points earned from order ORD-2026-000009', 1, DATE_SUB(NOW(), INTERVAL 24 DAY)),
(6,  'points_earned', 32, 'order', 11, 'Points earned from order ORD-2026-000011', 1, DATE_SUB(NOW(), INTERVAL 24 DAY)),
(12, 'points_earned', 19, 'order', 12, 'Points earned from order ORD-2026-000012', 2, DATE_SUB(NOW(), INTERVAL 22 DAY)),
(14, 'points_earned', 23, 'order', 14, 'Points earned from order ORD-2026-000014', 2, DATE_SUB(NOW(), INTERVAL 22 DAY)),
(1,  'points_earned', 36, 'order', 15, 'Points earned from order ORD-2026-000015', 1, DATE_SUB(NOW(), INTERVAL 20 DAY)),
(16, 'points_earned', 21, 'order', 16, 'Points earned from order ORD-2026-000016', 2, DATE_SUB(NOW(), INTERVAL 20 DAY)),
(2,  'points_earned', 26, 'order', 19, 'Points earned from order ORD-2026-000019', 1, DATE_SUB(NOW(), INTERVAL 18 DAY)),
(20, 'points_earned', 39, 'order', 21, 'Points earned from order ORD-2026-000021', 1, DATE_SUB(NOW(), INTERVAL 18 DAY)),
(4,  'points_earned', 45, 'order', 23, 'Points earned from order ORD-2026-000023', 1, DATE_SUB(NOW(), INTERVAL 16 DAY)),
(8,  'points_earned', 27, 'order', 24, 'Points earned from order ORD-2026-000024', 1, DATE_SUB(NOW(), INTERVAL 14 DAY)),
(22, 'points_earned', 16, 'order', 25, 'Points earned from order ORD-2026-000025', 2, DATE_SUB(NOW(), INTERVAL 14 DAY)),
(10, 'points_earned', 51, 'order', 27, 'Points earned from order ORD-2026-000027', 2, DATE_SUB(NOW(), INTERVAL 14 DAY)),
(14, 'points_earned', 42, 'order', 31, 'Points earned from order ORD-2026-000031', 1, DATE_SUB(NOW(), INTERVAL 10 DAY)),
(6,  'points_earned', 19, 'order', 32, 'Points earned from order ORD-2026-000032', 2, DATE_SUB(NOW(), INTERVAL 10 DAY)),
(2,  'points_earned', 62, 'order', 34, 'Points earned from order ORD-2026-000034', 2, DATE_SUB(NOW(), INTERVAL 10 DAY)),
(16, 'points_earned', 31, 'order', 35, 'Points earned from order ORD-2026-000035', 1, DATE_SUB(NOW(), INTERVAL 8 DAY)),
(18, 'points_earned', 17, 'order', 37, 'Points earned from order ORD-2026-000037', 1, DATE_SUB(NOW(), INTERVAL 8 DAY)),
(1,  'points_earned', 25, 'order', 38, 'Points earned from order ORD-2026-000038', 2, DATE_SUB(NOW(), INTERVAL 6 DAY)),
(22, 'points_earned', 48, 'order', 40, 'Points earned from order ORD-2026-000040', 2, DATE_SUB(NOW(), INTERVAL 6 DAY)),
(4,  'points_earned', 32, 'order', 41, 'Points earned from order ORD-2026-000041', 1, DATE_SUB(NOW(), INTERVAL 5 DAY)),
(8,  'points_earned', 56, 'order', 43, 'Points earned from order ORD-2026-000043', 1, DATE_SUB(NOW(), INTERVAL 5 DAY)),
(20, 'points_earned', 41, 'order', 45, 'Points earned from order ORD-2026-000045', 1, DATE_SUB(NOW(), INTERVAL 5 DAY)),
(12, 'points_earned', 26, 'order', 46, 'Points earned from order ORD-2026-000046', 2, DATE_SUB(NOW(), INTERVAL 4 DAY)),
(3,  'points_earned', 19, 'order', 47, 'Points earned from order ORD-2026-000047', 1, DATE_SUB(NOW(), INTERVAL 4 DAY)),
(14, 'points_earned', 38, 'order', 49, 'Points earned from order ORD-2026-000049', 1, DATE_SUB(NOW(), INTERVAL 3 DAY)),
(6,  'points_earned', 15, 'order', 51, 'Points earned from order ORD-2026-000051', 1, DATE_SUB(NOW(), INTERVAL 3 DAY)),
(2,  'points_earned', 58, 'order', 53, 'Points earned from order ORD-2026-000053', 1, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(10, 'points_earned', 32, 'order', 55, 'Points earned from order ORD-2026-000055', 1, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(1,  'points_earned', 29, 'order', 57, 'Points earned from order ORD-2026-000057', 1, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(16, 'points_earned', 42, 'order', 58, 'Points earned from order ORD-2026-000058', 2, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(5,  'points_earned', 31, 'order', 60, 'Points earned from order ORD-2026-000060', 2, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(14, 'points_earned', 54, 'order', 61, 'Points earned from order ORD-2026-000061', 1, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(8,  'points_earned', 35, 'order', 62, 'Points earned from order ORD-2026-000062', 1, NOW()),
(4,  'points_earned', 26, 'order', 64, 'Points earned from order ORD-2026-000064', 1, NOW());

-- Credit transactions (customer 3 and 6 and 18 have credit balances)
INSERT INTO customer_ledger (customer_id, entry_type, credit_delta, reference_type, reference_id, notes, created_by, created_at) VALUES
(3,  'credit_issued', 2500, 'order', 6,  'Credit purchase on order ORD-2026-000006', 2, DATE_SUB(NOW(), INTERVAL 28 DAY)),
(3,  'credit_repaid', -1000, 'manual', NULL, 'Cash repayment', 1, DATE_SUB(NOW(), INTERVAL 20 DAY)),
(6,  'credit_issued', 3200, 'order', 11, 'Credit purchase on order ORD-2026-000011', 1, DATE_SUB(NOW(), INTERVAL 24 DAY)),
(6,  'credit_repaid', -1000, 'manual', NULL, 'Cash repayment', 1, DATE_SUB(NOW(), INTERVAL 15 DAY)),
(18, 'credit_issued', 1780, 'order', 37, 'Credit purchase on order ORD-2026-000037', 1, DATE_SUB(NOW(), INTERVAL 8 DAY)),
(18, 'credit_repaid', -980, 'manual', NULL, 'Partial repayment', 1, DATE_SUB(NOW(), INTERVAL 4 DAY));

-- ============================================================================
-- Done! Verify with: SELECT COUNT(*) FROM orders;
-- Expected: 67 orders, 25 customers, 38 variants, 18 products
-- ============================================================================
