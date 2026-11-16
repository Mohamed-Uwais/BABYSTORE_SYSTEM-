-- Additive staging migration. Existing website_content remains the published store.
-- Do not execute against production without approved release and verified backup.
CREATE TABLE IF NOT EXISTS website_studio_draft (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  document JSON NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 0,
  updated_by INT UNSIGNED NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS website_studio_revisions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  document JSON NOT NULL,
  source_version INT UNSIGNED NOT NULL,
  action VARCHAR(20) NOT NULL,
  created_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
