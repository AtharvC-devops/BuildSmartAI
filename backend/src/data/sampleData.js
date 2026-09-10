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
  { id: 1, name: "Sunrise Villa",           clientId: 2, clientName: "Priya Sharma",  builderId: 1, status: "in_progress", budget: 4500000,  spent: 2100000,  progress: 45,  startDate: "2026-01-15", endDate: "2026-08-30",  location: "Mumbai",    area: 2500, floors: 2, type: "Residential",  assignedAgentId: 1, description: "2BHK luxury villa with garden and pool", overrunThreshold: 10, monsoonActive: false, materialDelayActive: false, labourShortageActive: false, approvalDelayActive: false, scaleSegment: "Mid-size Developer" },
  { id: 2, name: "Tech Park Phase 2",       clientId: 4, clientName: "Ananya Desai",  builderId: 1, status: "in_progress", budget: 12000000, spent: 8500000,  progress: 72,  startDate: "2025-09-01", endDate: "2026-06-15",  location: "Pune",      area: 8000, floors: 4, type: "Commercial",   assignedAgentId: 2, description: "Commercial tech park with parking", overrunThreshold: 10, monsoonActive: false, materialDelayActive: false, labourShortageActive: false, approvalDelayActive: false, scaleSegment: "Large Developer" },
  { id: 3, name: "Green Meadows Apartment", clientId: 5, clientName: "Suresh Reddy",  builderId: 3, status: "planning",    budget: 7500000,  spent: 500000,   progress: 8,   startDate: "2026-04-01", endDate: "2027-02-28",  location: "Bangalore", area: 5000, floors: 3, type: "Residential",  assignedAgentId: 5, description: "3BHK apartment complex with amenities", overrunThreshold: 10, monsoonActive: false, materialDelayActive: false, labourShortageActive: false, approvalDelayActive: false, scaleSegment: "Small Contractor" },
  { id: 4, name: "City Mall Renovation",    clientId: 4, clientName: "Ananya Desai",  builderId: 1, status: "completed",   budget: 3200000,  spent: 3050000,  progress: 100, startDate: "2025-06-01", endDate: "2025-12-20",  location: "Delhi",     area: 4000, floors: 2, type: "Commercial",   assignedAgentId: 3, description: "Complete mall interior renovation", overrunThreshold: 10, monsoonActive: false, materialDelayActive: false, labourShortageActive: false, approvalDelayActive: false, scaleSegment: "Large Developer" },
  { id: 5, name: "Lakeside Bungalow",       clientId: 2, clientName: "Priya Sharma",  builderId: 3, status: "on_hold",     budget: 6800000,  spent: 1200000,  progress: 18,  startDate: "2026-02-10", endDate: "2026-11-30",  location: "Udaipur",   area: 3500, floors: 2, type: "Residential",  assignedAgentId: 6, description: "Premium lakeside bungalow", overrunThreshold: 10, monsoonActive: false, materialDelayActive: false, labourShortageActive: false, approvalDelayActive: false, scaleSegment: "Mid-size Developer" },
  { id: 6, name: "Warehouse Complex",       clientId: 5, clientName: "Suresh Reddy",  builderId: 1, status: "in_progress", budget: 5500000,  spent: 3200000,  progress: 58,  startDate: "2025-11-01", endDate: "2026-07-30",  location: "Chennai",   area: 6000, floors: 1, type: "Industrial",   assignedAgentId: 4, description: "Industrial warehouse with loading docks", overrunThreshold: 10, monsoonActive: false, materialDelayActive: false, labourShortageActive: false, approvalDelayActive: false, scaleSegment: "Small Contractor" },
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
  { 
    id: 1, 
    projectId: 1, 
    date: "2026-05-10", 
    workers: 12, 
    tasks: "Scaffolding erection on northern wing", 
    cementBags: 15, 
    steelTons: 0.2, 
    bricks: 0,
    weather: "Sunny",
    equipmentUsed: "Concrete Mixer, Excavator",
    issues: "Minor scaffolding clamps delay resolved",
    safetyNotes: "Safety harnesses checked; no incidents reported.",
    progressPercentage: 2,
    materialsReceived: "JSW Steel reinforcement rods (0.5 tons)",
    photos: ["/simulated-upload/pic1.jpg"]
  },
  { 
    id: 2, 
    projectId: 1, 
    date: "2026-05-11", 
    workers: 14, 
    tasks: "Beam reinforcement welding", 
    cementBags: 5, 
    steelTons: 0.8, 
    bricks: 0,
    weather: "Cloudy",
    equipmentUsed: "Welding Sets, Crane",
    issues: "Power outage for 15 minutes, standby generator utilized",
    safetyNotes: "Welding masks and safety goggles mandatory at all times.",
    progressPercentage: 3,
    materialsReceived: "None",
    photos: ["/simulated-upload/pic2.jpg"]
  },
  { 
    id: 3, 
    projectId: 2, 
    date: "2026-05-09", 
    workers: 22, 
    tasks: "Electrical conduit wiring on 3rd floor", 
    cementBags: 0, 
    steelTons: 0.0, 
    bricks: 0,
    weather: "Sunny",
    equipmentUsed: "Drill Machines, Hand Tools",
    issues: "None",
    safetyNotes: "Electrical lines verified isolated before wiring.",
    progressPercentage: 4,
    materialsReceived: "PVC conduit pipes (50 meters)",
    photos: []
  }
];

const pwdRates = [
  { id: 1, category: "Site preparation", description: "Clearing site of grass, brushwood, and trees, including disposal.", unit: "sqm", rate: 45, rateSource: "Maharashtra PWD Reference Rate" },
  { id: 2, category: "Excavation", description: "Earthwork excavation in ordinary soil for foundations up to 1.5m depth.", unit: "cum", rate: 280, rateSource: "Maharashtra PWD Reference Rate" },
  { id: 3, category: "Foundation", description: "Providing and laying cement concrete 1:4:8 in foundation and plinth.", unit: "cum", rate: 4200, rateSource: "Maharashtra PWD Reference Rate" },
  { id: 4, category: "RCC", description: "Providing and casting reinforced cement concrete M20 grade for columns/beams.", unit: "cum", rate: 6800, rateSource: "Maharashtra PWD Reference Rate" },
  { id: 5, category: "Brick/block work", description: "Providing and constructing brick masonry in cement mortar 1:6.", unit: "cum", rate: 5100, rateSource: "Maharashtra PWD Reference Rate" },
  { id: 6, category: "Plaster", description: "Providing 12mm thick cement plaster 1:4 on walls.", unit: "sqm", rate: 190, rateSource: "Maharashtra PWD Reference Rate" },
  { id: 7, category: "Flooring", description: "Providing and laying vitrified floor tiles (600x600mm) in cement mortar.", unit: "sqm", rate: 850, rateSource: "Maharashtra PWD Reference Rate" },
  { id: 8, category: "Waterproofing", description: "Providing brick bat coba waterproofing treatment on terrace slab.", unit: "sqm", rate: 720, rateSource: "Maharashtra PWD Reference Rate" },
  { id: 9, category: "Plumbing", description: "Providing and fixing internal PPR pipe plumbing line with fittings.", unit: "rm", rate: 380, rateSource: "Maharashtra PWD Reference Rate" },
  { id: 10, category: "Electrical", description: "Wiring for light/fan points with PVC conduits and modular switches.", unit: "point", rate: 650, rateSource: "Maharashtra PWD Reference Rate" },
  { id: 11, category: "Doors/windows", description: "Providing and fixing flush door shutter with teak wood frame.", unit: "sqm", rate: 4200, rateSource: "Maharashtra PWD Reference Rate" },
  { id: 12, category: "Painting", description: "Applying two coats of weather shield acrylic emulsion paint on exterior walls.", unit: "sqm", rate: 160, rateSource: "Maharashtra PWD Reference Rate" },
  { id: 13, category: "Finishing", description: "POP ceiling plaster cornices and decorative designs in living rooms.", unit: "sqm", rate: 250, rateSource: "Maharashtra PWD Reference Rate" },
  { id: 14, category: "Miscellaneous", description: "Fencing, gate installation, and final site clearing.", unit: "LS", rate: 15000, rateSource: "Maharashtra PWD Reference Rate" }
];

const boqItems = [
  // Sunrise Villa (projectId = 1)
  { id: 1, projectId: 1, category: "Site preparation", description: "Clearing site of grass, brushwood, and trees, including disposal.", unit: "sqm", quantity: 250, rate: 45, amount: 11250, rateSource: "Maharashtra PWD Reference Rate" },
  { id: 2, projectId: 1, category: "Excavation", description: "Earthwork excavation in ordinary soil for foundations up to 1.5m depth.", unit: "cum", quantity: 80, rate: 280, amount: 22400, rateSource: "Maharashtra PWD Reference Rate" },
  { id: 3, projectId: 1, category: "Foundation", description: "Providing and laying cement concrete 1:4:8 in foundation and plinth.", unit: "cum", quantity: 30, rate: 4200, amount: 126000, rateSource: "Maharashtra PWD Reference Rate" },
  { id: 4, projectId: 1, category: "RCC", description: "Providing and casting reinforced cement concrete M20 grade for columns/beams.", unit: "cum", quantity: 45, rate: 6800, amount: 306000, rateSource: "Maharashtra PWD Reference Rate" },
  { id: 5, projectId: 1, category: "Brick/block work", description: "Providing and constructing brick masonry in cement mortar 1:6.", unit: "cum", quantity: 50, rate: 5100, amount: 255000, rateSource: "Maharashtra PWD Reference Rate" },
  { id: 6, projectId: 1, category: "Plaster", description: "Providing 12mm thick cement plaster 1:4 on walls.", unit: "sqm", quantity: 600, rate: 190, amount: 114000, rateSource: "Maharashtra PWD Reference Rate" },
  { id: 7, projectId: 1, category: "Flooring", description: "Providing and laying vitrified floor tiles (600x600mm) in cement mortar.", unit: "sqm", quantity: 220, rate: 850, amount: 187000, rateSource: "Maharashtra PWD Reference Rate" },
  
  // Tech Park Phase 2 (projectId = 2)
  { id: 8, projectId: 2, category: "Site preparation", description: "Clearing site of grass, brushwood, and trees, including disposal.", unit: "sqm", quantity: 800, rate: 45, amount: 36000, rateSource: "Maharashtra PWD Reference Rate" },
  { id: 9, projectId: 2, category: "Excavation", description: "Earthwork excavation in ordinary soil for foundations up to 1.5m depth.", unit: "cum", quantity: 240, rate: 280, amount: 67200, rateSource: "Maharashtra PWD Reference Rate" },
  { id: 10, projectId: 2, category: "Foundation", description: "Providing and laying cement concrete 1:4:8 in foundation and plinth.", unit: "cum", quantity: 120, rate: 4200, amount: 504000, rateSource: "Maharashtra PWD Reference Rate" }
];

const expenses = [
  // Sunrise Villa (projectId = 1)
  { id: 1, projectId: 1, category: "Site preparation", type: "Labour", amount: 8000, date: "2026-01-18", description: "Clearance labor payout", source: "Daily Log" },
  { id: 2, projectId: 1, category: "Site preparation", type: "Material", amount: 2000, date: "2026-01-18", description: "Site tools purchase", source: "Manual Entry" },
  { id: 3, projectId: 1, category: "Excavation", type: "Contractor", amount: 24000, date: "2026-02-10", description: "Excavator subcontractor billing", source: "RA Bill" },
  { id: 4, projectId: 1, category: "Foundation", type: "Material", amount: 110000, date: "2026-03-05", description: "Portland cement bulk purchase", source: "Purchase Order" },
  { id: 5, projectId: 1, category: "Foundation", type: "Labour", amount: 20000, date: "2026-03-06", description: "Foundation casting wages", source: "Daily Log" },
  { id: 6, projectId: 1, category: "RCC", type: "Material", amount: 210000, date: "2026-04-12", description: "TMT steel shipment", source: "Purchase Order" }
];

const contractors = [
  { id: 1, name: "Shivaji Civil Works Ltd", contact: "Amit Shivaji", phone: "+91-9811122233", email: "contact@shivajicivil.in" },
  { id: 2, name: "Vardhaman Plasterers", contact: "Vikas Shah", phone: "+91-9811122244", email: "info@vardhaman.in" }
];

const contracts = [
  { id: 1, projectId: 1, contractorId: 1, name: "Civil, Excavation, and Foundation Contract", value: 800000 },
  { id: 2, projectId: 1, contractorId: 2, name: "Plastering and Flooring Contract", value: 300000 }
];

const raBills = [
  {
    id: 1,
    projectId: 1,
    contractorId: 1,
    billNumber: "RAB-01",
    billingPeriod: "Jan 2026 - Feb 2026",
    workDescription: "Site prep and foundation casting",
    gstPercent: 18,
    retentionPercent: 5,
    status: "Approved",
    date: "2026-02-28"
  },
  {
    id: 2,
    projectId: 1,
    contractorId: 1,
    billNumber: "RAB-02",
    billingPeriod: "Mar 2026 - Apr 2026",
    workDescription: "Footing castings and pillar pillars",
    gstPercent: 18,
    retentionPercent: 5,
    status: "Submitted",
    date: "2026-04-30"
  }
];

const raBillItems = [
  // Bill 1 Items
  { id: 1, billId: 1, boqItemId: 1, quantityCompleted: 250, rate: 45, prevQuantity: 0 }, 
  { id: 2, billId: 1, boqItemId: 2, quantityCompleted: 80, rate: 280, prevQuantity: 0 },  
  { id: 3, billId: 1, boqItemId: 3, quantityCompleted: 15, rate: 4200, prevQuantity: 0 }, 

  // Bill 2 Items
  { id: 4, billId: 2, boqItemId: 3, quantityCompleted: 10, rate: 4200, prevQuantity: 15 }, 
  { id: 5, billId: 2, boqItemId: 4, quantityCompleted: 20, rate: 6800, prevQuantity: 0 }    
];

const workers = [
  { id: 1, name: "Rajesh Kumar", workerType: "Skilled", skill: "Brick/block work", contractorId: 1, dailyWage: 850, status: "active" },
  { id: 2, name: "Vijay Yadav", workerType: "Semi-Skilled", skill: "Excavation", contractorId: 1, dailyWage: 650, status: "active" },
  { id: 3, name: "Sanjay Paswan", workerType: "Unskilled", skill: "Site preparation", contractorId: 1, dailyWage: 450, status: "active" },
  { id: 4, name: "Ramesh Solanki", workerType: "Skilled", skill: "Plaster", contractorId: 2, dailyWage: 800, status: "active" },
  { id: 5, name: "Anil Kadam", workerType: "Semi-Skilled", skill: "Plaster", contractorId: 2, dailyWage: 600, status: "active" }
];

const attendance = [
  { id: 1, projectId: 1, date: "2026-08-30", workerId: 1, status: "Present", regularHours: 8, overtimeHours: 2, regularWage: 850, overtimeWage: 318.75, totalWage: 1168.75 },
  { id: 2, projectId: 1, date: "2026-08-30", workerId: 2, status: "Present", regularHours: 8, overtimeHours: 0, regularWage: 650, overtimeWage: 0, totalWage: 650 },
  { id: 3, projectId: 1, date: "2026-08-30", workerId: 3, status: "Half-Day", regularHours: 4, overtimeHours: 0, regularWage: 225, overtimeWage: 0, totalWage: 225 },
  { id: 4, projectId: 1, date: "2026-08-30", workerId: 4, status: "Absent", regularHours: 0, overtimeHours: 0, regularWage: 0, overtimeWage: 0, totalWage: 0 }
];

const materialRates = [
  { id: 1, material: "Cement", location: "Mumbai", unit: "bag", rate: 420, previousRate: 390, effectiveDate: "2026-08-15", source: "Mumbai Cement Wholesalers Assn" },
  { id: 2, material: "Steel", location: "Mumbai", unit: "ton", rate: 65000, previousRate: 68000, effectiveDate: "2026-08-10", source: "JSW Steel Yard Pune" },
  { id: 3, material: "Sand", location: "Mumbai", unit: "brass", rate: 6500, previousRate: 5800, effectiveDate: "2026-08-20", source: "Thane Sand Supplier Union" },
  { id: 4, material: "Aggregate", location: "Mumbai", unit: "brass", rate: 3800, previousRate: 3800, effectiveDate: "2026-08-01", source: "Navi Mumbai Metal Quarry" },
  { id: 5, material: "Bricks/Blocks", location: "Mumbai", unit: "pcs", rate: 8, previousRate: 7.5, effectiveDate: "2026-08-12", source: "Kalyan Clay Kilns" },
  { id: 6, material: "Tiles", location: "Mumbai", unit: "sqft", rate: 85, previousRate: 80, effectiveDate: "2026-08-18", source: "Morbi Tiles Depot" },
  { id: 7, material: "Paint", location: "Mumbai", unit: "litre", rate: 280, previousRate: 260, effectiveDate: "2026-08-22", source: "Asian Paints Dealer Hub" },
  { id: 8, material: "Electrical materials", location: "Mumbai", unit: "LS", rate: 12000, previousRate: 12000, effectiveDate: "2026-08-01", source: "Lohar Chawl Wholesale" },
  { id: 9, material: "Plumbing materials", location: "Mumbai", unit: "LS", rate: 9500, previousRate: 9000, effectiveDate: "2026-08-05", source: "Turbhe Plumbing Market" }
];

const materialInventory = [
  { id: 1, projectId: 1, material: "Cement", unit: "bag", requiredQty: 1000, orderedQty: 600, receivedQty: 500, consumedQty: 450 },
  { id: 2, projectId: 1, material: "Steel", unit: "ton", requiredQty: 25, orderedQty: 15, receivedQty: 12, consumedQty: 10 },
  { id: 3, projectId: 1, material: "Sand", unit: "brass", requiredQty: 200, orderedQty: 100, receivedQty: 90, consumedQty: 85 },
  { id: 4, projectId: 1, material: "Aggregate", unit: "brass", requiredQty: 150, orderedQty: 80, receivedQty: 75, consumedQty: 70 },
  { id: 5, projectId: 1, material: "Bricks/Blocks", unit: "pcs", requiredQty: 20000, orderedQty: 15000, receivedQty: 15000, consumedQty: 12000 },
  { id: 6, projectId: 1, material: "Tiles", unit: "sqft", requiredQty: 3000, orderedQty: 0, receivedQty: 0, consumedQty: 0 },
  { id: 7, projectId: 1, material: "Paint", unit: "litre", requiredQty: 500, orderedQty: 0, receivedQty: 0, consumedQty: 0 },
  { id: 8, projectId: 1, material: "Electrical materials", unit: "LS", requiredQty: 2, orderedQty: 1, receivedQty: 1, consumedQty: 1 },
  { id: 9, projectId: 1, material: "Plumbing materials", unit: "LS", requiredQty: 2, orderedQty: 1, receivedQty: 1, consumedQty: 1 }
];

const purchaseOrders = [
  { id: 1, projectId: 1, material: "Cement", supplierName: "UltraTech Depot Thane", orderedQty: 600, rate: 410, amount: 246000, date: "2026-08-01", status: "Delivered", eta: "2026-08-03" },
  { id: 2, projectId: 1, material: "Steel", supplierName: "JSW Steel Yard Pune", orderedQty: 15, rate: 64000, amount: 960000, date: "2026-08-10", status: "Delivered", eta: "2026-08-12" },
  { id: 3, projectId: 1, material: "Sand", supplierName: "Thane River Sand Traders", orderedQty: 100, rate: 6300, amount: 630000, date: "2026-08-25", status: "Ordered", eta: "2026-08-28" }
];

const materialLogs = [
  { id: 1, projectId: 1, material: "Cement", type: "Receipt", quantity: 500, date: "2026-08-03", description: "First delivery UltraTech PO#1" },
  { id: 2, projectId: 1, material: "Cement", type: "Consumption", quantity: 450, date: "2026-08-10", description: "Foundation casting works log" },
  { id: 3, projectId: 1, material: "Steel", type: "Receipt", quantity: 12, date: "2026-08-12", description: "JSW steel shipment PO#2" },
  { id: 4, projectId: 1, material: "Steel", type: "Consumption", quantity: 10, date: "2026-08-15", description: "Plinth beam reinforcement" }
];

const projectPhases = [
  // Sunrise Villa (projectId = 1)
  { id: 1, projectId: 1, phaseName: "Planning", plannedStart: "2026-01-15", plannedEnd: "2026-02-01", actualStart: "2026-01-15", actualEnd: "2026-02-01", status: "Completed", dependency: "None", progress: 100, delayDays: 0 },
  { id: 2, projectId: 1, phaseName: "Site Preparation", plannedStart: "2026-02-02", plannedEnd: "2026-02-15", actualStart: "2026-02-02", actualEnd: "2026-02-17", status: "Completed", dependency: "Planning", progress: 100, delayDays: 2 },
  { id: 3, projectId: 1, phaseName: "Excavation", plannedStart: "2026-02-16", plannedEnd: "2026-03-05", actualStart: "2026-02-18", actualEnd: "2026-03-10", status: "Completed", dependency: "Site Preparation", progress: 100, delayDays: 3 },
  { id: 4, projectId: 1, phaseName: "Foundation", plannedStart: "2026-03-06", plannedEnd: "2026-03-25", actualStart: "2026-03-12", actualEnd: "2026-03-31", status: "Completed", dependency: "Excavation", progress: 100, delayDays: 0 },
  { id: 5, projectId: 1, phaseName: "RCC/Structure", plannedStart: "2026-03-26", plannedEnd: "2026-05-10", actualStart: "2026-04-01", actualEnd: "2026-05-20", status: "Completed", dependency: "Foundation", progress: 100, delayDays: 5 },
  { id: 6, projectId: 1, phaseName: "Brickwork", plannedStart: "2026-05-11", plannedEnd: "2026-05-30", actualStart: "2026-05-21", actualEnd: "2026-06-12", status: "Completed", dependency: "RCC/Structure", progress: 100, delayDays: 8 },
  { id: 7, projectId: 1, phaseName: "Plaster", plannedStart: "2026-06-01", plannedEnd: "2026-06-20", actualStart: "2026-06-13", actualEnd: "2026-06-30", status: "Completed", dependency: "Brickwork", progress: 100, delayDays: 4 },
  { id: 8, projectId: 1, phaseName: "Electrical", plannedStart: "2026-06-21", plannedEnd: "2026-07-05", actualStart: "2026-07-01", actualEnd: "2026-07-10", status: "Completed", dependency: "Plaster", progress: 100, delayDays: 2 },
  { id: 9, projectId: 1, phaseName: "Plumbing", plannedStart: "2026-07-06", plannedEnd: "2026-07-20", actualStart: "2026-07-11", actualEnd: "2026-07-24", status: "Completed", dependency: "Electrical", progress: 100, delayDays: 1 },
  { id: 10, projectId: 1, phaseName: "Flooring", plannedStart: "2026-07-21", plannedEnd: "2026-08-05", actualStart: "2026-07-25", actualEnd: "", status: "In Progress", dependency: "Plumbing", progress: 65, delayDays: 4 },
  { id: 11, projectId: 1, phaseName: "Painting", plannedStart: "2026-08-06", plannedEnd: "2026-08-18", actualStart: "", actualEnd: "", status: "Not Started", dependency: "Flooring", progress: 0, delayDays: 0 },
  { id: 12, projectId: 1, phaseName: "Finishing", plannedStart: "2026-08-19", plannedEnd: "2026-08-25", actualStart: "", actualEnd: "", status: "Not Started", dependency: "Painting", progress: 0, delayDays: 0 },
  { id: 13, projectId: 1, phaseName: "Inspection", plannedStart: "2026-08-26", plannedEnd: "2026-08-28", actualStart: "", actualEnd: "", status: "Not Started", dependency: "Finishing", progress: 0, delayDays: 0 },
  { id: 14, projectId: 1, phaseName: "Handover", plannedStart: "2026-08-29", plannedEnd: "2026-08-30", actualStart: "", actualEnd: "", status: "Not Started", dependency: "Inspection", progress: 0, delayDays: 0 }
];

const projectCompliance = [
  { id: 1, projectId: 1, complianceType: "Regulatory", documentName: "MahaRERA Registration Certificate", status: "Approved", submissionDate: "2026-01-10", dueDate: "2026-01-20", documentReference: "MahaRERA/P1-MUMBAI/2026-003", remarks: "Approved for residential layout development" },
  { id: 2, projectId: 1, complianceType: "Municipal", documentName: "Commencement Certificate (CC)", status: "Approved", submissionDate: "2026-01-12", dueDate: "2026-01-25", documentReference: "MCGM/BP-VILLA/CC-293", remarks: "CC granted up to Plinth Level" },
  { id: 3, projectId: 1, complianceType: "Environmental", documentName: "State Pollution Control Board NOC", status: "Approved", submissionDate: "2026-01-15", dueDate: "2026-02-05", documentReference: "MPCB/NOC/2026-904", remarks: "NOC for sand screening and concrete mixing operations at site" },
  { id: 4, projectId: 1, complianceType: "Structural", documentName: "Structural Stability Report (Third Party Validation)", status: "Submitted", submissionDate: "2026-08-25", dueDate: "2026-09-10", documentReference: "IITB/CIVIL/STRUCT-92", remarks: "Report uploaded, municipal review in progress" },
  { id: 5, projectId: 1, complianceType: "Fire Safety", documentName: "Provisional Fire NOC", status: "Pending", submissionDate: "", dueDate: "2026-09-15", documentReference: "", remarks: "Application dossier prepared, waiting for layout inspection fee certification" }
];

const complianceRules = [
  { id: 1, name: "MahaRERA Registration", jurisdiction: "Mumbai", projectType: "Residential", applicability: "Area > 500 sqm or units > 8", requiredDocument: "MahaRERA Registration Certificate", dueDateRule: "Within 30 days of project launch" },
  { id: 2, name: "MCGM Commencement Certificate (CC)", jurisdiction: "Mumbai", projectType: "Residential", applicability: "All residential layouts", requiredDocument: "Commencement Certificate (CC)", dueDateRule: "Before site excavation" },
  { id: 3, name: "State Pollution Board NOC", jurisdiction: "Mumbai", projectType: "Residential", applicability: "Projects with concrete mixing", requiredDocument: "Pollution Control Board NOC", dueDateRule: "Before plinth construction" },
  { id: 4, name: "Third-Party Structural Stability Validation", jurisdiction: "Mumbai", projectType: "Residential", applicability: "All RCC frame structures", requiredDocument: "Structural Stability Report", dueDateRule: "Before finishing phase" },
  { id: 5, name: "Provisional Fire Safety NOC", jurisdiction: "Mumbai", projectType: "Residential", applicability: "All residential towers", requiredDocument: "Provisional Fire NOC", dueDateRule: "Before occupancy certification" }
];

const projectComplianceItems = [
  { id: 1, projectId: 1, ruleId: 1, status: "Approved", dueDate: "2026-02-15", submissionDate: "2026-02-10", documentReference: "MahaRERA/P1-MUMBAI/2026-003", remarks: "MahaRERA registry completed", linkedDocumentUrl: "https://maharera.mahaonline.gov.in/cert/1" },
  { id: 2, projectId: 1, ruleId: 2, status: "Approved", dueDate: "2026-02-20", submissionDate: "2026-02-18", documentReference: "MCGM/VILLA/CC-2026", remarks: "CC granted up to plinth", linkedDocumentUrl: "https://mcgm.gov.in/cc/villa" },
  { id: 3, projectId: 1, ruleId: 3, status: "Approved", dueDate: "2026-03-01", submissionDate: "2026-02-25", documentReference: "MPCB/NOC/904", remarks: "Pollution NOC active", linkedDocumentUrl: "" },
  { id: 4, projectId: 1, ruleId: 4, status: "Submitted", dueDate: "2026-09-15", submissionDate: "2026-08-25", documentReference: "IITB/CIVIL/STRUCT-92", remarks: "Report uploaded, waiting MCGM seal", linkedDocumentUrl: "" },
  { id: 5, projectId: 1, ruleId: 5, status: "Pending", dueDate: "2026-09-10", submissionDate: "", documentReference: "", remarks: "Liaison fee validation in progress", linkedDocumentUrl: "" }
];

module.exports = { users, agents, projects, bookings, reviews, services, monthlyData, suppliers, milestones, dailyLogs, pwdRates, boqItems, expenses, contractors, contracts, raBills, raBillItems, workers, attendance, materialRates, materialInventory, purchaseOrders, materialLogs, projectPhases, projectCompliance, complianceRules, projectComplianceItems };
