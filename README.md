# 💳 Billwatch — AI-Powered Autonomous Bill & Subscription Watcher

> **Hackathon:** Agents for Humans (AWS / Devpost) — Everyday Agents track  
> **Repository:** [https://github.com/Lancheba/Billwatch](https://github.com/Lancheba/Billwatch)  
> **Pitch:** An everyday autonomous AI financial assistant that tracks recurring bills, identifies zombie subscriptions, detects price surges and anomalies, forecasts 30-day cashflow, runs interactive What-If budget simulations, and drafts cancellation workflows with human-in-the-loop approval.

---

## 🏗️ Architecture & Feature Roadmap (Phases 0 — 5)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           React + TypeScript Frontend UI                        │
│  ├─ 📊 Dashboard (Overview, Health Score, 30-Day Forecast, Category Shift)      │
│  ├─ 🚨 Needs Attention & Insights (Priority-Tiered Alerts & Action Triggers)    │
│  ├─ 📅 Smart Financial Calendar (Daily Rollup Grid & Peak Day Highlighting)     │
│  ├─ 🔮 What-If Simulator (Interactive Toggle Budget Reduction & Score Gain)     │
│  ├─ 💬 AI Assistant Copilot (Context-Aware Conversational Financial Advisor)   │
│  ├─ 📄 Smart Ingest & AI Scanner (Receipt OCR & Mailbox Sync)                   │
│  └─ 🤖 Agent Audit Log (Structured Signal Chips & Human-in-the-Loop Review)     │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │ REST API
┌────────────────────────────────────────▼────────────────────────────────────────┐
│                              Django REST Framework                              │
│  ├─ Phase 0: Incremental Schema (Bill, PriceHistory, AIInsight, DecisionLog)    │
│  ├─ Phase 1: Dashboard Summary, Price Increase Detection, 30-Day Prediction     │
│  ├─ Phase 2: Recurring Frequency Detector, Zombie Subscriptions, Anomalies      │
│  ├─ Phase 3: Explainable Agent Reasoning, Assistant Chat, What-If Simulator     │
│  ├─ Phase 4: AI Receipt / Statement Scanner, Smart Email Stream Ingestion       │
│  └─ Phase 5: Composite Financial Health & Risk Score Engine (0-100)             │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │
┌────────────────────────────────────────▼────────────────────────────────────────┐
│                        Strands Agent & Autonomous Tools                         │
│  (Powered by Amazon Bedrock Claude 3.5 Sonnet / Local Analytical Fallback)      │
│  ├─ ingest_bill()                   ├─ detect_unused_subscription()             │
│  ├─ check_due_soon()                ├─ draft_notification()                     │
│  ├─ detect_anomaly()                ├─ draft_cancellation_email()               │
│  └─ log_decision(signals=[...])                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Key Highlights by Phase

### Phase 0 — Incremental Schema
- **`Bill`**: Added `merchant`, `confidence_score` (recurring detection confidence), `usage_frequency`.
- **`PriceHistory`**: Automatically captures historical price snapshots for trend & z-score anomaly analysis.
- **`AIInsight`**: User-scoped actionable insight cards with priority tiers (`critical`, `important`, `insight`, `recommendation`).
- **`DecisionLog`**: Transparent audit trail with structured factor signals (e.g., `[Signals: usage_idle: 74d | price_jump: +18% | confidence: 96%]`).

### Phase 1 — Quick Wins
- **Dashboard Rollup (`/api/dashboard/summary/`)**: Aggregates normalized monthly commitments across cycles (weekly, monthly, yearly), category distributions, and upcoming 7-day obligations.
- **Price Increase Detection**: Flags bills where current amount > `previous_amount` with % change and monthly budget impact.
- **30-Day Cashflow Forecast**: Predicts total outflow grouped by category and recurrence.
- **Smart Financial Calendar (`/api/dashboard/calendar/`)**: Groups obligations by date for interactive monthly grid rendering and peak-day identification.

### Phase 2 — Detection & Anomaly Logic
- **Recurring Payment Detection**: Groups historical charges by merchant similarity, infers frequency (weekly/monthly/yearly), and scores detection confidence.
- **Zombie Subscription Detector**: Rule-based detection flagging inactive subscriptions (>45 days idle) and calculating potential annual savings.
- **Spending Anomaly Engine**: Calculates rolling mean, stddev, and z-score to catch sudden price spikes.

### Phase 3 — Agent-Powered Copilot & What-If Simulator
- **Explainable AI Reasoning**: Decision logs present structured factor signals instead of vague text.
- **AI Financial Assistant Chat (`/api/agent/chat/`)**: Conversational advisor with real-time access to user bills, health scores, and suggested follow-ups.
- **What-If Simulator (`/api/dashboard/what-if/`)**: Live simulation of budget reduction and health score improvement when cancelling candidate bills.

### Phase 4 — Ingestion Upgrades
- **AI Receipt / Bill Scanner (`/api/bills/scan/`)**: Parses receipt text, PDFs, or images into structured bill fields.
- **Smart Email Bill Detection (`/api/bills/scan-email/`)**: Scans mailbox streams for known recurring vendor patterns (e.g., Adobe, GitHub, ConEd).

### Phase 5 — Scores, Priority Tiers & Polish
- **Financial Health & Risk Score (0-100)**: Evaluates subscription burden, zombie waste, unreviewed price spikes, and upcoming cashflow pressures.
- **Priority-Tiered Alerts**: Interactive triage in "Needs Attention" with 1-click cancellation drafting and dismissal.

---

## 🚀 Quick Start

### 1. Backend Setup

```bash
# Clone repository
git clone https://github.com/Lancheba/Billwatch.git
cd Billwatch

# Setup virtual environment
python -m venv venv
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# macOS / Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations & seed demo dataset
python manage.py migrate
python manage.py seed_demo_data --flush

# Start Django backend server
python manage.py runserver
```

- API Base: `http://127.0.0.1:8000/api/`
- Admin Portal: `http://127.0.0.1:8000/admin/`

### 2. Frontend Setup

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Open **`http://localhost:5173/`** in your browser.

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/dashboard/summary/` | Normalized monthly spend, due soon, price increases, 30-day forecast, health score |
| `GET` | `/api/dashboard/calendar/` | Monthly calendar data with daily totals & highest expense day |
| `POST` | `/api/dashboard/what-if/` | Simulates budget savings & score changes for excluded bills |
| `POST` | `/api/agent/chat/` | Conversational financial copilot query with real-time bill context |
| `POST` | `/api/agent/run/` | Trigger autonomous background watcher cycle |
| `GET` | `/api/insights/` | Retrieve user AI insights filtered by priority |
| `POST` | `/api/insights/<id>/dismiss/` | Dismiss an AI insight |
| `POST` | `/api/insights/<id>/act/` | Trigger 1-click action (draft cancellation email, cancel bill) |
| `POST` | `/api/bills/detect-recurring/` | Run recurring payment detection across bills |
| `POST` | `/api/bills/detect-zombies/` | Run zombie subscription detection |
| `POST` | `/api/bills/detect-anomalies/` | Run price surge & anomaly detection |
| `POST` | `/api/bills/scan/` | AI receipt & invoice text scanner |
| `POST` | `/api/bills/scan-email/` | Email invoice scanner simulation |
| `GET/POST` | `/api/bills/` | Bills CRUD |
| `GET` | `/api/decisions/` | Retrieve agent decision audit logs |
| `POST` | `/api/decisions/<id>/approve/` | Approve drafted human-in-the-loop action |
| `POST` | `/api/decisions/<id>/reject/` | Reject drafted action |

---

## 🧪 Testing & Verification

```bash
# Run Django test suite (17 comprehensive tests across all phases)
python manage.py test

# Build frontend production bundle
cd frontend
npm run build
```

---

## 🏆 Hackathon Submission Details
- **Track:** Everyday Agents
- **License:** MIT
- **Repository:** [https://github.com/Lancheba/Billwatch](https://github.com/Lancheba/Billwatch)

