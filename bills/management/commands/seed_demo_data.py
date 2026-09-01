"""
Django management command: seed_demo_data

Creates the demo Bills/Subscriptions described in the spec (Section 8):
- 4 normal bills with upcoming due dates (agent auto-handles)
- 1 bill with a price increase (Netflix $15.99 → $17.99)
- 1 subscription unused for 90+ days (Gym App)
- 1 bill due in 2 days

Usage:
    python manage.py seed_demo_data
    python manage.py seed_demo_data --flush   # wipe all Bills first
"""

from __future__ import annotations

from datetime import date, timedelta

from django.core.management.base import BaseCommand

from bills.models import Bill, Subscription


DEMO_BILLS = [
    # --- Normal bills (agent auto-handles quietly) ---
    {
        "name": "Electric Bill",
        "category": "utility",
        "amount": "120.00",
        "due_date_offset": 12,  # days from today
        "recurrence": "monthly",
        "is_subscription": False,
        "status": "active",
    },
    {
        "name": "Internet (Comcast)",
        "category": "utility",
        "amount": "79.99",
        "due_date_offset": 18,
        "recurrence": "monthly",
        "is_subscription": False,
        "status": "active",
    },
    {
        "name": "Spotify Premium",
        "category": "subscription",
        "amount": "10.99",
        "due_date_offset": 20,
        "recurrence": "monthly",
        "is_subscription": True,
        "last_used_days_ago": 5,  # recently used — should NOT be flagged
        "status": "active",
        "provider_url": "https://www.spotify.com/account/subscription/",
    },
    {
        "name": "Amazon Prime",
        "category": "subscription",
        "amount": "14.99",
        "due_date_offset": 25,
        "recurrence": "monthly",
        "is_subscription": True,
        "last_used_days_ago": 3,
        "status": "active",
        "provider_url": "https://www.amazon.com/mc/pipelines/cancellation",
    },
    # --- Bill with price increase (triggers detect_anomaly) ---
    {
        "name": "Netflix",
        "category": "subscription",
        "amount": "17.99",
        "previous_amount": "15.99",
        "due_date_offset": 9,
        "recurrence": "monthly",
        "is_subscription": True,
        "last_used_days_ago": 2,
        "status": "active",
        "provider_url": "https://www.netflix.com/cancelplan",
    },
    # --- Unused subscription >60 days (triggers detect_unused_subscription) ---
    {
        "name": "Gym Fitness App",
        "category": "subscription",
        "amount": "19.99",
        "due_date_offset": 7,
        "recurrence": "monthly",
        "is_subscription": True,
        "last_used_days_ago": 92,  # 92 days ago — well past the 60-day threshold
        "status": "active",
        "provider_url": "https://gymapp.example.com/cancel",
        "usage_notes": "Signed up in June, used it a few times, forgot about it.",
    },
    # --- Bill due in 2 days (triggers due-soon flag) ---
    {
        "name": "Water & Sewage",
        "category": "utility",
        "amount": "45.00",
        "due_date_offset": 2,  # 2 days from today!
        "recurrence": "monthly",
        "is_subscription": False,
        "status": "active",
    },
]


class Command(BaseCommand):
    help = "Seed the database with demo bills and subscriptions for the hackathon demo."

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Delete all existing Bills before seeding.",
        )

    def handle(self, *args, **options):
        if options["flush"]:
            count, _ = Bill.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"Flushed {count} existing bills."))

        today = date.today()
        created_count = 0

        for spec in DEMO_BILLS:
            due_date = today + timedelta(days=spec["due_date_offset"])
            last_used = None
            if "last_used_days_ago" in spec:
                last_used = today - timedelta(days=spec["last_used_days_ago"])

            bill, created = Bill.objects.get_or_create(
                name=spec["name"],
                defaults={
                    "category": spec["category"],
                    "amount": spec["amount"],
                    "previous_amount": spec.get("previous_amount"),
                    "due_date": due_date,
                    "recurrence": spec["recurrence"],
                    "is_subscription": spec["is_subscription"],
                    "last_used_date": last_used,
                    "status": spec["status"],
                },
            )

            if not created:
                self.stdout.write(f"  (already exists, skipping) {spec['name']}")
                continue

            created_count += 1

            # Create Subscription detail if applicable
            provider_url = spec.get("provider_url")
            usage_notes = spec.get("usage_notes")
            if spec["is_subscription"] and (provider_url or usage_notes):
                Subscription.objects.get_or_create(
                    bill=bill,
                    defaults={
                        "provider_url": provider_url,
                        "usage_notes": usage_notes,
                    },
                )

            flag = ""
            if spec.get("previous_amount"):
                flag = "  [PRICE INCREASE]"
            if spec.get("last_used_days_ago", 0) >= 60:
                flag = "  [UNUSED >60 DAYS]"
            if spec["due_date_offset"] <= 3:
                flag += "  [DUE SOON]"
            self.stdout.write(f"  Created: {bill.name} (due {due_date}){flag}")

        self.stdout.write(
            self.style.SUCCESS(f"\nSeeded {created_count} bill(s) successfully.")
        )
        self.stdout.write(
            "\nRun the agent now:\n"
            "    python run_agent.py\n"
            "Or via the API:\n"
            "    curl -X POST http://127.0.0.1:8000/api/agent/run/\n"
        )
