import React, { useState, useEffect } from 'react';
import { X, Trash2, Plus } from 'lucide-react';

const GoalSettingModal = ({ isOpen, onClose, onSave, currentRules }) => {
  const [localRules, setLocalRules] = useState([]);

  // Load rules when modal opens
  useEffect(() => {
    if (isOpen) {
      // Deep copy to detach from parent state completely
      setLocalRules(JSON.parse(JSON.stringify(currentRules)));
    }
  }, [isOpen, currentRules]);

  if (!isOpen) return null;

  const handleUpdate = (index, field, value) => {
    const newRules = [...localRules];
    // Allow empty string while typing, otherwise parse as integer
    newRules[index][field] = value === '' ? '' : parseInt(value);
    setLocalRules(newRules);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
          <div>
            <h3 className="text-xl font-bold text-white">Goal Settings</h3>
            <p className="text-slate-400 text-sm">Define automated goals based on salary ranges.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-12 gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            <div className="col-span-4">Min Salary</div>
            <div className="col-span-4">Max Salary</div>
            <div className="col-span-3 text-center">Goal</div>
          </div>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {localRules.map((rule, index) => (
              <div key={rule.id} className="grid grid-cols-12 gap-2 items-center">
                {/* Min Input */}
                <div className="col-span-4 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">PKR</span>
                  <input
                    type="number"
                    value={rule.min}
                    onChange={(e) => handleUpdate(index, 'min', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* Max Input */}
                <div className="col-span-4 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">PKR</span>
                  <input
                    type="number"
                    value={rule.max}
                    onChange={(e) => handleUpdate(index, 'max', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* Goal Input */}
                <div className="col-span-3">
                  <input
                    type="number"
                    value={rule.goal}
                    onChange={(e) => handleUpdate(index, 'goal', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-center text-blue-400 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* Delete Button */}
                <div className="col-span-1 flex justify-center">
                  <button 
                    onClick={() => setLocalRules(localRules.filter((_, i) => i !== index))}
                    className="text-slate-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Rule Button */}
          <button 
            onClick={() => setLocalRules([...localRules, { id: Date.now(), min: 0, max: 0, goal: 0 }])}
            className="w-full py-2 mt-2 border border-dashed border-slate-600 rounded-lg text-slate-400 text-sm hover:bg-slate-800 hover:text-white transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add New Range
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => onSave(localRules)} 
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-900/20"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoalSettingModal;