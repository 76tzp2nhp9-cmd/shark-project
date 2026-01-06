import React, { useState, useEffect } from 'react';
import { Briefcase } from 'lucide-react';

const HREmployeeModal = ({ onClose, onSubmit, employee = null, isEdit = false }) => {
  const [formData, setFormData] = useState({
    agent_name: '', 
    father_name: '', // Make sure this exists in state!
    designation: 'Agent', 
    cnic: '', 
    contact_number: '', 
    joining_date: new Date().toISOString().split('T')[0],
    bank_name: '', 
    account_number: '', 
    status: 'Active'
  });

  useEffect(() => {
    if (isEdit && employee) {
      setFormData({
        agent_name: employee.agent_name,
        father_name: employee.father_name || '',
        designation: employee.designation,
        cnic: employee.cnic,
        contact_number: employee.contact_number || '', 
        joining_date: employee.joining_date,
        bank_name: employee.bank_name || '',
        account_number: employee.account_number || '',
        status: employee.status || 'Active'
      });
    }
  }, [isEdit, employee]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 w-[500px] max-h-[90vh] overflow-y-auto">
        
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-blue-500"/> 
          {isEdit ? 'Edit Record' : 'New Employment Record'}
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          
          <div className="col-span-2">
            <label className="text-xs font-bold text-slate-400 mb-1 block">Name</label>
            <input 
              className="w-full bg-slate-800 border border-slate-600 text-white p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
              value={formData.agent_name} 
              onChange={e=>setFormData({...formData, agent_name:e.target.value})} 
            />
          </div>

          {/* [MOVED] Contact Number here */}
          <div>
            <label className="text-xs font-bold text-slate-400 mb-1 block">Contact No</label>
            <input 
              className="w-full bg-slate-800 border border-slate-600 text-white p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
              placeholder="0300-1234567"
              value={formData.contact_number} 
              onChange={e=>setFormData({...formData, contact_number:e.target.value})} 
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 mb-1 block">Father Name</label>
            <input 
              className="w-full bg-slate-800 border border-slate-600 text-white p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
              value={formData.father_name} 
              onChange={e=>setFormData({...formData, father_name:e.target.value})} 
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 mb-1 block">Designation</label>
            <input 
              className="w-full bg-slate-800 border border-slate-600 text-white p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
              value={formData.designation} 
              onChange={e=>setFormData({...formData, designation:e.target.value})} 
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 mb-1 block">CNIC</label>
            <input 
              className="w-full bg-slate-800 border border-slate-600 text-white p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
              value={formData.cnic} 
              onChange={e=>setFormData({...formData, cnic:e.target.value})} 
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 mb-1 block">Joining Date</label>
            <input 
              type="date" 
              className="w-full bg-slate-800 border border-slate-600 text-white p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
              value={formData.joining_date} 
              onChange={e=>setFormData({...formData, joining_date:e.target.value})} 
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 mb-1 block">Bank Name</label>
            <input 
              className="w-full bg-slate-800 border border-slate-600 text-white p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
              value={formData.bank_name} 
              onChange={e=>setFormData({...formData, bank_name:e.target.value})} 
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 mb-1 block">Account No</label>
            <input 
              className="w-full bg-slate-800 border border-slate-600 text-white p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
              value={formData.account_number} 
              onChange={e=>setFormData({...formData, account_number:e.target.value})} 
            />
          </div>

        </div>

        <div className="flex gap-3 mt-8">
          <button 
            onClick={() => onSubmit(formData)} 
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {isEdit ? 'Update Record' : 'Save Record'}
          </button>
          <button 
            onClick={onClose} 
            className="px-4 py-2 border border-slate-600 rounded-lg hover:bg-slate-800 text-slate-300 font-medium transition-colors"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
};

export default HREmployeeModal;