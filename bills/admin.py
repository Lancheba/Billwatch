from django.contrib import admin
from .models import Bill, Subscription, DecisionLog


@admin.register(Bill)
class BillAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "amount", "due_date", "status", "is_subscription"]
    list_filter = ["category", "status", "is_subscription", "recurrence"]
    search_fields = ["name"]


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ["bill", "provider_url"]


@admin.register(DecisionLog)
class DecisionLogAdmin(admin.ModelAdmin):
    list_display = ["bill", "agent_action", "user_decision", "created_at"]
    list_filter = ["agent_action", "user_decision"]
    readonly_fields = ["created_at"]
