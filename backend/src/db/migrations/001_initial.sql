CREATE DATABASE IF NOT EXISTS buildsmartai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE buildsmartai;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'builder',
  builder_scale ENUM('SMALL','MID','LARGE') NOT NULL DEFAULT 'SMALL',
  company_name VARCHAR(255),
  phone VARCHAR(50),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS projects (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  client_id INT UNSIGNED DEFAULT NULL,
  client_name VARCHAR(255) NOT NULL,
  builder_id INT UNSIGNED DEFAULT NULL,
  budget DECIMAL(15,2) NOT NULL,
  spent DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  location VARCHAR(255) NOT NULL,
  area DECIMAL(12,2) NOT NULL,
  floors INT NOT NULL,
  type VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'in_progress',
  progress DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  start_date DATE,
  expected_completion DATE,
  risk_level VARCHAR(50) NOT NULL DEFAULT 'low',
  scale ENUM('SMALL','MID','LARGE') NOT NULL DEFAULT 'SMALL',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_projects_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_projects_user (user_id),
  INDEX idx_projects_status (status),
  INDEX idx_projects_scale (scale)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS boq_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  unit VARCHAR(50) NOT NULL,
  quantity DECIMAL(15,4) NOT NULL,
  rate DECIMAL(15,2) NOT NULL,
  rate_source VARCHAR(150) NOT NULL DEFAULT 'market_standard',
  total DECIMAL(15,2) NOT NULL,
  version INT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_boq_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_boq_project (project_id),
  INDEX idx_boq_category (project_id, category)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS contractors (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),
  contact VARCHAR(255),
  address TEXT,
  gst_number VARCHAR(50),
  pan_number VARCHAR(50),
  contract_start_date DATE,
  contract_end_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_contractors_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_contractors_project (project_id),
  INDEX idx_contractors_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS contracts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NOT NULL,
  contractor_id INT UNSIGNED NOT NULL,
  contract_number VARCHAR(100) NOT NULL,
  contract_date DATE NOT NULL,
  contract_value DECIMAL(15,2) NOT NULL,
  retention_percentage DECIMAL(7,2) NOT NULL DEFAULT 0.00,
  gst_applicable TINYINT(1) NOT NULL DEFAULT 0,
  gst_rate DECIMAL(7,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_contracts_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_contracts_contractor FOREIGN KEY (contractor_id) REFERENCES contractors(id) ON DELETE CASCADE,
  UNIQUE KEY uq_contract_project_number (project_id, contract_number),
  INDEX idx_contracts_project (project_id),
  INDEX idx_contracts_contractor (contractor_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS contract_boq_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  contract_id INT UNSIGNED NOT NULL,
  boq_item_id INT UNSIGNED NOT NULL,
  description TEXT NOT NULL,
  unit VARCHAR(50) NOT NULL,
  contracted_quantity DECIMAL(15,4) NOT NULL,
  contract_rate DECIMAL(15,2) NOT NULL,
  contract_amount DECIMAL(15,2) NOT NULL,
  CONSTRAINT fk_contract_boq_contract FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
  INDEX idx_contract_boq_contract (contract_id),
  INDEX idx_contract_boq_item (boq_item_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ra_bills (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NOT NULL,
  contract_id INT UNSIGNED NOT NULL,
  contractor_id INT UNSIGNED NOT NULL,
  bill_number VARCHAR(100) NOT NULL,
  period_start DATE,
  period_end DATE,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  submission_date DATE,
  work_description TEXT,
  gross_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  net_payable DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  retention_percent DECIMAL(7,2) NOT NULL DEFAULT 0.00,
  gst_applicable TINYINT(1) NOT NULL DEFAULT 0,
  gst_rate DECIMAL(7,2) NOT NULL DEFAULT 0.00,
  created_by INT UNSIGNED,
  submitted_by INT UNSIGNED,
  reviewed_by INT UNSIGNED,
  approved_by INT UNSIGNED,
  paid_by INT UNSIGNED,
  rejection_reason TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ra_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_ra_contract FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ra_contractor FOREIGN KEY (contractor_id) REFERENCES contractors(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ra_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_ra_project_contract_bill (project_id, contract_id, bill_number),
  INDEX idx_ra_project (project_id),
  INDEX idx_ra_contractor (contractor_id),
  INDEX idx_ra_status (status),
  INDEX idx_ra_bill_number (bill_number)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ra_bill_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ra_bill_id INT UNSIGNED NOT NULL,
  boq_item_id INT UNSIGNED NOT NULL,
  description TEXT NOT NULL,
  unit VARCHAR(50) NOT NULL,
  contract_quantity DECIMAL(15,4) NOT NULL,
  previously_billed_quantity DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
  current_quantity DECIMAL(15,4) NOT NULL,
  cumulative_quantity DECIMAL(15,4) NOT NULL,
  contract_rate DECIMAL(15,2) NOT NULL,
  current_amount DECIMAL(15,2) NOT NULL,
  cumulative_amount DECIMAL(15,2) NOT NULL,
  CONSTRAINT fk_ra_item_bill FOREIGN KEY (ra_bill_id) REFERENCES ra_bills(id) ON DELETE CASCADE,
  INDEX idx_ra_items_bill (ra_bill_id),
  INDEX idx_ra_items_boq (boq_item_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ra_deductions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ra_bill_id INT UNSIGNED NOT NULL UNIQUE,
  retention DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  advance_recovery DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  penalty DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  other_deduction DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  gst DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  tax_deduction DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  total_deduction DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  CONSTRAINT fk_ra_deduction_bill FOREIGN KEY (ra_bill_id) REFERENCES ra_bills(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ra_bill_payments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ra_bill_id INT UNSIGNED NOT NULL,
  payment_date DATE NOT NULL,
  payment_reference VARCHAR(255) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  payment_status VARCHAR(50) NOT NULL DEFAULT 'completed',
  CONSTRAINT fk_ra_payment_bill FOREIGN KEY (ra_bill_id) REFERENCES ra_bills(id) ON DELETE CASCADE,
  UNIQUE KEY uq_ra_payment_reference (payment_reference),
  INDEX idx_ra_payment_bill (ra_bill_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS expenses (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NOT NULL,
  category VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  expense_date DATE NOT NULL,
  description TEXT NOT NULL,
  source VARCHAR(100) NOT NULL DEFAULT 'Manual Entry',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_expense_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_expenses_project (project_id),
  INDEX idx_expenses_type (project_id, type),
  INDEX idx_expenses_date (project_id, expense_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS workers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  worker_type VARCHAR(50) NOT NULL DEFAULT 'Daily Wage',
  skill VARCHAR(100) NOT NULL,
  contractor_id INT UNSIGNED,
  daily_wage DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_worker_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_worker_contractor FOREIGN KEY (contractor_id) REFERENCES contractors(id) ON DELETE SET NULL,
  INDEX idx_workers_project (project_id),
  INDEX idx_workers_contractor (contractor_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attendance (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NOT NULL,
  worker_id INT UNSIGNED NOT NULL,
  attendance_date DATE NOT NULL,
  status VARCHAR(30) NOT NULL,
  regular_hours DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  overtime_hours DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  regular_wage DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  overtime_wage DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_wage DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_attendance_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_worker FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
  UNIQUE KEY uq_attendance_worker_date (project_id, worker_id, attendance_date),
  INDEX idx_attendance_date (project_id, attendance_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS materials (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NOT NULL,
  material_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  current_stock DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
  unit VARCHAR(50),
  unit_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  supplier VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_material_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_material_project (project_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS material_rates (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED,
  material VARCHAR(255) NOT NULL,
  supplier VARCHAR(255),
  location VARCHAR(255),
  unit VARCHAR(50) NOT NULL,
  current_rate DECIMAL(15,2) NOT NULL,
  previous_rate DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  effective_date DATE NOT NULL,
  source VARCHAR(255),
  last_updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_rate_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_rates_project_material (project_id, material)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS material_inventory (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NOT NULL,
  material VARCHAR(255) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  required_qty DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
  ordered_qty DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
  received_qty DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
  consumed_qty DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
  CONSTRAINT fk_inventory_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_inventory_project_material (project_id, material)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS purchase_orders (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NOT NULL,
  material VARCHAR(255) NOT NULL,
  supplier_name VARCHAR(255) NOT NULL,
  ordered_qty DECIMAL(15,4) NOT NULL,
  rate DECIMAL(15,2) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  order_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Ordered',
  eta DATE,
  CONSTRAINT fk_po_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_po_project_status (project_id, status),
  INDEX idx_po_eta (eta)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS material_logs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NOT NULL,
  material VARCHAR(255) NOT NULL,
  transaction_type VARCHAR(30) NOT NULL,
  quantity DECIMAL(15,4) NOT NULL,
  transaction_date DATE NOT NULL,
  description TEXT,
  CONSTRAINT fk_material_log_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_material_logs_project_date (project_id, transaction_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS daily_logs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  log_date DATE NOT NULL,
  workers INT NOT NULL DEFAULT 0,
  tasks TEXT,
  weather VARCHAR(100),
  equipment_used TEXT,
  issues TEXT,
  safety_notes TEXT,
  progress_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  materials_received TEXT,
  cement_bags DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  steel_tons DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
  bricks DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  photos JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_daily_log_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_daily_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_daily_logs_project_date (project_id, log_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS milestones (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'not_started',
  planned_start DATE,
  planned_end DATE,
  actual_start DATE,
  actual_end DATE,
  progress DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  delay_days INT NOT NULL DEFAULT 0,
  reason TEXT,
  remarks TEXT,
  CONSTRAINT fk_milestone_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_milestones_project (project_id),
  INDEX idx_milestones_status (project_id, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS project_phases (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NOT NULL,
  phase_name VARCHAR(150) NOT NULL,
  planned_start DATE,
  planned_end DATE,
  actual_start DATE,
  actual_end DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'Not Started',
  dependency VARCHAR(150),
  progress DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  delay_days INT NOT NULL DEFAULT 0,
  reason TEXT,
  CONSTRAINT fk_phase_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_phases_project (project_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS compliance_rules (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  jurisdiction VARCHAR(255) NOT NULL,
  project_type VARCHAR(100) NOT NULL,
  applicability TEXT,
  required_document VARCHAR(255),
  due_date_rule VARCHAR(255),
  source VARCHAR(500),
  last_verified_date DATE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS project_compliance_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NOT NULL,
  rule_id INT UNSIGNED,
  requirement VARCHAR(255),
  authority VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'Pending',
  due_date DATE,
  submission_date DATE,
  document_reference VARCHAR(500),
  document_url VARCHAR(1000),
  source VARCHAR(500),
  last_verified_date DATE,
  remarks TEXT,
  CONSTRAINT fk_compliance_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_compliance_rule FOREIGN KEY (rule_id) REFERENCES compliance_rules(id) ON DELETE SET NULL,
  INDEX idx_compliance_project_status (project_id, status),
  INDEX idx_compliance_due_date (due_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS project_compliance_documents (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NOT NULL,
  compliance_item_id INT UNSIGNED,
  document_name VARCHAR(255) NOT NULL,
  version INT NOT NULL DEFAULT 1,
  storage_reference VARCHAR(1000),
  uploaded_by INT UNSIGNED,
  uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATE,
  CONSTRAINT fk_doc_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_doc_item FOREIGN KEY (compliance_item_id) REFERENCES project_compliance_items(id) ON DELETE SET NULL,
  CONSTRAINT fk_doc_user FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_documents_project (project_id),
  INDEX idx_documents_expiry (expires_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED,
  user_id INT UNSIGNED,
  event_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id BIGINT UNSIGNED,
  old_value JSON,
  new_value JSON,
  details JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_project_time (project_id, created_at),
  INDEX idx_audit_entity (entity_type, entity_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS workflow_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED,
  stage VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL,
  reference_type VARCHAR(100),
  reference_id BIGINT UNSIGNED,
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_workflow_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_workflow_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_workflow_project_time (project_id, created_at)
) ENGINE=InnoDB;
