export type ScriptStatus = 'idle' | 'running';

export interface LogFile {
  filename: string;
  filepath: string;
  created: string;
}

export interface Script {
  id: string;
  name: string;
  command: string;
  path: string;
  status: ScriptStatus;
  lastRun: string;
}

export interface ElectronAPI {
  onLog: (callback: (data: { id: string; type: string; msg: string }) => void) => () => void;
  onExit: (callback: (data: { id: string; code: number }) => void) => () => void;
  runScript: (data: { id: string; command: string; cwd: string; scriptName: string }) => void;
  stopScript: (id: string) => void;
  sendScriptInput: (id: string, data: string) => void;
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  selectDirectory: () => Promise<string | null>;
  openExternal: (uri: string) => void;
  saveScripts: (scripts: Script[]) => Promise<{ success: boolean; error?: string }>;
  loadScripts: () => Promise<{ success: boolean; scripts: Script[] | null; error?: string }>;
  getScriptLogs: (scriptName: string, scriptPath: string) => Promise<{ success: boolean; files: LogFile[]; error?: string }>;
  openLogFile: (filepath: string) => void;
  deleteLogFile: (filepath: string) => Promise<{ success: boolean; error?: string }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}