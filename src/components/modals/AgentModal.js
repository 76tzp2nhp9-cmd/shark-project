import React, { useState } from 'react';

// Agent Modal
const AgentModal = ({ onClose, onSubmit, agent = null, isEdit = false }) => {
  const [formData, setFormData] = useState({
    name: agent?.name || '', 
    password: agent?.password || '123', 
    team: agent?.team || 'Team A',
    // [FIX] Changed from shift to center (Default: Phase 7)
    center: agent?.center || 'Phase 7', 
    baseSalary: agent?.baseSalary || 40000,
    cnic: agent?.cnic || '', 
    activeDate: agent?.activeDate || new Date().toISOString().split('T')[0], 
    leftDate: agent?.leftDate || null,
    status: agent?.status || 'Active'
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold text-slate-800 mb-4">{isEdit ? 'Edit Agent' : 'Add New Agent'}</h3>
        <div className="space-y-4">
          <input type="text" placeholder="Agent Name" className="w-full px-4 py-2 border border-slate-300 rounded-lg" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          <input type="text" placeholder="Password (default: 123)" className="w-full px-4 py-2 border border-slate-300 rounded-lg" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
          
          <input type="text" placeholder="CNIC (Required)" className="w-full px-4 py-2 border border-slate-300 rounded-lg" value={formData.cnic} onChange={(e) => setFormData({ ...formData, cnic: e.target.value })} />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Team</label>
              <select className="w-full px-4 py-2 border border-slate-300 rounded-lg" value={formData.team} onChange={(e) => setFormData({ ...formData, team: e.target.value })}>
                <option>Team A</option><option>Team B</option><option>Team C</option>
              </select>
            </div>
            
            {/* [FIX] Center Dropdown */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Center</label>
              <select className="w-full px-4 py-2 border border-slate-300 rounded-lg" value={formData.center} onChange={(e) => setFormData({ ...formData, center: e.target.value })}>
                <option>Phase 4 - HomeWarranty</option>
                <option>Phase 4 - 5th Floor</option>
                <option>Phase 7</option>
              </select>
            </div>
          </div>

          <input type="number" placeholder="Base Salary" className="w-full px-4 py-2 border border-slate-300 rounded-lg" value={formData.baseSalary} onChange={(e) => setFormData({ ...formData, baseSalary: parseInt(e.target.value) })} />
          {isEdit && (
            <>
              <div><label className="block text-sm font-medium text-slate-700 mb-2">Active Date</label><input type="date" className="w-full px-4 py-2 border border-slate-300 rounded-lg" value={formData.activeDate} onChange={(e) => setFormData({ ...formData, activeDate: e.target.value })} /></div>
              {formData.status === 'Left' && (
                <div><label className="block text-sm font-medium text-slate-700 mb-2">Left Date</label><input type="date" className="w-full px-4 py-2 border border-slate-300 rounded-lg" value={formData.leftDate || ''} onChange={(e) => setFormData({ ...formData, leftDate: e.target.value })} /></div>
              )}
            </>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => onSubmit(formData)} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{isEdit ? 'Update Agent' : 'Add Agent'}</button>
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700 font-medium">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default AgentModal;