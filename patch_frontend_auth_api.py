"""
Patch script: adds auth API functions + a request interceptor that attaches
the stored token to every API call.

Usage (from your Billwatch project root):
    python patch_frontend_auth_api.py
"""

path = "frontend/src/api.ts"

with open(path, encoding="utf-8") as f:
    content = f.read()

if "authApi" in content:
    print("api.ts: already patched, skipping.")
else:
    # 1. Add request interceptor right after the api instance is created
    old_instance = (
        "const api = axios.create({\n"
        "  baseURL: import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api',\n"
        "  headers: { 'Content-Type': 'application/json' },\n"
        "})\n"
        "\n"
        "export default api"
    )
    new_instance = (
        "const api = axios.create({\n"
        "  baseURL: import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api',\n"
        "  headers: { 'Content-Type': 'application/json' },\n"
        "})\n"
        "\n"
        "api.interceptors.request.use((config) => {\n"
        "  const token = localStorage.getItem('billwatch_token')\n"
        "  if (token) {\n"
        "    config.headers = config.headers ?? {}\n"
        "    config.headers.Authorization = `Token ${token}`\n"
        "  }\n"
        "  return config\n"
        "})\n"
        "\n"
        "export default api"
    )
    if old_instance in content:
        content = content.replace(old_instance, new_instance, 1)
    else:
        print("api.ts: could not find axios.create block — please add the "
              "interceptor manually.")

    # 2. Append User type + authApi at the end of the file
    addition = '''

// ── Auth ───────────────────────────────────────────────────────────────────

export interface User {
  id: number
  username: string
  email: string
}

export const authApi = {
  signup: (username: string, email: string, password: string) =>
    api.post<{ token: string; user: User }>('/auth/signup/', { username, email, password })
      .then(r => r.data),
  login: (username: string, password: string) =>
    api.post<{ token: string; user: User }>('/auth/login/', { username, password })
      .then(r => r.data),
  me: () => api.get<User>('/auth/me/').then(r => r.data),
}
'''
    content = content.rstrip("\n") + addition

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("api.ts: added token interceptor + authApi (signup/login/me)")

print("Done.")
