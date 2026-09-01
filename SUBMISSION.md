# Bill & Subscription Watcher — Devpost Hackathon Submission

**Hackathon:** Agents for Humans (AWS / Devpost)  
**Track:** Everyday Agents  
**Project Name:** Bill & Subscription Watcher  
**Repository:** [https://github.com/Lancheba/Billwatch](https://github.com/Lancheba/Billwatch)  
**License:** MIT License  

---

## 1. Project Overview & Pitch
**One-Line Pitch:** An everyday AI agent that tracks recurring bills and subscriptions, flags stealth price increases and dormant renewals, and drafts the next action with human approval—so nothing renews unnoticed.

**Inspiration:**  
Most people lose hundreds of dollars every year due to silent subscription price hikes, recurring utility due dates slipping by, and forgotten gym or app memberships that renew unnoticed. Traditional personal finance dashboards are passive—they show charts after you've already been charged. We built an autonomous yet safe agent that runs in the background, auto-handles routine bills silently, and only intervenes when a meaningful human decision is required.

---

## 2. What It Does
1. **Intelligent Ingestion:** Ingests bills from structured entries, CSV statements, or text snippets with automatic category recognition.
2. **Anomaly & Hike Detection:** Automatically computes price variances against historical baselines (>5% triggers alert).
3. **Dormant Subscription Detection:** Identifies subscriptions inactive for 60+ days and flags them as cancellation candidates.
4. **Drafted Actions & Human-in-the-Loop:** Instead of taking irreversible actions, the agent drafts formatted notification alerts and cancellation request emails ready for 1-click user review (Approve / Reject).
5. **Full Auditability:** Every decision (auto-handled vs. surfaced) is timestamped and logged in `DecisionLog` with transparent agent reasoning.

---

## 3. Tech Stack & AWS Integration
- **Agent Framework:** [Strands Agents SDK](https://github.com/strands-agents/strands) in Python
- **LLM / Foundation Models:** Amazon Bedrock (Anthropic Claude 3.5 Sonnet: `us.anthropic.claude-3-5-sonnet-20241022-v2:0`) via `boto3`
- **Backend API & ORM:** Django 6 + Django REST Framework + SQLite
- **Frontend Dashboard:** React 18 + Vite + TypeScript + TanStack React Query + React Router
- **Agent Tools:** 7 custom `@tool` functions (`ingest_bill`, `check_due_soon`, `detect_anomaly`, `detect_unused_subscription`, `draft_notification`, `draft_cancellation_email`, `log_decision`)

---

## 4. Architecture & Workflow
```
   [ CSV Statements / Manual Input / Email Text ]
                        │
                        ▼
             [ Django REST API ] ◄──────► [ SQLite / PostgreSQL ]
              (Bills, DecisionLog)
                        ▲
                        │  (HTTP / Tools Loop)
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
             ├─ 📊 Dashboard (Overview & Stat Cards)
             ├─ 🚨 Needs Your Attention (Approve/Reject Drafts)
             ├─ 🤖 Agent Activity Log (Audit Trail Feed)
             └─ ➕ Add Bill & CSV Import
```

---

## 5. Submission Checklist
- [x] Public GitHub Repository: [https://github.com/Lancheba/Billwatch](https://github.com/Lancheba/Billwatch)
- [x] MIT License file included in root
- [x] Comprehensive README with setup and execution instructions
- [x] Demo Video Script (`DEMO_SCRIPT.md`)
- [x] Pre-seeded demo dataset showcasing 3 surfaced decision cases + auto-handled routines
- [x] Complete REST API and Agent tool integration
- [x] Fully functional modern React TypeScript UI
- [x] AWS Bedrock integration via Strands Python SDK
