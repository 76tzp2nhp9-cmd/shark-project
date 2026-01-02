import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react'; 

const AgentModal = ({ 
  onClose, 
  onSubmit, 
  agent = null, 
  isEdit = false, 
  teams = [], 
  centers = [] 
}) => {
  
  // Initialize state with all your NEW fields
  const [formData, setFormData] = useState({
    name: '',
    fatherName: '',       
    password: '123',      
    cnic: '',
    team: teams[0] || '',
    center: centers[0] || '',
    baseSalary: 40000,
    activeDate: new Date().toISOString().split('T')[0],
    leftDate: null,
    status: 'Active',
    bankName: '',         
    accountNumber: ''     
  });

  // Load agent data if in "Edit Mode"
  useEffect(() => {
    if (agent && isEdit) {
      setFormData({
        name: agent.name || '',
        fatherName: agent.father_name || agent.fatherName || '', 
        password: agent.password || '123',
        cnic: agent.cnic || '',
        team: agent.team || (teams.length > 0 ? teams[0] : ''),
        center: agent.center || (centers.length > 0 ? centers[0] : ''),
        baseSalary: agent.baseSalary || 40000,
        activeDate: agent.activeDate || agent.joining_date || new Date().toISOString().split('T')[0],
        leftDate: agent.leftDate || null,
        status: agent.status || 'Active',
        bankName: agent.bank_name || agent.bankName || '',
        accountNumber: agent.account_number || agent.accountNumber || ''
      });
    }
  }, [agent, isEdit, teams, centers]);

  // [FIX] Removed "if (!isOpen) return null;" 
  // This ensures the modal renders immediately when called by the parent.

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-2xl border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-700">
          <h3 className="text-xl font-bold text-white">
            {isEdit ? 'Edit Agent Details' : 'Add New Agent'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" /> 
          </button>
        </div>
        
        {/* Form Body */}
        <div className="p-6 space-y-5">
          
          {/* Row 1: Name & Father Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Agent Name</label>
              <input 
                type="text" 
                placeholder="Full Name" 
                className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white outline-none focus:ring-2 focus:ring-blue-500" 
                value={formData.name} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Father Name</label>
              <input 
                type="text" 
                placeholder="Father's Name" 
                className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white outline-none focus:ring-2 focus:ring-blue-500" 
                value={formData.fatherName} 
                onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })} 
              />
            </div>
          </div>

          {/* Row 2: CNIC & Password */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">CNIC</label>
              <input 
                type="text" 
                placeholder="Identity Number" 
                className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white outline-none focus:ring-2 focus:ring-blue-500" 
                value={formData.cnic} 
                onChange={(e) => setFormData({ ...formData, cnic: e.target.value })} 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
              <input 
                type="text" 
                placeholder="Default: 123" 
                className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white outline-none focus:ring-2 focus:ring-blue-500" 
                value={formData.password} 
                onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
              />
            </div>
          </div>

          {/* Row 3: Team & Center */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Team</label>
              <select 
                className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white outline-none focus:ring-2 focus:ring-blue-500" 
                value={formData.team} 
                onChange={(e) => setFormData({ ...formData, team: e.target.value })}
              >
                {teams.length > 0 ? teams.map(t => <option key={t} value={t}>{t}</option>) : <option value="">No Teams</option>}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Center</label>
              <select 
                className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white outline-none focus:ring-2 focus:ring-blue-500" 
                value={formData.center} 
                onChange={(e) => setFormData({ ...formData, center: e.target.value })}
              >
                {centers.length > 0 ? centers.map(c => <option key={c} value={c}>{c}</option>) : <option value="">No Centers</option>}
              </select>
            </div>
          </div>

          {/* Row 4: Base Salary & Joining Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Base Salary</label>
              <input 
                type="number" 
                className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white outline-none focus:ring-2 focus:ring-blue-500" 
                value={formData.baseSalary} 
                onChange={(e) => setFormData({ ...formData, baseSalary: parseInt(e.target.value) || 0 })} 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Joining Date</label>
              <input 
                type="date" 
                className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white outline-none focus:ring-2 focus:ring-blue-500" 
                value={formData.activeDate} 
                onChange={(e) => setFormData({ ...formData, activeDate: e.target.value })} 
              />
            </div>
          </div>

          {/* Row 5: Bank Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Bank Name</label>
              <input 
                type="text" 
                placeholder="e.g. Meezan Bank"
                className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white outline-none focus:ring-2 focus:ring-blue-500" 
                value={formData.bankName} 
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })} 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Account Number</label>
              <input 
                type="text" 
                placeholder="Account / IBAN"
                className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white outline-none focus:ring-2 focus:ring-blue-500" 
                value={formData.accountNumber} 
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })} 
              />
            </div>
          </div>

          {/* Left Date (Only in Edit Mode) */}
          {isEdit && formData.status === 'Left' && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Left Date</label>
              <input 
                type="date" 
                className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white outline-none focus:ring-2 focus:ring-blue-500" 
                value={formData.leftDate || ''} 
                onChange={(e) => setFormData({ ...formData, leftDate: e.target.value })} 
              />
            </div>
          )}

        </div>

        {/* Footer Buttons */}
        <div className="flex gap-3 p-6 border-t border-slate-700">
          <button 
            onClick={() => onSubmit(formData)} 
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            {isEdit ? 'Update Agent' : 'Add Agent'}
          </button>
          <button 
            onClick={onClose} 
            className="px-4 py-2 border border-slate-600 rounded-lg hover:bg-slate-700 text-slate-300 font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentModal;