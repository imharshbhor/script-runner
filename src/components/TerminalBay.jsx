import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";

export const TerminalBay = forwardRef(({ scriptId, initialLog, onInput, onClear }, ref) => {
  const containerRef = useRef(null);
  const termRef = useRef(null);

  useImperativeHandle(ref, () => ({
    write: (data) => {
      termRef.current?.write(data);
    },
    clearAndWrite: (data) => {
      termRef.current?.clear();
      termRef.current?.write(data);
    }
  }));

  const onInputRef = useRef(onInput);
  useEffect(() => {
    onInputRef.current = onInput;
  }, [onInput]);

  useEffect(() => {
    const term = new Terminal({
      theme: { 
        background: '#000000', 
        foreground: '#cccccc', 
        cursor: '#ccff00',
        selectionBackground: 'rgba(204, 255, 0, 0.3)'
      },
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 13,
      cursorBlink: true,
      convertEol: true
    });
    
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon((event, uri) => {
      if (window.electronAPI && window.electronAPI.openExternal) {
        window.electronAPI.openExternal(uri);
      } else {
        window.open(uri, '_blank');
      }
    });
    
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    
    term.open(containerRef.current);
    fitAddon.fit();

    term.onData(data => {
      if (onInputRef.current) onInputRef.current(data);
    });

    termRef.current = term;

    const resizeOb = new ResizeObserver(() => fitAddon.fit());
    resizeOb.observe(containerRef.current);

    return () => {
      resizeOb.disconnect();
      term.dispose();
    };
  }, []);

  // When scriptId switches, we populate it with the stored history
  useEffect(() => {
    if (termRef.current) {
      termRef.current.clear();
      if (initialLog) {
        termRef.current.write(initialLog);
      }
    }
  }, [scriptId]);

  return (
    <section className="panel terminal-bay">
      <header className="terminal-header">
        <div className="terminal-tabs">
          <div className="tab active">Terminal</div>
        </div>
        <div className="terminal-actions">
          <button 
            className="btn-icon" 
            style={{ width: 'auto', padding: '0 12px', fontSize: '0.7rem' }}
            onClick={() => onClear(scriptId)}
          >
            CLEAR
          </button>
        </div>
      </header>
      <div className="terminal-window" ref={containerRef}></div>
    </section>
  );
});