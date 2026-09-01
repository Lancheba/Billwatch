"""
Django management command: assign_bills

Assigns all Bills that currently have no owner (owner=None) — typically
ones created by seed_demo_data — to a given user account, so they show
up on that user's dashboard.

Usage (from your Billwatch project root, with venv active):
    python manage.py assign_bills --username testuser

If --username is omitted, it assigns them to the first user found.
Safe to re-run: bills that already have an owner are left untouched.
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from bills.models import Bill


class Command(BaseCommand):
    help = "Assign ownerless (seeded) bills to a specific user."

    def add_arguments(self, parser):
        parser.add_argument(
            "--username",
            type=str,
            default=None,
            help="Username to assign ownerless bills to. Defaults to the first user found.",
        )

    def handle(self, *args, **options):
        User = get_user_model()
        username = options["username"]

        if username:
            try:
                user = User.objects.get(username=username)
            except User.DoesNotExist:
                raise CommandError(f"No user found with username '{username}'.")
        else:
            user = User.objects.order_by("id").first()
            if not user:
                raise CommandError("No users exist yet. Sign up first, then re-run this command.")

        unowned = Bill.objects.filter(owner__isnull=True)
        count = unowned.count()

        if count == 0:
            self.stdout.write(self.style.WARNING("No ownerless bills found — nothing to do."))
            return

        unowned.update(owner=user)
        self.stdout.write(
            self.style.SUCCESS(f"Assigned {count} bill(s) to user '{user.username}'.")
        )
