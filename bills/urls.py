from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BillViewSet,
    DecisionLogViewSet,
    AIInsightViewSet,
    AgentRunView,
    DashboardSummaryView,
    CalendarView,
    WhatIfSimulatorView,
    AgentChatView,
)

router = DefaultRouter()
router.register(r"bills", BillViewSet, basename="bill")
router.register(r"decisions", DecisionLogViewSet, basename="decisionlog")
router.register(r"insights", AIInsightViewSet, basename="aiinsight")

urlpatterns = [
    path("", include(router.urls)),
    path("agent/run/", AgentRunView.as_view(), name="agent-run"),
    path("agent/chat/", AgentChatView.as_view(), name="agent-chat"),
    path("dashboard/summary/", DashboardSummaryView.as_view(), name="dashboard-summary"),
    path("dashboard/calendar/", CalendarView.as_view(), name="dashboard-calendar"),
    path("dashboard/what-if/", WhatIfSimulatorView.as_view(), name="dashboard-what-if"),
]
