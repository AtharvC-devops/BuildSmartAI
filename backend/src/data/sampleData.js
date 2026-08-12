// ══════════════════════════════════════════════════════════════════════════
// BuildSmart AI — In-Memory Sample Data
// Mirrors PostgreSQL schema: Users, Agents, Projects, Bookings, Reviews
// ══════════════════════════════════════════════════════════════════════════

const users = [
  { id: 1, name: "Rajesh Kumar",  email: "rajesh@buildsmart.com", role: "builder",  company: "Kumar Constructions",  phone: "+91-9876543210", avatar: "RK", joinedDate: "2024-06-15" },
  { id: 2, name: "Priya Sharma",  email: "priya@gmail.com",       role: "customer", company: null,                   phone: "+91-9876543211", avatar: "PS", joinedDate: "2025-01-20" },
  { id: 3, name: "Vikram Singh",  email: "vikram@buildtech.in",   role: "builder",  company: "BuildTech Solutions",  phone: "+91-9876543212", avatar: "VS", joinedDate: "2024-03-10" },
  { id: 4, name: "Ananya Desai",  email: "ananya@gmail.com",      role: "customer", company: null,                   phone: "+91-9876543213", avatar: "AD", joinedDate: "2025-02-28" },
  { id: 5, name: "Suresh Reddy",  email: "suresh@gmail.com",      role: "customer", company: null,                   phone: "+91-9876543214", avatar: "SR", joinedDate: "2025-03-15" },
];

const agents = [
  { id: 1, name: "Amit Patel",      skill: "Structural",  rating: 4.8, availability: true,  distance: 12, workload: 3,  hourlyRate: 850,  completedProjects: 47, experience: 12, avatar: "AP" },
  { id: 2, name: "Deepak Verma",    skill: "Electrical",  rating: 4.5, availability: true,  distance: 8,  workload: 5,  hourlyRate: 750,  completedProjects: 35, experience: 8,  avatar: "DV" },
  { id: 3, name: "Meena Joshi",     skill: "Interior",    rating: 4.9, availability: false, distance: 25, workload: 7,  hourlyRate: 900,  completedProjects: 62, experience: 15, avatar: "MJ" },
  { id: 4, name: "Karan Malhotra",  skill: "Plumbing",    rating: 4.2, availability: true,  distance: 15, workload: 2,  hourlyRate: 650,  completedProjects: 28, experience: 6,  avatar: "KM" },
  { id: 5, name: "Sunita Rao",      skill: "Structural",  rating: 4.6, availability: true,  distance: 20, workload: 4,  hourlyRate: 800,  completedProjects: 41, experience: 10, avatar: "SR" },
  { id: 6, name: "Rahul Gupta",     skill: "Finishing",   rating: 4.7, availability: true,  distance: 5,  workload: 6,  hourlyRate: 780,  completedProjects: 53, experience: 11, avatar: "RG" },
  { id: 7, name: "Pooja Iyer",      skill: "Electrical",  rating: 4.4, availability: true,  distance: 30, workload: 1,  hourlyRate: 720,  completedProjects: 22, experience: 5,  avatar: "PI" },
  { id: 8, name: "Arun Nair",       skill: "Interior",    rating: 4.3, availability: true,  distance: 18, workload: 3,  hourlyRate: 680,  completedProjects: 31, experience: 7,  avatar: "AN" },
];

const projects = [
  { id: 1, name: "Sunrise Villa",           clientId: 2, clientName: "Priya Sharma",  builderId: 1, status: "in_progress", budget: 4500000,  spent: 2100000,  progress: 45,  startDate: "2026-01-15", endDate: "2026-08-30",  location: "Mumbai",    area: 2500, floors: 2, type: "Residential",  assignedAgentId: 1, description: "2BHK luxury villa with garden and pool" },
  { id: 2, name: "Tech Park Phase 2",       clientId: 4, clientName: "Ananya Desai",  builderId: 1, status: "in_progress", budget: 12000000, spent: 8500000,  progress: 72,  startDate: "2025-09-01", endDate: "2026-06-15",  location: "Pune",      area: 8000, floors: 4, type: "Commercial",   assignedAgentId: 2, description: "Commercial tech park with parking" },
  { id: 3, name: "Green Meadows Apartment", clientId: 5, clientName: "Suresh Reddy",  builderId: 3, status: "planning",    budget: 7500000,  spent: 500000,   progress: 8,   startDate: "2026-04-01", endDate: "2027-02-28",  location: "Bangalore", area: 5000, floors: 3, type: "Residential",  assignedAgentId: 5, description: "3BHK apartment complex with amenities" },
  { id: 4, name: "City Mall Renovation",    clientId: 4, clientName: "Ananya Desai",  builderId: 1, status: "completed",   budget: 3200000,  spent: 3050000,  progress: 100, startDate: "2025-06-01", endDate: "2025-12-20",  location: "Delhi",     area: 4000, floors: 2, type: "Commercial",   assignedAgentId: 3, description: "Complete mall interior renovation" },
  { id: 5, name: "Lakeside Bungalow",       clientId: 2, clientName: "Priya Sharma",  builderId: 3, status: "on_hold",     budget: 6800000,  spent: 1200000,  progress: 18,  startDate: "2026-02-10", endDate: "2026-11-30",  location: "Udaipur",   area: 3500, floors: 2, type: "Residential",  assignedAgentId: 6, description: "Premium lakeside bungalow" },
  { id: 6, name: "Warehouse Complex",       clientId: 5, clientName: "Suresh Reddy",  builderId: 1, status: "in_progress", budget: 5500000,  spent: 3200000,  progress: 58,  startDate: "2025-11-01", endDate: "2026-07-30",  location: "Chennai",   area: 6000, floors: 1, type: "Industrial",   assignedAgentId: 4, description: "Industrial warehouse with loading docks" },
];

const bookings = [
  { id: 1, userId: 2, projectId: 1, serviceType: "Full Construction",    date: "2025-12-20", status: "confirmed", amount: 4500000  },
  { id: 2, userId: 4, projectId: 2, serviceType: "Commercial Build",     date: "2025-08-15", status: "confirmed", amount: 12000000 },
  { id: 3, userId: 5, projectId: 3, serviceType: "Apartment Complex",    date: "2026-03-10", status: "pending",   amount: 7500000  },
  { id: 4, userId: 4, projectId: 4, serviceType: "Renovation",           date: "2025-05-20", status: "completed", amount: 3200000  },
  { id: 5, userId: 2, projectId: 5, serviceType: "Bungalow Construction", date: "2026-01-25", status: "on_hold",  amount: 6800000  },
];

const reviews = [
  { id: 1, agentId: 1, userId: 2, projectId: 1, rating: 5, comment: "Excellent structural work. Very professional and timely.",          date: "2026-03-15" },
  { id: 2, agentId: 2, userId: 4, projectId: 2, rating: 4, comment: "Good electrical work, minor delays but quality output.",             date: "2026-02-20" },
  { id: 3, agentId: 3, userId: 4, projectId: 4, rating: 5, comment: "Outstanding interior work. Exceeded expectations!",                  date: "2025-12-25" },
  { id: 4, agentId: 5, userId: 5, projectId: 3, rating: 4, comment: "Reliable and skilled. Would recommend for structural projects.",     date: "2026-03-28" },
  { id: 5, agentId: 6, userId: 2, projectId: 5, rating: 4, comment: "Great finishing quality, hope project resumes soon.",                date: "2026-03-10" },
];

const services = [
  { id: 1, name: "Residential Construction", description: "Complete home construction from foundation to finishing",          minBudget: 2000000,  maxBudget: 20000000, duration: "6-18 months", icon: "🏠", category: "construction" },
  { id: 2, name: "Commercial Build",         description: "Office spaces, retail outlets, and commercial complexes",          minBudget: 5000000,  maxBudget: 50000000, duration: "8-24 months", icon: "🏢", category: "construction" },
  { id: 3, name: "Renovation & Remodeling",  description: "Interior and exterior renovation of existing structures",          minBudget: 500000,   maxBudget: 10000000, duration: "2-6 months",  icon: "🔨", category: "renovation"   },
  { id: 4, name: "Interior Design",          description: "Complete interior design and execution",                           minBudget: 300000,   maxBudget: 5000000,  duration: "1-4 months",  icon: "🎨", category: "design"       },
  { id: 5, name: "Structural Consultation",  description: "Expert structural analysis and consultation",                      minBudget: 50000,    maxBudget: 500000,   duration: "1-2 weeks",   icon: "📐", category: "consultation" },
  { id: 6, name: "Industrial Construction",  description: "Warehouses, factories, and industrial facilities",                 minBudget: 3000000,  maxBudget: 30000000, duration: "6-12 months", icon: "🏭", category: "construction" },
];

// Monthly spending data for dashboard charts
const monthlyData = [
  { month: "Jul",  budget: 1200000,  actual: 1150000  },
  { month: "Aug",  budget: 1400000,  actual: 1380000  },
  { month: "Sep",  budget: 1600000,  actual: 1720000  },
  { month: "Oct",  budget: 1800000,  actual: 1650000  },
  { month: "Nov",  budget: 2000000,  actual: 2100000  },
  { month: "Dec",  budget: 1900000,  actual: 1850000  },
  { month: "Jan",  budget: 2200000,  actual: 2050000  },
  { month: "Feb",  budget: 2400000,  actual: 2380000  },
  { month: "Mar",  budget: 2600000,  actual: 2750000  },
  { month: "Apr",  budget: 2100000,  actual: 2000000  },
];

const suppliers = [
  { id: 1, name: "Ultratech Cement Depot", material: "Cement", rating: 4.8, distance: 5, priceIndex: 1.05, availability: true, location: "Mumbai" },
  { id: 2, name: "Ambuja Cement Supply", material: "Cement", rating: 4.5, distance: 12, priceIndex: 0.95, availability: true, location: "Mumbai" },
  { id: 3, name: "ACC Cement Hub", material: "Cement", rating: 4.2, distance: 22, priceIndex: 0.85, availability: true, location: "Pune" },
  { id: 4, name: "Tata Tiscon Steel Store", material: "Steel", rating: 4.9, distance: 8, priceIndex: 1.10, availability: true, location: "Mumbai" },
  { id: 5, name: "JSW NeoSteel Traders", material: "Steel", rating: 4.6, distance: 15, priceIndex: 1.00, availability: true, location: "Mumbai" },
  { id: 6, name: "Sail Steel Yards", material: "Steel", rating: 4.3, distance: 28, priceIndex: 0.90, availability: false, location: "Pune" },
  { id: 7, name: "Lafarge Brickworks Ltd", material: "Bricks", rating: 4.4, distance: 18, priceIndex: 0.95, availability: true, location: "Pune" },
  { id: 8, name: "JK Brick Kilns", material: "Bricks", rating: 4.1, distance: 30, priceIndex: 0.80, availability: true, location: "Mumbai" },
  { id: 9, name: "Apex Clay Bricks", material: "Bricks", rating: 4.7, distance: 9, priceIndex: 1.15, availability: true, location: "Mumbai" },
  { id: 10, name: "Reliable Sand & Aggregates", material: "Sand", rating: 4.5, distance: 14, priceIndex: 1.00, availability: true, location: "Mumbai" },
  { id: 11, name: "Riverbed Sand Miners", material: "Sand", rating: 4.0, distance: 35, priceIndex: 0.85, availability: true, location: "Pune" },
  { id: 12, name: "Asian Paints Exclusive", material: "Paint", rating: 4.9, distance: 3, priceIndex: 1.20, availability: true, location: "Mumbai" },
  { id: 13, name: "Berger Paints Depot", material: "Paint", rating: 4.6, distance: 7, priceIndex: 1.00, availability: true, location: "Mumbai" },
  { id: 14, name: "Nerolac Paint Hub", material: "Paint", rating: 4.2, distance: 15, priceIndex: 0.90, availability: true, location: "Pune" },
];

const milestones = [
  // Sunrise Villa (Priya Sharma, Rajesh Kumar)
  { id: 1, projectId: 1, name: "Site Planning & Permitting", status: "completed", date: "2026-01-20", remarks: "All approvals in place." },
  { id: 2, projectId: 1, name: "Excavation & Foundation", status: "completed", date: "2026-03-10", remarks: "Foundation concrete poured." },
  { id: 3, projectId: 1, name: "Framing & Structure", status: "in_progress", date: "2026-05-12", remarks: "Pillar casting active." },
  { id: 4, projectId: 1, name: "Plumbing, Wiring & Plastering", status: "not_started", date: null, remarks: "" },
  { id: 5, projectId: 1, name: "Interior Finishing & Paint", status: "not_started", date: null, remarks: "" },
  { id: 6, projectId: 1, name: "Final Walkthrough & Handover", status: "not_started", date: null, remarks: "" },

  // Tech Park Phase 2 (Ananya Desai, Rajesh Kumar)
  { id: 7, projectId: 2, name: "Site Planning & Permitting", status: "completed", date: "2025-09-10", remarks: "NOC secured." },
  { id: 8, projectId: 2, name: "Excavation & Foundation", status: "completed", date: "2025-11-20", remarks: "Dual cell basement completed." },
  { id: 9, projectId: 2, name: "Framing & Structure", status: "completed", date: "2026-02-28", remarks: "All 4 floors casted." },
  { id: 10, projectId: 2, name: "Plumbing, Wiring & Plastering", status: "in_progress", date: "2026-05-01", remarks: "Electrical trunking underway." },
  { id: 11, projectId: 2, name: "Interior Finishing & Paint", status: "not_started", date: null, remarks: "" },
  { id: 12, projectId: 2, name: "Final Walkthrough & Handover", status: "not_started", date: null, remarks: "" },

  // Green Meadows Apartment (Suresh Reddy, Vikram Singh)
  { id: 13, projectId: 3, name: "Site Planning & Permitting", status: "in_progress", date: "2026-04-10", remarks: "Zoning approval pending." },
  { id: 14, projectId: 3, name: "Excavation & Foundation", status: "not_started", date: null, remarks: "" },
  { id: 15, projectId: 3, name: "Framing & Structure", status: "not_started", date: null, remarks: "" },
  { id: 16, projectId: 3, name: "Plumbing, Wiring & Plastering", status: "not_started", date: null, remarks: "" },
  { id: 17, projectId: 3, name: "Interior Finishing & Paint", status: "not_started", date: null, remarks: "" },
  { id: 18, projectId: 3, name: "Final Walkthrough & Handover", status: "not_started", date: null, remarks: "" },

  // City Mall Renovation (Ananya Desai, Rajesh Kumar)
  { id: 19, projectId: 4, name: "Site Planning & Permitting", status: "completed", date: "2025-06-15", remarks: "Structural audit complete." },
  { id: 20, projectId: 4, name: "Excavation & Foundation", status: "completed", date: "2025-08-01", remarks: "Footings reinforced." },
  { id: 21, projectId: 4, name: "Framing & Structure", status: "completed", date: "2025-09-30", remarks: "Shell completed." },
  { id: 22, projectId: 4, name: "Plumbing, Wiring & Plastering", status: "completed", date: "2025-11-15", remarks: "Fittings completed." },
  { id: 23, projectId: 4, name: "Interior Finishing & Paint", status: "completed", date: "2025-12-10", remarks: "Cladding and paint finished." },
  { id: 24, projectId: 4, name: "Final Walkthrough & Handover", status: "completed", date: "2025-12-20", remarks: "Project handed over to owners." },

  // Lakeside Bungalow (Priya Sharma, Vikram Singh)
  { id: 25, projectId: 5, name: "Site Planning & Permitting", status: "completed", date: "2026-02-20", remarks: "Sanctions active." },
  { id: 26, projectId: 5, name: "Excavation & Foundation", status: "in_progress", date: "2026-03-05", remarks: "Excavation paused." },
  { id: 27, projectId: 5, name: "Framing & Structure", status: "not_started", date: null, remarks: "" },
  { id: 28, projectId: 5, name: "Plumbing, Wiring & Plastering", status: "not_started", date: null, remarks: "" },
  { id: 29, projectId: 5, name: "Interior Finishing & Paint", status: "not_started", date: null, remarks: "" },
  { id: 30, projectId: 5, name: "Final Walkthrough & Handover", status: "not_started", date: null, remarks: "" },

  // Warehouse Complex (Suresh Reddy, Rajesh Kumar)
  { id: 31, projectId: 6, name: "Site Planning & Permitting", status: "completed", date: "2025-11-10", remarks: "Warehouse design approved." },
  { id: 32, projectId: 6, name: "Excavation & Foundation", status: "completed", date: "2026-01-15", remarks: "Heavy columns footings completed." },
  { id: 33, projectId: 6, name: "Framing & Structure", status: "in_progress", date: "2026-03-20", remarks: "Gantry girders installation." },
  { id: 34, projectId: 6, name: "Plumbing, Wiring & Plastering", status: "not_started", date: null, remarks: "" },
  { id: 35, projectId: 6, name: "Interior Finishing & Paint", status: "not_started", date: null, remarks: "" },
  { id: 36, projectId: 6, name: "Final Walkthrough & Handover", status: "not_started", date: null, remarks: "" }
];

const dailyLogs = [
  { id: 1, projectId: 1, date: "2026-05-10", workers: 12, tasks: "Scaffolding erection on northern wing", cementBags: 15, steelTons: 0.2, bricks: 0 },
  { id: 2, projectId: 1, date: "2026-05-11", workers: 14, tasks: "Beam reinforcement welding", cementBags: 5, steelTons: 0.8, bricks: 0 },
  { id: 3, projectId: 2, date: "2026-05-09", workers: 22, tasks: "Electrical conduit wiring on 3rd floor", cementBags: 0, steelTons: 0.0, bricks: 0 },
];

module.exports = { users, agents, projects, bookings, reviews, services, monthlyData, suppliers, milestones, dailyLogs };
