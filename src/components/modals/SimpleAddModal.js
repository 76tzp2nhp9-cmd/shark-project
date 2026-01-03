import React, { useState } from 'react';
import { X } from 'lucide-react';

const SimpleAddModal = ({ title, onClose, onSubmit, placeholder }) => {
  const [inputValue, setInputValue] = useState('');

  // Handle Enter key press for better UX
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      onSubmit(inputValue);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-slate-800/30">
          <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-slate-700 rounded-md text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <input 
            type="text" 
            placeholder={placeholder}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 bg-slate-800/20 border-t border-slate-800">
          <button 
            onClick={onClose} 
            className="flex-1 px-4 py-2.5 border border-slate-700 text-slate-400 rounded-xl font-bold hover:bg-slate-800 hover:text-white transition-all text-sm"
          >
            Cancel
          </button>
          <button 
            onClick={() => onSubmit(inputValue)} 
            disabled={!inputValue.trim()}
            className="flex-[2] px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20 transition-all text-sm"
          >
            Add Item
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimpleAddModal;