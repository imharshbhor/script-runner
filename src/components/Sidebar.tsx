import { Icon } from "./Icons";
import { ScriptCard } from "./ScriptCard";
import type { Script } from "../types";

interface SidebarProps {
  scripts: Script[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onAdd: () => void;
  isCollapsed: boolean;
  onToggleSidebar: () => void;
}

export function Sidebar({ scripts, activeId, onSelect, onToggle, onAdd, isCollapsed, onToggleSidebar }: SidebarProps) {
  const isAnyRunning = scripts.some(s => s.status === 'running');

  return (
    <aside className={`panel deck ${isCollapsed ? 'collapsed' : ''}`}>
      <header className="deck-header">
        <button className="btn-add" onClick={onAdd} title="Deploy New Script">
          <Icon.Plus size={isCollapsed ? 18 : 16} />
        </button>

      <div className="titlebar-left">
        <button className="tb-btn tb-icon-only" onClick={onToggleSidebar} title="Toggle Sidebar">
          <Icon.PanelLeft size={14} />
        </button>
      </div>
      </header>

      <div className="deck-list">
        {scripts.map(script => (
          <ScriptCard
            key={script.id}
            script={script}
            isActive={activeId === script.id}
            onClick={() => onSelect(script.id)}
            onToggle={onToggle}
            isCollapsed={isCollapsed}
          />
        ))}
      </div>

      <div className="deck-footer">
        <button className="btn-icon" title="Settings"><Icon.Settings size={18} /></button>
        <button className="btn-icon" title="Help"><Icon.HelpCircle size={18} /></button>
      </div>
    </aside>
  );
}