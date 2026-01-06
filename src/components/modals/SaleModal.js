import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react'; // Assuming you have lucide-react for the close icon

const SaleModal = ({ agents, currentUser, userRole, onClose, onSubmit, sale = null, isEdit = false }) => {
  const [formData, setFormData] = useState({
    agentName: sale?.agentName || (userRole === 'Agent' ? currentUser?.name : agents[0]?.name || ''),
    customerName: sale?.customerName || '', 
    phoneNumber: sale?.phoneNumber || '', 
    state: sale?.state || '', 
    zip: sale?.zip || '', 
    address: sale?.address || '',
    campaignType: sale?.campaignType || 'Outbound', 
    center: sale?.center || '', 
    teamLead: sale?.teamLead || '', 
    comments: sale?.comments || '',
    listId: sale?.listId || '', 
    disposition: sale?.disposition || 'Review Pending', 
    duration: sale?.duration || '',
    xferTime: sale?.xferTime || '', 
    xferAttempts: sale?.xferAttempts || '', 
    feedbackBeforeXfer: sale?.feedbackBeforeXfer || '',
    feedbackAfterXfer: sale?.feedbackAfterXfer || '', 
    grading: sale?.grading || '', 
    dockDetails: sale?.dockDetails || '', 
    evaluator: sale?.evaluator || ''
  });

  useEffect(() => {
    if (formData.agentName) {
      const selectedAgent = agents.find(a => a.name === formData.agentName);
      if (selectedAgent) {
        setFormData(prev => ({
          ...prev,
          center: selectedAgent.center || ''
        }));
      }
    }
  }, [formData.agentName, agents]);

  // Shared Tailwind classes for inputs to keep code clean
  const inputClass = "w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm";
  const labelClass = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1";

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-700 bg-slate-800/50">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span className={`w-2 h-6 rounded-full ${isEdit ? 'bg-orange-500' : 'bg-blue-500'}`}></span>
            {isEdit ? 'Update Sale Details' : 'Submit New Sale Entry'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Grid Layout */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Agent Info Section */}
            <div className="space-y-4">
              <h4 className="text-blue-400 text-xs font-black uppercase border-b border-slate-800 pb-1">Agent & Center</h4>
              <div>
                <label className={labelClass}>Agent Name</label>
                <select className={inputClass} value={formData.agentName} onChange={(e) => setFormData({ ...formData, agentName: e.target.value })} disabled={userRole === 'Agent'}>
                  {userRole === 'Agent' ? <option>{currentUser?.name}</option> : agents.map(a => <option key={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Center (Auto-filled)</label>
                <input type="text" className="w-full px-4 py-2 border border-slate-700 rounded-lg bg-slate-950 text-slate-500 cursor-not-allowed text-sm" value={formData.center} readOnly />
              </div>
            </div>

            {/* Customer Info Section */}
            <div className="space-y-4">
              <h4 className="text-blue-400 text-xs font-black uppercase border-b border-slate-800 pb-1">Customer Info</h4>
              <div>
                <label className={labelClass}>Customer Name</label>
                <input type="text" placeholder="Full Name" className={inputClass} value={formData.customerName} onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Phone Number</label>
                <input type="text" placeholder="Digits only" className={inputClass} value={formData.phoneNumber} inputMode="numeric" maxLength={10} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value.replace(/\D/g, '') })} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>State</label>
              <select className={inputClass} value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })}>
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
            <div>
              <label className={labelClass}>Zip Code</label>
              <input type="text" className={inputClass} value={formData.zip} onChange={(e) => setFormData({ ...formData, zip: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Campaign</label>
              <select className={inputClass} value={formData.campaignType} onChange={(e) => setFormData({ ...formData, campaignType: e.target.value })}>
                <option>Outbound</option><option>Inbound</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-blue-400 text-xs font-black uppercase border-b border-slate-800 pb-1">Address & Comments</h4>
            <div>
              <label className={labelClass}>Full Address</label>
              <input type="text" className={inputClass} value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className={labelClass}>Team Lead</label>
                  <input type="text" className={inputClass} value={formData.teamLead} onChange={(e) => setFormData({ ...formData, teamLead: e.target.value })} />
               </div>
               <div>
                  <label className={labelClass}>List ID</label>
                  <input type="text" className={inputClass} value={formData.listId} onChange={(e) => setFormData({ ...formData, listId: e.target.value })} />
               </div>
            </div>
            <div>
              <label className={labelClass}>Comments</label>
              <textarea className={`${inputClass} resize-none`} rows={2} value={formData.comments} onChange={(e) => setFormData({ ...formData, comments: e.target.value })} />
            </div>
          </div>

          {isEdit && (
            <div className="space-y-4 bg-slate-800/30 p-4 rounded-xl border border-slate-700">
              <h4 className="text-orange-400 text-xs font-black uppercase tracking-widest">QA Evaluation Fields</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                   <label className={labelClass}>Duration</label>
                   <input type="text" className={inputClass} value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} />
                </div>
                <div>
                   <label className={labelClass}>Xfer Time</label>
                   <input type="text" className={inputClass} value={formData.xferTime} onChange={(e) => setFormData({ ...formData, xferTime: e.target.value })} />
                </div>
                <div>
                   <label className={labelClass}>Attempts</label>
                   <input type="text" className={inputClass} value={formData.xferAttempts} onChange={(e) => setFormData({ ...formData, xferAttempts: e.target.value })} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Feedback (Before Xfer)</label>
                <textarea className={inputClass} rows={2} value={formData.feedbackBeforeXfer} onChange={(e) => setFormData({ ...formData, feedbackBeforeXfer: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className={labelClass}>Grading</label>
                   <select className={inputClass} value={formData.grading} onChange={(e) => setFormData({ ...formData, grading: e.target.value })}>
                      <option value="">-</option><option>Good</option><option>Bad</option><option>Worst</option>
                   </select>
                </div>
                

<div className="grid grid-cols-2 gap-4">
    <div>
        <label className={labelClass}>Fine Amount</label>
        <input 
            type="text" 
            inputMode="numeric" 
            placeholder="500" 
            className={inputClass} 
            value={formData.dockDetails} 
            // Strict number only for Amount
            onChange={(e) => setFormData({ ...formData, dockDetails: e.target.value.replace(/\D/g, '') })} 
        />
    </div>
    <div>
        <label className={labelClass}>Fine Reason</label>
        <input 
            type="text" 
            placeholder="e.g. Misbehavior / Late" 
            className={inputClass} 
            value={formData.dockReason || ''} 
            onChange={(e) => setFormData({ ...formData, dockReason: e.target.value })} 
        />
    </div>
</div>

                <div>
                   <label className={labelClass}>Evaluator</label>
                   <input type="text" className={inputClass} value={formData.evaluator} onChange={(e) => setFormData({ ...formData, evaluator: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          <div>
             <label className={labelClass}>Final Disposition</label>
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
        </div>

        {/* Modal Footer */}
        <div className="p-6 bg-slate-800/50 border-t border-slate-700 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-600 rounded-xl text-slate-300 font-bold hover:bg-slate-700 transition-all text-sm">
            Cancel
          </button>
          <button onClick={() => onSubmit(formData)} className="flex-[2] px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 shadow-lg shadow-blue-900/20 transition-all text-sm">
            {isEdit ? 'Update Entry' : 'Submit Sale'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaleModal;