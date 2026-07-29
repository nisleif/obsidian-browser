# Obsidian Browser

[![Python](https://img.shields.io/badge/python-3.14-blue)]()
[![PyInstaller](https://img.shields.io/badge/build-exe-green)]()
[![License](https://img.shields.io/badge/license-MIT-orange)]()

Navegador web stealth con herramientas de seguridad integradas, anti-detection, web scraping y ad blocking. Construido con Python (pywebview + WebView2) y una interfaz overlay HTML/JS personalizada.

![Splash](https://img.shields.io/badge/obsidian-v1.0-1a1a2e?labelColor=e94560)

---

## Características

### Navegación
- **Navegación completa** con botones atrás/adelante/recargar
- **Barra de URL inteligente** (auto-completa `https://`)
- **Pestañas múltiples** (Ctrl+T nueva, Ctrl+W cerrar, click para cambiar)
- **Bookmarks** (⭐ agregar, click para navegar, toggle ocultar/mostrar)
- **Atajos de teclado**: Ctrl+L/F6/Alt+D (URL), Ctrl+R/F5 (refresh), Escape (cerrar paneles)

### Stealth & Privacidad
- **Stealth Mode** (CloakBrowser) — navegación anónima con fingerprint spoofing, sesión separada de Edge
- **Adblock DOM-side** — 30+ selectores (generic + YouTube), MutationObserver + rescaneo periódico
- **DNT Header** — `DNT: 1` en todas las peticiones
- **Canvas fingerprint protection** — ruido inyectado en `toDataURL`
- **WebRTC leak prevention** — bloqueo de `getUserMedia` en HTTP
- **Referrer policy** — `no-referrer` forzado en cada página
- **Cookie auto-clean** — limpieza al cambiar de dominio

### Herramientas de Seguridad (Obsidian Tools Panel)
| Categoría | Herramientas |
|-----------|-------------|
| 🔍 **Scan** | Security Scan, Link Analysis, Tech Detection, Secret Scan |
| 📋 **Inspect** | Cookies, Headers, Page Info |
| 🌐 **Network** | DNS Lookup, Port Scan, URL Fuzz, SSL Info |
| 💥 **Test** | XSS Test, SQLi Test, Form Dump |
| ⚙️ **Config** | User-Agent personalizable, Proxy Config |
| 📦 **Resources** | HackingTool Repo, Obsidian Docs |

### Web Scraping
- **Scrape Page** — extrae texto completo vía Stealth Engine
- **Scrape Links** — todos los enlaces del DOM
- **Scrape Images** — todas las imágenes del DOM
- **Scrape Text** — texto visible de la página

### UI/UX
- **Toolbar overlay** inyectada en cada página (no iframe)
- **Barra de estado** con badge Stealth ON/OFF (verde/rojo), contador de ads bloqueados, indicador HTTP/HTTPS
- **Splash screen** animado al inicio
- **Transiciones suaves** en todos los elementos interactivos
- **Panel lateral** con 18 herramientas de seguridad
- **Dropdowns animados** con fade + slide
- **Soporte de Trusted Types** — 0% `innerHTML`, todo con `createElement` + `textContent`

---

## Tecnologías

- **Python 3.14** — backend (API, herramientas, stealth engine)
- **pywebview** — WebView2 (Edge Chromium) como motor de renderizado
- **JavaScript (vanilla)** — overlay UI, adblock, herramientas DOM-side
- **CSS3** — animaciones, gradientes, transiciones, diseño responsivo
- **CloakBrowser** — motor stealth para navegación anónima
- **PyInstaller** — compilación a `.exe` autocontenido (~7 MB)

## Instalación

```bash
# Clonar
git clone https://github.com/nisleif/obsidian-browser.git
cd obsidian-browser

# Dependencias
pip install -r requirements.txt

# Ejecutar
python main.py
```

## Compilar a EXE

```bash
python build_exe.py
```

El ejecutable se crea en `dist/Obsidian/Obsidian.exe`.

## Estructura del Proyecto

```
obsidian-browser/
├── main.py              # Entry point, crea ventana pywebview
├── api.py               # API backend: tabs, bookmarks, stealth, scraping, stats
├── tools.py             # Security tools: DNS, port scan, SSL, fuzz, proxy, UA
├── stealth_engine.py    # CloakBrowser integration (asyncio + threading)
├── overlay.js           # UI overlay inyectado: toolbar, tabs, adblock, tools (1509 lines)
├── start.html           # Página de inicio con splash screen + buscador
├── build_exe.py         # Script de compilación PyInstaller
├── test_stealth.py      # Pruebas del stealth engine
└── requirements.txt     # Dependencias Python
```

## Seguridad

Obsidian ofrece protección en múltiples capas:

| Capa | Protección | Estado |
|------|-----------|--------|
| Red | DNT Header, Proxy support | ✅ |
| DOM | Adblock, Referrer policy, Canvas noise | ✅ |
| Sesión | Stealth Mode (CloakBrowser session aislada) | ✅ |
| Análisis | Security Scan, SSL, Header inspection | ✅ |
| Detección | Secret scanner, XSS/SQLi analysis | ✅ |

**Limitaciones conocidas:**
- No tiene bloqueo de tracking a nivel red (req. `CoreWebView2.WebResourceRequested`)
- No tiene aislamiento de cookies persistente (comparte perfil con Edge)
- El port scanning puede ser bloqueado por antivirus/firewall

## Atajos de Teclado

| Tecla | Acción |
|-------|--------|
| `Ctrl+L` / `F6` / `Alt+D` | Enfocar barra de URL |
| `Ctrl+R` / `F5` | Recargar página |
| `Ctrl+T` | Nueva pestaña |
| `Ctrl+W` | Cerrar pestaña |
| `Escape` | Cerrar dropdowns/panel |

## Changelog

### v1.0 (2026-07-29)
- Migración a pywebview (WebView2)
- Stealth Mode con CloakBrowser
- Adblock DOM-side con 30+ selectores
- Obsidian Tools panel con 18 herramientas
- Splash screen animado
- UI con transiciones suaves
- Anti-tracking: DNT, canvas noise, WebRTC block, referrer policy
- Compilación EXE con PyInstaller (~7 MB)
