from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from bills.services import detect_recurring_payments

User = get_user_model()

class Command(BaseCommand):
    help = "Scan bills and transaction history to detect recurring payments and update confidence scores"

    def handle(self, *args, **options):
        for user in User.objects.all():
            res = detect_recurring_payments(user)
            self.stdout.write(self.style.SUCCESS(f"User {user.username}: scanned {res['processed_count']} recurring bills."))
