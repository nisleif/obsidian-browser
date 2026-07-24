import os
from PyQt6.QtCore import QUrl, QTimer, Qt
from PyQt6.QtWidgets import (
    QMainWindow, QTabWidget, QToolBar, QLineEdit,
    QPushButton, QStatusBar, QWidget, QHBoxLayout,
    QSplitter, QTreeWidget, QTextEdit, QVBoxLayout,
    QLabel, QDialog, QDialogButtonBox, QFormLayout,
    QCheckBox, QSpinBox, QComboBox, QGroupBox
)
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWebEngineCore import QWebEnginePage, QWebEngineProfile
from PyQt6.QtGui import QIcon, QAction, QFont
from stealth_engine import StealthEngine

HOME_PAGE = "https://www.google.com"


class WebEnginePage(QWebEnginePage):
    def __init__(self, profile, parent=None):
        super().__init__(profile, parent)
        self.loadFinished.connect(self._on_load_finished)

    def _on_load_finished(self, ok):
        if ok:
            self.runJavaScript(
                "document.title",
                lambda title: self.parent().update_title(title) if self.parent() else None
            )


class TabWidget(QWidget):
    def __init__(self, browser_window):
        super().__init__()
        self.browser_window = browser_window
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)
        self.web_view = QWebEngineView()
        self.web_view.setPage(WebEnginePage(
            QWebEngineProfile.defaultProfile(), self.web_view
        ))
        self.web_view.urlChanged.connect(self._url_changed)
        self.web_view.loadStarted.connect(self._load_started)
        self.web_view.loadFinished.connect(self._load_finished)
        self.web_view.titleChanged.connect(self._title_changed)
        self.web_view.iconChanged.connect(self._icon_changed)
        layout.addWidget(self.web_view)

    def load_url(self, url):
        if not url.scheme():
            url = QUrl("https://" + url.toString())
        self.web_view.setUrl(url)

    def _url_changed(self, url):
        self.browser_window.url_bar.setText(url.toString())

    def _load_started(self):
        self.browser_window.refresh_btn.setEnabled(False)
        self.browser_window.stop_btn.setEnabled(True)

    def _load_finished(self):
        self.browser_window.refresh_btn.setEnabled(True)
        self.browser_window.stop_btn.setEnabled(False)

    def _title_changed(self, title):
        idx = self.browser_window.tabs.indexOf(self)
        if idx >= 0:
            self.browser_window.tabs.setTabText(idx, title[:30])

    def _icon_changed(self, icon):
        idx = self.browser_window.tabs.indexOf(self)
        if idx >= 0:
            self.browser_window.tabs.setTabIcon(idx, icon)

    def update_title(self, title):
        if title:
            idx = self.browser_window.tabs.indexOf(self)
            if idx >= 0:
                self.browser_window.tabs.setTabText(idx, title[:30])


class StealthPanel(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self._engine = parent.stealth_engine if parent else None
        self.setWindowTitle("Stealth Settings")
        layout = QVBoxLayout(self)
        title = QLabel("<b>Stealth / Anti-Detection</b>")
        layout.addWidget(title)

        status_group = QGroupBox("Status")
        slayout = QVBoxLayout(status_group)
        self.status_label = QLabel("Stopped")
        slayout.addWidget(self.status_label)

        self.enabled = QCheckBox("Enable stealth mode")
        self.enabled.toggled.connect(self._on_toggle)
        slayout.addWidget(self.enabled)
        layout.addWidget(status_group)

        proxy_group = QGroupBox("Proxy")
        playout = QVBoxLayout(proxy_group)
        self.proxy_input = QLineEdit()
        self.proxy_input.setPlaceholderText("socks5://user:pass@host:port")
        playout.addWidget(self.proxy_input)

        self.headless_mode = QCheckBox("Headless (no window)")
        self.headless_mode.setChecked(True)
        playout.addWidget(self.headless_mode)

        apply_proxy = QPushButton("Apply Proxy & Restart")
        apply_proxy.clicked.connect(self._apply_proxy)
        playout.addWidget(apply_proxy)
        layout.addWidget(proxy_group)

        fingerprint_group = QGroupBox("Fingerprint")
        flayout = QVBoxLayout(fingerprint_group)
        self.platform = QComboBox()
        self.platform.addItems(["Windows", "macOS", "Linux"])
        flayout.addWidget(QLabel("Spoof platform:"))
        flayout.addWidget(self.platform)

        self.fingerprint_seed = QLineEdit()
        self.fingerprint_seed.setPlaceholderText("Random (leave empty)")
        flayout.addWidget(QLabel("Fingerprint seed:"))
        flayout.addWidget(self.fingerprint_seed)
        layout.addWidget(fingerprint_group)

        actions_group = QGroupBox("Actions")
        alayout = QVBoxLayout(actions_group)
        self.open_btn = QPushButton("Open current page in stealth mode")
        self.open_btn.clicked.connect(self._open_current_in_stealth)
        alayout.addWidget(self.open_btn)
        self.stop_btn = QPushButton("Stop stealth engine")
        self.stop_btn.clicked.connect(self._stop_engine)
        self.stop_btn.setEnabled(False)
        alayout.addWidget(self.stop_btn)
        layout.addWidget(actions_group)
        layout.addStretch()

    def set_engine(self, engine):
        self._engine = engine
        engine.status_changed.connect(self._update_status)
        engine.page_loaded.connect(self._on_page_loaded)

    def _update_status(self, msg):
        self.status_label.setText(msg)

    def _on_page_loaded(self, url, title):
        self.status_label.setText(f"Loaded: {title}")

    def _on_toggle(self, enabled):
        if not self._engine:
            return
        if enabled:
            proxy = self.proxy_input.text().strip() or None
            headless = self.headless_mode.isChecked()
            self._engine.start(headless=headless, proxy=proxy)
            self.open_btn.setEnabled(True)
            self.stop_btn.setEnabled(True)
        else:
            self._engine.stop()
            self.open_btn.setEnabled(False)
            self.stop_btn.setEnabled(False)

    def _apply_proxy(self):
        if self._engine:
            self._engine.stop()
        proxy = self.proxy_input.text().strip() or None
        headless = self.headless_mode.isChecked()
        if self._engine:
            self._engine.start(headless=headless, proxy=proxy)
        self.enabled.setChecked(True)

    def _open_current_in_stealth(self):
        if not self._engine or not self._engine.enabled:
            return
        window = self.window()
        if hasattr(window, 'url_bar'):
            url = window.url_bar.text().strip()
            if url:
                self._engine.navigate_bg(url)
                self.status_label.setText(f"Opening {url} in stealth...")

    def _stop_engine(self):
        if self._engine:
            self._engine.stop()
        self.enabled.setChecked(False)
        self.open_btn.setEnabled(False)
        self.stop_btn.setEnabled(False)


class ScrapingPanel(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Scraping Tools")
        layout = QVBoxLayout(self)
        title = QLabel("<b>Web Scraper</b>")
        layout.addWidget(title)
        self.url_input = QLineEdit()
        self.url_input.setPlaceholderText("Enter URL to scrape...")
        layout.addWidget(self.url_input)
        self.extract_all = QPushButton("Extract all text")
        self.extract_links = QPushButton("Extract links")
        self.extract_images = QPushButton("Extract images")
        btn_row = QHBoxLayout()
        btn_row.addWidget(self.extract_all)
        btn_row.addWidget(self.extract_links)
        btn_row.addWidget(self.extract_images)
        layout.addLayout(btn_row)
        self.output = QTextEdit()
        self.output.setReadOnly(True)
        self.output.setFont(QFont("Cascadia Code", 9))
        layout.addWidget(QLabel("Output:"))
        layout.addWidget(self.output)
        layout.addStretch()


class DevToolsPanel(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("DevTools")
        layout = QVBoxLayout(self)
        tabs = QTabWidget()
        self.console = QTextEdit()
        self.console.setReadOnly(True)
        self.console.setFont(QFont("Cascadia Code", 9))
        self.network = QTextEdit()
        self.network.setReadOnly(True)
        self.network.setFont(QFont("Cascadia Code", 9))
        self.dom_viewer = QTreeWidget()
        self.dom_viewer.setHeaderLabels(["Element"])
        tabs.addTab(self.console, "Console")
        tabs.addTab(self.network, "Network")
        tabs.addTab(self.dom_viewer, "Elements")
        layout.addWidget(tabs)


class SettingsDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Obsidian Settings")
        self.setMinimumWidth(400)
        layout = QFormLayout(self)
        self.home_page = QLineEdit(HOME_PAGE)
        layout.addRow("Home page:", self.home_page)
        self.stealth_default = QCheckBox("Enable stealth by default")
        layout.addRow(self.stealth_default)
        self.block_trackers = QCheckBox("Block trackers")
        self.block_trackers.setChecked(True)
        layout.addRow(self.block_trackers)
        self.max_tabs = QSpinBox()
        self.max_tabs.setRange(5, 100)
        self.max_tabs.setValue(50)
        layout.addRow("Max tabs:", self.max_tabs)
        buttons = QDialogButtonBox(QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel)
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)
        layout.addRow(buttons)


class ObsidianBrowser(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Obsidian Browser")
        self.setMinimumSize(1024, 700)
        self.stealth_engine = StealthEngine(self)
        self._setup_ui()
        self.stealth_panel.set_engine(self.stealth_engine)
        self.stealth_engine.status_changed.connect(
            lambda msg: self.status_label.setText(msg)
        )
        self._add_new_tab(QUrl(HOME_PAGE))

    def _setup_ui(self):
        self._create_toolbar()
        self._create_tab_bar()
        self._create_dock_panels()
        self._create_status_bar()
        self._create_menu()

    def _create_toolbar(self):
        nav = QToolBar("Navigation")
        nav.setMovable(False)
        nav.setIconSize(self.fontMetrics().boundingRect("  ").size())
        self.addToolBar(nav)

        self.back_btn = QPushButton("◀")
        self.back_btn.clicked.connect(self._go_back)
        nav.addWidget(self.back_btn)
        self.forward_btn = QPushButton("▶")
        self.forward_btn.clicked.connect(self._go_forward)
        nav.addWidget(self.forward_btn)
        self.refresh_btn = QPushButton("↻")
        self.refresh_btn.clicked.connect(self._refresh)
        nav.addWidget(self.refresh_btn)
        self.home_btn = QPushButton("🏠")
        self.home_btn.clicked.connect(self._go_home)
        nav.addWidget(self.home_btn)
        self.stop_btn = QPushButton("✕")
        self.stop_btn.clicked.connect(self._stop)
        self.stop_btn.setEnabled(False)
        nav.addWidget(self.stop_btn)

        self.url_bar = QLineEdit()
        self.url_bar.setPlaceholderText("Search or enter URL...")
        self.url_bar.returnPressed.connect(self._navigate_to_url)
        nav.addWidget(self.url_bar)

        self.stealth_btn = QPushButton("🛡️")
        self.stealth_btn.setCheckable(True)
        self.stealth_btn.setToolTip("Toggle stealth mode")
        nav.addWidget(self.stealth_btn)

    def _create_tab_bar(self):
        self.tabs = QTabWidget()
        self.tabs.setDocumentMode(True)
        self.tabs.setTabsClosable(True)
        self.tabs.tabCloseRequested.connect(self._close_tab)
        self.tabs.currentChanged.connect(self._tab_changed)
        self.tabs.setMovable(True)

        new_tab_btn = QPushButton("+")
        new_tab_btn.setFixedWidth(30)
        new_tab_btn.clicked.connect(lambda: self._add_new_tab(QUrl(HOME_PAGE)))
        self.tabs.setCornerWidget(new_tab_btn)

        self.setCentralWidget(self.tabs)

    def _create_dock_panels(self):
        self.stealth_panel = StealthPanel()
        self.scraping_panel = ScrapingPanel()
        self.devtools_panel = DevToolsPanel()

        from PyQt6.QtWidgets import QDockWidget
        dock = QDockWidget("Scraping", self)
        dock.setWidget(self.scraping_panel)
        dock.setAllowedAreas(
            Qt.DockWidgetArea.RightDockWidgetArea |
            Qt.DockWidgetArea.LeftDockWidgetArea
        )
        self.addDockWidget(Qt.DockWidgetArea.RightDockWidgetArea, dock)

    def _create_status_bar(self):
        self.status = QStatusBar()
        self.status_label = QLabel("Ready")
        self.status.addWidget(self.status_label)
        self.setStatusBar(self.status)

    def _create_menu(self):
        mb = self.menuBar()
        file_menu = mb.addMenu("File")
        file_menu.addAction(self._make_action("New Tab", "Ctrl+T", lambda: self._add_new_tab(QUrl(HOME_PAGE))))
        file_menu.addAction(self._make_action("Close Tab", "Ctrl+W", lambda: self._close_tab(self.tabs.currentIndex())))
        file_menu.addSeparator()
        file_menu.addAction(self._make_action("Settings...", "Ctrl+,", self._show_settings))
        file_menu.addSeparator()
        file_menu.addAction(self._make_action("Exit", "Ctrl+Q", self.close))

        tools_menu = mb.addMenu("Tools")
        tools_menu.addAction(self._make_action("Stealth Panel", None, self.stealth_panel.show))
        tools_menu.addAction(self._make_action("Scraping Panel", None, self.scraping_panel.show))
        tools_menu.addAction(self._make_action("DevTools", None, self.devtools_panel.show))
        tools_menu.addSeparator()
        tools_menu.addAction(self._make_action("Toggle Stealth Mode", "Ctrl+Shift+S", self._toggle_stealth))

        help_menu = mb.addMenu("Help")
        help_menu.addAction(self._make_action("About Obsidian", None, self._show_about))

    def _make_action(self, text, shortcut, slot):
        action = QAction(text, self)
        if shortcut:
            action.setShortcut(shortcut)
        action.triggered.connect(slot)
        return action

    def _add_new_tab(self, url=None):
        tab = TabWidget(self)
        idx = self.tabs.addTab(tab, "New Tab")
        self.tabs.setCurrentIndex(idx)
        if url:
            tab.load_url(url)
        return tab

    def _close_tab(self, idx):
        if self.tabs.count() > 1:
            tab = self.tabs.widget(idx)
            self.tabs.removeTab(idx)
            tab.deleteLater()
        else:
            self.close()

    def _tab_changed(self, idx):
        if idx >= 0:
            tab = self.tabs.widget(idx)
            self.url_bar.setText(tab.web_view.url().toString() or "")
            self._update_nav_buttons(tab)

    def _update_nav_buttons(self, tab):
        self.back_btn.setEnabled(tab.web_view.history().canGoBack())
        self.forward_btn.setEnabled(tab.web_view.history().canGoForward())

    def _navigate_to_url(self):
        tab = self.tabs.currentWidget()
        if tab:
            text = self.url_bar.text().strip()
            if "." in text or text.startswith("http"):
                url = QUrl(text) if text.startswith(("http://", "https://")) else QUrl("https://" + text)
            else:
                url = QUrl(f"https://www.google.com/search?q={text}")
            tab.load_url(url)

    def _go_back(self):
        tab = self.tabs.currentWidget()
        if tab:
            tab.web_view.back()

    def _go_forward(self):
        tab = self.tabs.currentWidget()
        if tab:
            tab.web_view.forward()

    def _refresh(self):
        tab = self.tabs.currentWidget()
        if tab:
            tab.web_view.reload()

    def _stop(self):
        tab = self.tabs.currentWidget()
        if tab:
            tab.web_view.stop()

    def _go_home(self):
        tab = self.tabs.currentWidget()
        if tab:
            tab.load_url(QUrl(HOME_PAGE))

    def _toggle_stealth(self):
        checked = not self.stealth_btn.isChecked()
        self.stealth_btn.setChecked(checked)
        self.stealth_panel.enabled.setChecked(checked)
        self.stealth_panel.show()

    def _show_settings(self):
        dlg = SettingsDialog(self)
        dlg.exec()

    def _show_about(self):
        from PyQt6.QtWidgets import QMessageBox
        QMessageBox.about(
            self, "About Obsidian",
            "Obsidian Browser v0.1.0\n\n"
            "A stealth-oriented web browser\n"
            "Built with PyQt6 + CloakBrowser engine\n\n"
            "Stealth. Speed. Freedom."
        )
