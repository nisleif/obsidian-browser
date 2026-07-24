"""
Stealth Engine - CloakBrowser integration without Qt dependencies
"""
import asyncio
import threading


class StealthEngine:
    def __init__(self):
        self._browser = None
        self._context = None
        self._page = None
        self._loop = None
        self._thread = None
        self._enabled = False
        self._callbacks = {
            "status": [],
            "page_loaded": [],
            "result": [],
            "error": [],
        }

    @property
    def enabled(self):
        return self._enabled

    def on(self, event, callback):
        if event in self._callbacks:
            self._callbacks[event].append(callback)
        return self

    def _emit(self, event, *args):
        for cb in self._callbacks.get(event, []):
            try:
                cb(*args)
            except Exception as e:
                print(f"[Stealth] callback error: {e}")

    def start(self, headless=True, proxy=None):
        if self._enabled:
            return
        self._enabled = True
        self._emit("status", "Stealth engine starting...")
        self._thread = threading.Thread(
            target=self._run_loop,
            args=(headless, proxy),
            daemon=True
        )
        self._thread.start()

    def _run_loop(self, headless, proxy):
        self._loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self._loop)
        _loop = self._loop
        try:
            _loop.run_until_complete(self._launch(headless, proxy))
            _loop.run_forever()
        except Exception as e:
            import traceback
            self._emit("error", f"{e}\n{traceback.format_exc()}")
            self._emit("status", "Stealth engine failed")
        finally:
            if _loop and not _loop.is_closed():
                _loop.close()

    async def _launch(self, headless, proxy):
        from cloakbrowser import launch_async
        opts = {"headless": headless}
        if proxy:
            opts["proxy"] = proxy
        self._browser = await launch_async(**opts)
        self._context = await self._browser.new_context()
        self._page = await self._context.new_page()
        self._page.on("load", lambda: self._bg(self._async_on_page_load()))
        self._emit("status", "Stealth engine ready")

    def navigate(self, url):
        if not self._page:
            self._emit("status", "Engine not ready")
            return
        self._bg(self._async_navigate(url))

    def evaluate(self, js, tag="eval"):
        self._bg(self._async_evaluate(js, tag))

    def get_text(self):
        self.evaluate("document.body.innerText", "text")

    def get_links(self):
        self.evaluate(
            "Array.from(document.querySelectorAll('a[href]')).map(a => ({ text: a.textContent.trim(), href: a.href }))",
            "links"
        )

    def stop(self):
        self._enabled = False
        self._emit("status", "Stealth engine stopping...")
        loop = self._loop
        if self._browser:
            self._bg(self._async_stop_browser())
        elif loop and loop.is_running():
            loop.call_soon_threadsafe(loop.stop)
        self._loop = None
        self._thread = None

    def _bg(self, coro):
        loop = self._loop
        if not loop or not loop.is_running():
            return
        try:
            asyncio.run_coroutine_threadsafe(coro, loop)
        except RuntimeError:
            pass

    async def _async_navigate(self, url):
        try:
            await self._page.goto(url, wait_until="load")
            current_url = self._page.url
            title = await self._page.evaluate("document.title") or ""
            self._emit("page_loaded", current_url, title)
            self._emit("status", f"Loaded: {title}")
        except Exception as e:
            import traceback
            self._emit("error", f"Nav error: {e}\n{traceback.format_exc()}")

    async def _async_evaluate(self, js, tag):
        try:
            result = await self._page.evaluate(js)
            self._emit("result", tag, result)
        except Exception as e:
            self._emit("error", f"Eval error ({tag}): {e}")

    async def _async_on_page_load(self):
        if not self._page:
            return
        try:
            url = self._page.url
            title = await self._page.evaluate("document.title") or ""
            self._emit("page_loaded", url, title)
        except Exception:
            pass

    async def _async_stop_browser(self):
        try:
            await self._browser.close()
        except Exception:
            pass
        self._browser = None
        self._context = None
        self._page = None
        loop = self._loop
        self._loop = None
        if loop and loop.is_running():
            loop.call_soon_threadsafe(loop.stop)
        self._emit("status", "Stealth engine stopped")
