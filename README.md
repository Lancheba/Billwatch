# Bill & Subscription Watcher

> **Hackathon:** Agents for Humans (AWS / Devpost) — Everyday Agents track  
> **Repository:** [https://github.com/Lancheba/Billwatch](https://github.com/Lancheba/Billwatch)  
> **Pitch:** An everyday AI agent that tracks recurring bills and subscriptions, flags due dates and price increases, and drafts the next action with human approval—so nothing slips through and nothing renews unnoticed.

---

## 🏗️ Architecture

```
[CSV Statement / Manual Form / Pasted Email Text]
                       │
                       ▼
             [ Django REST API ] ◄──────► [ SQLite / PostgreSQL ]
              (Bills, DecisionLog)
                       ▲
                       │ (HTTP / Tools Loop)
                       ▼
             [ Strands Agent Runtime ]
              (Powered by Amazon Bedrock)
                 ├─ check_due_soon()
                 ├─ detect_anomaly()
                 ├─ detect_unused_subscription()
                 ├─ draft_notification()
                 ├─ draft_cancellation_email()
                 └─ log_decision()
                       ▲
                       │
                       ▼
            [ React + TypeScript UI ]
             ├─ 📊 Dashboard (Stat cards & bills table)
             ├─ 🚨 Needs Your Attention (Approve/Reject drafts)
             ├─ 🤖 Agent Activity Log (Audit trail feed)
             └─ ➕ Add Bill & CSV Import
```

---

## ⚡ Tech Stack

| Layer | Technology |
|---|---|
| **Backend & ORM** | Python 3.12, Django 6, Django REST Framework |
| **Agent Runtime** | Strands Agents SDK + Amazon Bedrock (`Claude 3.5 Sonnet`) |
| **Frontend UI** | React 18, Vite, TypeScript, TanStack React Query, React Router |
| **Database** | SQLite (dev) / PostgreSQL (production ready) |
| **Agent Trigger** | Background execution via REST API (`POST /api/agent/run/`) & CLI (`python run_agent.py`) |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm
- Git

### 1. Clone & Setup Backend Virtual Environment

```bash
git clone https://github.com/Lancheba/Billwatch.git
cd Billwatch

python -m venv venv
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# macOS / Linux:
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set your AWS credentials for Amazon Bedrock:
```env
AWS_DEFAULT_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key-id
AWS_SECRET_ACCESS_KEY=your-secret-key
BILLWATCH_API_URL=http://127.0.0.1:8000/api
```
*(Or set `ANTHROPIC_API_KEY` to run Claude directly)*

### 3. Run Migrations & Seed Demo Data

```bash
python manage.py migrate
python manage.py seed_demo_data --flush
```

Demo bills created:
| Bill | Scenario | Agent Action |
|---|---|---|
| Electric Bill | Normal monthly utility | Auto-handled silently |
| Internet (Comcast) | Normal monthly utility | Auto-handled silently |
| Spotify Premium | Active subscription | Auto-handled silently |
| Amazon Prime | Active subscription | Auto-handled silently |
| **Netflix** | **Price increase \$15.99 → \$17.99** | **Anomaly detected** → Notification drafted |
| **Gym Fitness App** | **Unused >90 days** | **Dormant sub** → Cancellation email drafted |
| **Water & Sewage** | **Due in 2 days** | **Due soon** → Alert notification drafted |

### 4. Start Django Backend Server

```bash
python manage.py runserver
```

- API Base: `http://127.0.0.1:8000/api/`
- Django Admin: `http://127.0.0.1:8000/admin/`

### 5. Start React Frontend

In a separate terminal window:

```bash
cd frontend
npm install
npm run dev
```

Open **`http://localhost:5173/`** in your browser.

---

## 🤖 Running the Agent

### Option A — From the React Web UI
Click the **"▶ Run Agent"** button in the sidebar. The agent will run asynchronously in a background thread and update the Activity Log and Needs Attention screens in real-time.

### Option B — Via CLI
```bash
python run_agent.py --days 7
```

### Option C — Via REST API
```bash
curl -X POST http://127.0.0.1:8000/api/agent/run/ \
     -H "Content-Type: application/json" \
     -d '{"days": 7}'
```

---

## 🖥️ Frontend Screens

1. **Dashboard (`/`):** Summary metrics (Total spend, Active, Flagged), full bills table with status indicators and due soon badges.
2. **Needs Your Attention (`/attention`):** Human-in-the-loop triage center. Displays agent-generated draft cancellation emails and alerts with **✓ Approve** and **✗ Reject** action buttons.
3. **Agent Activity Log (`/log`):** Chronological transparency feed detailing every decision, showing what was quietly auto-handled vs what was surfaced with reasoning.
4. **Add Bill (`/add`):** Manual bill entry form + bulk CSV statement import.

---

## 🛠️ Strands Agent Tools

Each tool is decorated with `@tool` in `agent/tools.py`:

| Tool | Purpose |
|---|---|
| `ingest_bill(raw_text)` | Parses unstructured text/JSON into structured bill records |
| `check_due_soon(days=7)` | Fetches bills coming due within the specified time window |
| `detect_anomaly(bill)` | Compares current amount with baseline; flags increases >5% |
| `detect_unused_subscription(bill)` | Detects subscriptions dormant for 60+ days |
| `draft_notification(bill, reason)` | Formats human-readable alert notifications |
| `draft_cancellation_email(subscription)` | Drafts complete cancellation emails ready for user review |
| `log_decision(bill_id, action, reasoning, draft_content)` | Records structured audit log to `DecisionLog` |

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/bills/` | List all bills |
| `POST` | `/api/bills/` | Create a bill |
| `GET` | `/api/bills/<id>/` | Retrieve bill detail |
| `PATCH` | `/api/bills/<id>/` | Update bill |
| `DELETE` | `/api/bills/<id>/` | Delete bill |
| `GET` | `/api/bills/due-soon/?days=7` | Filter bills due within N days |
| `POST` | `/api/bills/import/` | Bulk CSV statement import |
| `GET` | `/api/decisions/` | Retrieve agent decision audit logs |
| `POST` | `/api/decisions/<id>/approve/` | Approve drafted action (cancels sub if applicable) |
| `POST` | `/api/decisions/<id>/reject/` | Reject drafted action |
| `POST` | `/api/agent/run/` | Trigger agent watcher cycle |

---

## 🧪 Testing

Run backend tests:
```bash
python manage.py test
```

Build frontend bundle:
```bash
cd frontend
npm run build
```

---

## 📂 Project Structure

```
Billwatch/
├── agent/
│   ├── __init__.py
│   └── tools.py              # 7 Strands @tool definitions
├── bills/
│   ├── management/commands/
│   │   └── seed_demo_data.py # Seeder with 3 flagged scenarios
│   ├── migrations/
│   ├── admin.py              # Django admin configuration
│   ├── models.py             # Bill, Subscription, DecisionLog
│   ├── serializers.py        # DRF Serializers
│   ├── tests.py              # Automated test suite
│   ├── urls.py               # API routing
│   └── views.py              # ViewSets & AgentRunView
├── billwatch_backend/
│   ├── settings.py           # DRF, CORS, Database config
│   ├── urls.py
│   └── wsgi.py
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── NeedsAttention.tsx
│   │   │   ├── ActivityLog.tsx
│   │   │   └── AddBill.tsx
│   │   ├── api.ts            # Axios client & typed endpoints
│   │   ├── utils.ts          # Badges & formatting helpers
│   │   ├── App.tsx           # Layout & navigation
│   │   └── index.css         # Clean utility styling
│   ├── package.json
│   └── vite.config.ts
├── run_agent.py              # CLI agent runner (Bedrock/Anthropic)
├── requirements.txt
├── DEMO_SCRIPT.md            # Video presentation script
├── SUBMISSION.md             # Devpost submission details
├── LICENSE                   # MIT License
└── README.md
```

---

## 🏆 Hackathon Submission Details
- **Track:** Everyday Agents
- **Demo Video Script:** See [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md)
- **Submission Overview:** See [`SUBMISSION.md`](SUBMISSION.md)
- **License:** MIT
