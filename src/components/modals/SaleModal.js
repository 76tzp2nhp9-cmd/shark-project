import React, { useState, useEffect } from 'react';

// Sale Modal
const SaleModal = ({ agents, currentUser, userRole, onClose, onSubmit, sale = null, isEdit = false }) => {
  const [formData, setFormData] = useState({
    agentName: sale?.agentName || (userRole === 'Agent' ? currentUser?.name : agents[0]?.name || ''),
    customerName: sale?.customerName || '', phoneNumber: sale?.phoneNumber || '', state: sale?.state || '', zip: sale?.zip || '', address: sale?.address || '',
    campaignType: sale?.campaignType || 'Campaign A', center: sale?.center || '', teamLead: sale?.teamLead || '', comments: sale?.comments || '',
    listId: sale?.listId || '', amount: sale?.amount || 0, disposition: sale?.disposition || 'Review Pending', duration: sale?.duration || '',
    xferTime: sale?.xferTime || '', xferAttempts: sale?.xferAttempts || '', feedbackBeforeXfer: sale?.feedbackBeforeXfer || '',
    feedbackAfterXfer: sale?.feedbackAfterXfer || '', grading: sale?.grading || '', dockDetails: sale?.dockDetails || '', evaluator: sale?.evaluator || ''
  });

  // [NEW] Add this useEffect block here
  useEffect(() => {
    if (formData.agentName) {
      // Look for the agent in the agents list
      const selectedAgent = agents.find(a => a.name === formData.agentName);
      
      if (selectedAgent) {
        setFormData(prev => ({
          ...prev,
          center: selectedAgent.center || '' // Auto-fills the center from the agent's profile
        }));
      }
    }
  }, [formData.agentName, agents]);


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md max-h-[90vh] flex flex-col">
        <h3 className="text-xl font-semibold text-slate-800 mb-4">{isEdit ? 'Edit Sale' : 'Submit New Sale'}</h3>
        <div className="space-y-4 overflow-y-auto flex-1">
          <select className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400" value={formData.agentName} onChange={(e) => setFormData({ ...formData, agentName: e.target.value })} disabled={userRole === 'Agent'}>
            {userRole === 'Agent' ? <option>{currentUser?.name}</option> : agents.map(a => <option key={a.id}>{a.name}</option>)}
          </select>
          <input type="text" placeholder="Customer Name" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.customerName} onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} />
          <input 
  type="text" 
  placeholder="Phone Number (Digits Only)" 
  className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white focus:ring-2 focus:ring-blue-500 outline-none" 
  value={formData.phoneNumber} 
  onChange={(e) => {
    // [FIX] Regular expression to remove any character that is NOT a number
    const val = e.target.value.replace(/\D/g, ''); 
    setFormData({ ...formData, phoneNumber: val });
  }}
  // Optional: limits the length to 11 digits
  maxLength={10}
  // Triggers numeric keypad on mobile devices
  inputMode="numeric" 
/>
          <div>
  <label className="block text-xs font-medium text-slate-400 mb-1"></label>
  <select 
    className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
    value={formData.state}
    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
    required
  >
    <option value="">Select State</option>
    <option value="AL">AL - Alabama</option>
    <option value="AK">AK - Alaska</option>
    <option value="AZ">AZ - Arizona</option>
    <option value="AR">AR - Arkansas</option>
    <option value="CA">CA - California</option>
    <option value="CO">CO - Colorado</option>
    <option value="CT">CT - Connecticut</option>
    <option value="DE">DE - Delaware</option>
    <option value="FL">FL - Florida</option>
    <option value="GA">GA - Georgia</option>
    <option value="HI">HI - Hawaii</option>
    <option value="ID">ID - Idaho</option>
    <option value="IL">IL - Illinois</option>
    <option value="IN">IN - Indiana</option>
    <option value="IA">IA - Iowa</option>
    <option value="KS">KS - Kansas</option>
    <option value="KY">KY - Kentucky</option>
    <option value="LA">LA - Louisiana</option>
    <option value="ME">ME - Maine</option>
    <option value="MD">MD - Maryland</option>
    <option value="MA">MA - Massachusetts</option>
    <option value="MI">MI - Michigan</option>
    <option value="MN">MN - Minnesota</option>
    <option value="MS">MS - Mississippi</option>
    <option value="MO">MO - Missouri</option>
    <option value="MT">MT - Montana</option>
    <option value="NE">NE - Nebraska</option>
    <option value="NV">NV - Nevada</option>
    <option value="NH">NH - New Hampshire</option>
    <option value="NJ">NJ - New Jersey</option>
    <option value="NM">NM - New Mexico</option>
    <option value="NY">NY - New York</option>
    <option value="NC">NC - North Carolina</option>
    <option value="ND">ND - North Dakota</option>
    <option value="OH">OH - Ohio</option>
    <option value="OK">OK - Oklahoma</option>
    <option value="OR">OR - Oregon</option>
    <option value="PA">PA - Pennsylvania</option>
    <option value="RI">RI - Rhode Island</option>
    <option value="SC">SC - South Carolina</option>
    <option value="SD">SD - South Dakota</option>
    <option value="TN">TN - Tennessee</option>
    <option value="TX">TX - Texas</option>
    <option value="UT">UT - Utah</option>
    <option value="VT">VT - Vermont</option>
    <option value="VA">VA - Virginia</option>
    <option value="WA">WA - Washington</option>
    <option value="WV">WV - West Virginia</option>
    <option value="WI">WI - Wisconsin</option>
    <option value="WY">WY - Wyoming</option>
  </select>
</div>
          <input type="text" placeholder="Zip" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.zip} onChange={(e) => setFormData({ ...formData, zip: e.target.value })} />
          <input type="text" placeholder="Address" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
          <select className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.campaignType} onChange={(e) => setFormData({ ...formData, campaignType: e.target.value })}>
            <option>Outbound</option><option>Inbound</option>
          </select>
          <div>
  <label className="block text-xs font-medium text-slate-500 mb-1"></label>
  <input
    type="text"
    className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-800 text-slate-400 cursor-not-allowed"
    value={formData.center}
    readOnly // Prevents typing
    placeholder="Auto-filled by Agent Name"
  />
  <p className="text-[10px] text-blue-500 mt-1"></p>
</div>
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
            <option>Review Pending</option>
            {isEdit && (
          <>
            <option value="All">All Dispositions</option>
      <optgroup label="Success">
        <option value="HW- Xfer">HW- Xfer</option>
        <option value="HW-IBXfer">HW-IBXfer</option>
        <option value="HW-Xfer-CDR">HW-Xfer-CDR</option>
      </optgroup>
      <optgroup label="Unsuccessful">
        <option value="Unsuccessful">Unsuccessful</option>
        <option value="HUWT">HUWT</option>
        <option value="DNC">DNC</option>
        <option value="DNQ">DNQ</option>
        <option value="DNQ-Dup">DNQ-Dup</option>
        <option value="DNQ-Webform">DNQ-Webform</option>
        <option value="Review Pending">Review Pending</option>
      </optgroup>
          </>
        )}
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