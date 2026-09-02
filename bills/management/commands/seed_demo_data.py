"""
Django management command: seed_demo_data
Seeds rich demo bills, price history, zombie subscriptions, and price hikes.
"""

from __future__ import annotations

from datetime import date, timedelta
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from bills.models import Bill, Subscription, Warranty, PriceHistory
from bills.services import (
    detect_recurring_payments,
    detect_zombie_subscriptions,
    detect_spending_anomalies,
    detect_expiring_warranties,
)

User = get_user_model()

DEMO_BILLS = [
    {
        "name": "Electric Utility (ConEd)",
        "merchant": "ConEd",
        "category": "utility",
        "amount": "120.00",
        "previous_amount": "115.00",
        "due_date_offset": 12,
        "recurrence": "monthly",
        "is_subscription": False,
        "status": "active",
    },
    {
        "name": "Internet (Verizon Fios)",
        "merchant": "Verizon",
        "category": "utility",
        "amount": "79.99",
        "due_date_offset": 18,
        "recurrence": "monthly",
        "is_subscription": False,
        "status": "active",
    },
    {
        "name": "Spotify Premium",
        "merchant": "Spotify",
        "category": "subscription",
        "amount": "10.99",
        "due_date_offset": 20,
        "recurrence": "monthly",
        "is_subscription": True,
        "last_used_days_ago": 2,
        "status": "active",
        "provider_url": "https://www.spotify.com/account/subscription/",
    },
    {
        "name": "Amazon Prime",
        "merchant": "Amazon",
        "category": "subscription",
        "amount": "14.99",
        "due_date_offset": 25,
        "recurrence": "monthly",
        "is_subscription": True,
        "last_used_days_ago": 3,
        "status": "active",
        "provider_url": "https://www.amazon.com/mc/pipelines/cancellation",
    },
    {
        "name": "Netflix Premium",
        "merchant": "Netflix",
        "category": "subscription",
        "amount": "19.99",
        "previous_amount": "15.99",
        "due_date_offset": 9,
        "recurrence": "monthly",
        "is_subscription": True,
        "last_used_days_ago": 4,
        "status": "active",
        "provider_url": "https://www.netflix.com/cancelplan",
    },
    {
        "name": "Gym Fitness App",
        "merchant": "GymApp",
        "category": "subscription",
        "amount": "24.99",
        "due_date_offset": 7,
        "recurrence": "monthly",
        "is_subscription": True,
        "last_used_days_ago": 92,
        "status": "active",
        "provider_url": "https://gymapp.example.com/cancel",
        "usage_notes": "Signed up in spring, not opened in over 90 days.",
    },
    {
        "name": "Cloud Storage Pro",
        "merchant": "Dropbox",
        "category": "subscription",
        "amount": "12.99",
        "due_date_offset": 14,
        "recurrence": "monthly",
        "is_subscription": True,
        "last_used_days_ago": 80,
        "status": "active",
        "provider_url": "https://dropbox.com/cancel",
    },
    {
        "name": "Water & City Sewage",
        "merchant": "CityWater",
        "category": "utility",
        "amount": "45.00",
        "due_date_offset": 2,
        "recurrence": "monthly",
        "is_subscription": False,
        "status": "active",
    },
    {
        "name": "Car Loan Payment",
        "merchant": "ChaseAuto",
        "category": "loan",
        "amount": "285.00",
        "due_date_offset": 16,
        "recurrence": "monthly",
        "is_subscription": False,
        "status": "active",
    },
    {
        "name": "MacBook Pro",
        "merchant": "BestBuy",
        "category": "warranty",
        "amount": "1999.00",
        "due_date_offset": 6,
        "recurrence": "one_time",
        "is_subscription": False,
        "status": "active",
        "retailer": "BestBuy",
        "purchase_date_offset": -359,
        "return_window_days": 15,
        "claim_url": "https://www.bestbuy.com/site/help-topics/return-exchange-policy/pcmcat260800050000.c",
    },
    {
        "name": "KitchenAid Stand Mixer",
        "merchant": "Target",
        "category": "warranty",
        "amount": "429.00",
        "due_date_offset": 22,
        "recurrence": "one_time",
        "is_subscription": False,
        "status": "active",
        "retailer": "Target",
        "purchase_date_offset": -343,
        "return_window_days": 30,
        "claim_url": "https://www.kitchenaid.com/warranty.html",
    },
]


class Command(BaseCommand):
    help = "Seed the database with rich demo bills, price history, and insights."

    def add_arguments(self, parser):
        parser.add_argument("--flush", action="store_true", help="Delete existing bills before seeding.")
        parser.add_argument("--username", type=str, default="demo", help="Username to attach seeded bills to.")

    def handle(self, *args, **options):
        username = options["username"]
        user, _ = User.objects.get_or_create(username=username, defaults={"email": f"{username}@billwatch.local"})
        if not user.has_usable_password():
            user.set_password("pass12345")
            user.save()

        if options["flush"]:
            count, _ = Bill.objects.filter(owner=user).delete()
            self.stdout.write(self.style.WARNING(f"Flushed {count} existing bills for {username}."))

        today = date.today()
        created_count = 0

        for spec in DEMO_BILLS:
            due_date = today + timedelta(days=spec["due_date_offset"])
            last_used = None
            if "last_used_days_ago" in spec:
                last_used = today - timedelta(days=spec["last_used_days_ago"])

            bill, created = Bill.objects.get_or_create(
                owner=user,
                name=spec["name"],
                defaults={
                    "merchant": spec.get("merchant", ""),
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

            if created:
                created_count += 1
                if spec.get("previous_amount"):
                    # Add earlier price history record
                    PriceHistory.objects.create(
                        bill=bill,
                        amount=spec["previous_amount"],
                        notes="Recorded 6 months ago",
                    )

                provider_url = spec.get("provider_url")
                if spec["is_subscription"] and provider_url:
                    Subscription.objects.get_or_create(
                        bill=bill,
                        defaults={"provider_url": provider_url, "usage_notes": spec.get("usage_notes", "")},
                    )

                if spec["category"] == "warranty":
                    purchase_date = None
                    if "purchase_date_offset" in spec:
                        purchase_date = today + timedelta(days=spec["purchase_date_offset"])
                    Warranty.objects.get_or_create(
                        bill=bill,
                        defaults={
                            "retailer": spec.get("retailer", ""),
                            "purchase_date": purchase_date,
                            "return_window_days": spec.get("return_window_days"),
                            "claim_url": spec.get("claim_url", ""),
                        },
                    )

        # Trigger detection routines to populate initial AI insights
        detect_recurring_payments(user)
        detect_zombie_subscriptions(user)
        detect_spending_anomalies(user)
        detect_expiring_warranties(user)

        self.stdout.write(self.style.SUCCESS(f"Seeded demo bills and initial AI Insights for user '{username}'!"))
