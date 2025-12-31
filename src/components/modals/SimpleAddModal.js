import React, { useState } from 'react';

const SimpleAddModal = ({ title, onClose, onSubmit, placeholder }) => {
  const [inputValue, setInputValue] = useState('');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
        <h3 className="text-xl font-semibold text-slate-800 mb-4">{title}</h3>
        <input 
          type="text" 
          placeholder={placeholder}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg mb-4 text-slate-900"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          autoFocus
        />
        <div className="flex gap-3">
          <button 
            onClick={() => onSubmit(inputValue)} 
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Add Item
          </button>
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default SimpleAddModal;