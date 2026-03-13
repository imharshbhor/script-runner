import { useState, useEffect, useRef } from "react";
import { Icon } from "./Icons";

export function SearchPalette({ isOpen, onClose, scripts, onSelect }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = scripts.filter(s => 
    s.name.toLowerCase().includes(query.toLowerCase()) || 
    s.command.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-modal" onClick={e => e.stopPropagation()}>
        <div className="search-input-wrapper">
          <Icon.Search size={16} color="var(--text-muted)" />
          <input 
            ref={inputRef}
            className="search-input" 
            placeholder="Search scripts by name or command..." 
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'Enter' && filtered.length > 0) {
                onSelect(filtered[0].id);
                onClose();
              }
            }}
          />
        </div>
        <div className="search-results">
          {filtered.length === 0 ? (
            <div className="search-empty">No scripts found.</div>
          ) : (
            filtered.map((s, idx) => (
              <div 
                key={s.id} 
                className={`search-result-item ${idx === 0 ? 'selected' : ''}`}
                onClick={() => { onSelect(s.id); onClose(); }}
              >
                <div className={`status-dot ${s.status === 'running' ? 'running' : ''}`} />
                <div className="search-result-name">{s.name}</div>
                <div className="search-result-cmd">{s.command}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}