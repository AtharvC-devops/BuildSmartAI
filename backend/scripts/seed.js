const mysql = require("mysql2/promise");
require("dotenv").config();
const { hashPassword } = require("../src/utils/password");

const config = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "buildsmartai",
  multipleStatements: false
};

async function seed() {
  const connection = await mysql.createConnection(config);
  try {
    await connection.beginTransaction();
    const users = [
      [1, "small@buildsmart.com", "Ramesh Sharma (Small Scale Builder)", "builder", "SMALL", "Sharma Custom Homes"],
      [2, "mid@buildsmart.com", "Anil Deshmukh (Mid Scale Builder)", "builder", "MID", "Metro Infrastructure & Living"],
      [3, "large@buildsmart.com", "Vikramaditya Singhania (Large Scale Builder)", "builder", "LARGE", "Apex Global Megastructures Infra"],
      [4, "finance@buildsmart.com", "Apex Finance Controller", "finance", "LARGE", "Apex Global Megastructures Infra"],
      [5, "site.engineer@buildsmart.com", "Apex Site Engineer", "site_engineer", "LARGE", "Apex Global Megastructures Infra"],
      [6, "project.manager@buildsmart.com", "Apex Project Manager", "project_manager", "LARGE", "Apex Global Megastructures Infra"],
      [7, "priya@gmail.com", "Priya Sharma", "client", "SMALL", null]
    ];
    for (const [id, email, name, role, scale, company] of users) {
      await connection.execute(
        "INSERT INTO users (id, email, password, name, role, builder_scale, company_name) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), role=VALUES(role), builder_scale=VALUES(builder_scale), company_name=VALUES(company_name)",
        [id, email, hashPassword("password123"), name, role, scale, company]
      );
    }

    const projects = [
      [1, 1, "Green Valley Villa 4BHK", "Rajesh Patel", 3500000, 1200000, "Pune, Maharashtra", 2400, 2, "residential", "in_progress", 35, "2025-01-10", "low", "SMALL"],
      [2, 2, "Skyline Heights Tower A", "Prestige Realty Group", 25000000, 14500000, "Bengaluru, Karnataka", 18000, 7, "residential", "in_progress", 58, "2024-09-01", "medium", "MID"],
      [3, 3, "Metropolis IT Tech Park Phase II", "CyberCorp Tech Parks Ltd", 150000000, 62000000, "Hyderabad, Telangana", 120000, 18, "commercial", "in_progress", 42, "2024-05-10", "medium", "LARGE"],
      [4, 3, "Apex Riverside Residences", "Apex Homebuyers", 90000000, 28000000, "Navi Mumbai, Maharashtra", 64000, 14, "residential", "in_progress", 31, "2025-06-01", "medium", "LARGE"],
      [5, 3, "Apex Pune Commercial Hub", "Apex Commercial", 120000000, 76000000, "Pune, Maharashtra", 95000, 12, "commercial", "on_hold", 64, "2024-11-15", "high", "LARGE"]
    ];
    for (const project of projects) {
      await connection.execute(
        "INSERT INTO projects (id, user_id, name, client_name, budget, spent, location, area, floors, type, status, progress, start_date, risk_level, scale) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), budget=VALUES(budget), spent=VALUES(spent), status=VALUES(status), progress=VALUES(progress), scale=VALUES(scale)",
        project
      );
    }

    await connection.execute("INSERT IGNORE INTO contractors (id, project_id, name, company_name, contact, address, gst_number, pan_number, contract_start_date, contract_end_date) VALUES (1,1,'Shivaji Civil Works Ltd','Shivaji Civil Works Ltd','+91-9811122233','Thane, Maharashtra','27AABCS1234F1Z5','AABCS1234F','2026-01-01','2026-12-31'), (2,1,'Vardhaman Plasterers','Vardhaman Plasterers','+91-9811122244','Pune, Maharashtra','27AABCV5678G1Z2','AABCV5678G','2026-03-01','2026-11-30'), (3,2,'Maharashtra Regional Civil Works','Maharashtra Regional Civil Works','+91-9822001122','Nashik, Maharashtra','27AABCM2468K1Z4','AABCM2468K','2025-09-01','2026-08-31'), (4,3,'Apex Structural Contractors','Apex Structural Contractors','+91-9819008899','Hyderabad, Telangana','36AABCA1357L1Z8','AABCA1357L','2025-01-01','2027-01-31')");
    await connection.execute("INSERT IGNORE INTO contracts (id,project_id,contractor_id,contract_number,contract_date,contract_value,retention_percentage,gst_applicable,gst_rate) VALUES (1,1,1,'CNT-2026-001','2026-01-01',800000,5,1,18),(2,1,2,'CNT-2026-002','2026-03-01',300000,5,1,18),(3,2,3,'CNT-MID-2025-001','2025-09-01',5000000,5,1,18),(4,3,4,'CNT-LARGE-2025-001','2025-01-01',30000000,5,1,18)");
    await connection.execute("INSERT IGNORE INTO boq_items (id,project_id,category,description,unit,quantity,rate,rate_source,total) VALUES (1,1,'Site Preparation','Site clearing','sqm',250,45,'Maharashtra PWD Reference Rate',11250),(2,1,'Excavation','Foundation excavation','cum',80,280,'Maharashtra PWD Reference Rate',22400),(3,1,'Foundation','Foundation concrete','cum',30,4200,'Maharashtra PWD Reference Rate',126000),(8,2,'Site Preparation','Regional site preparation','sqm',800,45,'Maharashtra PWD Reference Rate',36000),(9,2,'Excavation','Tower foundation excavation','cum',240,280,'Maharashtra PWD Reference Rate',67200),(10,2,'Foundation','Tower foundation concrete','cum',120,4200,'Maharashtra PWD Reference Rate',504000),(20,3,'RCC','Commercial RCC frame','cum',1800,6800,'Telangana DSR Reference Rate',12240000)");
    await connection.execute("INSERT IGNORE INTO contract_boq_items (contract_id,boq_item_id,description,unit,contracted_quantity,contract_rate,contract_amount) VALUES (1,1,'Site clearing','sqm',250,45,11250),(1,2,'Foundation excavation','cum',80,280,22400),(1,3,'Foundation concrete','cum',30,4200,126000),(3,8,'Regional site preparation','sqm',800,45,36000),(3,9,'Tower foundation excavation','cum',240,280,67200),(3,10,'Tower foundation concrete','cum',120,4200,504000),(4,20,'Commercial RCC frame','cum',1800,6800,12240000)");
    await connection.execute("INSERT IGNORE INTO workers (id,project_id,name,worker_type,skill,contractor_id,daily_wage) VALUES (1,1,'Rajesh Kumar','Skilled','Brickwork',1,850),(2,1,'Vijay Yadav','Semi-Skilled','Excavation',1,650),(3,2,'Mohan Patil','Skilled','RCC',3,900),(4,3,'Suresh Reddy','Skilled','Structural',4,1100)");
    await connection.execute("INSERT IGNORE INTO material_rates (id,project_id,material,supplier,location,unit,current_rate,previous_rate,effective_date,source) VALUES (1,1,'Cement','UltraTech Depot','Pune','bag',420,390,'2026-08-15','Local supplier quote'),(2,2,'Steel','JSW Steel Yard','Nashik','ton',65000,68000,'2026-08-10','Regional supplier quote'),(3,3,'Cement','UltraTech Depot','Hyderabad','bag',440,410,'2026-08-20','Approved vendor quote'),(4,3,'Steel','Tata Tiscon','Hyderabad','ton',67000,64000,'2026-08-20','Approved vendor quote')");
    await connection.execute("INSERT IGNORE INTO project_phases (project_id,phase_name,planned_start,planned_end,status,progress,delay_days) VALUES (1,'Foundation','2026-03-06','2026-03-25','Completed',100,0),(2,'RCC/Structure','2026-03-26','2026-05-10','In Progress',72,5),(3,'Planning','2025-05-10','2025-06-10','Completed',100,0),(3,'RCC/Structure','2026-01-01','2026-04-30','In Progress',64,12)");
    await connection.commit();
    console.log("[SEED] Development data seeded into MySQL (all demo passwords: password123)");
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

seed().catch(error => {
  console.error("[SEED] Failed:", error.message);
  process.exitCode = 1;
});
