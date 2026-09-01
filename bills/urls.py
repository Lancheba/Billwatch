from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BillViewSet, DecisionLogViewSet, AgentRunView

router = DefaultRouter()
router.register(r"bills", BillViewSet, basename="bill")
router.register(r"decisions", DecisionLogViewSet, basename="decisionlog")

urlpatterns = [
    path("", include(router.urls)),
    path("agent/run/", AgentRunView.as_view(), name="agent-run"),
]
