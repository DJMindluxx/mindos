const { app, BrowserWindow, shell, Menu, Tray, nativeImage } = require('electron');
const path = require('path');
const http = require('http');

let mainWindow = null;
let tray = null;
const PORT = 5174;

// ── Ressourcen-Pfad (funktioniert geverpackt + in dev) ────────────────────────
function getResourcesPath() {
  // In gepackter App: resources/ neben der App
  // In Entwicklung: project root
  if (app.isPackaged) {
    return process.resourcesPath;
  }
  return path.join(__dirname, '..');
}

// ── Server inline laden (kein separater Node-Prozess!) ────────────────────────
function startServer() {
  const resourcesPath = getResourcesPath();
  const serverPath = path.join(resourcesPath, 'dist', 'index.cjs');

  // Umgebung setzen BEVOR der Server geladen wird
  process.env.NODE_ENV = 'production';
  process.env.PORT = String(PORT);
  process.env.DB_PATH = path.join(app.getPath('userData'), 'mindos.db');

  try {
    require(serverPath);
    console.log('[mindos] Server gestartet auf Port', PORT);
  } catch (err) {
    console.error('[mindos] Server-Fehler:', err.message);
    console.error('[mindos] Gesuchter Pfad:', serverPath);
  }
}

// ── Warten bis Server antwortet ───────────────────────────────────────────────
function waitForServer(retries = 40) {
  return new Promise((resolve, reject) => {
    function attempt(n) {
      const req = http.get(`http://127.0.0.1:${PORT}/api/settings`, (res) => {
        res.resume(); // Body verwerfen
        if (res.statusCode < 500) {
          resolve();
        } else {
          retry(n);
        }
      });
      req.on('error', () => retry(n));
      req.setTimeout(1000, () => { req.destroy(); retry(n); });
    }
    function retry(n) {
      if (n <= 0) return reject(new Error('Server hat nicht gestartet'));
      setTimeout(() => attempt(n - 1), 300);
    }
    attempt(retries);
  });
}

// ── Hauptfenster erstellen ────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 430,
    height: 900,
    minWidth: 375,
    minHeight: 700,
    maxWidth: 600,
    backgroundColor: '#0c0a0d',
    // Frame aktiviert für Windows — eigene Titelleiste wäre extra Aufwand
    frame: true,
    autoHideMenuBar: true, // Menüleiste verstecken (Alt zum einblenden)
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, 'icons', 'icon.png'),
    title: 'MindOS',
  });

  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);

  // Externe Links im System-Browser öffnen
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── Tray (System-Tray Icon) ───────────────────────────────────────────────────
function createTray() {
  try {
    const iconPath = path.join(__dirname, 'icons', 'icon-tray.png');
    const icon = nativeImage.createFromPath(iconPath);
    const resized = icon.isEmpty()
      ? nativeImage.createFromPath(path.join(__dirname, 'icons', 'icon.png')).resize({ width: 16, height: 16 })
      : icon.resize({ width: 16, height: 16 });

    tray = new Tray(resized);
    const contextMenu = Menu.buildFromTemplate([
      { label: 'MindOS öffnen', click: () => { if (mainWindow) mainWindow.show(); else createWindow(); } },
      { type: 'separator' },
      { label: 'Beenden', click: () => app.quit() },
    ]);
    tray.setToolTip('MindOS — Business Cockpit');
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => { if (mainWindow) mainWindow.show(); else createWindow(); });
  } catch (e) {
    console.warn('[mindos] Tray nicht verfügbar:', e.message);
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  // Einzelne Instanz sicherstellen
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
    return;
  }
  app.on('second-instance', () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
  });

  startServer();

  try {
    await waitForServer();
  } catch (e) {
    console.error('[mindos] Server-Start fehlgeschlagen:', e.message);
    // Trotzdem Fenster öffnen — zeigt Fehlerseite statt einzufrieren
  }

  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
