import { useMemo } from "react";

function App() {
  const platform = useMemo(() => window.electronAPI?.platform ?? "unknown", []);

  return (
    <main className="app">
      <div className="card">
        <p className="eyebrow">Starter Ready</p>
        <h1>Electron + React</h1>
        <p>
          This desktop shell runs an Electron main process with a React renderer
          powered by Vite.
        </p>
        <p className="meta">Detected platform: {platform}</p>
      </div>
    </main>
  );
}

export default App;
