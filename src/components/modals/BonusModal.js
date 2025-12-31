import React, { useState } from 'react';

// Bonus Modal
const BonusModal = ({ agents, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({ agentName: agents[0]?.name || '', period: 'Week 1', type: 'Weekly', amount: 2000, targetSales: 5, actualSales: 6 });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h3 className="text-xl font-semibold text-slate-800 mb-4">Add Bonus</h3>
        <div className="space-y-4">
          <select className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.agentName} onChange={(e) => setFormData({ ...formData, agentName: e.target.value })}>
            {agents.map(a => <option key={a.id}>{a.name}</option>)}
          </select>
          <select className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
            <option>Weekly</option><option>Monthly</option>
          </select>
          <input type="text" placeholder="Period" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.period} onChange={(e) => setFormData({ ...formData, period: e.target.value })} />
          <input type="number" placeholder="Target Sales" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.targetSales} onChange={(e) => setFormData({ ...formData, targetSales: parseInt(e.target.value) })} />
          <input type="number" placeholder="Actual Sales" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.actualSales} onChange={(e) => setFormData({ ...formData, actualSales: parseInt(e.target.value) })} />
          <input type="number" placeholder="Bonus Amount" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) })} />
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => onSubmit(formData)} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Add Bonus</button>
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700 font-medium">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default BonusModal;