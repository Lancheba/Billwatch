import calendar as calendar_module
import csv
import io
import os
import sys
import threading
from collections import defaultdict
from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal

TWO_PLACES = Decimal("0.01")


def _money(value: Decimal) -> str:
    """Round a Decimal to 2dp and render as a plain string (avoids repeating
    decimals from things like yearly/12, and normalises bare 0 to 0.00)."""
    return str(Decimal(value).quantize(TWO_PLACES, rounding=ROUND_HALF_UP))

from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Bill, DecisionLog
from .serializers import BillSerializer, DecisionLogSerializer

# Multiplier used to normalise each recurrence into a "per-month" equivalent
# so bills on different cycles (weekly / yearly) can be summed meaningfully.
MONTHLY_MULTIPLIER = {
    "monthly": Decimal("1"),
    "weekly": Decimal("52") / Decimal("12"),
    "yearly": Decimal("1") / Decimal("12"),
    "one_time": Decimal("0"),
}


def _monthly_equivalent(bill: Bill) -> Decimal:
    return bill.amount * MONTHLY_MULTIPLIER.get(bill.recurrence, Decimal("0"))


def _bill_brief(bill: Bill) -> dict:
    return {
        "id": bill.id,
        "name": bill.name,
        "category": bill.category,
        "amount": str(bill.amount),
        "due_date": bill.due_date.isoformat(),
        "recurrence": bill.recurrence,
        "is_subscription": bill.is_subscription,
    }


class BillViewSet(viewsets.ModelViewSet):
    """
    CRUD for Bills plus custom actions:
      GET  /api/bills/due-soon/?days=7   — bills due within N days
      POST /api/bills/import/            — bulk CSV import
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
                          is_subscription, last_used_date (optional)
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
            # Normalise boolean
            row["is_subscription"] = row.get("is_subscription", "false").lower() in (
                "true",
                "1",
                "yes",
            )
            serializer = BillSerializer(data=row)
            if serializer.is_valid():
                serializer.save()
                created.append(serializer.data)
            else:
                errors.append({"row": i, "errors": serializer.errors})

        return Response(
            {"created": len(created), "errors": errors},
            status=status.HTTP_207_MULTI_STATUS if errors else status.HTTP_201_CREATED,
        )


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
        # If it was a cancellation draft, mark the bill as cancelled.
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


class AgentRunView(APIView):
    """
    POST /api/agent/run/
    Triggers the Bill Watcher agent run in a background thread and returns
    immediately. The agent logs its decisions to DecisionLog via the API.

    Optional body: { "days": 7 }
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        days = int(request.data.get("days", 7))

        def _run():
            # Make sure Django settings are available in the new thread
            project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            if project_root not in sys.path:
                sys.path.insert(0, project_root)

            try:
                from run_agent import run
                run(days=days)
            except Exception as exc:  # pragma: no cover
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


class DashboardSummaryView(APIView):
    """
    GET /api/dashboard/summary/

    Rolls the user's bills up into the "Financial Overview" the dashboard
    needs: normalised monthly commitments (by category), what's due in the
    next 7 days, detected price increases, a 30-day cash-need forecast, and
    a month-over-month spending trend.

    Optional query param: ?days=7 controls the "due soon" window.
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
        active_bills = bills.exclude(status__in=["cancelled"])

        # ---- Monthly commitments, normalised across recurrences --------
        by_category = defaultdict(lambda: Decimal("0"))
        monthly_total = Decimal("0")
        for bill in active_bills:
            equiv = _monthly_equivalent(bill)
            by_category[bill.category] += equiv
            monthly_total += equiv

        # ---- Due within the next N days ---------------------------------
        cutoff = today + timedelta(days=due_soon_days)
        due_soon_qs = active_bills.filter(
            due_date__gte=today, due_date__lte=cutoff
        ).exclude(status="paid")
        due_soon = [_bill_brief(b) for b in due_soon_qs]

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
                **_bill_brief(b),
                "previous_amount": str(b.previous_amount),
                "increase": str(delta),
                "pct_change": round(float(pct), 1),
            })

        # ---- Next 30 days cash-need forecast ------------------------------
        horizon = today + timedelta(days=30)
        next_30_qs = active_bills.filter(
            due_date__gte=today, due_date__lte=horizon
        ).exclude(status="paid")
        next_30_by_category = defaultdict(lambda: Decimal("0"))
        next_30_total = Decimal("0")
        for b in next_30_qs:
            next_30_by_category[b.category] += b.amount
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

        # ---- Simple potential-savings estimate (zombie-lite) ---------------
        # Flags active subscriptions unused for 45+ days as "at risk" so the
        # dashboard has something concrete to recommend cancelling/reviewing.
        stale_cutoff = today - timedelta(days=45)
        stale_subs = [
            b for b in active_bills
            if b.is_subscription and (b.last_used_date is None or b.last_used_date < stale_cutoff)
        ]
        potential_savings = sum((_monthly_equivalent(b) for b in stale_subs), Decimal("0"))

        return Response({
            "monthly_commitments": {
                "total": _money(monthly_total),
                "by_category": {k: _money(v) for k, v in by_category.items()},
            },
            "due_soon": {
                "window_days": due_soon_days,
                "count": len(due_soon),
                "bills": due_soon,
            },
            "price_increases": {
                "count": len(price_increases),
                "monthly_impact": _money(monthly_increase_impact),
                "bills": price_increases,
            },
            "next_30_days": {
                "total": _money(next_30_total),
                "by_category": {k: _money(v) for k, v in next_30_by_category.items()},
            },
            "spending_trend": {
                "current_month_total": _money(current_month_total),
                "previous_month_total": _money(previous_month_total),
                "pct_change": round(trend_pct, 1) if trend_pct is not None else None,
            },
            "potential_savings": {
                "monthly": _money(potential_savings),
                "annual": _money(potential_savings * 12),
                "stale_subscriptions": [_bill_brief(b) for b in stale_subs],
            },
        })


class CalendarView(APIView):
    """
    GET /api/dashboard/calendar/?year=2026&month=9

    Groups the user's bills by due_date for the requested month so the
    frontend can render a "Smart Financial Calendar" without doing the
    grouping/aggregation itself. Defaults to the current month.
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
            days[b.due_date.isoformat()].append(_bill_brief(b))

        day_totals = {
            day: _money(sum((Decimal(item["amount"]) for item in items), Decimal("0")))
            for day, items in days.items()
        }
        highest_day = max(day_totals, key=lambda d: Decimal(day_totals[d])) if day_totals else None

        return Response({
            "year": year,
            "month": month,
            "days": days,
            "day_totals": day_totals,
            "highest_expense_day": highest_day,
            "month_total": _money(sum((Decimal(v) for v in day_totals.values()), Decimal("0"))),
        })
