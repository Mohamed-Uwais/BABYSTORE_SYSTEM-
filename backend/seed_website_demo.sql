-- Categories
INSERT INTO categories (name, slug) VALUES
('Diapers', 'diapers'), ('Wet Wipes', 'wet-wipes'), ('Baby Clothes', 'baby-clothes'),
('Feeding', 'feeding'), ('Bath & Skincare', 'bath-skincare'), ('Toys', 'toys');

-- Brands
INSERT INTO brands (name, slug) VALUES
('Pampers', 'pampers'), ('Huggies', 'huggies'), ('MamyPoko', 'mamypoko'),
('Pigeon', 'pigeon'), ('Johnson''s', 'johnsons'), ('Tiny Buds', 'tiny-buds');

-- Products with variants
INSERT INTO products (name, slug, category_id, brand_id, description) VALUES
('Pampers Premium Care Pants', 'pampers-premium-care-pants', 1, 1, 'Ultra-soft diaper pants with 360-degree cottony softness for your baby''s delicate skin.'),
('Huggies Wonder Pants', 'huggies-wonder-pants', 1, 2, 'Double leak guard and bubble bed technology for up to 12 hours absorption.'),
('MamyPoko Pants Standard', 'mamypoko-pants-standard', 1, 3, 'Affordable quality diapers with excellent absorption for active babies.'),
('Pampers Baby Dry Taped', 'pampers-baby-dry-taped', 1, 1, 'Up to 12 hours of dryness with 3 absorbing layers. Perfect for overnight use.'),
('Huggies Pure Baby Wipes', 'huggies-pure-baby-wipes', 2, 2, '99% pure water wipes, gentle on baby''s skin. No alcohol, no fragrance.'),
('Pampers Sensitive Wipes', 'pampers-sensitive-wipes', 2, 1, 'Dermatologically tested, pH balanced wipes for sensitive baby skin.'),
('Baby Romper Set', 'baby-romper-set', 3, 6, 'Soft cotton romper set with snap buttons. Available in multiple sizes and colors.'),
('Pigeon Feeding Bottle', 'pigeon-feeding-bottle', 4, 4, 'SofTouch peristaltic nipple mimics natural breastfeeding. BPA-free.'),
('Pigeon Breast Milk Storage', 'pigeon-breast-milk-storage', 4, 4, 'Pre-sterilized breast milk storage bags. BPA-free and leak-proof.'),
('Johnson''s Baby Shampoo', 'johnsons-baby-shampoo', 5, 5, 'No More Tears formula. Gentle enough for daily use. Hypoallergenic.'),
('Johnson''s Baby Lotion', 'johnsons-baby-lotion', 5, 5, 'Clinically proven mild formula keeps baby''s skin soft and smooth for 24 hours.'),
('Tiny Buds Baby Wash', 'tiny-buds-baby-wash', 5, 6, 'Natural ingredients baby wash with aloe vera and chamomile extracts.');

-- Variants for each product
INSERT INTO product_variants (product_id, sku, variant_label, cost_price, retail_price, current_stock, low_stock_threshold, discount_type, discount_value) VALUES
(1, 'PAM-PC-S', 'Size S (4-8kg) 34pcs', 850, 1290, 45, 10, 'none', 0),
(1, 'PAM-PC-M', 'Size M (7-12kg) 30pcs', 900, 1350, 38, 10, 'none', 0),
(1, 'PAM-PC-L', 'Size L (9-14kg) 28pcs', 950, 1450, 30, 10, 'percent', 10),
(1, 'PAM-PC-XL', 'Size XL (12-17kg) 24pcs', 1000, 1550, 25, 10, 'none', 0),
(2, 'HUG-WP-S', 'Size S (4-8kg) 36pcs', 750, 1150, 50, 10, 'none', 0),
(2, 'HUG-WP-M', 'Size M (7-12kg) 32pcs', 800, 1250, 42, 10, 'none', 0),
(2, 'HUG-WP-L', 'Size L (9-14kg) 28pcs', 850, 1350, 35, 10, 'amount', 150),
(2, 'HUG-WP-XL', 'Size XL (12-17kg) 24pcs', 900, 1450, 28, 10, 'none', 0),
(3, 'MPK-STD-M', 'Size M (7-12kg) 40pcs', 500, 790, 60, 15, 'none', 0),
(3, 'MPK-STD-L', 'Size L (9-14kg) 36pcs', 550, 850, 55, 15, 'none', 0),
(3, 'MPK-STD-XL', 'Size XL (12-17kg) 32pcs', 600, 950, 48, 15, 'percent', 15),
(4, 'PAM-BD-NB', 'Newborn (up to 5kg) 46pcs', 750, 1190, 40, 10, 'none', 0),
(4, 'PAM-BD-S', 'Size S (4-8kg) 42pcs', 800, 1290, 35, 10, 'none', 0),
(4, 'PAM-BD-M', 'Size M (6-11kg) 38pcs', 850, 1390, 30, 10, 'none', 0),
(5, 'HUG-PW-56', '56 Wipes', 250, 450, 80, 20, 'none', 0),
(5, 'HUG-PW-72', '72 Wipes', 320, 590, 65, 15, 'percent', 5),
(6, 'PAM-SW-52', '52 Wipes', 280, 490, 70, 20, 'none', 0),
(6, 'PAM-SW-72', '72 Wipes', 350, 650, 55, 15, 'none', 0),
(7, 'BR-SET-0-3', '0-3 Months', 600, 1290, 20, 5, 'none', 0),
(7, 'BR-SET-3-6', '3-6 Months', 650, 1390, 18, 5, 'percent', 20),
(7, 'BR-SET-6-12', '6-12 Months', 700, 1490, 15, 5, 'none', 0),
(8, 'PIG-FB-160', '160ml', 450, 890, 30, 8, 'none', 0),
(8, 'PIG-FB-240', '240ml', 500, 990, 25, 8, 'amount', 100),
(9, 'PIG-BMS-25', '25 Bags', 550, 950, 35, 10, 'none', 0),
(10, 'JNB-SH-200', '200ml', 350, 650, 40, 10, 'none', 0),
(10, 'JNB-SH-500', '500ml', 600, 1090, 30, 10, 'percent', 10),
(11, 'JNB-LT-200', '200ml', 300, 590, 45, 10, 'none', 0),
(11, 'JNB-LT-500', '500ml', 500, 990, 35, 10, 'none', 0),
(12, 'TB-BW-250', '250ml', 400, 750, 25, 8, 'none', 0),
(12, 'TB-BW-500', '500ml', 650, 1190, 20, 8, 'amount', 200);
