# Bill & Subscription Watcher

> **Hackathon:** Agents for Humans (AWS / Devpost) — Everyday Agents track  
> An agent that tracks bills and subscriptions, flags due dates and price changes, and drafts the next action — so nothing slips through and nothing renews unnoticed.

---

## Architecture

```
[CSV Upload / Manual Form / Pasted Email Text]
              |
              v
      [Django REST API] <----> [SQLite / Postgres DB]
              ^                  (Bill, DecisionLog)
              |
      [Strands Agent Runtime]
       tools: ingest_bill, check_due_soon,
              detect_anomaly, detect_unused_subscription,
              draft_notification, draft_cancellation_email,
              log_decision
              |
              v
      [React Dashboard]            (coming: Days 7–8)
       - Dashboard
       - Needs Your Attention (approve/reject)
       - Agent Activity Log
       - Add Bill
```

---

## Stack

| Layer | Technology |
|---|---|
| Backend / data | Django 6 + Django REST Framework |
| Agent runtime | Python + Strands Agents SDK |
| Frontend | React + Vite + TypeScript *(coming Days 7–8)* |
| DB | SQLite (dev) |
| Agent trigger | `POST /api/agent/run/` + `python run_agent.py` |

---

## Quick Start

### Prerequisites
- Python 3.11+
- Git

### 1. Clone & create virtualenv

```bash
git clone https://github.com/Lancheba/Billwatch.git
cd Billwatch
python -m venv venv
# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment (optional for agent)

Copy or create a `.env` file in the project root:

```env
# Required only for running the Strands agent against AWS Bedrock
AWS_DEFAULT_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# If using Anthropic directly instead of Bedrock:
# ANTHROPIC_API_KEY=...

# Django API base URL (default works if Django runs on 8000)
BILLWATCH_API_URL=http://127.0.0.1:8000/api
```

### 4. Run migrations

```bash
python manage.py migrate
```

### 5. Seed demo data

```bash
python manage.py seed_demo_data
# or to wipe and re-seed:
python manage.py seed_demo_data --flush
```

Demo bills created:
| Bill | Scenario |
|---|---|
| Electric Bill | Normal — auto-handled |
| Internet (Comcast) | Normal — auto-handled |
| Spotify Premium | Normal — auto-handled |
| Amazon Prime | Normal — auto-handled |
| **Netflix** | **Price increase \$15.99 → \$17.99** — triggers anomaly detection |
| **Gym Fitness App** | **Unused >90 days** — triggers cancellation draft |
| **Water & Sewage** | **Due in 2 days** — triggers due-soon alert |

### 6. Start the Django server

```bash
python manage.py runserver
```

API root: http://127.0.0.1:8000/api/  
Admin: http://127.0.0.1:8000/admin/

### 7. Run the agent

**Option A — CLI (recommended for development):**
```bash
python run_agent.py
# Custom look-ahead:
python run_agent.py --days 14
```

**Option B — via REST API:**
```bash
curl -X POST http://127.0.0.1:8000/api/agent/run/ \
     -H "Content-Type: application/json" \
     -d '{"days": 7}'
```

The agent runs in a background thread and logs all decisions to `/api/decisions/`.

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/bills/` | List all bills |
| POST | `/api/bills/` | Create a bill |
| GET | `/api/bills/<id>/` | Bill detail |
| PUT/PATCH | `/api/bills/<id>/` | Update a bill |
| DELETE | `/api/bills/<id>/` | Delete a bill |
| GET | `/api/bills/due-soon/?days=7` | Bills due within N days |
| POST | `/api/bills/import/` | Bulk CSV import |
| GET | `/api/decisions/` | List agent decision logs |
| POST | `/api/decisions/<id>/approve/` | Approve a drafted action |
| POST | `/api/decisions/<id>/reject/` | Reject a drafted action |
| POST | `/api/agent/run/` | Trigger agent run |

### CSV Import Format

```csv
name,category,amount,due_date,recurrence,is_subscription,last_used_date
Netflix,subscription,17.99,2026-09-10,monthly,true,2026-08-30
Electric Bill,utility,120.00,2026-09-13,monthly,false,
```

---

## Agent Tools

| Tool | Description |
|---|---|
| `ingest_bill(raw_text)` | Parse raw text / JSON into structured Bill fields |
| `check_due_soon(days=7)` | Fetch bills due within N days |
| `detect_anomaly(bill)` | Flag price changes >5% vs previous_amount |
| `detect_unused_subscription(bill)` | Flag subscriptions unused >60 days |
| `draft_notification(bill, reason)` | Generate human-readable alert message |
| `draft_cancellation_email(subscription)` | Draft cancellation email for review |
| `log_decision(bill_id, action, reasoning, draft_content)` | Record agent decision to DB |

---

## Project Structure

```
Billwatch/
├── agent/
│   ├── __init__.py
│   └── tools.py              # All 7 Strands @tool functions
├── bills/
│   ├── management/commands/
│   │   └── seed_demo_data.py # Demo data seeder
│   ├── migrations/
│   ├── admin.py
│   ├── models.py             # Bill, Subscription, DecisionLog
│   ├── serializers.py        # DRF serializers
│   ├── urls.py               # API URL router
│   └── views.py              # ViewSets + AgentRunView
├── billwatch_backend/
│   ├── settings.py
│   └── urls.py
├── run_agent.py              # CLI entry point for agent
├── manage.py
├── requirements.txt
└── README.md
```

---

## Roadmap

- [x] Day 1–2: Django models + REST API
- [x] Day 3–4: Strands agent tools (all 7)
- [x] Day 5: Agent run loop + `/api/agent/run/` endpoint + seed data
- [ ] Day 7–8: React dashboard (Dashboard, Needs Attention, Activity Log, Add Bill)
- [ ] Day 9: End-to-end demo run verification
- [ ] Day 10: (Optional) Amazon Bedrock AgentCore deployment
- [ ] Day 11: Architecture diagram image + README polish
- [ ] Day 12: Demo video
- [ ] Day 13–14: Final submission

---

## License

MIT — see [LICENSE](LICENSE)
