import { Icon } from "./Icons";

export function ScriptCard({ script, isActive, onClick, onToggle, isCollapsed }) {
  if (isCollapsed) {
    const initial = script.name.charAt(0).toUpperCase();
    return (
      <div 
        className={`script-avatar ${isActive ? 'active' : ''} ${script.status}`}
        onClick={onClick}
        title={`${script.name} (${script.status})`}
      >
        {initial}
      </div>
    );
  }

  return (
    <div 
      className={`script-card ${script.status} ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      <div className="card-header">
        <div>
          <div className="card-title">{script.name}</div>
          <div className="card-path" title={script.path}>{script.path}</div>
        </div>
        <div className="card-actions">
          <button 
            className={`btn-icon ${script.status === 'running' ? 'stop' : 'play'}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(script.id);
            }}
          >
            {script.status === 'running' ? <Icon.Square /> : <Icon.Play />}
          </button>
        </div>
      </div>
      <div className="card-footer">
        <span className={`status-badge ${script.status}`}>
          <span className="status-dot"></span>
          {script.status}
        </span>
        <span style={{ color: 'var(--text-muted)' }}>{script.lastRun}</span>
      </div>
    </div>
  );
}