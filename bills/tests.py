from datetime import date, timedelta
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from bills.models import Bill, DecisionLog, Subscription
from agent.tools import (
    detect_anomaly,
    detect_unused_subscription,
    draft_notification,
    draft_cancellation_email,
    ingest_bill,
)


class BillAPITests(APITestCase):
    def setUp(self):
        # Bill/DecisionLog endpoints require authentication (see
        # bills/views.py IsAuthenticated + owner-scoped querysets), so the
        # test client needs a logged-in user or every call 401s.
        User = get_user_model()
        self.user = User.objects.create_user(username="tester", password="pass12345")
        self.client.force_authenticate(user=self.user)

        today = date.today()
        self.bill1 = Bill.objects.create(
            owner=self.user,
            name="Electricity",
            category="utility",
            amount="100.00",
            previous_amount="95.00",
            due_date=today + timedelta(days=2),
            recurrence="monthly",
            is_subscription=False,
            status="active",
        )
        self.sub1 = Bill.objects.create(
            owner=self.user,
            name="Netflix",
            category="subscription",
            amount="17.99",
            previous_amount="15.99",
            due_date=today + timedelta(days=15),
            recurrence="monthly",
            is_subscription=True,
            last_used_date=today - timedelta(days=70),
            status="active",
        )
        Subscription.objects.create(
            bill=self.sub1,
            provider_url="https://netflix.com/cancel",
            usage_notes="Inactive",
        )

    def test_list_bills(self):
        url = reverse("bill-list")
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.data["results"] if isinstance(resp.data, dict) and "results" in resp.data else resp.data
        self.assertEqual(len(results), 2)

    def test_due_soon_endpoint(self):
        url = reverse("bill-due-soon")
        resp = self.client.get(url, {"days": 5})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]["name"], "Electricity")

    def test_decision_log_approve_cancellation(self):
        decision = DecisionLog.objects.create(
            bill=self.sub1,
            agent_action="drafted_cancellation",
            reasoning="Unused for 70 days",
            draft_content="Subject: Cancellation",
            user_decision="pending",
        )
        url = reverse("decisionlog-approve", kwargs={"pk": decision.pk})
        resp = self.client.post(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        decision.refresh_from_db()
        self.assertEqual(decision.user_decision, "approved")
        self.sub1.refresh_from_db()
        self.assertEqual(self.sub1.status, "cancelled")

    def test_decision_log_reject(self):
        decision = DecisionLog.objects.create(
            bill=self.bill1,
            agent_action="drafted_notification",
            reasoning="Due soon",
            user_decision="pending",
        )
        url = reverse("decisionlog-reject", kwargs={"pk": decision.pk})
        resp = self.client.post(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        decision.refresh_from_db()
        self.assertEqual(decision.user_decision, "rejected")

    def test_agent_run_endpoint(self):
        url = reverse("agent-run")
        resp = self.client.post(url, {"days": 7}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(resp.data["status"], "started")


class DashboardSummaryTests(APITestCase):
    """Covers Phase 1: monthly commitments, due-soon, price increases,
    30-day forecast, spending trend, and the zombie-lite savings estimate."""

    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username="dash", password="pass12345")
        self.client.force_authenticate(user=self.user)
        self.today = date.today()

        # Monthly utility bill with a price increase, due soon.
        Bill.objects.create(
            owner=self.user, name="Electricity", category="utility",
            amount="150.00", previous_amount="100.00",
            due_date=self.today + timedelta(days=3),
            recurrence="monthly", is_subscription=False, status="active",
        )
        # Yearly subscription, not due soon, no price change, recently used
        # (so it should NOT be flagged as a stale/zombie subscription).
        Bill.objects.create(
            owner=self.user, name="Domain renewal", category="subscription",
            amount="1200.00", previous_amount="1200.00",
            due_date=self.today + timedelta(days=200),
            last_used_date=self.today - timedelta(days=5),
            recurrence="yearly", is_subscription=True, status="active",
        )
        # Stale/unused subscription -> should surface as potential savings.
        Bill.objects.create(
            owner=self.user, name="Canva Pro", category="subscription",
            amount="499.00", previous_amount=None,
            due_date=self.today + timedelta(days=20),
            recurrence="monthly", is_subscription=True,
            last_used_date=self.today - timedelta(days=60), status="active",
        )
        # Cancelled bill should be excluded from all totals.
        Bill.objects.create(
            owner=self.user, name="Old gym", category="other",
            amount="999.00", due_date=self.today + timedelta(days=5),
            recurrence="monthly", is_subscription=False, status="cancelled",
        )
        # Another user's bill must never leak into these totals.
        other = User.objects.create_user(username="other", password="pass12345")
        Bill.objects.create(
            owner=other, name="Not mine", category="other",
            amount="5000.00", due_date=self.today + timedelta(days=1),
            recurrence="monthly", is_subscription=False, status="active",
        )

    def test_requires_authentication(self):
        self.client.force_authenticate(user=None)
        resp = self.client.get(reverse("dashboard-summary"))
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_excludes_cancelled_and_other_users_bills(self):
        resp = self.client.get(reverse("dashboard-summary"))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        names = [b["name"] for b in resp.data["due_soon"]["bills"]]
        self.assertNotIn("Old gym", names)
        self.assertNotIn("Not mine", names)

    def test_monthly_commitments_normalises_recurrence(self):
        resp = self.client.get(reverse("dashboard-summary"))
        data = resp.data["monthly_commitments"]
        # 150 (monthly) + 1200/12 (yearly) + 499 (monthly) = 749.00
        self.assertEqual(data["total"], "749.00")

    def test_due_soon_window(self):
        resp = self.client.get(reverse("dashboard-summary"), {"days": 3})
        self.assertEqual(resp.data["due_soon"]["count"], 1)
        self.assertEqual(resp.data["due_soon"]["bills"][0]["name"], "Electricity")

    def test_due_soon_rejects_non_integer_days(self):
        resp = self.client.get(reverse("dashboard-summary"), {"days": "abc"})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_price_increase_detected(self):
        resp = self.client.get(reverse("dashboard-summary"))
        increases = resp.data["price_increases"]
        self.assertEqual(increases["count"], 1)
        self.assertEqual(increases["bills"][0]["name"], "Electricity")
        self.assertEqual(increases["bills"][0]["pct_change"], 50.0)

    def test_potential_savings_flags_stale_subscription(self):
        resp = self.client.get(reverse("dashboard-summary"))
        savings = resp.data["potential_savings"]
        names = [b["name"] for b in savings["stale_subscriptions"]]
        self.assertIn("Canva Pro", names)
        self.assertEqual(savings["monthly"], "499.00")
        self.assertEqual(savings["annual"], "5988.00")


class CalendarViewTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username="cal", password="pass12345")
        self.client.force_authenticate(user=self.user)
        self.year, self.month = 2026, 9

        Bill.objects.create(
            owner=self.user, name="Internet", category="utility",
            amount="799.00", due_date=date(2026, 9, 3),
            recurrence="monthly", status="active",
        )
        Bill.objects.create(
            owner=self.user, name="Rent", category="other",
            amount="8000.00", due_date=date(2026, 9, 15),
            recurrence="monthly", status="active",
        )
        # Outside the requested month -> must not appear.
        Bill.objects.create(
            owner=self.user, name="October bill", category="other",
            amount="100.00", due_date=date(2026, 10, 1),
            recurrence="monthly", status="active",
        )

    def test_groups_bills_by_day_and_flags_highest_day(self):
        resp = self.client.get(
            reverse("dashboard-calendar"), {"year": self.year, "month": self.month}
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("2026-09-03", resp.data["days"])
        self.assertIn("2026-09-15", resp.data["days"])
        self.assertNotIn("2026-10-01", resp.data["days"])
        self.assertEqual(resp.data["highest_expense_day"], "2026-09-15")
        self.assertEqual(resp.data["month_total"], "8799.00")

    def test_invalid_month_rejected(self):
        resp = self.client.get(reverse("dashboard-calendar"), {"year": 2026, "month": 13})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


class AgentToolsUnitTests(TestCase):
    def test_detect_anomaly_hike(self):
        bill = {"name": "Netflix", "amount": "17.99", "previous_amount": "15.99"}
        anomaly = detect_anomaly(bill)
        self.assertIsNotNone(anomaly)
        self.assertEqual(anomaly["type"], "price_increase")
        self.assertGreater(anomaly["pct_change"], 5)

    def test_detect_anomaly_normal(self):
        bill = {"name": "Gym", "amount": "50.00", "previous_amount": "50.00"}
        anomaly = detect_anomaly(bill)
        self.assertIsNone(anomaly)

    def test_detect_unused_subscription(self):
        today = date.today()
        bill = {
            "is_subscription": True,
            "last_used_date": (today - timedelta(days=90)).isoformat(),
        }
        self.assertTrue(detect_unused_subscription(bill, threshold_days=60))

        recent_bill = {
            "is_subscription": True,
            "last_used_date": (today - timedelta(days=10)).isoformat(),
        }
        self.assertFalse(detect_unused_subscription(recent_bill, threshold_days=60))

    def test_draft_cancellation_email(self):
        sub = {
            "name": "Gym App",
            "amount": "19.99",
            "recurrence": "monthly",
            "subscription_detail": {"provider_url": "https://gymapp.com/cancel"},
        }
        email = draft_cancellation_email(sub)
        self.assertIn("Cancellation Request", email)
        self.assertIn("Gym App", email)
        self.assertIn("$19.99", email)

    def test_ingest_bill_json(self):
        raw = '{"name": "Water", "amount": 45.0, "due_date": "2026-09-10", "category": "utility"}'
        data = ingest_bill(raw)
        self.assertEqual(data["name"], "Water")
        self.assertEqual(data["amount"], 45.0)
