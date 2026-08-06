-- Per-additional-pack delivery fee for pack-based pricing
ALTER TABLE delivery_zones
  ADD COLUMN IF NOT EXISTS per_additional_pack_fee DECIMAL(10,2) NOT NULL DEFAULT 100.00 AFTER base_fee;
