"""
Obsidian Browser - Entry point
"""
import os
import sys
import webview
from api import ObsidianAPI

API = ObsidianAPI()

def resource_path(relative_path):
    try:
        base = sys._MEIPASS
    except AttributeError:
        base = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base, relative_path)

class JS_API:
    def toggle_stealth(self):
        return API.toggle_stealth()

    def stealth_status(self):
        return API.stealth_engine.enabled if API.stealth_engine else False

    def scrape_page(self):
        return API.scrape_current()

    def get_page_info(self):
        return API.get_page_info()

    def get_stats(self):
        return API.get_stats()

    # Tabs — controlled from JS to avoid race with loaded events
    def get_tabs(self):
        return API.get_tabs()

    def init_tabs(self, url, title="New Tab"):
        API.init_tabs(url)
        return API.get_tabs()

    def add_tab(self, url=None):
        return API.add_tab(url)

    def close_tab(self, tab_id):
        API.close_tab(tab_id)

    def switch_tab(self, tab_id):
        API.switch_tab(tab_id)

    def update_active_tab(self, url, title):
        API.update_active_tab(url, title)
        return API.get_tabs()

    # Bookmarks
    def get_bookmarks(self):
        return API.get_bookmarks()

    def add_bookmark(self, url, title):
        return API.add_bookmark(url, title)

    def remove_bookmark(self, bookmark_id):
        API.remove_bookmark(bookmark_id)

    def is_bookmarked(self, url):
        return API.is_bookmarked(url)

    # DevTools
    def toggle_devtools(self):
        return API.toggle_devtools()

    # Window
    def close_window(self):
        try:
            if API._window:
                API._window.evaluate_js("window.close()")
        except Exception:
            pass

    # ─── Obscura Security Tools ────────────────────────────────
    def resolve_dns(self, hostname):
        return API.resolve_dns(hostname)

    def port_scan(self, hostname):
        return API.port_scan(hostname)

    def url_fuzz(self, base_url):
        return API.url_fuzz(base_url)

    def get_headers(self, url):
        return API.get_headers(url)

    def get_ssl_info(self, hostname, port=443):
        return API.get_ssl_info(hostname, port)

    def set_user_agent(self, ua):
        return API.set_user_agent(ua)

    def get_user_agent(self):
        return API.get_user_agent()

    def set_proxy(self, proxy_url):
        return API.set_proxy(proxy_url)

    def clear_proxy(self):
        return API.clear_proxy()

    def get_proxy(self):
        return API.get_proxy()


def inject_overlay(window):
    overlay_path = resource_path("overlay.js")
    try:
        if os.path.exists(overlay_path):
            with open(overlay_path, encoding='utf-8') as f:
                js = f.read()
            window.evaluate_js(js)
    except Exception as e:
        print(f"[Obsidian] Inject error: {e}")


def update_stealth_ui(window):
    enabled = API.stealth_engine.enabled if API.stealth_engine else False
    try:
        window.evaluate_js(
            "if(window.obsidian){"
            f"  window.obsidian.setStealthStatus({'true' if enabled else 'false'});"
            "}"
        )
    except Exception:
        pass


def on_page_loaded(window):
    try:
        try:
            url = window.get_current_url()
        except Exception:
            url = "about:blank"
        inject_overlay(window)
        update_stealth_ui(window)
    except Exception:
        pass


def main():
    start = resource_path("start.html")
    if not os.path.exists(start):
        start = "about:blank"

    API.set_start_url(start)

    window = webview.create_window(
        title="Obsidian Browser",
        url=start,
        width=1200,
        height=800,
        min_size=(800, 500),
        js_api=JS_API(),
        text_select=True,
    )

    API.set_window(window)
    window.events.loaded += lambda: on_page_loaded(window)

    webview.start(debug=False)

if __name__ == "__main__":
    main()
