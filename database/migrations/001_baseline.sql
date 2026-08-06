-- Baseline migration: marks the canonical schema as applied.
-- The core tables from babystore_schema.sql are assumed to already exist.
-- This migration is a no-op; it exists so schema_migrations has a starting record.
SELECT 1;
