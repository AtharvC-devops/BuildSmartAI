-- Migration 002: Add site_measurements table and upgrade RA bills schema
-- Run against buildsmartai database

-- ── 1. Site Measurements ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_measurements (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NOT NULL,
  boq_item_id INT UNSIGNED NOT NULL,
  measurement_date DATE NOT NULL,
  description VARCHAR(500) NOT NULL DEFAULT '',
  quantity DECIMAL(15,4) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  recorded_by VARCHAR(255) NOT NULL DEFAULT 'Site Engineer',
  status ENUM('draft','verified','rejected') NOT NULL DEFAULT 'draft',
  rejection_reason TEXT,
  is_billed TINYINT(1) NOT NULL DEFAULT 0,
  ra_bill_id INT UNSIGNED DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sm_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_sm_boq_item FOREIGN KEY (boq_item_id) REFERENCES boq_items(id) ON DELETE CASCADE,
  INDEX idx_sm_project (project_id),
  INDEX idx_sm_boq (boq_item_id),
  INDEX idx_sm_status (project_id, status),
  INDEX idx_sm_billed (project_id, is_billed)
) ENGINE=InnoDB;

-- ── 2. Upgrade ra_bills: add sequential bill_number format, agreement, statuses ──
ALTER TABLE ra_bills
  ADD COLUMN IF NOT EXISTS agreement_number VARCHAR(100) DEFAULT NULL AFTER bill_number,
  ADD COLUMN IF NOT EXISTS bill_sequence INT UNSIGNED NOT NULL DEFAULT 1 AFTER agreement_number,
  ADD COLUMN IF NOT EXISTS subtotal DECIMAL(15,2) NOT NULL DEFAULT 0.00 AFTER gross_amount,
  ADD COLUMN IF NOT EXISTS gst_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00 AFTER gst_rate,
  ADD COLUMN IF NOT EXISTS retention_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00 AFTER retention_percent,
  ADD COLUMN IF NOT EXISTS other_deductions DECIMAL(15,2) NOT NULL DEFAULT 0.00 AFTER retention_amount;

-- Update status CHECK (MySQL 8.0.16+) – just use application-level enforcement
-- Update bill_number default format
UPDATE ra_bills SET bill_number = CONCAT('RA-', LPAD(bill_sequence, 2, '0')) WHERE bill_number NOT LIKE 'RA-%';

-- ── 3. Upgrade ra_bill_items: add Previous/ThisBill/Total/PartRate columns ──
ALTER TABLE ra_bill_items
  ADD COLUMN IF NOT EXISTS part_rate DECIMAL(15,2) DEFAULT NULL AFTER contract_rate,
  ADD COLUMN IF NOT EXISTS previous_billed_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00 AFTER previously_billed_quantity,
  ADD COLUMN IF NOT EXISTS this_bill_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00 AFTER current_quantity;

-- Rename columns to match spec (safe renames using generated columns not needed in MySQL - use aliases in queries)
-- We'll use in code:
--   previously_billed_quantity = previous_qty
--   current_quantity = this_bill_qty
--   cumulative_quantity = total_qty
--   current_amount = this_bill_amount (via column alias)
--   cumulative_amount = total_amount
