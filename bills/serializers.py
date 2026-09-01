from rest_framework import serializers
from .models import Bill, Subscription, DecisionLog, PriceHistory, AIInsight


class SubscriptionDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscription
        fields = ["provider_url", "usage_notes"]


class PriceHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = PriceHistory
        fields = ["id", "amount", "recorded_at", "notes"]


class BillSerializer(serializers.ModelSerializer):
    subscription_detail = SubscriptionDetailSerializer(read_only=True)
    price_history = PriceHistorySerializer(many=True, read_only=True)

    class Meta:
        model = Bill
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at", "owner", "price_history"]


class DecisionLogSerializer(serializers.ModelSerializer):
    bill_name = serializers.CharField(source="bill.name", read_only=True)

    class Meta:
        model = DecisionLog
        fields = "__all__"
        read_only_fields = ["created_at"]


class AIInsightSerializer(serializers.ModelSerializer):
    bill_name = serializers.CharField(source="bill.name", read_only=True)

    class Meta:
        model = AIInsight
        fields = "__all__"
        read_only_fields = ["created_at", "user"]
