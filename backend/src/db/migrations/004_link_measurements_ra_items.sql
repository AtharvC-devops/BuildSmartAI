-- Migration 004: Link site_measurements to ra_bill_items

DROP PROCEDURE IF EXISTS upgrade_site_measurements_004;

CREATE PROCEDURE upgrade_site_measurements_004()
BEGIN
  IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='site_measurements' AND COLUMN_NAME='ra_bill_item_id') THEN
    ALTER TABLE site_measurements ADD COLUMN ra_bill_item_id INT UNSIGNED DEFAULT NULL AFTER ra_bill_id;
  END IF;
  
  IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_NAME='site_measurements' AND INDEX_NAME='idx_sm_ra_bill_item') THEN
    ALTER TABLE site_measurements ADD INDEX idx_sm_ra_bill_item (ra_bill_item_id);
  END IF;

  IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
    WHERE TABLE_NAME='site_measurements' AND CONSTRAINT_NAME='fk_sm_ra_bill_item'
  ) THEN
    ALTER TABLE site_measurements 
      ADD CONSTRAINT fk_sm_ra_bill_item FOREIGN KEY (ra_bill_item_id) REFERENCES ra_bill_items(id) ON DELETE SET NULL;
  END IF;
END;

CALL upgrade_site_measurements_004();
DROP PROCEDURE IF EXISTS upgrade_site_measurements_004;
