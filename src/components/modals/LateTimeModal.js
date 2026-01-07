import React, { useState } from 'react';
import { X, Clock, Save } from 'lucide-react';

const LateTimeModal = ({ currentLateTime, onClose, onSubmit }) => {
  // 1. Use local state to hold the value while editing
  const [tempTime, setTempTime] = useState(currentLateTime);

  const handleSave = () => {
    // 2. Only submit the value when the Save button is clicked
    onSubmit(tempTime);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-sm overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-400" /> Set Late Threshold
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
            <p className="text-xs text-purple-200">
              Any login after this time will be marked as 
              <span className="font-bold text-yellow-400 mx-1">Late (Yellow)</span> 
              or 
              <span className="font-bold text-red-400 mx-1">Late (Red)</span>.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Late Time (HH:MM AM/PM)</label>
            <input 
              type="time" 
              value={tempTime} // Controlled input using local state
              onChange={(e) => setTempTime(e.target.value)} // Only updates local variable, doesn't close modal
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white text-lg font-mono focus:ring-2 focus:ring-purple-500 outline-none [color-scheme:dark]"
            />
          </div>

          {/* Buttons */}
          <div className="pt-2 flex gap-3">
            <button 
              onClick={onClose} 
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors"
            >
              Close
            </button>
            <button 
              onClick={handleSave} // Triggers the save action
              className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-purple-900/20 transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" /> Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LateTimeModal;