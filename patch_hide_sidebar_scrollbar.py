"""
Patch script: hides the visible sidebar scrollbar in the frontend.
- Adds a `sidebar-nav-scroll` class to the sidebar <nav> in App.tsx
- Adds CSS to index.css that hides the scrollbar (cross-browser) while
  keeping the sidebar scrollable

Usage (from your Billwatch project root):
    python patch_hide_sidebar_scrollbar.py
"""

app_tsx_path = "frontend/src/App.tsx"
index_css_path = "frontend/src/index.css"

# --- 1. App.tsx: add class to the sidebar nav ---
with open(app_tsx_path, encoding="utf-8") as f:
    app_tsx = f.read()

old_nav = '<nav style={{ flex: 1, overflowY: \'auto\', paddingRight: 4 }}>'
new_nav = '<nav className="sidebar-nav-scroll" style={{ flex: 1, overflowY: \'auto\', paddingRight: 4 }}>'

if new_nav in app_tsx:
    print(f"{app_tsx_path}: already patched, skipping.")
elif old_nav not in app_tsx:
    print(f"{app_tsx_path}: expected <nav> markup not found — no changes made. "
          "The file may already differ from what this patch expects.")
else:
    app_tsx = app_tsx.replace(old_nav, new_nav)
    with open(app_tsx_path, "w", encoding="utf-8", newline="\n") as f:
        f.write(app_tsx)
    print(f"{app_tsx_path}: patched.")

# --- 2. index.css: add scrollbar-hiding rule ---
with open(index_css_path, encoding="utf-8") as f:
    index_css = f.read()

marker = "/* Sidebar Nav Item */"
css_addition = """/* Sidebar nav still scrolls when content overflows, but the scrollbar
   itself is hidden so it doesn't show as a bulky OS scrollbar over the
   glass sidebar. */
.sidebar-nav-scroll {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* old Edge / IE */
}

.sidebar-nav-scroll::-webkit-scrollbar {
  display: none; /* Chrome, Safari, new Edge */
}

"""

if ".sidebar-nav-scroll" in index_css:
    print(f"{index_css_path}: already patched, skipping.")
elif marker not in index_css:
    print(f"{index_css_path}: expected marker comment not found — appending rule to end of file instead.")
    index_css = index_css.rstrip() + "\n\n" + css_addition
    with open(index_css_path, "w", encoding="utf-8", newline="\n") as f:
        f.write(index_css)
    print(f"{index_css_path}: patched (appended).")
else:
    index_css = index_css.replace(marker, css_addition + marker, 1)
    with open(index_css_path, "w", encoding="utf-8", newline="\n") as f:
        f.write(index_css)
    print(f"{index_css_path}: patched.")

print("\nDone. Restart your frontend dev server (npm run dev) to see the change.")
