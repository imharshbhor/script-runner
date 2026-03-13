import { Icon } from "./Icons";

export function EmptyState({ onAdd }) {
  return (
    <main className="empty-matrix">
      <div className="empty-content">
        <div className="empty-icon"><Icon.Terminal size={64} /></div>
        <h1 className="empty-title">AWAITING INPUT</h1>
        <p className="empty-desc">
          No script sequence selected. Select an existing configuration from the command deck or deploy a new sequence to begin telemetry.
        </p>
        <button className="btn-primary" onClick={onAdd}>
          <Icon.Plus size={20} /> Deploy New Sequence
        </button>
      </div>
    </main>
  );
}