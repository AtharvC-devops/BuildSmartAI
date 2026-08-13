# 🏗️ BuildSmart AI — Intelligent Construction Management Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?style=flat-square&logo=express)](https://expressjs.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![JWT](https://img.shields.io/badge/Auth-JWT_%26_Bcrypt-CB3837?style=flat-square&logo=json-web-tokens)](https://jwt.io/)
[![Machine Learning](https://img.shields.io/badge/ML-Scikit--Learn-F7931E?style=flat-square&logo=scikit-learn)](https://scikit-learn.org/)

**BuildSmart AI** is a state-of-the-art, AI-powered construction management platform designed to streamline project workflows, estimate construction costs with 90%+ accuracy, predict project timelines, allocate field resources using machine learning, and manage daily site logs and milestones.

The application features a strict **Role-Based Access Control (RBAC)** architecture that cleanly separates user experiences into two dedicated application paths: **Builder (`/builder/*`)** and **Client (`/client/*`)**.

---

## 🌟 Key Features & Role Separation

```
                       ┌──────────────────────────────┐
                       │    BuildSmart AI Platform    │
                       └──────────────┬───────────────┘
                                      │
                         ┌────────────┴────────────┐
                         │ Role-Based Auth Engine  │
                         └────────────┬────────────┘
                                      │
            ┌─────────────────────────┴─────────────────────────┐
            ▼                                                   ▼
 🔨 BUILDER WORKSPACE (`/builder/*`)               👤 CLIENT WORKSPACE (`/client/*`)
 ├── Overview & KPI Metrics                        ├── Client Dashboard & My Projects
 ├── AI Cost Prediction (Random Forest ML)         ├── Search & Compare Services
 ├── Time Estimation & Phase Breakdown             ├── Interactive AI Quote Calculator
 ├── Smart Resource & Agent Allocation             └── Real-Time Project Milestone Tracker
 ├── Material Sourcing & CPWD BOQ Estimator
 ├── AI Risk Advisor & Checklist
 ├── Daily Work & Material Logs
 └── Milestone Tracker & Auto Progress
```

### 1. 🔨 Builder Workspace (`/builder/*`)
- **Dashboard Overview**: Monitor active projects, budget usage, spending trends, and pending client launch requests.
- **AI Cost Prediction**: Random Forest ML model trained on 13,000+ real property data points + CPWD Schedule of Rates bill of quantities (BOQ) estimator.
- **Time Estimation**: Phase-by-phase project timeline breakdown powered by regression models.
- **Smart Resource Allocation**: Automated scoring algorithm matching field agents based on skill, location distance, rating, and current workload.
- **Material Sourcing & Suppliers**: Ranking suppliers by price index, distance, and availability.
- **Risk Advisor**: Weather, safety, and compliance risk analysis with customized mitigation checklists.
- **Daily Logs**: Log labor shifts, cement bags, steel tonnage, and brick consumption with automatic project expenditure calculation.
- **Project Milestones**: Track milestone progression with auto-calculated project completion percentages.

### 2. 👤 Client Workspace (`/client/*`)
- **Client Dashboard**: Track project progress, budget status, and assigned builder info.
- **Search Services**: Browse construction categories (Residential, Commercial, Industrial, Renovation, Interior).
- **Cost Estimate**: Custom interactive quote calculator predicting costs and timelines based on built-up area, material quality, and floors.
- **Project Tracking**: View live milestone status updates submitted by builders.

### 3. 🔒 Role-Based Access Control (RBAC) & Security
- **JWT & Bcrypt Authentication**: Passwords hashed securely using `bcryptjs` (10 rounds). Stateless session tokens signed with JSON Web Tokens.
- **Route Guarding (`ProtectedRoute`)**: Unauthenticated users trying to access `/builder/*` or `/client/*` are redirected to `/login`.
- **Role Enforcement**: Clients attempting to open `/builder` routes are denied and automatically redirected to `/client` (and vice versa).
- **API Authorization**: Backend routes validate Bearer tokens and enforce role permissions (`requireRole("builder")`).

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | Next.js 16 (App Router), React 19, TailwindCSS v4, Framer Motion, Recharts, Lucide Icons |
| **Backend API** | Node.js, Express 4, JWT (`jsonwebtoken`), Bcrypt (`bcryptjs`), CORS, Axios |
| **AI / ML Service** | Python 3.9+, FastAPI, Scikit-learn (Random Forest Regressor), Pandas, NumPy |
| **Database** | In-Memory Relational Schema (Mirrors PostgreSQL schema: Users, Projects, Agents, Bookings, Milestones, Daily Logs) |

---

## 🔑 Default Local Test Credentials

You can test the role-based experience out of the box using pre-configured demo credentials:

| Role | Email | Password | Assigned Dashboard |
| :--- | :--- | :--- | :--- |
| **Builder Pro** | `rajesh@buildsmart.com` | `password123` | `/builder` |
| **Builder Tech** | `vikram@buildtech.in` | `password123` | `/builder` |
| **Client** | `priya@gmail.com` | `password123` | `/client` |
| **Client** | `ananya@gmail.com` | `password123` | `/client` |

> 💡 *Note: You can also register a new account on the `/register` page by choosing **"Continue as Builder"** or **"Continue as Client"**.*

---

## 🚀 Step-by-Step Setup & Running Guide

### Prerequisites
Make sure you have the following installed on your system:
- **Node.js** (v18.0.0 or higher) & `npm`
- **Python** (v3.9 or higher) & `pip`

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/AtharvC-devops/BuildSmartAI.git
cd BuildSmartAI
```

---

### Step 2: Start the Backend API Service

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Express backend server:
   ```bash
   npm start
   ```
   *The Express backend server will start on **`http://localhost:5000`**.*

---

### Step 3: Start the Python AI/ML Microservice

1. Open a new terminal window and navigate to the `ai-service` directory:
   ```bash
   cd ai-service
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Train the ML model (if required):
   ```bash
   python train_model.py
   ```

4. Start the FastAPI microservice:
   ```bash
   python main.py
   ```
   *The Python AI service will start on **`http://localhost:8000`**.*

---

### Step 4: Start the Frontend Application

1. Open another terminal window and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Next.js development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to **`http://localhost:3000`**.

---

## 📂 Project Structure

```
BuildSmartAI/
├── backend/                        # Express Node.js Backend API
│   ├── src/
│   │   ├── data/
│   │   │   └── sampleData.js       # In-memory relational database
│   │   ├── middleware/
│   │   │   └── auth.middleware.js  # JWT validation & role authorization
│   │   ├── routes/
│   │   │   ├── ai.routes.js        # Microservice proxy endpoints
│   │   │   ├── auth.routes.js      # Register, Login, Me endpoints
│   │   │   ├── projects.routes.js  # Protected project management APIs
│   │   │   └── users.routes.js     # User & Agent query APIs
│   │   └── server.js               # Main Express entry point
│   └── package.json
│
├── frontend/                       # Next.js 16 App Router Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── builder/            # Dedicated Builder Workspace
│   │   │   │   ├── cost-prediction/
│   │   │   │   ├── daily-logs/
│   │   │   │   ├── material-sourcing/
│   │   │   │   ├── project-milestones/
│   │   │   │   ├── resource-allocation/
│   │   │   │   ├── risk-advisor/
│   │   │   │   ├── time-prediction/
│   │   │   │   ├── layout.js       # Builder sidebar & role guard
│   │   │   │   └── page.js         # Builder overview
│   │   │   ├── client/             # Dedicated Client Workspace
│   │   │   │   ├── estimate/
│   │   │   │   ├── search/
│   │   │   │   ├── tracking/
│   │   │   │   ├── layout.js       # Client top navbar & role guard
│   │   │   │   └── page.js         # Client dashboard
│   │   │   ├── login/              # Login Page
│   │   │   ├── register/           # Registration Page with Role Selection
│   │   │   ├── layout.js           # Root layout with AuthProvider
│   │   │   └── page.js             # Public Landing Page
│   │   ├── components/
│   │   │   └── ProtectedRoute.js   # RBAC route guard component
│   │   ├── context/
│   │   │   └── AuthContext.js      # React Context for auth state
│   │   └── lib/
│   │       └── api.js              # API client helper with Bearer tokens
│   └── package.json
│
└── ai-service/                     # Python FastAPI Machine Learning Microservice
    ├── main.py                     # FastAPI REST API endpoints
    ├── train_model.py              # ML model training pipeline
    ├── location_list.json          # Trained location list
    └── requirements.txt            # Python dependencies
```

---

## 📡 API Reference Overview

### Auth Endpoints (`/api/auth`)
- `POST /api/auth/register` — Register a new user (`name`, `email`, `password`, `role: "builder" | "client"`).
- `POST /api/auth/login` — Authenticate credentials and receive a signed JWT token.
- `GET /api/auth/me` — Retrieve profile of currently authenticated user.

### Project Endpoints (`/api/projects`)
- `GET /api/projects` — Get projects (Filtered by user role).
- `POST /api/projects` — Create a new project request. *(Requires authentication)*
- `PUT /api/projects/:id` — Update project details or assign agent. *(Requires Builder role)*
- `PUT /api/projects/:id/milestones` — Update milestone status & recalculate progress. *(Requires Builder role)*
- `POST /api/projects/:id/logs` — Log daily work & materials. *(Requires Builder role)*

### AI / ML Endpoints (`/api`)
- `POST /api/predict-price` — Predict property price using trained ML model.
- `POST /api/predict-cost` — Calculate baseline construction cost breakdown.
- `POST /api/predict-time` — Calculate estimated project completion days & phases.
- `POST /api/assign-agent` — Run multi-criteria scoring algorithm for agent assignment.
- `POST /api/predict-risk` — Generate safety, weather, and compliance risk checklists.

---

## 📜 License & Acknowledgments

Built for **BuildSmart AI**. Powered by modern web technologies, FastAPI, and Scikit-Learn.
