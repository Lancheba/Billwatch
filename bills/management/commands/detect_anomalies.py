from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from bills.services import detect_spending_anomalies

User = get_user_model()

class Command(BaseCommand):
    help = "Scan PriceHistory and past bills to detect price surges and spending anomalies"

    def handle(self, *args, **options):
        for user in User.objects.all():
            res = detect_spending_anomalies(user)
            self.stdout.write(self.style.SUCCESS(
                f"User {user.username}: identified {res['anomaly_count']} spending anomalies."
            ))
