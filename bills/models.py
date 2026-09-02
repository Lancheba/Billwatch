from datetime import date, timedelta
from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

MONTHLY_MULTIPLIER = {
    "monthly": Decimal("1"),
    "weekly": Decimal("52") / Decimal("12"),
    "yearly": Decimal("1") / Decimal("12"),
    "one_time": Decimal("0"),
}


class Bill(models.Model):
    CATEGORY_CHOICES = [
        ("utility", "Utility"),
        ("subscription", "Subscription"),
        ("loan", "Loan"),
        ("warranty", "Warranty"),
        ("other", "Other"),
    ]
    RECURRENCE_CHOICES = [
        ("monthly", "Monthly"),
        ("yearly", "Yearly"),
        ("weekly", "Weekly"),
        ("one_time", "One Time"),
    ]
    STATUS_CHOICES = [
        ("active", "Active"),
        ("flagged", "Flagged"),
        ("cancelled", "Cancelled"),
        ("paid", "Paid"),
    ]

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="bills",
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=100)
    merchant = models.CharField(max_length=150, blank=True, default="")
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="other")
    amount = models.DecimalField(
        max_digits=8, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))]
    )
    previous_amount = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    due_date = models.DateField()
    recurrence = models.CharField(max_length=20, choices=RECURRENCE_CHOICES, default="monthly")
    is_subscription = models.BooleanField(default=False)
    confidence_score = models.FloatField(default=1.0, help_text="Recurring detection confidence (0.0 to 1.0)")
    usage_frequency = models.CharField(max_length=50, blank=True, default="monthly")
    last_used_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["due_date"]
        indexes = [
            # Matches the (owner, due_date range) filter used by due-soon,
            # the dashboard, and the calendar view.
            models.Index(fields=["owner", "due_date"], name="bill_owner_due_date_idx"),
            # Matches the (owner, category, status) filter used by the
            # warranty and zombie-subscription detectors.
            models.Index(fields=["owner", "category", "status"], name="bill_owner_cat_status_idx"),
        ]

    def __str__(self):
        return f"{self.name} (${self.amount}) — due {self.due_date}"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        old_amount = None
        if not is_new:
            try:
                orig = Bill.objects.get(pk=self.pk)
                old_amount = orig.amount
            except Bill.DoesNotExist:
                pass
        
        super().save(*args, **kwargs)

        # Record PriceHistory on creation or amount change
        if is_new or (old_amount is not None and old_amount != self.amount):
            PriceHistory.objects.create(
                bill=self,
                amount=self.amount,
                notes="Initial amount" if is_new else f"Updated from {old_amount}",
            )

    @property
    def days_until_due(self) -> int:
        """Days from today until due_date. Negative if already overdue."""
        return (self.due_date - date.today()).days

    @property
    def is_overdue(self) -> bool:
        return self.due_date < date.today() and self.status not in ("paid", "cancelled")

    @property
    def monthly_equivalent(self):
        """Normalizes this bill's amount to a monthly figure, regardless of recurrence."""
        return self.amount * MONTHLY_MULTIPLIER.get(self.recurrence, Decimal("0"))


class Subscription(models.Model):
    """Optional richer subscription details linked to a Bill."""

    bill = models.OneToOneField(Bill, on_delete=models.CASCADE, related_name="subscription_detail")
    provider_url = models.URLField(null=True, blank=True)
    usage_notes = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"Subscription: {self.bill.name}"


class Warranty(models.Model):
    """
    Optional richer warranty details linked to a Bill.

    For a warranty item, the parent Bill's `due_date` holds the warranty
    expiry date and `amount` holds the purchase price (recurrence is
    typically "one_time"), so warranties reuse the same due-soon /
    forecast machinery as bills and subscriptions.
    """

    bill = models.OneToOneField(Bill, on_delete=models.CASCADE, related_name="warranty_detail")
    retailer = models.CharField(max_length=150, blank=True, default="")
    purchase_date = models.DateField(null=True, blank=True)
    return_window_days = models.PositiveIntegerField(
        null=True, blank=True, help_text="Retailer return/exchange window, in days, if shorter than the warranty itself"
    )
    claim_url = models.URLField(null=True, blank=True, help_text="Manufacturer/retailer warranty claim or support page")
    notes = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"Warranty: {self.bill.name} (expires {self.bill.due_date})"

    @property
    def return_deadline(self):
        """Last date the item can still be returned/exchanged, or None if unknown."""
        if self.purchase_date and self.return_window_days is not None:
            return self.purchase_date + timedelta(days=self.return_window_days)
        return None

    @property
    def return_days_left(self):
        """Days remaining in the return window (negative if already closed), or None if unknown."""
        deadline = self.return_deadline
        if deadline is None:
            return None
        return (deadline - date.today()).days

    @property
    def is_in_return_window(self) -> bool:
        days_left = self.return_days_left
        return days_left is not None and days_left >= 0


class PriceHistory(models.Model):
    """Historical price snapshots for a bill, powering price increase and anomaly detection."""

    bill = models.ForeignKey(Bill, on_delete=models.CASCADE, related_name="price_history")
    amount = models.DecimalField(max_digits=8, decimal_places=2)
    recorded_at = models.DateTimeField(default=timezone.now)
    notes = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        ordering = ["-recorded_at"]

    def __str__(self):
        return f"{self.bill.name} - ${self.amount} at {self.recorded_at:%Y-%m-%d}"


class AIInsight(models.Model):
    """Actionable AI-generated insights, anomalies, zombie subscription flags, and savings."""

    TYPE_CHOICES = [
        ("zombie", "Zombie Subscription"),
        ("anomaly", "Spending Anomaly"),
        ("savings", "Savings Opportunity"),
        ("risk", "Financial Risk"),
        ("price_increase", "Price Increase"),
        ("warranty_expiring", "Warranty Expiring"),
    ]
    PRIORITY_CHOICES = [
        ("critical", "Critical"),
        ("important", "Important"),
        ("insight", "Insight"),
        ("recommendation", "Recommendation"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="insights",
    )
    bill = models.ForeignKey(
        Bill,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="insights",
    )
    insight_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="insight")
    title = models.CharField(max_length=200)
    message = models.TextField()
    payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    dismissed = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.priority.upper()}] {self.title} ({self.user.username})"


class DecisionLog(models.Model):
    ACTION_CHOICES = [
        ("auto_handled", "Auto Handled"),
        ("flagged_for_review", "Flagged for Review"),
        ("drafted_notification", "Drafted Notification"),
        ("drafted_cancellation", "Drafted Cancellation"),
    ]
    USER_DECISION_CHOICES = [
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("pending", "Pending"),
    ]

    bill = models.ForeignKey(Bill, on_delete=models.CASCADE, related_name="decision_logs")
    agent_action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    reasoning = models.TextField()
    draft_content = models.TextField(null=True, blank=True)
    user_decision = models.CharField(
        max_length=20, choices=USER_DECISION_CHOICES, null=True, blank=True, default="pending"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.agent_action}] {self.bill.name} @ {self.created_at:%Y-%m-%d %H:%M}"
