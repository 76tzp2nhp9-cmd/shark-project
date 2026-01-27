import React, { useState, useEffect } from 'react';
import { X, AlertCircle, User, Calendar, FileText, DollarSign } from 'lucide-react';

const FineModal = ({ agents, onClose, onSubmit, fine, isEdit }) => {
  const [formData, setFormData] = useState({
    agentName: '',
    reason: '',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Load data if editing
  useEffect(() => {
    if (isEdit && fine) {
      setFormData({
        agentName: fine.agentName || '',
        reason: fine.reason || '',
        amount: fine.amount || '',
        date: fine.date || new Date().toISOString().split('T')[0]
      });
    }
  }, [isEdit, fine]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-700 bg-slate-800/60 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              {isEdit ? 'Edit Fine Details' : 'Issue New Fine'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">Apply a penalty record to an agent.</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          
          {/* SECTION 1: DETAILS */}
          <div className="space-y-4">
            
            {/* Agent Select */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <User className="w-3 h-3" /> Select Agent
              </label>
              <div className="relative">
                <select
                  name="agentName"
                  value={formData.agentName}
                  onChange={handleChange}
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none appearance-none transition-all cursor-pointer hover:bg-slate-700/50"
                >
                  <option value="">-- Choose Agent --</option>
                  {agents.filter(a => a.status === 'Active').map((agent) => (
                    <option key={agent.id || agent.cnic} value={agent.name}>{agent.name}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                </div>
              </div>
            </div>

            {/* Date Field */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <Calendar className="w-3 h-3" /> Date of Issue
              </label>
              <input 
                type="date" 
                name="date" 
                value={formData.date} 
                onChange={handleChange} 
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-3 text-white text-sm focus:ring-2 focus:ring-red-500 outline-none [color-scheme:dark]"
              />
            </div>

            {/* Reason Field */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <FileText className="w-3 h-3" /> Reason / Violation
              </label>
              <input 
                type="text" 
                name="reason" 
                placeholder="e.g. Late Arrival, Misconduct, Dock..." 
                value={formData.reason} 
                onChange={handleChange} 
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-3 text-white text-sm focus:ring-2 focus:ring-red-500 outline-none placeholder-slate-500"
              />
            </div>
          </div>

          {/* SECTION 2: AMOUNT BOX */}
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 space-y-4">
            
            {/* HERO: AMOUNT FIELD */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-wider">
                <DollarSign className="w-3 h-3" /> Fine Amount (PKR)
              </label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-red-500 font-bold text-lg">Rs.</span>
                <input
                  type="number"
                  name="amount"
                  placeholder="500"
                  value={formData.amount}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-600 group-hover:border-red-500/50 rounded-xl pl-12 pr-4 py-4 text-white text-xl font-bold font-mono focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all placeholder-slate-700"
                />
              </div>
              <p className="text-[10px] text-slate-500 pl-1">This amount will be deducted from the agent's payroll.</p>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-800 bg-slate-800/60 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-slate-300 bg-transparent hover:bg-slate-700/50 rounded-xl text-sm font-bold transition-all border border-slate-600 hover:border-slate-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-[2] px-4 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-900/30 transition-all transform active:scale-[0.98]"
          >
            {isEdit ? 'Update Fine' : 'Apply Fine'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default FineModal;