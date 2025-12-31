import React, { useState } from 'react';

// Agent Modal
const AgentModal = ({ onClose, onSubmit, agent = null, isEdit = false, teams = [], centers = [] }) => {
  const [formData, setFormData] = useState({
    name: agent?.name || '', 
    password: agent?.password || '123', 
    // [FIX] Default to the first item in the dynamic list if no agent exists
    team: agent?.team || (teams.length > 0 ? teams[0] : ''),
    center: agent?.center || (centers.length > 0 ? centers[0] : ''), 
    baseSalary: agent?.baseSalary || 40000,
    cnic: agent?.cnic || '', 
    activeDate: agent?.activeDate || new Date().toISOString().split('T')[0], 
    leftDate: agent?.leftDate || null,
    status: agent?.status || 'Active'
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold text-slate-800 mb-4">
          {isEdit ? 'Edit Agent' : 'Add New Agent'}
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Agent Name</label>
            <input 
              type="text" 
              placeholder="Enter name" 
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900" 
              value={formData.name} 
              onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Password</label>
            <input 
              type="text" 
              placeholder="Default: 123" 
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900" 
              value={formData.password} 
              onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">CNIC</label>
            <input 
              type="text" 
              placeholder="Required" 
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900" 
              value={formData.cnic} 
              onChange={(e) => setFormData({ ...formData, cnic: e.target.value })} 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Team</label>
              <select 
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900" 
                value={formData.team} 
                onChange={(e) => setFormData({ ...formData, team: e.target.value })}
              >
                {teams.length > 0 ? (
                  teams.map(t => <option key={t} value={t}>{t}</option>)
                ) : (
                  <option value="">No Teams Found</option>
                )}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Center</label>
              <select 
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900" 
                value={formData.center} 
                onChange={(e) => setFormData({ ...formData, center: e.target.value })}
              >
                {centers.length > 0 ? (
                  centers.map(c => <option key={c} value={c}>{c}</option>)
                ) : (
                  <option value="">No Centers Found</option>
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Base Salary</label>
            <input 
              type="number" 
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900" 
              value={formData.baseSalary} 
              onChange={(e) => setFormData({ ...formData, baseSalary: parseInt(e.target.value) || 0 })} 
            />
          </div>

          {isEdit && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Active Date</label>
                <input 
                  type="date" 
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900" 
                  value={formData.activeDate} 
                  onChange={(e) => setFormData({ ...formData, activeDate: e.target.value })} 
                />
              </div>
              {formData.status === 'Left' && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Left Date</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900" 
                    value={formData.leftDate || ''} 
                    onChange={(e) => setFormData({ ...formData, leftDate: e.target.value })} 
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button 
            onClick={() => onSubmit(formData)} 
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            {isEdit ? 'Update Agent' : 'Add Agent'}
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

export default AgentModal;