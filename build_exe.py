"""
Build Obsidian Browser as a standalone Windows .exe
"""
import os
import sys
import shutil
from pathlib import Path

DIST_DIR = Path(r"C:\Users\NACHO\Desktop\Obsidian\dist")
BUILD_DIR = Path(r"C:\Users\NACHO\Desktop\Obsidian\build")

def clean_dirs():
    for d in [DIST_DIR, BUILD_DIR]:
        if d.exists():
            shutil.rmtree(d)
    print("Cleaned build directories")

def build():
    os.chdir(r"C:\Users\NACHO\Desktop\Obsidian")

    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconfirm",
        "--clean",
        "--name", "Obsidian",
        "--windowed",
        "--onedir",
        "--noconsole",
        "--add-data", f"stealth_engine.py{os.pathsep}.",
        "--add-data", f"tools.py{os.pathsep}.",
        "--add-data", f"overlay.js{os.pathsep}.",
        "--add-data", f"start.html{os.pathsep}.",
        "--add-data", f"test_stealth.py{os.pathsep}.",
        "--hidden-import", "cloakbrowser",
        "--hidden-import", "asyncio",
        "--collect-all", "cloakbrowser",
        "main.py"
    ]

    print("Running PyInstaller...")
    print(" ".join(cmd))
    import subprocess
    subprocess.run(cmd, shell=True)
    print("Build complete!")

    exe_path = DIST_DIR / "Obsidian" / "Obsidian.exe"
    if exe_path.exists():
        print(f"Executable created: {exe_path}")
        size_mb = exe_path.stat().st_size / (1024 * 1024)
        print(f"Size: {size_mb:.1f} MB")
    else:
        print("Build may have failed - executable not found")

if __name__ == "__main__":
    clean_dirs()
    build()
