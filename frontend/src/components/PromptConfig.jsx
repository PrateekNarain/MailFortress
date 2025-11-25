import React, { useState, useEffect, useRef } from 'react';
import { DEFAULT_PROMPTS_JSON } from '../constants';

export default function PromptConfig({ prompts = [], onUpdatePrompt, initializePrompts }) {
  const coreKeys = ['categorize', 'action_items', 'reply_generate'];
  const [editing, setEditing] = useState({});
  const fileInputRef = useRef(null);

  useEffect(() => {
    // prefill editing state from prompts or defaults
    const map = {};
    coreKeys.forEach((k) => {
      const found = prompts.find(p => p.prompt_type === k);
      map[k] = found ? (found.prompt_text || '') : (DEFAULT_PROMPTS_JSON[k]?.system || DEFAULT_PROMPTS_JSON[k]?.title || '');
    });
    setEditing(map);
  }, [prompts]);

  const handleChange = (key, value) => {
    setEditing((s) => ({ ...s, [key]: value }));
  };

  const save = async (key) => {
    try {
      const found = prompts.find(p => p.prompt_type === key);
      if (found) {
        await onUpdatePrompt(found.id, { prompt_text: editing[key] });
        alert('Prompt saved');
      } else {
        // prompts not initialized in DB
        if (typeof initializePrompts === 'function') {
          await initializePrompts();
          alert('Prompts initialized in DB. Please edit again if you want to change the text.');
        } else {
          alert('No prompt entry found in DB. Run Initialize Data to create default prompts.');
        }
      }
    } catch (err) {
      console.error('Failed to save prompt', err);
      alert('Failed to save prompt. See console for details.');
    }
  };

  const exportPrompts = () => {
    try {
      const exportData = prompts.map(p => ({
        prompt_type: p.prompt_type,
        prompt_text: p.prompt_text,
        model: p.model,
      }));
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mailfortress-prompts-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed', err);
      alert('Failed to export prompts');
    }
  };

  const handleImport = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      
      if (!Array.isArray(imported)) {
        alert('Invalid format: expected array of prompts');
        return;
      }

      // Update editing state
      const newEditing = { ...editing };
      imported.forEach(p => {
        if (p.prompt_type && coreKeys.includes(p.prompt_type)) {
          newEditing[p.prompt_type] = p.prompt_text || '';
        }
      });
      setEditing(newEditing);
      
      // Optionally auto-save
      for (const p of imported) {
        const found = prompts.find(pr => pr.prompt_type === p.prompt_type);
        if (found && p.prompt_text) {
          await onUpdatePrompt(found.id, { prompt_text: p.prompt_text });
        }
      }
      
      alert('Prompts imported successfully');
    } catch (err) {
      console.error('Import failed', err);
      alert('Failed to import prompts. Check console for details.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end space-x-2 mb-4">
        <button 
          onClick={exportPrompts} 
          className="px-3 py-1 btn-ghost text-sm"
          disabled={!prompts.length}>
          📤 Export Prompts
        </button>
        <label className="px-3 py-1 btn-ghost text-sm cursor-pointer">
          📥 Import Prompts
          <input 
            type="file" 
            accept="application/json" 
            className="hidden" 
            ref={fileInputRef}
            onChange={(e) => handleImport(e.target.files?.[0])} 
          />
        </label>
      </div>

      {coreKeys.map((k) => (
        <div key={k} className="p-3 border rounded-md bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="font-medium">{DEFAULT_PROMPTS_JSON[k]?.title || k}</div>
            <div className="text-sm text-gray-500">core</div>
          </div>

          <textarea
            className="w-full mt-2 p-2 border rounded resize-y"
            rows={4}
            value={editing[k] ?? ''}
            onChange={(e) => handleChange(k, e.target.value)}
          />

          <div className="mt-2 flex justify-end">
            <button
              onClick={() => save(k)}
              className="px-3 py-1 btn-primary text-sm"
            >
              Save Prompt
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
