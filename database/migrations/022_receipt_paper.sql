ALTER TABLE store_settings
  ADD COLUMN receipt_paper ENUM('58mm','80mm','A4') NOT NULL DEFAULT '80mm';
