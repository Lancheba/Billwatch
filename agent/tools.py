"""
Strands Agent tools for Bill & Subscription Watcher.

Each function is decorated with @tool and is callable by the Strands
reasoning loop. Tools communicate with the Django backend via the REST API
(requests) so they can also be used from an external agent process.

Environment variables (or .env):
    BILLWATCH_API_URL  — base URL for the Django API, default http://127.0.0.1:8000/api
"""

from __future__ import annotations

import os
import re
from datetime import date, datetime
from typing import Any

import requests
from strands import tool

API_BASE = os.environ.get("BILLWATCH_API_URL", "http://127.0.0.1:8000/api").rstrip("/")


def _api(method: str, path: str, **kwargs) -> Any:
    """Thin wrapper around requests that raises on HTTP errors."""
    url = f"{API_BASE}/{path.lstrip('/')}"
    resp = getattr(requests, method)(url, **kwargs)
    resp.raise_for_status()
    return resp.json()


# ---------------------------------------------------------------------------
# Tool 1 — ingest_bill
# ---------------------------------------------------------------------------

@tool
def ingest_bill(raw_text: str) -> dict:
    """
    Parse a raw bill/subscription entry from pasted text or a JSON string
    into structured fields ready to POST to /api/bills/.

    The function first tries to decode `raw_text` as JSON. If that fails it
    does lightweight regex extraction looking for common patterns
    (name, amount, due date, category keywords).

    Returns a dict with keys: name, amount, due_date, category,
    recurrence, is_subscription — or raises ValueError on parse failure.
    """
    import json

    # --- attempt JSON parse first ---
    try:
        data = json.loads(raw_text)
        # Minimal validation
        required = {"name", "amount", "due_date"}
        missing = required - data.keys()
        if missing:
            raise ValueError(f"JSON missing required keys: {missing}")
        data.setdefault("category", "other")
        data.setdefault("recurrence", "monthly")
        data.setdefault("is_subscription", False)
        return data
    except json.JSONDecodeError:
        pass

    # --- fallback: regex heuristics on plain text ---
    result: dict = {}

    # Amount  — e.g. "$17.99" or "17.99"
    amount_match = re.search(r"\$?\s*(\d+\.\d{2})", raw_text)
    if amount_match:
        result["amount"] = float(amount_match.group(1))

    # Due date — e.g. "due 2024-09-15" or "due date: Sep 15 2024"
    date_match = re.search(
        r"due\s+(?:date[:\s]*)?"
        r"(\d{4}-\d{2}-\d{2}|[A-Za-z]+ \d{1,2},? \d{4})",
        raw_text,
        re.IGNORECASE,
    )
    if date_match:
        raw_date = date_match.group(1)
        for fmt in ("%Y-%m-%d", "%B %d %Y", "%B %d, %Y", "%b %d %Y", "%b %d, %Y"):
            try:
                result["due_date"] = datetime.strptime(raw_date, fmt).date().isoformat()
                break
            except ValueError:
                continue

    # Name — first non-empty line, stripped
    for line in raw_text.splitlines():
        line = line.strip()
        if line:
            result["name"] = line[:100]
            break

    # Category heuristics
    lower = raw_text.lower()
    if any(k in lower for k in ("electric", "gas", "water", "internet", "utility")):
        result["category"] = "utility"
    elif any(k in lower for k in ("subscription", "netflix", "spotify", "amazon", "hulu", "gym")):
        result["category"] = "subscription"
    elif any(k in lower for k in ("loan", "mortgage", "credit")):
        result["category"] = "loan"
    else:
        result["category"] = "other"

    result["is_subscription"] = result["category"] == "subscription"
    result.setdefault("recurrence", "monthly")

    if not result.get("name") or not result.get("amount") or not result.get("due_date"):
        raise ValueError(
            "Could not parse required fields (name, amount, due_date) from raw text. "
            "Please provide structured JSON instead."
        )
    return result


# ---------------------------------------------------------------------------
# Tool 2 — check_due_soon
# ---------------------------------------------------------------------------

@tool
def check_due_soon(days: int = 7) -> list[dict]:
    """
    Return bills due within `days` days from today by querying /api/bills/due-soon/.

    Args:
        days: Look-ahead window in days (default 7).

    Returns:
        List of bill dicts sorted by due_date ascending.
    """
    data = _api("get", "bills/due-soon/", params={"days": days})
    # Handle paginated or plain list response
    if isinstance(data, dict) and "results" in data:
        return data["results"]
    return data


# ---------------------------------------------------------------------------
# Tool 3 — detect_anomaly
# ---------------------------------------------------------------------------

@tool
def detect_anomaly(bill: dict) -> dict | None:
    """
    Detect price anomalies for a bill.

    Checks:
    1. Amount increased by more than 5% compared to previous_amount.
    2. Amount increased at all (any hike is worth surfacing).

    Args:
        bill: A bill dict as returned by the API.

    Returns:
        An anomaly dict with keys (type, old_amount, new_amount, pct_change, message)
        if an anomaly is found, else None.
    """
    amount = float(bill.get("amount", 0))
    prev = bill.get("previous_amount")

    if prev is None:
        return None  # no baseline to compare

    prev = float(prev)
    if prev == 0:
        return None

    pct_change = ((amount - prev) / prev) * 100

    if pct_change > 5:
        return {
            "type": "price_increase",
            "old_amount": prev,
            "new_amount": amount,
            "pct_change": round(pct_change, 2),
            "message": (
                f"{bill['name']} price increased from ${prev:.2f} to ${amount:.2f} "
                f"({pct_change:.1f}% increase)."
            ),
        }

    if pct_change < -5:
        return {
            "type": "price_decrease",
            "old_amount": prev,
            "new_amount": amount,
            "pct_change": round(pct_change, 2),
            "message": (
                f"{bill['name']} price decreased from ${prev:.2f} to ${amount:.2f} "
                f"({abs(pct_change):.1f}% decrease)."
            ),
        }

    return None


# ---------------------------------------------------------------------------
# Tool 4 — detect_unused_subscription
# ---------------------------------------------------------------------------

@tool
def detect_unused_subscription(bill: dict, threshold_days: int = 60) -> bool:
    """
    Return True if `bill` is a subscription that hasn't been used in
    `threshold_days` days (default 60), indicating it's a cancellation candidate.

    Args:
        bill: A bill dict as returned by the API.
        threshold_days: Number of idle days before flagging (default 60).
    """
    if not bill.get("is_subscription"):
        return False

    last_used = bill.get("last_used_date")
    if last_used is None:
        # Never recorded as used — treat as unused if it's a subscription
        return True

    last_used_date = date.fromisoformat(last_used)
    days_idle = (date.today() - last_used_date).days
    return days_idle >= threshold_days


# ---------------------------------------------------------------------------
# Tool 5 — draft_notification
# ---------------------------------------------------------------------------

@tool
def draft_notification(bill: dict, reason: str) -> str:
    """
    Generate a short, human-readable alert message for a bill that needs
    the user's attention.

    Args:
        bill: A bill dict.
        reason: Short reason string, e.g. 'due_soon', 'price_increase'.

    Returns:
        A formatted notification string.
    """
    name = bill["name"]
    amount = float(bill["amount"])
    due_date_str = bill.get("due_date", "unknown date")

    if reason == "due_soon":
        today = date.today()
        due = date.fromisoformat(due_date_str)
        days_left = (due - today).days
        if days_left == 0:
            timing = "TODAY"
        elif days_left == 1:
            timing = "tomorrow"
        else:
            timing = f"in {days_left} days"
        return (
            f"⚠️  {name} renews {timing} (due {due_date_str}) — "
            f"amount: ${amount:.2f}. Action required."
        )

    if reason == "price_increase":
        prev = float(bill.get("previous_amount") or amount)
        return (
            f"💸  {name} price increased from ${prev:.2f} to ${amount:.2f}. "
            f"Due {due_date_str}. Review your bill."
        )

    if reason == "unused_subscription":
        last_used = bill.get("last_used_date", "unknown")
        return (
            f"🔕  {name} subscription — last used {last_used}. "
            f"Consider cancelling to save ${amount:.2f}/{bill.get('recurrence', 'month')}."
        )

    # Generic fallback
    return f"📋  {name}: {reason}. Due {due_date_str}, amount ${amount:.2f}."


# ---------------------------------------------------------------------------
# Tool 6 — draft_cancellation_email
# ---------------------------------------------------------------------------

@tool
def draft_cancellation_email(subscription: dict) -> str:
    """
    Draft a polite cancellation request email for an unused subscription.

    Args:
        subscription: A bill dict (is_subscription must be True).

    Returns:
        A draft email string ready for user review and approval.
    """
    name = subscription["name"]
    amount = float(subscription["amount"])
    recurrence = subscription.get("recurrence", "monthly")
    provider_url = ""
    detail = subscription.get("subscription_detail")
    if detail and detail.get("provider_url"):
        provider_url = f"\nCancellation page: {detail['provider_url']}"

    return f"""Subject: Cancellation Request — {name} Subscription

To Whom It May Concern,

I am writing to request the cancellation of my {name} subscription, \
billed at ${amount:.2f} {recurrence}.

Please confirm the cancellation in writing and ensure no further charges \
are applied to my account.{provider_url}

Thank you,
[Your Name]

---
[DRAFT — Needs your approval before sending]
"""


# ---------------------------------------------------------------------------
# Tool 7 — log_decision
# ---------------------------------------------------------------------------

@tool
def log_decision(
    bill_id: int,
    action: str,
    reasoning: str,
    draft_content: str | None = None,
) -> dict:
    """
    Record what the agent decided to do (and why) into a DecisionLog.

    Args:
        bill_id: Primary key of the related Bill.
        action:  One of auto_handled | flagged_for_review |
                 drafted_notification | drafted_cancellation.
        reasoning: Human-readable explanation of why this action was taken.
        draft_content: The drafted notification/email text, if any.

    Returns:
        The created DecisionLog dict from the API.
    """
    payload = {
        "bill": bill_id,
        "agent_action": action,
        "reasoning": reasoning,
        "draft_content": draft_content,
        "user_decision": "pending" if action != "auto_handled" else None,
    }
    return _api("post", "decisions/", json=payload)
