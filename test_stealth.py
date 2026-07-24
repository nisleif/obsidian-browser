import sys, time
sys.path.insert(0, r"C:\Users\NACHO\Desktop\Obsidian")

from PyQt6.QtCore import Qt, QTimer
from PyQt6.QtWidgets import QApplication

QApplication.setAttribute(Qt.ApplicationAttribute.AA_ShareOpenGLContexts, True)
app = QApplication([])

from stealth_engine import StealthEngine

engine = StealthEngine()

t0 = time.time()
def log(msg):
    t = time.time() - t0
    print(f"[{t:5.1f}s] {msg}", flush=True)

engine.status_changed.connect(lambda msg: log(f"STATUS: {msg}"))
engine.page_loaded.connect(lambda url, title: log(f"PAGE: {title} | {url}"))
engine.result_ready.connect(lambda tag, val: log(f"RESULT ({tag}): {str(val)[:100]}"))
engine.error_occurred.connect(lambda msg: log(f"ERROR: {msg}"))

log("Starting engine...")
engine.start(headless=True)

ready = False
def on_ready(msg):
    global ready
    if "ready" in msg.lower():
        ready = True
engine.status_changed.connect(on_ready)

def do_nav():
    if not ready:
        log("Engine not ready yet, will retry...")
        QTimer.singleShot(2000, do_nav)
        return
    log("Navigating to https://example.com...")
    engine.navigate("https://example.com")

def do_get():
    log("Getting page text...")
    engine.get_text()

def do_links():
    log("Getting links...")
    engine.get_links()

def do_stop():
    log("Stopping engine...")
    engine.stop()
    QTimer.singleShot(3000, QApplication.quit)

QTimer.singleShot(2000, do_nav)
QTimer.singleShot(10000, do_get)
QTimer.singleShot(12000, do_links)
QTimer.singleShot(20000, do_stop)

log("Event loop started")
app.exec()
log("Done!")
