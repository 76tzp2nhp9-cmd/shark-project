import React, { useState } from 'react';
import { Clock } from 'lucide-react'; // <--- ADD THIS LINE

// [NEW] Late Time Modal
const LateTimeModal = ({ currentLateTime, onClose, onSubmit }) => {
  const [time, setTime] = useState(currentLateTime);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
        <h3 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600"/> Set Late Threshold
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          Agents logging in after this time will be marked as <b>Late</b>.
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Late Time</label>
            <input 
              type="time" 
              value={time} 
              onChange={(e) => setTime(e.target.value)} 
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-lg" 
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button 
            onClick={() => onSubmit(time)} 
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Save Setting
          </button>
          <button 
            onClick={onClose} 
            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700 font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default LateTimeModal;