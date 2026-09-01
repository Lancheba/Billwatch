from datetime import date, timedelta
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
        today = date.today()
        self.bill1 = Bill.objects.create(
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
