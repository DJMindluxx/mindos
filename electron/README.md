# MindOS — Electron Desktop App

## Automatischer Build via GitHub Actions

Wenn du einen neuen Release-Tag pushst, baut GitHub automatisch `.exe` (Windows) und `.dmg` (Mac):

```bash
git tag v1.0.0
git push origin v1.0.0
```

→ Danach unter **github.com/DJMindluxx/mindos/releases** den Download abholen.

## Manueller Build (lokal)

Voraussetzungen: Node.js 20+, npm, Python 3 mit `pip install reportlab pillow`

```bash
# 1. Im Projekt-Root: App bauen
npm run build

# 2. In den electron/ Ordner wechseln
cd electron
npm install

# Windows
npm run build:win

# macOS
npm run build:mac

# Beide
npm run build:all
```

Die fertigen Installer landen im Ordner `electron-dist/`.

## Datenbank

Die SQLite-Datenbank wird bei der Electron-App unter dem App-Datenverzeichnis gespeichert:
- Windows: `%APPDATA%\MindOS\mindos.db`
- macOS: `~/Library/Application Support/MindOS/mindos.db`

So gehen deine Daten nicht verloren wenn du die App neu installierst.
