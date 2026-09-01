from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from bills.services import detect_zombie_subscriptions

User = get_user_model()

class Command(BaseCommand):
    help = "Detect unused zombie subscriptions and generate AIInsights"

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=45, help="Idle days threshold")

    def handle(self, *args, **options):
        days = options["days"]
        for user in User.objects.all():
            res = detect_zombie_subscriptions(user, idle_days_threshold=days)
            self.stdout.write(self.style.SUCCESS(
                f"User {user.username}: found {res['zombie_count']} zombie subscriptions. Potential annual savings: ${res['total_annual_waste']}"
            ))
