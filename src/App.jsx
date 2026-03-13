import { useState, useEffect, useRef } from "react";
import { Sidebar } from "./components/Sidebar";
import { ConfigBay } from "./components/ConfigBay";
import { TerminalBay } from "./components/TerminalBay";
import { EmptyState } from "./components/EmptyState";
import { Titlebar } from "./components/Titlebar";
import { SearchPalette } from "./components/SearchPalette";
import "./styles.css";

const initialScripts = [
  { id: "s1", name: "List Directory contents", command: "ls", path: "C:\\", status: "idle", lastRun: "Never" }
];

function formatTime() {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`;
}

export default function App() {
  const [scripts, setScripts] = useState(initialScripts);
  const [activeId, setActiveId] = useState(null);
  const logsRef = useRef({});
  const terminalRef = useRef(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Global search shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Keep a ref to activeId so we can use it inside the electron callbacks
  // without constantly re-subscribing.
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
        else output = output.replace(/(?<!\r)\n/g, '\r\n'); // normalize newlines for xterm

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

  const handleToggleScript = (id) => {
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
          cwd: script.path
        });
      }
    } else {
      if(window.electronAPI) window.electronAPI.stopScript(id);
    }
  };

  const handleUpdateScript = (id, updates) => {
    setScripts(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleDeleteScript = (id) => {
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

  const handleClearLogs = (id) => {
    logsRef.current[id] = "";
    if (id === activeId) terminalRef.current?.clearAndWrite("");
  };

  const handleTerminalInput = (data) => {
    if (activeId && window.electronAPI) {
      window.electronAPI.sendScriptInput(activeId, data);
    }
  };

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
            </main>
          ) : (
            <EmptyState onAdd={handleAddScript} />
          )}
      </div>
    </div>
  );
}
