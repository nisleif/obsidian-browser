# Obsidian Browser

Navegador web stealth con herramientas de seguridad integradas, construido con Python (pywebview) y una interfaz HTML/JS personalizada.

## Características

- **Navegación completa** con pestañas, bookmarks, historial
- **Stealth Engine** — modo de navegación anónima con firma digital modificable
- **Obscura Security Tools:**
  - Resolución DNS
  - Escaneo de puertos
  - Fuzzing de URLs
  - Inspección de headers HTTP/HTTPS
  - Información SSL/TLS
- **User-Agent personalizable** y soporte de proxy
- **Web scraper** integrado
- **Interfaz overlay** inyectada mediante JavaScript
- Compilable a `.exe` con PyInstaller

## Tecnologías

- Python (pywebview)
- JavaScript (overlay)
- HTML + CSS (UI personalizada)

## Instalación

```bash
pip install -r requirements.txt
python main.py
```

## Compilar a EXE

```bash
python build_exe.py
```
