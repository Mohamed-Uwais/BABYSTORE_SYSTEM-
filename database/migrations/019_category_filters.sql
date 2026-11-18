-- Additive website metadata. Does not modify products, identifiers or stock.
CREATE TABLE IF NOT EXISTS website_category_filters (
  category_id INT UNSIGNED NOT NULL PRIMARY KEY,
  definitions JSON NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS website_variant_attributes (
  variant_id INT UNSIGNED NOT NULL PRIMARY KEY,
  attribute_values JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
