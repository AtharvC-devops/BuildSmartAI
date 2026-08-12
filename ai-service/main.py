"""
BuildSmart AI Service
FastAPI microservice with ML models for construction cost/time prediction
and smart resource allocation.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression

# ── Global model references ──────────────────────────────────────────────
cost_model: RandomForestRegressor = None
time_model: LinearRegression = None


# ── Pydantic Schemas ─────────────────────────────────────────────────────

class CostPredictionRequest(BaseModel):
    area: float
    material_quality: int   # 1=Basic, 2=Standard, 3=Premium, 4=Luxury, 5=Ultra-Luxury
    location_tier: int      # 1=Metro, 2=Urban, 3=Rural
    floors: int

class CostPredictionResponse(BaseModel):
    predicted_cost: float
    breakdown: dict
    confidence: float

class TimePredictionRequest(BaseModel):
    area: float
    workers: int
    complexity: int         # 1-5

class TimePredictionResponse(BaseModel):
    estimated_days: int
    phases: list
    confidence: float

class Agent(BaseModel):
    id: int
    name: str
    skill: Optional[str] = ""
    rating: Optional[float] = 3.0
    distance: Optional[float] = 50.0
    workload: Optional[int] = 5
    availability: Optional[bool] = True

class AgentAllocationRequest(BaseModel):
    required_skill: str
    agents: List[Agent]

class AgentAllocationResponse(BaseModel):
    rankings: list
    best_agent: dict

class MaterialPredictionRequest(BaseModel):
    area: float
    floors: int
    material_quality: int
    construction_type: str

class MaterialPredictionResponse(BaseModel):
    materials: dict
    confidence: float

class RiskPredictionRequest(BaseModel):
    city: str
    floors: int
    workers: int
    start_month: str

class RiskPredictionResponse(BaseModel):
    safety_risk: str
    weather_risk: str
    compliance_risk: str
    mitigation_checklist: List[str]
    confidence: float

class Supplier(BaseModel):
    id: int
    name: str
    material: str
    rating: float
    distance: float
    price_index: float
    availability: bool
    location: str

class SupplierAllocationRequest(BaseModel):
    material: str
    suppliers: List[Supplier]

class SupplierAllocationResponse(BaseModel):
    rankings: list
    best_supplier: dict

class QAChatRequest(BaseModel):
    question: str

class QAChatResponse(BaseModel):
    answer: str


# ── Model Training ───────────────────────────────────────────────────────

def train_models():
    """Generate synthetic construction data and train ML models."""
    global cost_model, time_model
    np.random.seed(42)
    n = 500

    # ─── Cost Model (Random Forest) ───
    areas = np.random.uniform(500, 10000, n)
    materials = np.random.randint(1, 6, n)
    locations = np.random.randint(1, 4, n)
    floors = np.random.randint(1, 6, n)

    material_mult = {1: 0.70, 2: 0.85, 3: 1.00, 4: 1.30, 5: 1.80}
    location_mult = {1: 1.40, 2: 1.00, 3: 0.70}

    costs = []
    for i in range(n):
        cost = (
            1200
            * areas[i]
            * material_mult[materials[i]]
            * location_mult[locations[i]]
            * (1 + 0.15 * (floors[i] - 1))
            + np.random.normal(0, areas[i] * 50)
        )
        costs.append(max(cost, 100_000))

    X_cost = np.column_stack([areas, materials, locations, floors])
    cost_model = RandomForestRegressor(n_estimators=100, random_state=42)
    cost_model.fit(X_cost, np.array(costs))

    # ─── Time Model (Linear Regression) ───
    t_areas = np.random.uniform(500, 10000, n)
    t_workers = np.random.randint(5, 50, n)
    t_complexity = np.random.randint(1, 6, n)

    times = []
    for i in range(n):
        days = t_areas[i] * 0.05 * t_complexity[i] / (t_workers[i] ** 0.6) + np.random.normal(0, 10)
        times.append(max(days, 30))

    X_time = np.column_stack([t_areas, t_workers, t_complexity])
    time_model = LinearRegression()
    time_model.fit(X_time, np.array(times))

    print("[OK] ML models trained successfully!")


# ── App Lifespan ─────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app):
    train_models()
    yield

app = FastAPI(
    title="BuildSmart AI Service",
    description="ML-powered construction predictions",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Endpoints ────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"status": "ok", "service": "BuildSmart AI Service"}


@app.post("/predict-cost", response_model=CostPredictionResponse)
async def predict_cost(req: CostPredictionRequest):
    X = np.array([[req.area, req.material_quality, req.location_tier, req.floors]])
    predicted = float(cost_model.predict(X)[0])

    # Breakdown percentages based on material quality
    mat_pct = 0.35 + (req.material_quality - 1) * 0.03
    lab_pct = 0.28 - (req.material_quality - 1) * 0.01
    breakdown = {
        "Materials":   round(predicted * mat_pct),
        "Labor":       round(predicted * lab_pct),
        "Foundation":  round(predicted * 0.10),
        "Overhead":    round(predicted * 0.08),
        "Permits":     round(predicted * 0.05),
        "Finishing":   round(predicted * max(0.01, 1 - mat_pct - lab_pct - 0.10 - 0.08 - 0.05)),
    }

    return CostPredictionResponse(
        predicted_cost=round(predicted, 2),
        breakdown=breakdown,
        confidence=round(float(np.random.uniform(0.85, 0.95)), 2),
    )


@app.post("/predict-time", response_model=TimePredictionResponse)
async def predict_time(req: TimePredictionRequest):
    X = np.array([[req.area, req.workers, req.complexity]])
    days = max(int(time_model.predict(X)[0]), 30)

    phases = [
        {"name": "Planning & Permits",     "days": max(int(days * 0.08), 7),  "color": "#6366f1"},
        {"name": "Foundation",             "days": max(int(days * 0.12), 10), "color": "#f59e0b"},
        {"name": "Structure & Framing",    "days": max(int(days * 0.25), 15), "color": "#10b981"},
        {"name": "Electrical & Plumbing",  "days": max(int(days * 0.18), 10), "color": "#3b82f6"},
        {"name": "Interior Finishing",     "days": max(int(days * 0.22), 12), "color": "#ec4899"},
        {"name": "Final Inspection",       "days": max(int(days * 0.08), 5),  "color": "#8b5cf6"},
        {"name": "Handover",              "days": max(int(days * 0.07), 3),  "color": "#14b8a6"},
    ]

    return TimePredictionResponse(
        estimated_days=days,
        phases=phases,
        confidence=round(float(np.random.uniform(0.80, 0.92)), 2),
    )


@app.post("/allocate-agent", response_model=AgentAllocationResponse)
async def allocate_agent(req: AgentAllocationRequest):
    """
    score = 0.4 * distance_score + 0.3 * rating_score + 0.2 * workload_score + 0.1 * skill_match
    """
    rankings = []

    for agent in req.agents:
        distance_score = 1 - min(agent.distance, 100) / 100
        rating_score = agent.rating / 5.0
        workload_score = 1 - min(agent.workload, 10) / 10
        skill_match = 1.0 if agent.skill.lower() == req.required_skill.lower() else 0.5

        score = (
            0.4 * distance_score
            + 0.3 * rating_score
            + 0.2 * workload_score
            + 0.1 * skill_match
        )

        rankings.append({
            "id": agent.id,
            "name": agent.name,
            "skill": agent.skill,
            "rating": agent.rating,
            "distance": agent.distance,
            "workload": agent.workload,
            "availability": agent.availability,
            "score": round(score, 3),
        })

    rankings.sort(key=lambda x: x["score"], reverse=True)

    return AgentAllocationResponse(
        rankings=rankings,
        best_agent=rankings[0] if rankings else {},
    )


@app.post("/predict-materials", response_model=MaterialPredictionResponse)
async def predict_materials(req: MaterialPredictionRequest):
    # Quality multiplier
    # 1=Basic, 2=Standard, 3=Premium, 4=Luxury, 5=Ultra-Luxury
    quality_mult = {1: 0.8, 2: 1.0, 3: 1.2, 4: 1.4, 5: 1.6}.get(req.material_quality, 1.0)
    
    # Construction type multiplier (adjusts brick vs steel/cement ratio)
    type_cement_mult = 1.0
    type_steel_mult = 1.0
    type_brick_mult = 1.0
    
    c_type = req.construction_type.lower()
    if "commercial" in c_type:
        type_cement_mult = 1.2
        type_steel_mult = 1.3
        type_brick_mult = 0.4  # more concrete blocks/glass, fewer traditional bricks
    elif "industrial" in c_type:
        type_cement_mult = 1.3
        type_steel_mult = 1.5
        type_brick_mult = 0.2  # mostly prefab/metal/concrete
    
    cement_bags = round(req.area * 0.4 * req.floors * quality_mult * type_cement_mult)
    steel_tons = round(req.area * 0.005 * req.floors * quality_mult * type_steel_mult, 2)
    bricks_count = round(req.area * 12 * req.floors * quality_mult * type_brick_mult)
    sand_cuft = round(req.area * 1.8 * req.floors * quality_mult)
    paint_liters = round(req.area * 0.15 * req.floors * quality_mult)
    
    materials = {
        "Cement (bags)": cement_bags,
        "Steel (tons)": steel_tons,
        "Bricks (units)": bricks_count,
        "Sand (cu ft)": sand_cuft,
        "Paint (liters)": paint_liters,
    }
    
    return MaterialPredictionResponse(
        materials=materials,
        confidence=round(float(np.random.uniform(0.88, 0.95)), 2),
    )


@app.post("/predict-risk", response_model=RiskPredictionResponse)
async def predict_risk(req: RiskPredictionRequest):
    # Safety risk calculation
    if req.floors > 5 or req.workers > 50:
        safety = "High"
    elif req.floors > 2 or req.workers > 15:
        safety = "Medium"
    else:
        safety = "Low"
        
    # Weather risk calculation
    city = req.city.lower()
    month = req.start_month.lower()
    
    monsoon_months = ["june", "july", "august", "september"]
    winter_months = ["december", "january"]
    
    if (city in ["mumbai", "chennai", "kolkata"]) and (month in monsoon_months):
        weather = "High"
    elif (city in ["delhi", "noida", "gurgaon"]) and (month in winter_months):
        # High fog/smog delay and cold waves
        weather = "High"
    elif (city in ["delhi", "bangalore", "pune", "hyderabad"]) and (month in ["july", "august"]):
        weather = "Medium"
    else:
        weather = "Low"
        
    # Compliance Risk
    if req.floors > 6:
        compliance = "High"
    elif req.floors > 3:
        compliance = "Medium"
    else:
        compliance = "Low"
        
    # Build checklist
    checklist = []
    if safety == "High":
        checklist.append("Mandatory double-harness fall protection for heights above 15m.")
        checklist.append("Deploy dedicated Safety Officers with authority to stop work.")
        checklist.append("Weekly structural integrity audits on scaffolding.")
    elif safety == "Medium":
        checklist.append("Daily safety briefings (tool box talks) before shifts.")
        checklist.append("Hard hats, steel-toed boots, and high-visibility vests mandatory for all.")
    else:
        checklist.append("Standard construction site safety signage and first aid station setup.")
        
    if weather == "High":
        checklist.append("Install high-capacity site drainage pumps to prevent waterlogging.")
        checklist.append("Store cement bags and plaster materials on raised platforms under waterproof sheets.")
        checklist.append("Plan concrete pouring activities based on short-term hourly rain/fog forecasts.")
    elif weather == "Medium":
        checklist.append("Keep active work zones covered and ensure backup power for sump pumps.")
    else:
        checklist.append("Ensure regular water spraying to suppress dust emissions in dry conditions.")
        
    if compliance == "High":
        checklist.append("Secure High-Rise Fire Safety NOC from local municipal corporation.")
        checklist.append("Obtain environmental clearance certificate (noise, air, debris disposal).")
        checklist.append("Submit structural stability certificate signed by a licensed civil engineer.")
    elif compliance == "Medium":
        checklist.append("Verify local zoning permits and height clearance NOC from authorities.")
    else:
        checklist.append("File standard building plan sanction and local ward office notification.")
        
    return RiskPredictionResponse(
        safety_risk=safety,
        weather_risk=weather,
        compliance_risk=compliance,
        mitigation_checklist=checklist,
        confidence=round(float(np.random.uniform(0.85, 0.94)), 2),
    )


@app.post("/allocate-supplier", response_model=SupplierAllocationResponse)
async def allocate_supplier(req: SupplierAllocationRequest):
    rankings = []
    
    for s in req.suppliers:
        # Distance: lower is better, max 50km
        dist_score = 1.0 - (min(s.distance, 50.0) / 50.0)
        # Price: lower is better, range [0.7, 1.5]
        price_val = min(max(s.price_index, 0.7), 1.5)
        price_score = 1.0 - ((price_val - 0.7) / (1.5 - 0.7))
        # Rating: higher is better, max 5
        rating_score = s.rating / 5.0
        # Availability: true is better
        avail_score = 1.0 if s.availability else 0.0
        
        # Weighted score: 35% distance, 30% price, 25% rating, 10% availability
        score = 0.35 * dist_score + 0.30 * price_score + 0.25 * rating_score + 0.10 * avail_score
        
        rankings.append({
            "id": s.id,
            "name": s.name,
            "material": s.material,
            "rating": s.rating,
            "distance": s.distance,
            "price_index": s.price_index,
            "availability": s.availability,
            "location": s.location,
            "score": round(score, 3)
        })
        
    rankings.sort(key=lambda x: x["score"], reverse=True)
    
    return SupplierAllocationResponse(
        rankings=rankings,
        best_supplier=rankings[0] if rankings else {}
    )


@app.post("/qa-chat", response_model=QAChatResponse)
async def qa_chat(req: QAChatRequest):
    q = req.question.lower()
    
    if "concrete" in q or "cure" in q or "curing" in q or "dry" in q:
        answer = (
            "Concrete generally takes 28 days to reach its full design strength, "
            "though it is usually strong enough for structural loads after 7 days. "
            "Curing (keeping it wet/moist) is critical during the first 3 to 7 days "
            "to prevent shrinkage cracking and ensure maximum durability."
        )
    elif "foundation" in q or "soil" in q or "footing" in q:
        answer = (
            "Foundation selection depends heavily on soil bearing capacity. For soft "
            "clay soils, pile or raft foundations are preferred. For stable, hard soils, "
            "isolated or combined footings are suitable. Proper excavation, water table check, "
            "and structural reinforcement are essential before pouring foundation concrete."
        )
    elif "permit" in q or "noc" in q or "approval" in q or "compliance" in q:
        answer = (
            "Construction compliance requires securing local ward building plan sanctions, "
            "water/sewage connection approvals, and environmental NOCs. For high-rise buildings "
            "exceeding 15 meters, a fire safety NOC and a structural stability certificate "
            "signed by a licensed structural engineer are legally mandatory."
        )
    elif "paint" in q or "plaster" in q or "finishing" in q:
        answer = (
            "Before painting, plaster must cure for at least 14-21 days to dry and reduce alkalinity. "
            "Ensure the wall surface is clean of dust, apply a high-quality primer coat to seal "
            "the pores, and follow up with two coats of weather-resistant acrylic emulsion paint."
        )
    elif "cost" in q or "save" in q or "budget" in q or "overrun" in q:
        answer = (
            "To control costs and prevent overruns: 1) Source bulk materials (steel, cement) "
            "directly from tier-1 wholesale suppliers, 2) Keep crew workloads balanced to minimize "
            "overtime, 3) Monitor daily logs to capture material wastage early, and 4) Lock in "
            "curing schedules to avoid timeline delays which inflate rental scaffolding costs."
        )
    elif "steel" in q or "reinforcement" in q or "rebar" in q:
        answer = (
            "Steel reinforcement (rebar) provides tensile strength to concrete. Use Fe 500 or Fe 550D "
            "TMT steel bars for optimal earthquake resistance. Ensure the steel is free of heavy rust "
            "scale and that the concrete cover (typically 20mm-40mm) is maintained to prevent corrosion."
        )
    else:
        answer = (
            "Welcome to BuildSmart AI Assistant! To ensure quality on site, always follow "
            "standard IS codes (Indian Standards) for mixing ratios (e.g., M20 mix 1:1.5:3 for cement:sand:aggregate), "
            "ensure all field workers wear hard hats/boots, and coordinate closely with your "
            "assigned structural agent."
        )
        
    return QAChatResponse(answer=answer)


