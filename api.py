"""
Obsidian Browser API - Backend
"""
import uuid
import threading
import time
from stealth_engine import StealthEngine
from tools import SecurityTools


class ObsidianAPI:
    def __init__(self):
        self._window = None
        self.stealth_engine = StealthEngine()
        self.tools = SecurityTools()
        self._last_scrape = None
        self._activity_log = []
        self._tabs = []
        self._active_tab_id = None
        self._bookmarks = []
        self._devtools_open = False
        self.stealth_engine.on("status", self._on_stealth_status)
        self.stealth_engine.on("page_loaded", self._on_stealth_page)
        self.stealth_engine.on("result", self._on_stealth_result)

    def set_window(self, window):
        self._window = window

    def _js(self, code):
        if self._window:
            try:
                self._window.evaluate_js(code)
            except Exception:
                pass

    def _log(self, msg):
        self._activity_log.insert(0, msg)
        if len(self._activity_log) > 50:
            self._activity_log.pop()

    # ─── Tabs ─────────────────────────────────────────────────
    def init_tabs(self, start_url):
        tab_id = "tab_" + uuid.uuid4().hex[:6]
        self._tabs = [{"id": tab_id, "url": start_url, "title": "New Tab"}]
        self._active_tab_id = tab_id
        self._log(f"Initialized tabs: {start_url}")

    def get_tabs(self):
        # Safety: ensure exactly 1 tab during initialization
        if len(self._tabs) != 1 and self._active_tab_id is not None:
            # Deduplicate: keep only the active tab
            active = next((t for t in self._tabs if t["id"] == self._active_tab_id), None)
            if active:
                self._tabs = [active]
            else:
                self._tabs = self._tabs[:1]
        return {"tabs": self._tabs, "active": self._active_tab_id}

    def add_tab(self, url=None):
        if not url:
            url = "about:blank"
        tab_id = "tab_" + uuid.uuid4().hex[:6]
        tab = {"id": tab_id, "url": url, "title": "New Tab"}
        self._tabs.append(tab)
        self._active_tab_id = tab_id
        if self._window:
            self._window.load_url(url)
        self._log(f"New tab: {url}")
        return tab_id

    def close_tab(self, tab_id):
        if len(self._tabs) <= 1:
            return  # keep at least one tab
        self._tabs = [t for t in self._tabs if t["id"] != tab_id]
        if self._active_tab_id == tab_id:
            if self._tabs:
                self.switch_tab(self._tabs[0]["id"])
            else:
                self.add_tab()

    def switch_tab(self, tab_id):
        self._active_tab_id = tab_id
        tab = next((t for t in self._tabs if t["id"] == tab_id), None)
        if tab and self._window:
            self._window.load_url(tab["url"])
        self._log(f"Switched to tab: {tab['title'] if tab else 'unknown'}")

    def update_active_tab(self, url, title):
        for tab in self._tabs:
            if tab["id"] == self._active_tab_id:
                tab["url"] = url
                tab["title"] = title
                break

    # ─── Bookmarks ────────────────────────────────────────────
    def get_bookmarks(self):
        return self._bookmarks

    def add_bookmark(self, url, title):
        existing = [b for b in self._bookmarks if b["url"] == url]
        if not existing:
            self._bookmarks.append({"url": url, "title": title, "id": uuid.uuid4().hex[:8]})
            self._log(f"Bookmarked: {title}")
        return self._bookmarks

    def remove_bookmark(self, bookmark_id):
        self._bookmarks = [b for b in self._bookmarks if b["id"] != bookmark_id]

    def is_bookmarked(self, url):
        return any(b["url"] == url for b in self._bookmarks)

    # ─── DevTools ─────────────────────────────────────────────
    def toggle_devtools(self):
        try:
            if self._window:
                gui = getattr(self._window, 'gui', None)
                if gui:
                    wv = getattr(gui, 'webview', None)
                    if wv and hasattr(wv, 'CoreWebView2'):
                        try:
                            core = wv.CoreWebView2
                            if core:
                                core.OpenDevToolsWindow()
                                self._devtools_open = True
                                return self._devtools_open
                        except Exception:
                            pass
                # Fallback: try to get CoreWebView2 from window directly
                try:
                    self._window.evaluate_js(
                        "try{window.chrome.webview.coreWebView2.openDevToolsWindow()}catch(e){}"
                    )
                    self._devtools_open = True
                except Exception:
                    pass
        except Exception as e:
            self._log(f"DevTools error: {e}")
        return self._devtools_open

    # ─── Stats ────────────────────────────────────────────────
    def get_stats(self):
        stats = {"ads_blocked": 0, "stealth": False, "activity": []}
        stats["stealth"] = self.stealth_engine.enabled if self.stealth_engine else False
        if self._window:
            try:
                result = self._window.evaluate_js(
                    "if(window.obsidian) window.obsidian.getStats()"
                )
                if result:
                    stats.update(result)
            except Exception:
                pass
        stats["activity"] = self._activity_log[:20]
        return stats

    # ─── Stealth events ───────────────────────────────────────
    def _on_stealth_status(self, msg):
        safe = msg.replace("'", "\\'").replace("\n", " ")
        self._js(f"if(window.obsidian) window.obsidian.setStatusText('{safe}')")
        self._log(msg)

    def _on_stealth_page(self, url, title):
        safe = title.replace("'", "\\'").replace("\n", " ")
        self._js(f"if(window.obsidian) window.obsidian.setStatusText('Stealth: {safe}')")
        self._log(f"Stealth navigated to: {title}")

    def _on_stealth_result(self, tag, val):
        if tag == "text":
            self._last_scrape = val

    def navigate(self, url):
        if self._window:
            self._window.load_url(url)

    def toggle_stealth(self):
        if self.stealth_engine:
            if self.stealth_engine.enabled:
                self.stealth_engine.stop()
                self._log("Stealth deactivated")
            else:
                self.stealth_engine.start(headless=True)
                self._log("Stealth activated")
            return self.stealth_engine.enabled
        return False

    def scrape_current(self):
        if not self.stealth_engine.enabled:
            return "Enable stealth mode first"
        url = self._window.get_current_url() if self._window else ""
        if url and url != "about:blank":
            self._last_scrape = None
            self.stealth_engine.navigate(url)
            time.sleep(3)
            self._js("if(window.obsidian) window.obsidian.setStatusText('Scraping...')")
            self.stealth_engine.get_text()
            for _ in range(30):
                time.sleep(0.1)
                if self._last_scrape is not None:
                    result = self._last_scrape[:2000]
                    self._log(f"Scraped {len(result)} chars from {url}")
                    return result
            return "Scrape timeout"
        return "No page to scrape"

    def get_page_info(self):
        info = {"stealth": self.stealth_engine.enabled if self.stealth_engine else False}
        if self._window:
            try:
                info["url"] = self._window.get_current_url()
            except Exception:
                info["url"] = "unknown"
        return info

    # ─── Obscura Security Tools ────────────────────────────────
    def resolve_dns(self, hostname):
        return self.tools.resolve_dns(hostname)

    def port_scan(self, hostname, ports=None):
        return self.tools.port_scan(hostname, ports)

    def url_fuzz(self, base_url, paths=None):
        return self.tools.url_fuzz(base_url, paths)

    def get_headers(self, url):
        return self.tools.get_headers(url)

    def get_ssl_info(self, hostname, port=443):
        return self.tools.get_ssl_info(hostname, port)

    def set_user_agent(self, ua):
        return self.tools.set_user_agent(ua)

    def get_user_agent(self):
        return self.tools.get_user_agent()

    def set_proxy(self, proxy_url):
        return self.tools.set_proxy(proxy_url)

    def clear_proxy(self):
        return self.tools.clear_proxy()

    def get_proxy(self):
        return self.tools.get_proxy()
