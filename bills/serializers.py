from rest_framework import serializers
from .models import Bill, Subscription, DecisionLog


class SubscriptionDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscription
        fields = ["provider_url", "usage_notes"]


class BillSerializer(serializers.ModelSerializer):
    subscription_detail = SubscriptionDetailSerializer(read_only=True)

    class Meta:
        model = Bill
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at", "owner"]


class DecisionLogSerializer(serializers.ModelSerializer):
    bill_name = serializers.CharField(source="bill.name", read_only=True)

    class Meta:
        model = DecisionLog
        fields = "__all__"
        read_only_fields = ["created_at"]
