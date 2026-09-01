# Bill & Subscription Watcher — Demo Video Script
**Hackathon Track:** Everyday Agents (AWS / Devpost)  
**Target Duration:** 3 – 4 minutes  
**Format:** Screen recording with voiceover (Loom, OBS, or QuickTime)

---

## Act 1: The Problem & Pitch (0:00 – 0:45)
* **Visual:** Camera on speaker / Slides or Title card ("Bill & Subscription Watcher — Everyday Agent").
* **Voiceover:**
  > "Every month, millions of dollars are lost to forgotten subscriptions, sneaky price hikes, and missed due dates. Most bill tracking apps are just glorified spreadsheets—they demand manual entry and leave all the thinking to you.
  >
  > Introducing **Bill & Subscription Watcher**, an everyday AI agent built with **Strands Agents SDK**, **AWS Bedrock**, **Django**, and **React**. 
  > It runs quietly in the background, auto-handling recurring routine bills, while proactively catching anomalies and drafting the exact next step whenever human judgment is required."

---

## Act 2: Architecture & Live Dashboard (0:45 – 1:30)
* **Visual:** Switch to browser showing `http://localhost:5173/` (Dashboard).
* **Voiceover:**
  > "Here’s the Billwatch dashboard. We have a set of recurring utility bills and digital subscriptions. 
  > Notice how each bill is categorized, tracked with recurrence periods, previous amounts for baseline comparison, and last-used activity timestamps.
  > In the top summary cards, you see total monthly commitments and active vs flagged items."

---

## Act 3: Triggering the Agent & Reasoning Loop (1:30 – 2:30)
* **Visual:** Click the **"Run Agent"** button in the sidebar or run `python run_agent.py` in the terminal. Navigate to **Agent Activity Log** (`/log`).
* **Voiceover:**
  > "Let's trigger our Strands agent run. 
  > The agent inspects the bills using specialized tools: `check_due_soon`, `detect_anomaly`, and `detect_unused_subscription`.
  > Look at the Activity Log:
  > 1. Normal bills like Electricity and Internet with no changes were **auto-handled silently** without spamming alerts.
  > 2. The agent detected a **$2.00 (12.5%) price hike on Netflix** ($15.99 → $17.99) and drafted an alert notification.
  > 3. It identified a **Gym App unused for over 90 days** and drafted a formal cancellation email ready to send.
  > 4. It flagged the **Water bill due in 2 days** to ensure the due date isn't missed."

---

## Act 4: Human-in-the-Loop & Decision Resolution (2:30 – 3:30)
* **Visual:** Navigate to **"Needs Your Attention"** (`/attention`). Expand the drafted cancellation email and click **Approve**.
* **Voiceover:**
  > "The agent never takes irreversible actions on its own. Everything requiring human consent appears in **Needs Your Attention**.
  > Here's the drafted cancellation email for Gym Fitness App with cancellation links and pre-formatted text.
  > When I click **Approve**, the agent updates the status to cancelled, halts renewal alerts, and records the audit trail in the database.
  > If I choose to keep an item, clicking **Reject** acknowledges the alert without modifying the subscription."

---

## Act 5: Adding Bills & CSV Import (3:30 – 4:00)
* **Visual:** Navigate to **Add Bill** (`/add`). Show manual form and CSV dropzone.
* **Voiceover:**
  > "Users can easily add single bills or bulk import existing statements via CSV with automated ingestion tool assistance."

---

## Act 6: Wrap-up & Tech Stack (4:00 – 4:30)
* **Visual:** Show GitHub repository and architecture summary.
* **Voiceover:**
  > "Built using Python, Strands Agents SDK on Amazon Bedrock (Claude 3.5 Sonnet), Django REST Framework, and React with TypeScript. 
  > Bill & Subscription Watcher turns passive bill tracking into an intelligent, everyday personal finance copilot. Thank you!"
