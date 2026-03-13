import { Icon } from "./Icons";

export function ConfigBay({ script, onUpdate, onDelete }) {
  const handleChange = (field, value) => {
    onUpdate(script.id, { [field]: value });
  };

  const selectDir = async () => {
    if(window.electronAPI?.selectDirectory) {
      const dir = await window.electronAPI.selectDirectory();
      if(dir) {
        handleChange('path', dir);
      }
    } else {
        alert("Directory selection requires running in Electron mode.");
    }
  };

  return (
    <section className="panel config-bay">
      <header className="bay-header">
        <div className="bay-title">
          <Icon.Settings size={16} /> Parameter Configuration
        </div>
        <button 
          className="btn-icon" 
          onClick={() => onDelete(script.id)} 
          title="Purge Script"
        >
          <Icon.Trash size={14} />
        </button>
      </header>
      <div className="bay-content">
        <div className="form-group">
          <label className="label">Sequence Name</label>
          <input 
            type="text" 
            className="input" 
            value={script.name}
            onChange={(e) => handleChange('name', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="label">Working Directory</label>
          <div className="input-group">
             <input 
               type="text" 
               className="input flex-1" 
               value={script.path}
               onChange={(e) => handleChange('path', e.target.value)}
             />
             <button className="btn-secondary" onClick={selectDir}>Browse</button>
          </div>
        </div>
        <div className="form-group full">
          <label className="label">Execution Command</label>
          <textarea 
            className="input" 
            value={script.command}
            onChange={(e) => handleChange('command', e.target.value)}
          />
        </div>
      </div>
    </section>
  );
}