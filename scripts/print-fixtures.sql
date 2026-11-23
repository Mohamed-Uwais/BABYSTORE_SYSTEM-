INSERT IGNORE INTO categories(name,slug) VALUES ('Review','review')
;
INSERT IGNORE INTO products(category_id,name,slug) SELECT id,'Adjustable baby carrier with extended padded shoulder straps and detachable waterproof travel pouch','review-carrier' FROM categories WHERE slug='review'
;
INSERT IGNORE INTO product_variants(product_id,sku,variant_label,retail_price,current_stock) SELECT id,'TEST-CARRIER','Midnight blue / large',2500,10 FROM products WHERE slug='review-carrier'
;
INSERT IGNORE INTO orders(order_number,channel,status,subtotal,discount_total,grand_total) VALUES ('PRINT-CASH','pos','completed',5000,325,4675),('PRINT-SPLIT','pos','partially_refunded',5000,325,4675)
;
INSERT INTO order_items(order_id,variant_id,quantity,unit_price,discount_amount,line_total) SELECT o.id,v.id,2,2500,325,4675 FROM orders o JOIN product_variants v ON v.sku='TEST-CARRIER' WHERE o.order_number IN ('PRINT-CASH','PRINT-SPLIT') AND NOT EXISTS(SELECT 1 FROM order_items i WHERE i.order_id=o.id)
;
INSERT INTO order_payments(order_id,payment_method,amount) SELECT o.id,p.method,p.amount FROM orders o JOIN (SELECT 'PRINT-CASH' n,'cash' method,5000 amount UNION ALL SELECT 'PRINT-SPLIT','cash',2675 UNION ALL SELECT 'PRINT-SPLIT','card',2000) p ON p.n=o.order_number WHERE NOT EXISTS(SELECT 1 FROM order_payments op WHERE op.order_id=o.id AND op.payment_method=p.method)
;
INSERT INTO order_returns(order_id,order_item_id,quantity,reason,refund_amount,processed_by) SELECT o.id,i.id,1,'Review return',2337.50,u.id FROM orders o JOIN order_items i ON i.order_id=o.id JOIN users u ON u.username='print_reviewer' WHERE o.order_number='PRINT-SPLIT' AND NOT EXISTS(SELECT 1 FROM order_returns r WHERE r.order_id=o.id)
;
UPDATE order_payments op JOIN orders o ON o.id=op.order_id SET op.cash_tendered=IF(o.order_number='PRINT-CASH',5000,3000),op.amount=IF(o.order_number='PRINT-CASH',4675,2675) WHERE o.order_number IN ('PRINT-CASH','PRINT-SPLIT') AND op.payment_method='cash'
;
UPDATE orders SET receipt_coupon_code='REVIEW100', receipt_coupon_amount=100 WHERE order_number IN ('PRINT-CASH','PRINT-SPLIT')
;
UPDATE order_items i JOIN orders o ON i.order_id=o.id SET i.line_total=5000,i.discount_amount=0 WHERE o.order_number IN ('PRINT-CASH','PRINT-SPLIT')
