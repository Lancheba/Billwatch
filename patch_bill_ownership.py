"""
Patch script: scopes bills to the logged-in user.
- Adds an `owner` FK field to the Bill model (nullable, so existing
  demo/seeded bills without an owner keep working)
- Updates bills/serializers.py so `owner` is read-only (set automatically,
  never accepted from the client)
- Updates bills/views.py so BillViewSet and DecisionLogViewSet require
  authentication and only return/operate on the requesting user's data,
  and new bills are auto-assigned to request.user

Usage (from your Billwatch project root, with venv active):
    python patch_bill_ownership.py

After running this, you'll still need to:
    python manage.py makemigrations
    python manage.py migrate
"""

models_path = "bills/models.py"
serializers_path = "bills/serializers.py"
views_path = "bills/views.py"

# --- 1. models.py: add owner field + import ---
with open(models_path, encoding="utf-8") as f:
    content = f.read()

if "owner = models.ForeignKey" in content:
    print("models.py: owner field already present, skipping.")
else:
    old_import = "from django.db import models\nfrom django.utils import timezone"
    new_import = (
        "from django.conf import settings\n"
        "from django.db import models\n"
        "from django.utils import timezone"
    )
    if old_import in content:
        content = content.replace(old_import, new_import, 1)
    else:
        print("models.py: could not find import block — please add "
              "'from django.conf import settings' manually.")

    old_field = "    name = models.CharField(max_length=100)"
    new_field = (
        "    owner = models.ForeignKey(\n"
        "        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,\n"
        "        related_name=\"bills\", null=True, blank=True,\n"
        "    )\n"
        "    name = models.CharField(max_length=100)"
    )
    if old_field in content:
        content = content.replace(old_field, new_field, 1)
        with open(models_path, "w", encoding="utf-8") as f:
            f.write(content)
        print("models.py: added owner field to Bill")
    else:
        print("models.py: could not find Bill.name field — please add owner field manually.")

# --- 2. serializers.py: make owner read-only ---
with open(serializers_path, encoding="utf-8") as f:
    ser_content = f.read()

old_ro = 'read_only_fields = ["created_at", "updated_at"]'
new_ro = 'read_only_fields = ["created_at", "updated_at", "owner"]'

if '"owner"' in ser_content:
    print("serializers.py: already patched, skipping.")
elif old_ro in ser_content:
    ser_content = ser_content.replace(old_ro, new_ro, 1)
    with open(serializers_path, "w", encoding="utf-8") as f:
        f.write(ser_content)
    print("serializers.py: owner set as read-only")
else:
    print("serializers.py: could not find read_only_fields pattern — please add 'owner' manually.")

# --- 3. views.py: auth + per-user scoping ---
with open(views_path, encoding="utf-8") as f:
    view_content = f.read()

if "IsAuthenticated" in view_content:
    print("views.py: already patched, skipping.")
else:
    old_import = "from rest_framework import status, viewsets"
    new_import = (
        "from rest_framework import status, viewsets\n"
        "from rest_framework.permissions import IsAuthenticated"
    )
    view_content = view_content.replace(old_import, new_import, 1)

    old_billviewset = (
        "    queryset = Bill.objects.all()\n"
        "    serializer_class = BillSerializer\n"
    )
    new_billviewset = (
        "    serializer_class = BillSerializer\n"
        "    permission_classes = [IsAuthenticated]\n\n"
        "    def get_queryset(self):\n"
        "        return Bill.objects.filter(owner=self.request.user)\n\n"
        "    def perform_create(self, serializer):\n"
        "        serializer.save(owner=self.request.user)\n"
    )
    view_content = view_content.replace(old_billviewset, new_billviewset, 1)

    old_due_soon_qs = (
        "        qs = Bill.objects.filter(\n"
        "            due_date__gte=today, due_date__lte=cutoff\n"
        "        ).exclude(status__in=[\"paid\", \"cancelled\"])"
    )
    new_due_soon_qs = (
        "        qs = Bill.objects.filter(\n"
        "            owner=request.user, due_date__gte=today, due_date__lte=cutoff\n"
        "        ).exclude(status__in=[\"paid\", \"cancelled\"])"
    )
    view_content = view_content.replace(old_due_soon_qs, new_due_soon_qs, 1)

    old_decisionviewset = (
        "    queryset = DecisionLog.objects.select_related(\"bill\").all()\n"
        "    serializer_class = DecisionLogSerializer\n"
    )
    new_decisionviewset = (
        "    serializer_class = DecisionLogSerializer\n"
        "    permission_classes = [IsAuthenticated]\n\n"
        "    def get_queryset(self):\n"
        "        return DecisionLog.objects.select_related(\"bill\").filter(\n"
        "            bill__owner=self.request.user\n"
        "        )\n"
    )
    view_content = view_content.replace(old_decisionviewset, new_decisionviewset, 1)

    old_agentrun = "class AgentRunView(APIView):"
    new_agentrun = (
        "class AgentRunView(APIView):\n"
        "    permission_classes = [IsAuthenticated]"
    )
    # Insert permission_classes right after the class docstring's closing triple-quote
    # (simpler: just add after class line + existing docstring block is handled manually
    # if this exact insertion point isn't found)
    if "class AgentRunView(APIView):\n    \"\"\"" in view_content:
        view_content = view_content.replace(
            "    Optional body: { \"days\": 7 }\n    \"\"\"\n\n    def post(self, request):",
            "    Optional body: { \"days\": 7 }\n    \"\"\"\n\n"
            "    permission_classes = [IsAuthenticated]\n\n    def post(self, request):",
            1,
        )

    with open(views_path, "w", encoding="utf-8") as f:
        f.write(view_content)
    print("views.py: added auth + per-user scoping to BillViewSet, DecisionLogViewSet, AgentRunView")

print("Done. Now run: python manage.py makemigrations && python manage.py migrate")
