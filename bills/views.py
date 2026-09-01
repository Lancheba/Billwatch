import csv
import io
import os
import sys
import threading
from datetime import date, timedelta

from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Bill, DecisionLog
from .serializers import BillSerializer, DecisionLogSerializer


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
