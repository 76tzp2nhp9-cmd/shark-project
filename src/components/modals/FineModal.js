import React, { useState, useEffect } from 'react';

const FineModal = ({ agents, onClose, onSubmit, fine = null, isEdit = false }) => {
  const [formData, setFormData] = useState({ 
    agentName: agents[0]?.name || '', 
    reason: '', 
    amount: 500 
  });

  // [FIX] Sync internal state with the existing record when editing
  useEffect(() => {
    if (isEdit && fine) {
      setFormData({
        agentName: fine.agentName,
        reason: fine.reason,
        amount: fine.amount
      });
    }
  }, [isEdit, fine]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h3 className="text-xl font-semibold text-slate-800 mb-4">{isEdit ? 'Edit Fine' : 'Add Fine'}</h3>
        <div className="space-y-4">
          <select className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.agentName} onChange={(e) => setFormData({ ...formData, agentName: e.target.value })}>
            {agents.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
          </select>
          <input type="text" placeholder="Reason" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} />
          <input type="number" placeholder="Amount" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) })} />
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => onSubmit(formData)} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">{isEdit ? 'Update' : 'Add'} Fine</button>
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700 font-medium">Cancel</button>
        </div>
      </div>
    </div>
  );
};
export default FineModal;