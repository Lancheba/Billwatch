import calendar as calendar_module
import csv
import io
import os
import sys
import threading
from collections import defaultdict
from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal

from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Bill, DecisionLog, PriceHistory, AIInsight
from .serializers import (
    BillSerializer,
    DecisionLogSerializer,
    PriceHistorySerializer,
    AIInsightSerializer,
)
from .services import (
    MONTHLY_MULTIPLIER,
    money,
    monthly_equivalent,
    bill_brief,
    detect_recurring_payments,
    detect_zombie_subscriptions,
    detect_spending_anomalies,
    calculate_financial_health,
    simulate_what_if,
    scan_receipt_text,
    scan_email_mailbox_bills,
    assistant_chat_query,
)


class BillViewSet(viewsets.ModelViewSet):
    """
    CRUD for Bills plus intelligent actions:
      GET  /api/bills/due-soon/?days=7
      POST /api/bills/import/
      POST /api/bills/detect-recurring/
      POST /api/bills/detect-zombies/
      POST /api/bills/detect-anomalies/
      POST /api/bills/scan/
      POST /api/bills/scan-email/
    """

    serializer_class = BillSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Bill.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=False, methods=["get"], url_path="due-soon")
    def due_soon(self, request):
        """Return bills whose due_date is within `days` days from today."""
        try:
            days = int(request.query_params.get("days", 7))
        except ValueError:
            return Response(
                {"error": "days must be an integer"}, status=status.HTTP_400_BAD_REQUEST
            )
        today = date.today()
        cutoff = today + timedelta(days=days)
        qs = Bill.objects.filter(
            owner=request.user, due_date__gte=today, due_date__lte=cutoff
        ).exclude(status__in=["paid", "cancelled"])
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], url_path="import")
    def import_csv(self, request):
        """
        Bulk import bills from a CSV file.
        Expected columns: name, category, amount, due_date, recurrence,
                          is_subscription, last_used_date (optional), merchant (optional)
        """
        file = request.FILES.get("file")
        if not file:
            return Response(
                {"error": "No file provided. Send a multipart/form-data request with key 'file'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        decoded = file.read().decode("utf-8")
        reader = csv.DictReader(io.StringIO(decoded))
        created, errors = [], []

        for i, row in enumerate(reader, start=1):
            row = {k.strip(): v.strip() for k, v in row.items()}
            row["is_subscription"] = row.get("is_subscription", "false").lower() in (
                "true",
                "1",
                "yes",
            )
            serializer = BillSerializer(data=row)
            if serializer.is_valid():
                serializer.save(owner=request.user)
                created.append(serializer.data)
            else:
                errors.append({"row": i, "errors": serializer.errors})

        return Response(
            {"created": len(created), "errors": errors},
            status=status.HTTP_207_MULTI_STATUS if errors else status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["post"], url_path="detect-recurring")
    def detect_recurring(self, request):
        """Scan transaction/bill history to infer recurrence intervals & confidence scores."""
        result = detect_recurring_payments(request.user)
        return Response(result)

    @action(detail=False, methods=["post"], url_path="detect-zombies")
    def detect_zombies(self, request):
        """Scan active subscriptions for idle usage and create AI Insights."""
        threshold = int(request.data.get("threshold_days", 45))
        result = detect_zombie_subscriptions(request.user, idle_days_threshold=threshold)
        return Response(result)

    @action(detail=False, methods=["post"], url_path="detect-anomalies")
    def detect_anomalies(self, request):
        """Scan past bills and PriceHistory for price surges and statistical anomalies."""
        result = detect_spending_anomalies(request.user)
        return Response(result)

    @action(detail=False, methods=["post"], url_path="scan")
    def scan_receipt(self, request):
        """
        AI Receipt / Bill scanner endpoint.
        Accepts raw_text or an uploaded receipt image/pdf file.
        """
        file = request.FILES.get("file")
        raw_text = request.data.get("raw_text", "")

        if file:
            # If text file or read direct
            try:
                content = file.read().decode("utf-8", errors="ignore")
                raw_text += "\n" + content
            except Exception:
                raw_text += f"\nReceipt: {file.name}"

        if not raw_text.strip():
            return Response(
                {"error": "Please provide 'raw_text' or upload a 'file'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        extracted = scan_receipt_text(raw_text)
        return Response({
            "status": "success",
            "extracted": extracted,
            "message": "Extracted bill metadata ready for review and import.",
        })

    @action(detail=False, methods=["post"], url_path="scan-email")
    def scan_email(self, request):
        """Scans email inbox stream for recurring invoices with confidence scores."""
        result = scan_email_mailbox_bills(request.user)
        return Response(result)


class AIInsightViewSet(viewsets.ModelViewSet):
    """
    CRUD and actions for AI-generated insights, anomalies, and zombie alerts.
    """
    serializer_class = AIInsightSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = AIInsight.objects.filter(user=self.request.user)
        show_all = self.request.query_params.get("all") == "1"
        if not show_all:
            qs = qs.filter(dismissed=False)
        priority = self.request.query_params.get("priority")
        if priority:
            qs = qs.filter(priority=priority)
        return qs

    @action(detail=True, methods=["post"])
    def dismiss(self, request, pk=None):
        insight = self.get_object()
        insight.dismissed = True
        insight.save(update_fields=["dismissed"])
        return Response({"status": "dismissed", "id": insight.id})

    @action(detail=True, methods=["post"])
    def act(self, request, pk=None):
        """Takes immediate action on an insight (e.g., drafts cancellation or cancels bill)."""
        insight = self.get_object()
        action_type = request.data.get("action_type", "draft_cancellation")
        
        if insight.bill:
            if action_type == "draft_cancellation":
                # Create a DecisionLog
                log = DecisionLog.objects.create(
                    bill=insight.bill,
                    agent_action="drafted_cancellation",
                    reasoning=f"[Insight Action] {insight.message}",
                    draft_content=(
                        f"Subject: Cancellation Request - {insight.bill.name}\n\n"
                        f"Please cancel my {insight.bill.name} subscription billed at "
                        f"${money(insight.bill.amount)}/{insight.bill.recurrence}."
                    ),
                    user_decision="pending",
                )
                insight.dismissed = True
                insight.save(update_fields=["dismissed"])
                return Response({
                    "status": "success",
                    "message": "Cancellation drafted in Decision Log.",
                    "decision_log_id": log.id,
                })
            elif action_type == "cancel_bill":
                insight.bill.status = "cancelled"
                insight.bill.save(update_fields=["status"])
                insight.dismissed = True
                insight.save(update_fields=["dismissed"])
                return Response({"status": "success", "message": f"{insight.bill.name} marked cancelled."})

        insight.dismissed = True
        insight.save(update_fields=["dismissed"])
        return Response({"status": "dismissed", "id": insight.id})


class DecisionLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only list/retrieve for DecisionLog.
    POST /api/decisions/<id>/approve/  — user approves a drafted action.
    POST /api/decisions/<id>/reject/   — user rejects a drafted action.
    """

    serializer_class = DecisionLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return DecisionLog.objects.select_related("bill").filter(
            bill__owner=self.request.user
        )

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        log = self.get_object()
        log.user_decision = "approved"
        log.save(update_fields=["user_decision"])
        if log.agent_action == "drafted_cancellation":
            log.bill.status = "cancelled"
            log.bill.save(update_fields=["status"])
        return Response(DecisionLogSerializer(log).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        log = self.get_object()
        log.user_decision = "rejected"
        log.save(update_fields=["user_decision"])
        return Response(DecisionLogSerializer(log).data)


class DashboardSummaryView(APIView):
    """
    GET /api/dashboard/summary/
    Rolls up user's financial overview, normalized commitments, price increases,
    30-day forecast, spending trends, savings engine, and financial health score.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            due_soon_days = int(request.query_params.get("days", 7))
        except ValueError:
            return Response(
                {"error": "days must be an integer"}, status=status.HTTP_400_BAD_REQUEST
            )

        today = date.today()
        bills = Bill.objects.filter(owner=request.user)
        active_bills = bills.exclude(status="cancelled")

        # ---- Monthly commitments, normalised across recurrences --------
        by_category = defaultdict(lambda: Decimal("0"))
        monthly_total = Decimal("0")
        for bill in active_bills:
            equiv = monthly_equivalent(bill)
            by_category[bill.category] += equiv
            monthly_total += equiv

        # ---- Due within the next N days ---------------------------------
        cutoff = today + timedelta(days=due_soon_days)
        due_soon_qs = active_bills.filter(
            due_date__gte=today, due_date__lte=cutoff
        ).exclude(status="paid")
        due_soon = [bill_brief(b) for b in due_soon_qs]

        # ---- Price increase detection ------------------------------------
        price_increase_qs = [
            b for b in active_bills
            if b.previous_amount is not None and b.amount > b.previous_amount
        ]
        price_increases = []
        monthly_increase_impact = Decimal("0")
        for b in price_increase_qs:
            delta = b.amount - b.previous_amount
            pct = (delta / b.previous_amount * 100) if b.previous_amount else Decimal("0")
            monthly_increase_impact += delta * MONTHLY_MULTIPLIER.get(b.recurrence, Decimal("0"))
            price_increases.append({
                **bill_brief(b),
                "previous_amount": money(b.previous_amount),
                "increase": money(delta),
                "pct_change": round(float(pct), 1),
            })

        # ---- Next 30 days cash-need forecast ------------------------------
        horizon = today + timedelta(days=30)
        next_30_qs = active_bills.filter(
            due_date__gte=today, due_date__lte=horizon
        ).exclude(status="paid")
        next_30_by_category = defaultdict(lambda: Decimal("0"))
        next_30_by_recurrence = defaultdict(lambda: Decimal("0"))
        next_30_total = Decimal("0")
        for b in next_30_qs:
            next_30_by_category[b.category] += b.amount
            next_30_by_recurrence[b.recurrence] += b.amount
            next_30_total += b.amount

        # ---- Month-over-month spending trend (by due_date) ----------------
        first_of_this_month = today.replace(day=1)
        last_month_end = first_of_this_month - timedelta(days=1)
        first_of_last_month = last_month_end.replace(day=1)

        current_month_total = sum(
            (b.amount for b in active_bills if b.due_date >= first_of_this_month
             and b.due_date <= today.replace(day=calendar_module.monthrange(today.year, today.month)[1])),
            Decimal("0"),
        )
        previous_month_total = sum(
            (b.amount for b in active_bills if first_of_last_month <= b.due_date <= last_month_end),
            Decimal("0"),
        )
        if previous_month_total > 0:
            trend_pct = float((current_month_total - previous_month_total) / previous_month_total * 100)
        else:
            trend_pct = None

        # ---- Savings Engine & Zombie summary -----------------------------
        zombie_res = detect_zombie_subscriptions(request.user)
        health_res = calculate_financial_health(request.user)

        return Response({
            "monthly_commitments": {
                "total": money(monthly_total),
                "by_category": {k: money(v) for k, v in by_category.items()},
            },
            "due_soon": {
                "window_days": due_soon_days,
                "count": len(due_soon),
                "bills": due_soon,
            },
            "price_increases": {
                "count": len(price_increases),
                "monthly_impact": money(monthly_increase_impact),
                "bills": price_increases,
            },
            "next_30_days": {
                "total": money(next_30_total),
                "by_category": {k: money(v) for k, v in next_30_by_category.items()},
                "by_recurrence": {k: money(v) for k, v in next_30_by_recurrence.items()},
            },
            "spending_trend": {
                "current_month_total": money(current_month_total),
                "previous_month_total": money(previous_month_total),
                "pct_change": round(trend_pct, 1) if trend_pct is not None else None,
            },
            "potential_savings": {
                "monthly": money(Decimal(zombie_res["total_annual_waste"]) / 12) if Decimal(zombie_res["total_annual_waste"]) > 0 else "0.00",
                "annual": zombie_res["total_annual_waste"],
                "zombie_count": zombie_res["zombie_count"],
                "stale_subscriptions": zombie_res["zombies"],
            },
            "financial_health": health_res,
        })


class CalendarView(APIView):
    """
    GET /api/dashboard/calendar/?year=2026&month=9
    Groups bills by due_date for interactive monthly grid rendering.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = date.today()
        try:
            year = int(request.query_params.get("year", today.year))
            month = int(request.query_params.get("month", today.month))
        except ValueError:
            return Response(
                {"error": "year and month must be integers"}, status=status.HTTP_400_BAD_REQUEST
            )
        if not (1 <= month <= 12):
            return Response({"error": "month must be 1-12"}, status=status.HTTP_400_BAD_REQUEST)

        _, days_in_month = calendar_module.monthrange(year, month)
        start = date(year, month, 1)
        end = date(year, month, days_in_month)

        bills = Bill.objects.filter(
            owner=request.user, due_date__gte=start, due_date__lte=end
        ).exclude(status="cancelled")

        days = defaultdict(list)
        for b in bills:
            days[b.due_date.isoformat()].append(bill_brief(b))

        day_totals = {
            day: money(sum((Decimal(item["amount"]) for item in items), Decimal("0")))
            for day, items in days.items()
        }
        highest_day = max(day_totals, key=lambda d: Decimal(day_totals[d])) if day_totals else None

        return Response({
            "year": year,
            "month": month,
            "days": days,
            "day_totals": day_totals,
            "highest_expense_day": highest_day,
            "month_total": money(sum((Decimal(v) for v in day_totals.values()), Decimal("0"))),
        })


class WhatIfSimulatorView(APIView):
    """
    POST /api/dashboard/what-if/
    Body: { "exclude_bill_ids": [1, 2], "add_bills": [...] }
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        exclude_bill_ids = request.data.get("exclude_bill_ids", [])
        add_bills = request.data.get("add_bills", [])
        result = simulate_what_if(request.user, exclude_bill_ids=exclude_bill_ids, add_bills=add_bills)
        return Response(result)


class AgentChatView(APIView):
    """
    POST /api/agent/chat/
    Body: { "message": "What subscriptions should I cancel?" }
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        message = request.data.get("message", "").strip()
        if not message:
            return Response(
                {"error": "message is required"}, status=status.HTTP_400_BAD_REQUEST
            )
        result = assistant_chat_query(request.user, message)
        return Response(result)


class AgentRunView(APIView):
    """
    POST /api/agent/run/
    Triggers the Bill Watcher agent run in background.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        days = int(request.data.get("days", 7))

        def _run():
            project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            if project_root not in sys.path:
                sys.path.insert(0, project_root)

            try:
                from run_agent import run
                run(days=days)
            except Exception as exc:
                import traceback
                print(f"[AgentRunView] Agent error: {exc}")
                traceback.print_exc()

        thread = threading.Thread(target=_run, daemon=True)
        thread.start()

        return Response(
            {
                "status": "started",
                "message": f"Agent run started in background (look-ahead {days} days). "
                           "Check /api/decisions/ for results.",
            },
            status=status.HTTP_202_ACCEPTED,
        )
