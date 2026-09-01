"""
Patch script: wires up token authentication.
- Adds 'rest_framework.authtoken' and 'accounts' to INSTALLED_APPS
- Adds DEFAULT_AUTHENTICATION_CLASSES to REST_FRAMEWORK settings
- Adds accounts.urls to the root urlpatterns under /api/auth/

Usage (from your Billwatch project root, with venv active):
    python patch_auth_setup.py
"""

settings_path = "billwatch_backend/settings.py"
urls_path = "billwatch_backend/urls.py"

# --- 1. settings.py: INSTALLED_APPS ---
with open(settings_path, encoding="utf-8") as f:
    content = f.read()

old_apps = "    # Local\n    'bills',\n]"
new_apps = (
    "    'rest_framework.authtoken',\n"
    "    # Local\n"
    "    'bills',\n"
    "    'accounts',\n"
    "]"
)

if "'accounts'" in content:
    print("settings.py: apps already patched, skipping.")
else:
    if old_apps in content:
        content = content.replace(old_apps, new_apps, 1)
        print("settings.py: added rest_framework.authtoken and accounts to INSTALLED_APPS")
    else:
        print("settings.py: could not find INSTALLED_APPS pattern — please add manually:")
        print("  'rest_framework.authtoken' and 'accounts'")

# --- 2. settings.py: REST_FRAMEWORK auth classes ---
old_rf = '"PAGE_SIZE": 50,\n}'
new_rf = (
    '"PAGE_SIZE": 50,\n'
    '    "DEFAULT_AUTHENTICATION_CLASSES": [\n'
    '        "rest_framework.authentication.TokenAuthentication",\n'
    '        "rest_framework.authentication.SessionAuthentication",\n'
    '    ],\n'
    '}'
)

if "DEFAULT_AUTHENTICATION_CLASSES" in content:
    print("settings.py: auth classes already patched, skipping.")
elif old_rf in content:
    content = content.replace(old_rf, new_rf, 1)
    print("settings.py: added DEFAULT_AUTHENTICATION_CLASSES")
else:
    print("settings.py: could not find REST_FRAMEWORK pattern — please add auth classes manually.")

with open(settings_path, "w", encoding="utf-8") as f:
    f.write(content)

# --- 3. urls.py: wire in accounts app ---
with open(urls_path, encoding="utf-8") as f:
    url_content = f.read()

old_urls = 'path("api/", include("bills.urls")),\n]'
new_urls = (
    'path("api/", include("bills.urls")),\n'
    '    path("api/auth/", include("accounts.urls")),\n'
    ']'
)

if "accounts.urls" in url_content:
    print("urls.py: already patched, skipping.")
elif old_urls in url_content:
    url_content = url_content.replace(old_urls, new_urls, 1)
    with open(urls_path, "w", encoding="utf-8") as f:
        f.write(url_content)
    print("urls.py: added /api/auth/ routes")
else:
    print("urls.py: could not find urlpatterns pattern — please add manually:")
    print('  path("api/auth/", include("accounts.urls")),')

print("Done.")
