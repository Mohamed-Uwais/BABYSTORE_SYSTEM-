-- Preserve existing values: historical zero costs cannot be classified without evidence.
ALTER TABLE product_variants MODIFY cost_price DECIMAL(10,2) NULL DEFAULT NULL;
ALTER TABLE stock_batches MODIFY unit_cost DECIMAL(10,2) NULL;
