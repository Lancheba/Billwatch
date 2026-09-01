"""
Bill & Subscription Watcher — Strands Agent runner.

Usage:
    python run_agent.py                     # run the full watcher cycle
    python run_agent.py --days 14           # look-ahead window in days

Environment variables (or set in .env):
    BILLWATCH_API_URL      — Django API base URL (default http://127.0.0.1:8000/api)
    AWS_DEFAULT_REGION     — required by Strands/Bedrock (e.g. us-east-1)
    ANTHROPIC_API_KEY      — if using Anthropic model directly instead of Bedrock
"""

from __future__ import annotations

import argparse
import os
import sys

# Allow running from project root without installing the package
sys.path.insert(0, os.path.dirname(__file__))

from strands import Agent
from strands.models import BedrockModel

from agent.tools import (
    check_due_soon,
    detect_anomaly,
    detect_unused_subscription,
    draft_cancellation_email,
    draft_notification,
    ingest_bill,
    log_decision,
)

SYSTEM_PROMPT = """
You are a Bill & Subscription Watcher agent. Your job is to review a user's
bills and subscriptions and take the smallest safe action:

- If a bill is due soon and nothing is unusual: log it as auto_handled, no alert.
- If a bill's amount increased by more than 5% compared to previous_amount:
  flag it, draft a notification explaining the change, log as drafted_notification.
- If a subscription hasn't been used in 60+ days:
  flag it, draft a cancellation email, log as drafted_cancellation.
  Do NOT send it — only draft it for user approval.
- Never take an irreversible action (sending money, cancelling) without
  explicit human approval.
- Always log your reasoning via log_decision so the user can audit every decision.

Run loop:
1. call check_due_soon() to get bills due soon
2. for each bill: call detect_anomaly() and detect_unused_subscription()
3. where flagged: call draft_notification() and/or draft_cancellation_email()
4. call log_decision() for every bill reviewed
""".strip()


def build_agent() -> Agent:
    tools = [
        ingest_bill,
        check_due_soon,
        detect_anomaly,
        detect_unused_subscription,
        draft_notification,
        draft_cancellation_email,
        log_decision,
    ]

    # Try Bedrock first; fall back to Anthropic direct if region not set
    region = os.environ.get("AWS_DEFAULT_REGION")
    if region:
        model = BedrockModel(
            model_id="us.anthropic.claude-3-5-sonnet-20241022-v2:0",
            region_name=region,
        )
        return Agent(model=model, tools=tools, system_prompt=SYSTEM_PROMPT)

    # Fallback: Strands default model (requires ANTHROPIC_API_KEY)
    return Agent(tools=tools, system_prompt=SYSTEM_PROMPT)


def run(days: int = 7) -> None:
    agent = build_agent()
    prompt = (
        f"Run the full bill watcher cycle with a {days}-day look-ahead window. "
        "Review every bill returned by check_due_soon, detect anomalies and unused "
        "subscriptions, draft notifications/cancellations where needed, and log a "
        "decision for every bill. Summarise what you flagged vs auto-handled at the end."
    )
    print(f"\n{'='*60}")
    print("Bill & Subscription Watcher — Agent Run")
    print(f"Look-ahead: {days} days  |  API: {os.environ.get('BILLWATCH_API_URL', 'http://127.0.0.1:8000/api')}")
    print("="*60 + "\n")
    result = agent(prompt)
    print("\n" + "="*60)
    print("Agent run complete.")
    print("="*60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run the Bill Watcher agent")
    parser.add_argument("--days", type=int, default=7, help="Due-soon look-ahead (days)")
    args = parser.parse_args()
    run(days=args.days)
