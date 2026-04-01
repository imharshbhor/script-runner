import { Icon } from "./Icons";

interface TitlebarProps {
  onToggleSidebar: () => void;
  onOpenSearch: () => void;
}

export function Titlebar({ onToggleSidebar, onOpenSearch }: TitlebarProps) {
  const minimize = () => window.electronAPI?.minimize();
  const maximize = () => window.electronAPI?.maximize();
  const close = () => window.electronAPI?.close();

  return (
    <div className="titlebar">
      <div className="titlebar-drag-region"></div>

     <div className="titlebar-left"><p>ScriptRunner</p></div>

      <div className="titlebar-center">
        <div className="search-bar" onClick={onOpenSearch}>
          <Icon.Search size={14} />
          <span className="search-text">Search scripts...</span>
          <span className="search-shortcut">Ctrl+P</span>
        </div>
      </div>

      <div className="titlebar-right">
        <button className="window-control minimize" onClick={minimize}>
          <svg viewBox="0 0 10 1" width="10" height="1"><rect fill="currentColor" width="10" height="1"></rect></svg>
        </button>
        <button className="window-control maximize" onClick={maximize}>
          <svg viewBox="0 0 10 10" width="10" height="10"><rect fill="none" stroke="currentColor" width="9" height="9" x="0.5" y="0.5"></rect></svg>
        </button>
        <button className="window-control close" onClick={close}>
          <svg viewBox="0 0 10 10" width="10" height="10"><polygon fill="currentColor" points="10.2,0.7 9.5,0 5.1,4.4 0.7,0 0,0.7 4.4,5.1 0,9.5 0.7,10.2 5.1,5.8 9.5,10.2 10.2,9.5 5.8,5.1"></polygon></svg>
        </button>
      </div>
    </div>
  );
}