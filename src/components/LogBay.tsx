import { useState, useEffect } from "react";
import { Icon } from "./Icons";
import type { LogFile } from "../types";

interface LogBayProps {
  scriptName: string;
  scriptPath: string;
  onGetLogs: (scriptName: string, scriptPath: string) => Promise<LogFile[]>;
  onOpenLog: (filepath: string) => void;
  onDeleteLog: (filepath: string) => Promise<void>;
}

export function LogBay({ scriptName, scriptPath, onGetLogs, onOpenLog, onDeleteLog }: LogBayProps) {
  const [logs, setLogs] = useState<LogFile[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, [scriptName, scriptPath]);

  const loadLogs = async () => {
    const files = await onGetLogs(scriptName, scriptPath);
    setLogs(files);
  };

  const handleDeleteLog = async (filepath: string) => {
    await onDeleteLog(filepath);
    setDeleteConfirm(null);
    loadLogs();
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleString();
  };

  return (
    <section className="panel log-bay">
      <header className="bay-header">
        <div className="bay-title">
          <Icon.FileText size={16} /> Saved Logs
        </div>
      </header>
      <div className="log-list">
        {logs.length === 0 ? (
          <div className="log-empty">No logs saved yet.</div>
        ) : (
          logs.map((log) => (
            <div key={log.filepath} className="log-item">
              <div className="log-info">
                <span className="log-filename">{log.filename}</span>
                <span className="log-date">{formatDate(log.created)}</span>
              </div>
              <div className="log-actions">
                {deleteConfirm === log.filepath ? (
                  <>
                    <button 
                      className="btn-icon btn-danger"
                      onClick={() => handleDeleteLog(log.filepath)}
                      title="Confirm delete"
                    >
                      <Icon.Check size={14} />
                    </button>
                    <button 
                      className="btn-icon"
                      onClick={() => setDeleteConfirm(null)}
                      title="Cancel"
                    >
                      <Icon.X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      className="btn-icon"
                      onClick={() => onOpenLog(log.filepath)}
                      title="Open log"
                    >
                      <Icon.ExternalLink size={14} />
                    </button>
                    <button 
                      className="btn-icon"
                      onClick={() => setDeleteConfirm(log.filepath)}
                      title="Delete log"
                    >
                      <Icon.Trash size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}