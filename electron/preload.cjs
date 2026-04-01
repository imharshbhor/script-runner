const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-close"),
  selectDirectory: () => ipcRenderer.invoke("select-directory"),
  runScript: (args) => ipcRenderer.send("run-script", args),
  stopScript: (id) => ipcRenderer.send("stop-script", id),
  sendScriptInput: (id, data) => ipcRenderer.send("script-input", { id, data }),
  openExternal: (url) => ipcRenderer.send("open-external", url),
  saveScripts: (scripts) => ipcRenderer.invoke("save-scripts", scripts),
  loadScripts: () => ipcRenderer.invoke("load-scripts"),
  getScriptLogs: (scriptName, scriptPath) => ipcRenderer.invoke("get-script-logs", { scriptName, scriptPath }),
  openLogFile: (filepath) => ipcRenderer.send("open-log-file", filepath),
  deleteLogFile: (filepath) => ipcRenderer.invoke("delete-log-file", filepath),
  onLog: (callback) => {
    const handler = (_event, value) => callback(value);
    ipcRenderer.on("script-log", handler);
    return () => ipcRenderer.removeListener("script-log", handler);
  },
  onExit: (callback) => {
    const handler = (_event, value) => callback(value);
    ipcRenderer.on("script-exit", handler);
    return () => ipcRenderer.removeListener("script-exit", handler);
  },
});