import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';

const FineModal = ({ agents, onClose, onSubmit, fine, isEdit }) => {
  const [formData, setFormData] = useState({
    agentName: '',
    reason: '',
    amount: '',
    date: new Date().toISOString().split('T')[0] // Default to today
  });

  // Load data if editing
  useEffect(() => {
    if (isEdit && fine) {
      setFormData(fine);
    }
  }, [isEdit, fine]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {/* Modal Container */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl overflow-hidden transform transition-all">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            {isEdit ? 'Edit Fine Details' : 'Issue New Fine'}
          </h2>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-700 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* 1. Select Agent */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Select Agent</label>
            <div className="relative">
              <select
                name="agentName"
                value={formData.agentName}
                onChange={handleChange}
                required
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none appearance-none"
              >
                <option value="">-- Choose Agent --</option>
                {agents
                  .filter(a => a.status === 'Active')
                  .map((agent) => (
                  <option key={agent.id || agent.cnic} value={agent.name}>
                    {agent.name}
                  </option>
                ))}
              </select>
              {/* Custom Arrow for Select */}
              <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
              </div>
            </div>
          </div>

          {/* 2. Reason */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Reason for Fine</label>
            <input
              type="text"
              name="reason"
              placeholder="e.g. Late Arrival, Misconduct..."
              value={formData.reason}
              onChange={handleChange}
              required
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white text-sm focus:ring-2 focus:ring-red-500 outline-none placeholder-slate-500 transition-all"
            />
          </div>

          {/* 3. Amount */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount (PKR)</label>
            <div className="relative">
              <span className="absolute left-4 top-2.5 text-slate-500 text-sm font-bold">Rs.</span>
              <input
                type="number"
                name="amount"
                placeholder="500"
                value={formData.amount}
                onChange={handleChange}
                required
                min="1"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-12 pr-4 py-2.5 text-white text-sm font-mono focus:ring-2 focus:ring-red-500 outline-none placeholder-slate-500 transition-all"
              />
            </div>
          </div>

          {/* 4. Date (Optional but recommended) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white text-sm focus:ring-2 focus:ring-red-500 outline-none [color-scheme:dark]"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex gap-3 pt-4 border-t border-slate-800 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors border border-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-red-900/20 transition-all transform active:scale-95"
            >
              {isEdit ? 'Update Fine' : 'Apply Fine'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default FineModal;