const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { spawn, execSync } = require("node:child_process");

const isDev = !app.isPackaged;
const devServerUrl = process.env.VITE_DEV_SERVER_URL ?? "http://localhost:5173";

// Keep track of running processes
const activeProcesses = new Map();
// Keep track of logs per script
const scriptLogs = new Map();
// Keep track of script metadata
const scriptMeta = new Map();

// Get user data path for storing scripts
function getScriptsPath() {
  return path.join(app.getPath("userData"), "scripts.json");
}

// Get logs directory
function getLogsDir() {
  const logsDir = path.join(app.getPath("userData"), "logs");
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  return logsDir;
}

// Get safe filename from script name and path
function sanitizeFilename(str) {
  return str.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
}

// Save log to file
function saveLogToFile(scriptId, scriptName, scriptPath, logContent) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const safeName = sanitizeFilename(scriptName);
  const safePath = sanitizeFilename(scriptPath);
  const filename = `${safeName}-${safePath}-${timestamp}.txt`;
  const filepath = path.join(getLogsDir(), filename);
  
  try {
    fs.writeFileSync(filepath, logContent);
    return { success: true, filename, filepath };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Get list of log files for a script
function getScriptLogs(scriptName, scriptPath) {
  const logsDir = getLogsDir();
  const safeName = sanitizeFilename(scriptName);
  const safePath = scriptPath ? sanitizeFilename(scriptPath) : null;
  
  try {
    const files = fs.readdirSync(logsDir)
      .filter(f => {
        if (!f.endsWith('.txt')) return false;
        const parts = f.replace('.txt', '').split('-');
        return parts[0] === safeName && (safePath === null || parts[1] === safePath);
      })
      .map(f => {
        const filepath = path.join(logsDir, f);
        const stats = fs.statSync(filepath);
        return {
          filename: f,
          filepath: filepath,
          created: stats.birthtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
    return { success: true, files };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Delete a log file
function deleteLogFile(filepath) {
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Kill all active processes
function killAllProcesses() {
  for (const [id, child] of activeProcesses) {
    if (child.pid) {
      try {
        execSync(`taskkill /PID ${child.pid} /F /T`, { windowsHide: true, stdio: 'ignore' });
      } catch (e) {
        try { child.kill(); } catch (_) {}
      }
    } else {
      child.kill();
    }
    activeProcesses.delete(id);
  }
}

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
  ipcMain.on("window-close", () => {
    try {
      execSync("taskkill /F /FI \"WINDOWTITLE eq ScriptRunner*\" /T", { windowsHide: true, stdio: 'ignore' });
    } catch (e) {}
    killAllProcesses();
    window.close();
  });

  // Directory Picker IPC
  ipcMain.handle("select-directory", async () => {
    const result = await dialog.showOpenDialog(window, {
      properties: ["openDirectory"]
    });
    if (result.canceled) return null;
    return result.filePaths[0];
  });

  // Script Runner IPC
  ipcMain.on("run-script", (event, { id, command, cwd, scriptName }) => {
    if (activeProcesses.has(id)) {
      event.sender.send("script-log", { id, type: "err", msg: "Process is already running." });
      return;
    }

    // Store script metadata
    scriptMeta.set(id, { scriptName: scriptName || "script", scriptPath: cwd || "" });

    try {
      // Use cmd /K to keep shell alive so we can kill it later
      const child = spawn("cmd.exe", ["/K", command], {
        cwd: cwd || process.cwd(),
        env: { ...process.env, FORCE_COLOR: "1" },
        shell: false
      });

      activeProcesses.set(id, child);

      child.stdout.on("data", (data) => {
        const msg = data.toString();
        // Accumulate logs
        scriptLogs.set(id, (scriptLogs.get(id) || "") + msg);
        event.sender.send("script-log", { id, type: "data", msg });
      });

      child.stderr.on("data", (data) => {
        const msg = data.toString();
        // Accumulate logs
        scriptLogs.set(id, (scriptLogs.get(id) || "") + msg);
        event.sender.send("script-log", { id, type: "data", msg });
      });

      child.on("close", (code) => {
        // Save log to file before cleaning up
        const logContent = scriptLogs.get(id) || "";
        const meta = scriptMeta.get(id) || { scriptName: "script" };
        if (logContent.trim()) {
          saveLogToFile(id, meta.scriptName, meta.scriptPath, logContent);
        }
        scriptLogs.delete(id);
        scriptMeta.delete(id);
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
        if (child.pid) {
          try {
            execSync(`taskkill /PID ${child.pid} /F /T`, { windowsHide: true, stdio: 'ignore' });
          } catch(e) {
            child.kill(); 
          }
        } else {
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
      if (child.pid) {
        try {
          execSync(`taskkill /PID ${child.pid} /F /T`, { windowsHide: true, stdio: 'ignore' });
        } catch(e) {
          child.kill(); 
        }
      } else {
        child.kill();
      }
      // Save log before deleting
      const logContent = scriptLogs.get(id) || "";
      const meta = scriptMeta.get(id) || { scriptName: "script" };
      if (logContent.trim()) {
        saveLogToFile(id, meta.scriptName, logContent);
      }
      scriptLogs.delete(id);
      scriptMeta.delete(id);
      activeProcesses.delete(id);
      event.sender.send("script-log", { id, type: "err", msg: "Process terminated by user." });
      event.sender.send("script-exit", { id, code: null });
    }
  });

  ipcMain.on("open-external", (event, url) => {
    shell.openExternal(url);
  });

  // Save scripts to local file
  ipcMain.handle("save-scripts", async (event, scripts) => {
    try {
      fs.writeFileSync(getScriptsPath(), JSON.stringify(scripts, null, 2));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Load scripts from local file
  ipcMain.handle("load-scripts", async () => {
    try {
      const filePath = getScriptsPath();
      if (!fs.existsSync(filePath)) {
        return { success: true, scripts: null };
      }
      const data = fs.readFileSync(filePath, "utf-8");
      return { success: true, scripts: JSON.parse(data) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Get logs for a script
  ipcMain.handle("get-script-logs", async (event, { scriptName, scriptPath }) => {
    return getScriptLogs(scriptName, scriptPath);
  });

  // Open a log file
  ipcMain.on("open-log-file", (event, filepath) => {
    shell.openPath(filepath);
  });

  // Delete a log file
  ipcMain.handle("delete-log-file", async (event, filepath) => {
    return deleteLogFile(filepath);
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

// Kill all processes before quitting
app.on("before-quit", () => {
  killAllProcesses();
});

app.on("window-all-closed", () => {
  killAllProcesses();
  if (process.platform !== "darwin") {
    app.quit();
  }
});