const { app, BrowserWindow, shell, Menu, Tray, nativeImage } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

let mainWindow = null;
let tray = null;
let serverProcess = null;
const PORT = 5174; // Electron-eigener Port, nicht 5000

// ── Server starten ────────────────────────────────────────────────────────────
function startServer() {
  const serverPath = path.join(__dirname, '..', 'dist', 'index.cjs');
  serverProcess = spawn(process.execPath, [serverPath], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(PORT),
      DB_PATH: path.join(app.getPath('userData'), 'mindos.db'),
    },
    stdio: 'pipe',
  });

  serverProcess.stdout.on('data', (d) => console.log('[server]', d.toString().trim()));
  serverProcess.stderr.on('data', (d) => console.error('[server]', d.toString().trim()));
  serverProcess.on('exit', (code) => {
    console.log('[server] exited with code', code);
  });
}

// ── Warten bis Server antwortet ───────────────────────────────────────────────
function waitForServer(retries = 30) {
  return new Promise((resolve, reject) => {
    function attempt(n) {
      http.get(`http://127.0.0.1:${PORT}/api/settings`, (res) => {
        if (res.statusCode < 500) resolve();
        else attempt(n - 1);
      }).on('error', () => {
        if (n <= 0) return reject(new Error('Server did not start'));
        setTimeout(() => attempt(n - 1), 500);
      });
    }
    attempt(retries);
  });
}

// ── Hauptfenster erstellen ────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 430,
    height: 932,
    minWidth: 375,
    minHeight: 700,
    maxWidth: 600,
    backgroundColor: '#0c0a0d',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    frame: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, 'icons', 'icon.png'),
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
    tray = new Tray(icon.resize({ width: 16, height: 16 }));
    const contextMenu = Menu.buildFromTemplate([
      { label: 'MindOS öffnen', click: () => { if (mainWindow) mainWindow.show(); else createWindow(); } },
      { type: 'separator' },
      { label: 'Beenden', click: () => app.quit() },
    ]);
    tray.setToolTip('MindOS');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => { if (mainWindow) mainWindow.show(); });
  } catch (e) {
    console.warn('Tray konnte nicht erstellt werden:', e.message);
  }
}

// ── App-Menü (macOS) ──────────────────────────────────────────────────────────
function setupMenu() {
  const template = [
    {
      label: 'MindOS',
      submenu: [
        { label: 'Über MindOS', role: 'about' },
        { type: 'separator' },
        { label: 'Beenden', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
      ],
    },
    {
      label: 'Bearbeiten',
      submenu: [
        { role: 'undo', label: 'Rückgängig' },
        { role: 'redo', label: 'Wiederholen' },
        { type: 'separator' },
        { role: 'cut', label: 'Ausschneiden' },
        { role: 'copy', label: 'Kopieren' },
        { role: 'paste', label: 'Einfügen' },
        { role: 'selectAll', label: 'Alles auswählen' },
      ],
    },
    {
      label: 'Ansicht',
      submenu: [
        { role: 'reload', label: 'Neu laden' },
        { role: 'toggleDevTools', label: 'Entwicklertools' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Zoom zurücksetzen' },
        { role: 'zoomIn', label: 'Vergrößern' },
        { role: 'zoomOut', label: 'Verkleinern' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  setupMenu();
  startServer();
  try {
    await waitForServer();
  } catch (e) {
    console.error('Server-Start fehlgeschlagen:', e.message);
  }
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // Auf macOS läuft die App weiter (Tray), auf Windows/Linux beenden
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});
