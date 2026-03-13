const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("node:path");
const { spawn } = require("node:child_process");

const isDev = !app.isPackaged;
const devServerUrl = process.env.VITE_DEV_SERVER_URL ?? "http://localhost:5173";

// Keep track of running processes
const activeProcesses = new Map();

function createWindow() {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false, // Custom Titlebar
    titleBarStyle: 'hidden',
    titleBarOverlay: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Window Controls IPC
  ipcMain.on("window-minimize", () => window.minimize());
  ipcMain.on("window-maximize", () => {
    if (window.isMaximized()) window.unmaximize();
    else window.maximize();
  });
  ipcMain.on("window-close", () => window.close());

  // Directory Picker IPC
  ipcMain.handle("select-directory", async () => {
    const result = await dialog.showOpenDialog(window, {
      properties: ["openDirectory"]
    });
    if (result.canceled) return null;
    return result.filePaths[0];
  });

  // Script Runner IPC
  ipcMain.on("run-script", (event, { id, command, cwd }) => {
    if (activeProcesses.has(id)) {
      event.sender.send("script-log", { id, type: "err", msg: "Process is already running." });
      return;
    }

    try {
      // Use powershell on Windows explicitly as requested
      const child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", command], {
        cwd: cwd || process.cwd(),
        env: { ...process.env, FORCE_COLOR: "1" },
        shell: false
      });

      activeProcesses.set(id, child);

      child.stdout.on("data", (data) => {
        event.sender.send("script-log", { id, type: "data", msg: data.toString() });
      });

      child.stderr.on("data", (data) => {
        event.sender.send("script-log", { id, type: "data", msg: data.toString() });
      });

      child.on("close", (code) => {
        activeProcesses.delete(id);
        event.sender.send("script-exit", { id, code });
      });

      child.on("error", (err) => {
        activeProcesses.delete(id);
        event.sender.send("script-log", { id, type: "err", msg: `Spawn error: ${err.message}` });
        event.sender.send("script-exit", { id, code: -1 });
      });
      
    } catch (err) {
      event.sender.send("script-log", { id, type: "err", msg: `Failed to start: ${err.message}` });
      event.sender.send("script-exit", { id, code: -1 });
    }
  });

  ipcMain.on("script-input", (event, { id, data }) => {
    const child = activeProcesses.get(id);
    if (child && child.stdin) {
      if (data === '\x03') { // Ctrl+C intercepted manually
        try {
          spawn("taskkill", ["/pid", child.pid, '/f', '/t']);
        } catch(e) {
          child.kill(); 
        }
      } else {
        child.stdin.write(data);
      }
    }
  });

  ipcMain.on("stop-script", (event, id) => {
    const child = activeProcesses.get(id);
    if (child) {
      // Best effort kill on windows powershell
      try {
          spawn("taskkill", ["/pid", child.pid, '/f', '/t']);
      } catch(e) {
          child.kill(); 
      }
      activeProcesses.delete(id);
      event.sender.send("script-log", { id, type: "err", msg: "Process terminated by user." });
      event.sender.send("script-exit", { id, code: null });
    }
  });

  ipcMain.on("open-external", (event, url) => {
    shell.openExternal(url);
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  if (isDev) {
    window.loadURL(devServerUrl);
    window.webContents.openDevTools({ mode: "detach" });
    return;
  }

  window.loadFile(path.join(__dirname, "..", "dist", "index.html"));
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});