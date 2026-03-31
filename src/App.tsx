import { useState, useEffect, useRef } from "react";
import { Sidebar } from "./components/Sidebar";
import { ConfigBay } from "./components/ConfigBay";
import { TerminalBay } from "./components/TerminalBay";
import { LogBay } from "./components/LogBay";
import { EmptyState } from "./components/EmptyState";
import { Titlebar } from "./components/Titlebar";
import { SearchPalette } from "./components/SearchPalette";
import type { Script } from "./types";
import "./styles.css";

const defaultScripts: Script[] = [
  { id: "s1", name: "List Directory contents", command: "dir", path: "C:\\", status: "idle", lastRun: "Never" }
];

function formatTime() {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`;
}

export default function App() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const logsRef = useRef<Record<string, string>>({});
  const terminalRef = useRef<{ write: (data: string) => void; clearAndWrite: (data: string) => void } | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleGetLogs = async (scriptName: string, scriptPath: string) => {
    if (window.electronAPI) {
      const result = await window.electronAPI.getScriptLogs(scriptName, scriptPath);
      if (result.success) {
        return result.files;
      }
    }
    return [];
  };

  const handleOpenLog = (filepath: string) => {
    if (window.electronAPI) {
      window.electronAPI.openLogFile(filepath);
    }
  };

  const handleDeleteLog = async (filepath: string) => {
    if (window.electronAPI) {
      await window.electronAPI.deleteLogFile(filepath);
    }
  };

  // Load scripts on mount
  useEffect(() => {
    async function load() {
      if (window.electronAPI) {
        const result = await window.electronAPI.loadScripts();
        if (result.success && result.scripts) {
          setScripts(result.scripts.map(s => ({ ...s, status: 'idle' })));
        } else if (result.success) {
          setScripts(defaultScripts);
        }
      } else {
        setScripts(defaultScripts);
      }
      setIsLoading(false);
    }
    load();
  }, []);

  // Auto-save when scripts change
  useEffect(() => {
    if (!isLoading && window.electronAPI && scripts.length > 0) {
      window.electronAPI.saveScripts(scripts);
    }
  }, [scripts, isLoading]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeIdRef = useRef(activeId);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  useEffect(() => {
    if (window.electronAPI) {
      const unsubLog = window.electronAPI.onLog(({ id, type, msg }) => {
        let output = msg;

        if (type === 'cmd') output = `\r\n\x1b[36m$ ${msg}\x1b[0m\r\n`;
        else if (type === 'warn') output = `\x1b[33m${msg}\x1b[0m`;
        else if (type === 'err') output = `\x1b[31m${msg}\x1b[0m`;
        else if (type === 'ok') output = `\r\n\x1b[32m${msg}\x1b[0m\r\n`;
        else output = output.replace(/(?<!\r)\n/g, '\r\n');

        logsRef.current[id] = (logsRef.current[id] || "") + output;

        if (id === activeIdRef.current) {
          terminalRef.current?.write(output);
        }
      });

      const unsubExit = window.electronAPI.onExit(({ id, code }) => {
        setScripts(prev => prev.map(s => {
          if (s.id === id) {
            const exitMsg = `\r\n\x1b[31mProcess exited with code ${code}\x1b[0m\r\n`;
            logsRef.current[id] = (logsRef.current[id] || "") + exitMsg;
            if (id === activeIdRef.current) terminalRef.current?.write(exitMsg);

            return { ...s, status: 'idle', lastRun: formatTime().slice(0, 8) };
          }
          return s;
        }));
      });

      return () => {
        unsubLog();
        unsubExit();
      };
    }
  }, []);

  const activeScript = scripts.find(s => s.id === activeId);

  const handleToggleScript = (id: string) => {
    const script = scripts.find(s => s.id === id);
    if (!script) return;

    const isRunning = script.status === 'running';

    if (!isRunning) {
      setScripts(prev => prev.map(s => s.id === id ? { ...s, status: 'running', lastRun: 'Active' } : s));

      const startMsg = `\x1b[2J\x1b[H\x1b[36m$ ${script.command}\x1b[0m\r\n`;
      logsRef.current[id] = startMsg;
      if (id === activeId) terminalRef.current?.clearAndWrite(startMsg);

      if (window.electronAPI) {
        window.electronAPI.runScript({
          id,
          command: script.command,
          cwd: script.path,
          scriptName: script.name
        });
      }
    } else {
      if(window.electronAPI) window.electronAPI.stopScript(id);
    }
  };

  const handleUpdateScript = (id: string, updates: Partial<Script>) => {
    setScripts(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleDeleteScript = (id: string) => {
    if(window.electronAPI) window.electronAPI.stopScript(id);
    setScripts(prev => prev.filter(s => s.id !== id));
    delete logsRef.current[id];
    if (activeId === id) setActiveId(null);
  };

  const handleAddScript = () => {
    const newId = `s${Date.now()}`;
    setScripts([{
      id: newId,
      name: "New Protocol",
      command: "echo 'Hello World'",
      path: "C:\\",
      status: "idle",
      lastRun: "Never"
    }, ...scripts]);
    setActiveId(newId);
  };

  const handleClearLogs = (id: string) => {
    logsRef.current[id] = "";
    if (id === activeId) terminalRef.current?.clearAndWrite("");
  };

  const handleTerminalInput = (data: string) => {
    if (activeId && window.electronAPI) {
      window.electronAPI.sendScriptInput(activeId, data);
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <div className="command-center">
      <Titlebar
        onToggleSidebar={() => setIsSidebarCollapsed(p => !p)}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      <SearchPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        scripts={scripts}
        onSelect={setActiveId}
      />

      <div className="main-content">
          <Sidebar
            scripts={scripts}
            activeId={activeId}
            onSelect={setActiveId}
            onToggle={handleToggleScript}
            onAdd={handleAddScript}
            isCollapsed={isSidebarCollapsed}
            onToggleSidebar={() => setIsSidebarCollapsed(p => !p)}
          />

          {activeScript ? (
            <main className="workspace">
              <ConfigBay
                script={activeScript}
                onUpdate={handleUpdateScript}
                onDelete={handleDeleteScript}
              />
              <TerminalBay
                ref={terminalRef}
                scriptId={activeScript.id}
                initialLog={logsRef.current[activeScript.id] || ""}
                onClear={handleClearLogs}
                onInput={handleTerminalInput}
              />
              <LogBay
                scriptName={activeScript.name}
                scriptPath={activeScript.path}
                onGetLogs={handleGetLogs}
                onOpenLog={handleOpenLog}
                onDeleteLog={handleDeleteLog}
              />
            </main>
          ) : (
            <EmptyState onAdd={handleAddScript} />
          )}
      </div>
    </div>
  );
}