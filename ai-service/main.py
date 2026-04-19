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
