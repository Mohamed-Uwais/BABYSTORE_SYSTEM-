-- Multi-image support for products
CREATE TABLE IF NOT EXISTS product_images (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id      INT UNSIGNED NOT NULL,
    variant_id      INT UNSIGNED DEFAULT NULL,
    image_url       VARCHAR(500) NOT NULL,
    sort_order      INT DEFAULT 0,
    is_primary      TINYINT(1) DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
