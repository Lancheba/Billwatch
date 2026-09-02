import calendar as calendar_module
import json
import math
import os
import re
from collections import defaultdict
from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.utils import timezone
from .models import Bill, DecisionLog, PriceHistory, AIInsight, MONTHLY_MULTIPLIER

TWO_PLACES = Decimal("0.01")


def money(value) -> str:
    if value is None:
        return "0.00"
    return str(Decimal(str(value)).quantize(TWO_PLACES, rounding=ROUND_HALF_UP))


def monthly_equivalent(bill: Bill) -> Decimal:
    """Kept for backward compatibility — delegates to Bill.monthly_equivalent."""
    return bill.monthly_equivalent


def bill_brief(bill: Bill) -> dict:
    return {
        "id": bill.id,
        "name": bill.name,
        "merchant": bill.merchant or bill.name,
        "category": bill.category,
        "amount": money(bill.amount),
        "previous_amount": money(bill.previous_amount) if bill.previous_amount else None,
        "due_date": bill.due_date.isoformat(),
        "days_until_due": bill.days_until_due,
        "is_overdue": bill.is_overdue,
        "recurrence": bill.recurrence,
        "is_subscription": bill.is_subscription,
        "confidence_score": bill.confidence_score,
        "usage_frequency": bill.usage_frequency,
        "last_used_date": bill.last_used_date.isoformat() if bill.last_used_date else None,
        "status": bill.status,
    }


# ---------------------------------------------------------------------------
# Phase 2: Recurring Payment Detection (Section 6)
# ---------------------------------------------------------------------------

def detect_recurring_payments(user):
    """
    Scans bills and price history for the user, groups by merchant name similarity,
    infers frequency and recurrence confidence, and updates Bill records.
    """
    bills = Bill.objects.filter(owner=user).exclude(status="cancelled")
    updated = []

    # Normalization helper
    def norm_name(n):
        return re.sub(r"[^a-z0-9]", "", n.lower())

    merchant_groups = defaultdict(list)
    for b in bills:
        key = norm_name(b.merchant or b.name)
        merchant_groups[key].append(b)

    for key, group in merchant_groups.items():
        # If bill has known subscription keywords or monthly patterns
        for b in group:
            confidence = 0.85
            norm = norm_name(b.name)
            
            # Check for strong subscription keywords
            sub_keywords = ["netflix", "spotify", "hulu", "disney", "apple", "amazon", "github", "gym", "openai", "claude", "youtube", "dropbox", "adobe"]
            if any(k in norm for k in sub_keywords):
                confidence = 0.98
                if not b.is_subscription:
                    b.is_subscription = True

            # If we have price history records, check intervals
            history = list(b.price_history.order_by("recorded_at"))
            if len(history) >= 2:
                intervals = []
                for i in range(1, len(history)):
                    delta = (history[i].recorded_at.date() - history[i-1].recorded_at.date()).days
                    if delta > 0:
                        intervals.append(delta)
                if intervals:
                    avg_int = sum(intervals) / len(intervals)
                    if 25 <= avg_int <= 35:
                        b.recurrence = "monthly"
                        confidence = max(confidence, 0.95)
                    elif 6 <= avg_int <= 8:
                        b.recurrence = "weekly"
                        confidence = max(confidence, 0.95)
                    elif 350 <= avg_int <= 380:
                        b.recurrence = "yearly"
                        confidence = max(confidence, 0.95)

            if not b.merchant:
                b.merchant = b.name.split()[0].capitalize()

            b.confidence_score = round(confidence, 2)
            b.save(update_fields=["merchant", "is_subscription", "recurrence", "confidence_score"])
            updated.append(bill_brief(b))

    return {
        "status": "success",
        "processed_count": len(updated),
        "bills": updated,
    }


# ---------------------------------------------------------------------------
# Phase 2: Zombie Subscription Detector (Section 8)
# ---------------------------------------------------------------------------

def detect_zombie_subscriptions(user, idle_days_threshold=45):
    """
    Flags active subscriptions where last_used_date is null or older than N days.
    Creates or updates AIInsight records with projected annual savings.
    """
    today = date.today()
    cutoff = today - timedelta(days=idle_days_threshold)
    
    subs = Bill.objects.filter(
        owner=user,
        is_subscription=True,
    ).exclude(status="cancelled")

    zombies = []
    insights_created = []

    for sub in subs:
        is_zombie = False
        idle_days = None

        if sub.last_used_date is None:
            is_zombie = True
            idle_days = 90  # default idle penalty
        elif sub.last_used_date <= cutoff:
            is_zombie = True
            idle_days = (today - sub.last_used_date).days

        if is_zombie:
            monthly_val = monthly_equivalent(sub)
            annual_val = monthly_val * Decimal("12")
            
            priority = "critical" if annual_val >= Decimal("150") or idle_days >= 60 else "important"
            
            insight, created = AIInsight.objects.update_or_create(
                user=user,
                bill=sub,
                insight_type="zombie",
                defaults={
                    "priority": priority,
                    "title": f"Zombie Subscription: {sub.name}",
                    "message": (
                        f"You have not used {sub.name} in {idle_days} days. "
                        f"Cancelling will save {money(monthly_val)}/mo ({money(annual_val)}/yr)."
                    ),
                    "payload": {
                        "bill_id": sub.id,
                        "bill_name": sub.name,
                        "idle_days": idle_days,
                        "monthly_savings": money(monthly_val),
                        "annual_savings": money(annual_val),
                        "amount": money(sub.amount),
                        "recurrence": sub.recurrence,
                    },
                    "dismissed": False,
                },
            )
            insights_created.append(insight.id)
            zombies.append({
                **bill_brief(sub),
                "idle_days": idle_days,
                "monthly_savings": money(monthly_val),
                "annual_savings": money(annual_val),
                "insight_id": insight.id,
            })

    total_annual = sum(Decimal(z["annual_savings"]) for z in zombies)
    return {
        "zombie_count": len(zombies),
        "total_annual_waste": money(total_annual),
        "zombies": zombies,
    }


# ---------------------------------------------------------------------------
# Warranty Expiry Detector
# ---------------------------------------------------------------------------

def detect_expiring_warranties(user, days_threshold=30):
    """
    Flags warranty-category bills that need attention within `days_threshold`
    days — either because the overall coverage (Bill.due_date) is expiring,
    or because the retailer's return/exchange window (purchase_date +
    return_window_days) is about to close, whichever is more urgent.
    Creates or updates AIInsight records so expiring coverage surfaces the
    same way zombie subscriptions and price hikes do.
    """
    warranties = Bill.objects.filter(
        owner=user, category="warranty",
    ).exclude(status__in=["cancelled", "paid"])

    expiring = []
    for w in warranties:
        days_left = w.days_until_due
        detail = getattr(w, "warranty_detail", None)
        return_window_days = detail.return_window_days if detail else None
        return_days_left = detail.return_days_left if detail else None
        in_return_window = detail.is_in_return_window if detail else False

        coverage_expiring = 0 <= days_left <= days_threshold
        # Return window is still open and closes within the look-ahead window
        return_window_closing = in_return_window and return_days_left <= days_threshold

        if not (coverage_expiring or return_window_closing):
            continue

        # Whichever deadline is sooner drives urgency/messaging
        if in_return_window and (not coverage_expiring or return_days_left <= days_left):
            urgent_days_left = return_days_left
            urgency_reason = "return window"
        else:
            urgent_days_left = days_left
            urgency_reason = "coverage"

        priority = "critical" if urgent_days_left <= 7 else "important"

        insight, _created = AIInsight.objects.update_or_create(
            user=user,
            bill=w,
            insight_type="warranty_expiring",
            defaults={
                "priority": priority,
                "title": f"Warranty Expiring: {w.name}",
                "message": (
                    f"{w.name} return window closes in {return_days_left} day(s)."
                    if urgency_reason == "return window"
                    else (
                        f"{w.name} coverage expires in {days_left} day(s) (on {w.due_date.isoformat()}). "
                        "File a claim now if there's a known issue before coverage lapses."
                    )
                ),
                "payload": {
                    "bill_id": w.id,
                    "bill_name": w.name,
                    "expires_on": w.due_date.isoformat(),
                    "days_left": days_left,
                    "retailer": detail.retailer if detail else "",
                    "return_window_days": return_window_days,
                    "return_days_left": return_days_left,
                    "in_return_window": in_return_window,
                    "claim_url": detail.claim_url if detail and detail.claim_url else None,
                },
                "dismissed": False,
            },
        )
        expiring.append({
            **bill_brief(w),
            "days_left": days_left,
            "in_return_window": in_return_window,
            "return_days_left": return_days_left,
            "insight_id": insight.id,
        })

    return {
        "expiring_count": len(expiring),
        "warranties": expiring,
    }


# ---------------------------------------------------------------------------
# Phase 2: Spending Anomaly Detection (Section 12)
# ---------------------------------------------------------------------------

def detect_spending_anomalies(user):
    """
    Computes rolling mean and percentage deviations from past bills / PriceHistory.
    Flags if latest amount deviates > 10-15%.
    """
    bills = Bill.objects.filter(owner=user).exclude(status="cancelled")
    anomalies = []

    for bill in bills:
        # Check direct previous_amount comparison
        if bill.previous_amount is not None and bill.previous_amount > 0:
            diff = bill.amount - bill.previous_amount
            pct = (diff / bill.previous_amount) * Decimal("100")
            
            if pct >= Decimal("10"):
                priority = "critical" if pct >= Decimal("25") or diff >= Decimal("20") else "important"
                insight, _ = AIInsight.objects.update_or_create(
                    user=user,
                    bill=bill,
                    insight_type="anomaly",
                    defaults={
                        "priority": priority,
                        "title": f"Price Surge: {bill.name} increased {round(float(pct), 1)}%",
                        "message": (
                            f"{bill.name} jumped from  to  "
                            f"(+{round(float(pct), 1)}%). Extra cost: + per {bill.recurrence}."
                        ),
                        "payload": {
                            "bill_id": bill.id,
                            "previous_amount": money(bill.previous_amount),
                            "current_amount": money(bill.amount),
                            "difference": money(diff),
                            "pct_change": round(float(pct), 1),
                        },
                        "dismissed": False,
                    },
                )
                anomalies.append({
                    **bill_brief(bill),
                    "previous_amount": money(bill.previous_amount),
                    "difference": money(diff),
                    "pct_change": round(float(pct), 1),
                    "insight_id": insight.id,
                })

        # Also inspect PriceHistory snapshots if more than 3 exist
        history = list(bill.price_history.order_by("recorded_at"))
        if len(history) >= 3:
            amounts = [float(h.amount) for h in history]
            mean_amt = sum(amounts) / len(amounts)
            variance = sum((x - mean_amt) ** 2 for x in amounts) / len(amounts)
            stddev = math.sqrt(variance)
            
            latest = float(bill.amount)
            if stddev > 0:
                z_score = (latest - mean_amt) / stddev
                if z_score > 1.8:
                    # Statistical outlier
                    AIInsight.objects.update_or_create(
                        user=user,
                        bill=bill,
                        insight_type="anomaly",
                        defaults={
                            "priority": "important",
                            "title": f"Statistical Anomaly: {bill.name}",
                            "message": f"Recent charge of  is significantly above typical average of  (z-score: {z_score:.2f}).",
                            "payload": {
                                "bill_id": bill.id,
                                "mean": round(mean_amt, 2),
                                "z_score": round(z_score, 2),
                                "latest": latest,
                            },
                        },
                    )

    return {
        "anomaly_count": len(anomalies),
        "anomalies": anomalies,
    }


# ---------------------------------------------------------------------------
# Phase 5: Financial Health & Risk Score Engine (Section 11 & 13)
# ---------------------------------------------------------------------------

def calculate_financial_health(user):
    """
    Computes a composite Financial Health & Risk score (0 to 100) and risk factors.
    """
    bills = Bill.objects.filter(owner=user).exclude(status="cancelled")
    active_bills = [b for b in bills if b.status != "paid"]

    monthly_total = sum((monthly_equivalent(b) for b in bills), Decimal("0"))
    sub_total = sum((monthly_equivalent(b) for b in bills if b.is_subscription), Decimal("0"))

    # Factors
    score = 100
    factors = []

    # 1. Zombie Subscriptions
    zombie_res = detect_zombie_subscriptions(user)
    zombie_count = zombie_res["zombie_count"]
    if zombie_count > 0:
        penalty = min(30, zombie_count * 10)
        score -= penalty
        factors.append({
            "type": "zombie_waste",
            "impact": f"-{penalty} pts",
            "message": f"{zombie_count} unused zombie subscription(s) wasting /yr.",
            "status": "warning" if zombie_count < 3 else "danger",
        })
    else:
        factors.append({
            "type": "zombie_clean",
            "impact": "+0 pts",
            "message": "No unused subscriptions detected. Great job!",
            "status": "good",
        })

    # 2. Subscription Burden Ratio
    if monthly_total > 0:
        sub_ratio = float(sub_total / monthly_total) * 100
        if sub_ratio > 45:
            penalty = 15
            score -= penalty
            factors.append({
                "type": "sub_burden",
                "impact": f"-{penalty} pts",
                "message": f"Subscriptions take {sub_ratio:.0f}% of total monthly commitments (recommendation: <35%).",
                "status": "warning",
            })
        else:
            factors.append({
                "type": "sub_ratio_healthy",
                "impact": "+0 pts",
                "message": f"Healthy subscription balance ({sub_ratio:.0f}% of commitments).",
                "status": "good",
            })

    # 3. Price Increases & Anomalies
    anomaly_res = detect_spending_anomalies(user)
    anom_count = anomaly_res["anomaly_count"]
    if anom_count > 0:
        penalty = min(20, anom_count * 8)
        score -= penalty
        factors.append({
            "type": "price_hikes",
            "impact": f"-{penalty} pts",
            "message": f"{anom_count} unreviewed price increase(s) or anomalies detected.",
            "status": "warning",
        })

    # 4. Due Soon Pressure (next 7 days)
    today = date.today()
    due_7_days = [b for b in active_bills if today <= b.due_date <= today + timedelta(days=7)]
    due_7_sum = sum((b.amount for b in due_7_days), Decimal("0"))
    if due_7_sum > Decimal("500"):
        score -= 5
        factors.append({
            "type": "cashflow_pressure",
            "impact": "-5 pts",
            "message": f"Upcoming cashflow need:  due in next 7 days.",
            "status": "warning",
        })

    score = max(15, min(100, score))
    
    if score >= 85:
        grade = "A"
        rating = "Excellent"
        color = "#16a34a"
    elif score >= 70:
        grade = "B"
        rating = "Good"
        color = "#2563eb"
    elif score >= 50:
        grade = "C"
        rating = "Fair"
        color = "#d97706"
    else:
        grade = "D"
        rating = "Attention Needed"
        color = "#dc2626"

    return {
        "score": score,
        "grade": grade,
        "rating": rating,
        "color": color,
        "factors": factors,
        "monthly_commitments": money(monthly_total),
        "total_annual_waste": zombie_res["total_annual_waste"],
    }


# ---------------------------------------------------------------------------
# Phase 3: What-If Simulator Engine (Section 14)
# ---------------------------------------------------------------------------

def simulate_what_if(user, exclude_bill_ids=None, add_bills=None):
    """
    Simulates budget impact of cancelling selected bills and adding hypothetical bills.
    Returns baseline vs simulated monthly spend, annual savings, category breakdown, and new health score.
    """
    exclude_ids = set(exclude_bill_ids or [])
    all_bills = Bill.objects.filter(owner=user).exclude(status="cancelled")

    base_monthly = sum((monthly_equivalent(b) for b in all_bills), Decimal("0"))
    base_by_cat = defaultdict(lambda: Decimal("0"))
    for b in all_bills:
        base_by_cat[b.category] += monthly_equivalent(b)

    remaining_bills = [b for b in all_bills if b.id not in exclude_ids]
    sim_monthly = sum((monthly_equivalent(b) for b in remaining_bills), Decimal("0"))
    sim_by_cat = defaultdict(lambda: Decimal("0"))
    for b in remaining_bills:
        sim_by_cat[b.category] += monthly_equivalent(b)

    # If new bills added in simulation
    if add_bills:
        for item in add_bills:
            amt = Decimal(str(item.get("amount", 0)))
            rec = item.get("recurrence", "monthly")
            mult = MONTHLY_MULTIPLIER.get(rec, Decimal("1"))
            equiv = amt * mult
            sim_monthly += equiv
            sim_by_cat[item.get("category", "other")] += equiv

    monthly_savings = max(Decimal("0"), base_monthly - sim_monthly)
    annual_savings = monthly_savings * Decimal("12")

    # Estimate simulated score improvement
    curr_health = calculate_financial_health(user)
    sim_score = min(100, curr_health["score"] + len(exclude_ids) * 8)

    return {
        "baseline": {
            "monthly_total": money(base_monthly),
            "annual_total": money(base_monthly * 12),
            "by_category": {k: money(v) for k, v in base_by_cat.items()},
            "health_score": curr_health["score"],
        },
        "simulated": {
            "monthly_total": money(sim_monthly),
            "annual_total": money(sim_monthly * 12),
            "by_category": {k: money(v) for k, v in sim_by_cat.items()},
            "health_score": sim_score,
        },
        "savings": {
            "monthly": money(monthly_savings),
            "annual": money(annual_savings),
            "pct_reduced": round(float((monthly_savings / base_monthly * 100)), 1) if base_monthly > 0 else 0,
        },
        "excluded_count": len(exclude_ids),
    }


# ---------------------------------------------------------------------------
# Phase 4: AI Receipt/Bill Scanner (Section 4)
# ---------------------------------------------------------------------------

def scan_receipt_text(raw_text: str) -> dict:
    """
    Extracts bill metadata from receipt text, OCR output, or document dumps.
    """
    extracted = {
        "name": "",
        "merchant": "",
        "amount": "0.00",
        "due_date": (date.today() + timedelta(days=14)).isoformat(),
        "category": "other",
        "recurrence": "monthly",
        "is_subscription": False,
        "confidence_score": 0.88,
    }

    # Extract Amount
    amounts = re.findall(r"\$\s*(\d+(?:\.\d{2})?)", raw_text)
    if not amounts:
        amounts = re.findall(r"(?:total|balance|due|amount|charged)[:\s]*\True\s*(\d+\.\d{2})", raw_text, re.I)
    if amounts:
        extracted["amount"] = money(amounts[-1])

    # Extract Date
    dates = re.findall(r"(\d{4}-\d{2}-\d{2})", raw_text)
    if not dates:
        dates = re.findall(r"(\d{1,2}/\d{1,2}/\d{2,4})", raw_text)
    if dates:
        raw_d = dates[0]
        for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y"):
            try:
                extracted["due_date"] = datetime.strptime(raw_d, fmt).date().isoformat()
                break
            except ValueError:
                continue

    # Extract Merchant / Title
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    if lines:
        extracted["name"] = lines[0][:80]
        extracted["merchant"] = lines[0].split()[0].capitalize()

    lower = raw_text.lower()
    if any(k in lower for k in ("electric", "water", "gas", "power", "utility", "coned", "energy")):
        extracted["category"] = "utility"
    elif any(k in lower for k in ("netflix", "spotify", "hulu", "prime", "sub", "membership", "subscription", "cloud")):
        extracted["category"] = "subscription"
        extracted["is_subscription"] = True
    elif any(k in lower for k in ("loan", "mortgage", "bank", "credit", "chase", "wells")):
        extracted["category"] = "loan"

    if any(k in lower for k in ("annual", "yearly", "per year")):
        extracted["recurrence"] = "yearly"
    elif any(k in lower for k in ("weekly", "per week")):
        extracted["recurrence"] = "weekly"

    return extracted


# ---------------------------------------------------------------------------
# Phase 4: Smart Email Bill Detection Mock / Integration (Section 5)
# ---------------------------------------------------------------------------

def scan_email_mailbox_bills(user):
    """
    Simulates / integrates Gmail/IMAP email scan for recurring bills.
    Discovers recurring invoices with merchant patterns and confidence scores.
    """
    mock_detected = [
        {
            "name": "Adobe Creative Cloud",
            "merchant": "Adobe",
            "amount": "54.99",
            "category": "subscription",
            "recurrence": "monthly",
            "due_date": (date.today() + timedelta(days=5)).isoformat(),
            "is_subscription": True,
            "confidence_score": 0.96,
            "email_subject": "Your Adobe invoice is ready (#INV-84920)",
            "source": "billing@adobe.com",
        },
        {
            "name": "ConEd Electric Utility",
            "merchant": "ConEd",
            "amount": "112.40",
            "category": "utility",
            "recurrence": "monthly",
            "due_date": (date.today() + timedelta(days=12)).isoformat(),
            "is_subscription": False,
            "confidence_score": 0.92,
            "email_subject": "Your Monthly Statement from ConEd",
            "source": "statements@coned.com",
        },
        {
            "name": "Github Copilot Pro",
            "merchant": "GitHub",
            "amount": "10.00",
            "category": "subscription",
            "recurrence": "monthly",
            "due_date": (date.today() + timedelta(days=18)).isoformat(),
            "is_subscription": True,
            "confidence_score": 0.99,
            "email_subject": "Receipt for GitHub payment",
            "source": "billing@github.com",
        },
    ]

    # Filter out bills user already has
    existing_names = set(Bill.objects.filter(owner=user).values_list("name", flat=True))
    candidates = [b for b in mock_detected if b["name"] not in existing_names]
    
    return {
        "status": "success",
        "emails_scanned": 42,
        "found_count": len(candidates),
        "candidates": candidates,
    }


# ---------------------------------------------------------------------------
# Phase 3: AI Assistant Financial Chat Engine (Section 18)
# ---------------------------------------------------------------------------

def assistant_chat_query(user, user_message: str) -> dict:
    """
    Context-aware financial advisor chat.
    Injects the user's live bill catalog, spending breakdown, health score,
    and zombie alerts into natural language responses with actionable suggestions.
    """
    bills = Bill.objects.filter(owner=user).exclude(status="cancelled")
    monthly_tot = sum((monthly_equivalent(b) for b in bills), Decimal("0"))
    health = calculate_financial_health(user)
    zombies = detect_zombie_subscriptions(user)
    anomalies = detect_spending_anomalies(user)
    
    msg = user_message.lower().strip()
    suggestions = []

    # Check for specific intents
    if "zombie" in msg or "unused" in msg or "cancel" in msg:
        if zombies["zombie_count"] > 0:
            names = ", ".join(z["name"] for z in zombies["zombies"])
            reply = (
                f"You have **{zombies['zombie_count']} unused subscription(s)** ({names}) "
                f"that haven't been used in over 45 days. Cancelling them could save you "
                f"**/year** (/month)!"
            )
            suggestions = [f"Draft cancellation for {z['name']}" for z in zombies["zombies"]]
        else:
            reply = "Great news! You don't have any inactive or zombie subscriptions right now. All your subscriptions show recent activity."

    elif "health" in msg or "score" in msg or "risk" in msg:
        reply = (
            f"Your Financial Health Score is **{health['score']}/100 ({health['rating']})**.\n\n"
            f"• Monthly Commitments: \n"
            f"• Active Factors: " + "; ".join(f['message'] for f in health['factors'])
        )
        suggestions = ["How to improve my score?", "Run What-If simulation"]

    elif "spend" in msg or "total" in msg or "monthly" in msg or "budget" in msg:
        cat_sums = defaultdict(lambda: Decimal("0"))
        for b in bills:
            cat_sums[b.category] += monthly_equivalent(b)
        cat_breakdown = ", ".join(f"{k.capitalize()}: " for k, v in cat_sums.items())
        reply = (
            f"Your total normalized monthly commitment is **** across {bills.count()} bills.\n\n"
            f"Breakdown by category:\n{cat_breakdown}"
        )
        suggestions = ["Show upcoming bills", "Detect anomalies"]

    elif "due" in msg or "upcoming" in msg or "soon" in msg:
        today = date.today()
        soon = bills.filter(due_date__gte=today, due_date__lte=today + timedelta(days=7)).order_by("due_date")
        if soon.exists():
            items = ", ".join(f"{b.name} ( on {b.due_date})" for b in soon)
            reply = f"You have **{soon.count()} bill(s)** due in the next 7 days: {items}."
        else:
            reply = "You have no bills due in the next 7 days! Your cashflow is clear for the week."
        suggestions = ["View financial calendar", "Total monthly spend"]

    elif "increase" in msg or "price" in msg or "hike" in msg or "anomaly" in msg:
        if anomalies["anomaly_count"] > 0:
            anom_list = ", ".join(f"{a['name']} (+{a['pct_change']}%)" for a in anomalies["anomalies"])
            reply = f"⚠️ Detected **{anomalies['anomaly_count']} price surge(s)**: {anom_list}. Review them to prevent overpaying."
            suggestions = ["View Attention tab", "Simulate cancelling increased bills"]
        else:
            reply = "No sudden price increases or anomalous charges detected across your bills."

    else:
        # General AI financial synthesis
        top_bill = bills.order_by("-amount").first()
        top_name = f"{top_bill.name} ()" if top_bill else "None"
        reply = (
            f"Hello! I am your Billwatch AI Financial Assistant. Here is your quick pulse:\n\n"
            f"• **Monthly Spend:** \n"
            f"• **Health Score:** {health['score']}/100 ({health['rating']})\n"
            f"• **Largest Expense:** {top_name}\n"
            f"• **Identified Savings:** /yr from inactive subscriptions.\n\n"
            f"You can ask me to simulate cancellations, analyze price surges, check upcoming due dates, or draft cancellation emails."
        )
        suggestions = ["What subscriptions can I cancel?", "Simulate budget savings", "Check price increases"]

    return {
        "reply": reply,
        "suggestions": suggestions,
        "timestamp": timezone.now().isoformat(),
        "context": {
            "monthly_total": money(monthly_tot),
            "health_score": health["score"],
            "zombie_count": zombies["zombie_count"],
        },
    }
