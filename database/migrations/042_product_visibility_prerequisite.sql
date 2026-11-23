-- Some installations added this existing feature manually. Retain their values.
SET @visibility_ddl = (SELECT IF(COUNT(*)=0,
 'ALTER TABLE products ADD COLUMN show_on_website BOOLEAN NOT NULL DEFAULT TRUE',
 'SELECT 1') FROM information_schema.columns
 WHERE table_schema=DATABASE() AND table_name='products' AND column_name='show_on_website');
PREPARE visibility_statement FROM @visibility_ddl;
EXECUTE visibility_statement;
DEALLOCATE PREPARE visibility_statement;
