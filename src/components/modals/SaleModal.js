import React, { useState } from 'react';

// Sale Modal
const SaleModal = ({ agents, currentUser, userRole, onClose, onSubmit, sale = null, isEdit = false }) => {
  const [formData, setFormData] = useState({
    agentName: sale?.agentName || (userRole === 'Agent' ? currentUser?.name : agents[0]?.name || ''),
    customerName: sale?.customerName || '', phoneNumber: sale?.phoneNumber || '', state: sale?.state || '', zip: sale?.zip || '', address: sale?.address || '',
    campaignType: sale?.campaignType || 'Campaign A', center: sale?.center || '', teamLead: sale?.teamLead || '', comments: sale?.comments || '',
    listId: sale?.listId || '', amount: sale?.amount || 0, disposition: sale?.disposition || 'HW- Xfer', duration: sale?.duration || '',
    xferTime: sale?.xferTime || '', xferAttempts: sale?.xferAttempts || '', feedbackBeforeXfer: sale?.feedbackBeforeXfer || '',
    feedbackAfterXfer: sale?.feedbackAfterXfer || '', grading: sale?.grading || '', dockDetails: sale?.dockDetails || '', evaluator: sale?.evaluator || ''
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md max-h-[90vh] flex flex-col">
        <h3 className="text-xl font-semibold text-slate-800 mb-4">{isEdit ? 'Edit Sale' : 'Submit New Sale'}</h3>
        <div className="space-y-4 overflow-y-auto flex-1">
          <select className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400" value={formData.agentName} onChange={(e) => setFormData({ ...formData, agentName: e.target.value })} disabled={userRole === 'Agent'}>
            {userRole === 'Agent' ? <option>{currentUser?.name}</option> : agents.map(a => <option key={a.id}>{a.name}</option>)}
          </select>
          <input type="text" placeholder="Customer Name" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.customerName} onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} />
          <input type="text" placeholder="Phone Number" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} />
          <input type="text" placeholder="State" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
          <input type="text" placeholder="Zip" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.zip} onChange={(e) => setFormData({ ...formData, zip: e.target.value })} />
          <input type="text" placeholder="Address" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
          <select className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.campaignType} onChange={(e) => setFormData({ ...formData, campaignType: e.target.value })}>
            <option>Campaign A</option><option>Campaign B</option><option>Campaign C</option>
          </select>
          <input type="text" placeholder="Center" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.center} onChange={(e) => setFormData({ ...formData, center: e.target.value })} />
          <input type="text" placeholder="Team Lead" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.teamLead} onChange={(e) => setFormData({ ...formData, teamLead: e.target.value })} />
          <textarea placeholder="Comments" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.comments} onChange={(e) => setFormData({ ...formData, comments: e.target.value })} rows={3} />
          <input type="text" placeholder="List ID" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.listId} onChange={(e) => setFormData({ ...formData, listId: e.target.value })} />
          {isEdit && (
            <>
              <input type="text" placeholder="Disposition" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.disposition} onChange={(e) => setFormData({ ...formData, disposition: e.target.value })} />
              <input type="text" placeholder="Duration" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} />
              <input type="text" placeholder="Xfer Time" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.xferTime} onChange={(e) => setFormData({ ...formData, xferTime: e.target.value })} />
              <input type="text" placeholder="Xfer Attempts" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.xferAttempts} onChange={(e) => setFormData({ ...formData, xferAttempts: e.target.value })} />
              <textarea placeholder="Feedback (Before Xfer)" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.feedbackBeforeXfer} onChange={(e) => setFormData({ ...formData, feedbackBeforeXfer: e.target.value })} rows={2} />
              <textarea placeholder="Feedback (After Xfer)" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.feedbackAfterXfer} onChange={(e) => setFormData({ ...formData, feedbackAfterXfer: e.target.value })} rows={2} />
              <input type="text" placeholder="Grading" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.grading} onChange={(e) => setFormData({ ...formData, grading: e.target.value })} />
              <input type="text" placeholder="Dock Details" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.dockDetails} onChange={(e) => setFormData({ ...formData, dockDetails: e.target.value })} />
              <input type="text" placeholder="Evaluator" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.evaluator} onChange={(e) => setFormData({ ...formData, evaluator: e.target.value })} />
              <input type="number" placeholder="Amount" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) })} />
            </>
          )}
          <select className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.disposition} onChange={(e) => setFormData({ ...formData, disposition: e.target.value })}>
            <option>HW- Xfer</option><option>HW-IBXfer</option><option>Unsuccessful</option><option>HUWT</option><option>DNC</option><option>DNQ</option><option>DNQ-Dup</option><option>HW-Xfer-CDR</option><option>DNQ-Webform</option><option>Review Pending</option>
          </select>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => onSubmit(formData)} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{isEdit ? 'Update Sale' : 'Submit Sale'}</button>
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700 font-medium">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default SaleModal;