import React, { useState } from 'react';
import { Briefcase } from 'lucide-react'; // <--- ADD THIS LINE

// [NEW] HR Employee Modal
const HREmployeeModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    agent_name: '', designation: 'Agent', email: '', phone: '', cnic: '', address: '',
    joining_date: new Date().toISOString().split('T')[0], bank_name: '', account_number: '', emergency_contact: ''
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-[500px] max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2"><Briefcase className="w-5 h-5"/> New Employment Record</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="text-xs font-bold text-gray-600">Name</label><input className="w-full border p-2 rounded" value={formData.agent_name} onChange={e=>setFormData({...formData, agent_name:e.target.value})} /></div>
          <div><label className="text-xs font-bold text-gray-600">Designation</label><input className="w-full border p-2 rounded" value={formData.designation} onChange={e=>setFormData({...formData, designation:e.target.value})} /></div>
          <div><label className="text-xs font-bold text-gray-600">Joining Date</label><input type="date" className="w-full border p-2 rounded" value={formData.joining_date} onChange={e=>setFormData({...formData, joining_date:e.target.value})} /></div>
          <div><label className="text-xs font-bold text-gray-600">Phone</label><input className="w-full border p-2 rounded" value={formData.phone} onChange={e=>setFormData({...formData, phone:e.target.value})} /></div>
          <div><label className="text-xs font-bold text-gray-600">CNIC</label><input className="w-full border p-2 rounded" value={formData.cnic} onChange={e=>setFormData({...formData, cnic:e.target.value})} /></div>
          <div className="col-span-2"><label className="text-xs font-bold text-gray-600">Address</label><input className="w-full border p-2 rounded" value={formData.address} onChange={e=>setFormData({...formData, address:e.target.value})} /></div>
          <div><label className="text-xs font-bold text-gray-600">Bank Name</label><input className="w-full border p-2 rounded" value={formData.bank_name} onChange={e=>setFormData({...formData, bank_name:e.target.value})} /></div>
          <div><label className="text-xs font-bold text-gray-600">Account No</label><input className="w-full border p-2 rounded" value={formData.account_number} onChange={e=>setFormData({...formData, account_number:e.target.value})} /></div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => onSubmit(formData)} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Record</button>
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700 font-medium">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default HREmployeeModal;
//