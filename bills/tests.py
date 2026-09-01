from datetime import date, timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from bills.models import Bill, DecisionLog, Subscription, PriceHistory, AIInsight
from bills.services import (
    detect_recurring_payments,
    detect_zombie_subscriptions,
    detect_spending_anomalies,
    calculate_financial_health,
    simulate_what_if,
    scan_receipt_text,
    scan_email_mailbox_bills,
    assistant_chat_query,
)
from agent.tools import (
    detect_anomaly,
    detect_unused_subscription,
    draft_notification,
    draft_cancellation_email,
    ingest_bill,
)


class BillAPITests(APITestCase):
    def setUp(self):
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

    from unittest.mock import patch

    @patch("run_agent.run")
    def test_agent_run_endpoint(self, mock_run):
        url = reverse("agent-run")
        resp = self.client.post(url, {"days": 7}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(resp.data["status"], "started")


class DashboardSummaryTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username="dash", password="pass12345")
        self.client.force_authenticate(user=self.user)
        self.today = date.today()

        Bill.objects.create(
            owner=self.user, name="Electricity", category="utility",
            amount="150.00", previous_amount="100.00",
            due_date=self.today + timedelta(days=3),
            recurrence="monthly", is_subscription=False, status="active",
        )
        Bill.objects.create(
            owner=self.user, name="Domain renewal", category="subscription",
            amount="1200.00", previous_amount="1200.00",
            due_date=self.today + timedelta(days=200),
            last_used_date=self.today - timedelta(days=5),
            recurrence="yearly", is_subscription=True, status="active",
        )
        Bill.objects.create(
            owner=self.user, name="Canva Pro", category="subscription",
            amount="499.00", previous_amount=None,
            due_date=self.today + timedelta(days=20),
            recurrence="monthly", is_subscription=True,
            last_used_date=self.today - timedelta(days=60), status="active",
        )
        Bill.objects.create(
            owner=self.user, name="Old gym", category="other",
            amount="999.00", due_date=self.today + timedelta(days=5),
            recurrence="monthly", is_subscription=False, status="cancelled",
        )
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
        self.assertEqual(data["total"], "749.00")

    def test_due_soon_window(self):
        resp = self.client.get(reverse("dashboard-summary"), {"days": 3})
        self.assertEqual(resp.data["due_soon"]["count"], 1)
        self.assertEqual(resp.data["due_soon"]["bills"][0]["name"], "Electricity")

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


class WhatIfAndChatTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username="simuser", password="pass12345")
        self.client.force_authenticate(user=self.user)
        self.today = date.today()

        self.b1 = Bill.objects.create(
            owner=self.user, name="Netflix", category="subscription",
            amount="20.00", due_date=self.today + timedelta(days=5),
            recurrence="monthly", is_subscription=True, status="active",
        )
        self.b2 = Bill.objects.create(
            owner=self.user, name="Gym", category="subscription",
            amount="50.00", due_date=self.today + timedelta(days=10),
            recurrence="monthly", is_subscription=True, status="active",
        )

    def test_what_if_simulator_endpoint(self):
        url = reverse("dashboard-what-if")
        resp = self.client.post(url, {"exclude_bill_ids": [self.b1.id]}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["baseline"]["monthly_total"], "70.00")
        self.assertEqual(resp.data["simulated"]["monthly_total"], "50.00")
        self.assertEqual(resp.data["savings"]["monthly"], "20.00")
        self.assertEqual(resp.data["savings"]["annual"], "240.00")

    def test_agent_chat_endpoint(self):
        url = reverse("agent-chat")
        resp = self.client.post(url, {"message": "How much do I spend on subscriptions?"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("reply", resp.data)
        self.assertIn("suggestions", resp.data)


class InsightsAndScannerAPITests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username="insightuser", password="pass12345")
        self.client.force_authenticate(user=self.user)
        self.today = date.today()

        self.bill = Bill.objects.create(
            owner=self.user, name="Old Software", category="subscription",
            amount="30.00", due_date=self.today + timedelta(days=5),
            recurrence="monthly", is_subscription=True,
            last_used_date=self.today - timedelta(days=60), status="active",
        )
        self.insight = AIInsight.objects.create(
            user=self.user,
            bill=self.bill,
            insight_type="zombie",
            priority="critical",
            title="Zombie Subscription: Old Software",
            message="Unused for 60 days",
            payload={"annual_savings": "360.00"},
        )

    def test_list_and_dismiss_insight(self):
        url = reverse("aiinsight-list")
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(resp.data), 1)

        dismiss_url = reverse("aiinsight-dismiss", kwargs={"pk": self.insight.pk})
        resp = self.client.post(dismiss_url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.insight.refresh_from_db()
        self.assertTrue(self.insight.dismissed)

    def test_scan_receipt_endpoint(self):
        url = reverse("bill-scan-receipt")
        sample_receipt = "Spotify Premium\nAmount: $9.99\nDate: 2026-09-12\nMonthly charge."
        resp = self.client.post(url, {"raw_text": sample_receipt}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["extracted"]["amount"], "9.99")
        self.assertEqual(resp.data["extracted"]["category"], "subscription")


class CoreServicesTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username="serviceuser", password="pass12345")
        self.today = date.today()

    def test_scan_receipt_text(self):
        raw = "Netflix US\nAmount: $15.49\nDue: 2026-09-20\nMonthly subscription"
        res = scan_receipt_text(raw)
        self.assertEqual(res["amount"], "15.49")
        self.assertEqual(res["category"], "subscription")
        self.assertTrue(res["is_subscription"])

    def test_financial_health_score(self):
        Bill.objects.create(
            owner=self.user, name="Rent", amount="1000.00",
            due_date=self.today + timedelta(days=10),
            recurrence="monthly", is_subscription=False, status="active",
        )
        health = calculate_financial_health(self.user)
        self.assertGreaterEqual(health["score"], 80)
        self.assertEqual(health["rating"], "Excellent")
