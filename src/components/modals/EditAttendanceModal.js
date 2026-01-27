import React, { useState, useEffect } from 'react';
import { X, Calendar, Save, Search, User, LogIn, LogOut } from 'lucide-react';

const EditAttendanceModal = ({ isOpen, onClose, agents, attendanceRecords, onSave }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [status, setStatus] = useState('Absent');
  
  // [NEW] Separate states for Login and Logout
  const [loginTime, setLoginTime] = useState('');
  const [logoutTime, setLogoutTime] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');

  // Status Options
  const statuses = [
    { label: 'Present', value: 'Present', color: 'bg-green-500/20 text-green-400 border-green-500/50' },
    { label: 'Late', value: 'Late', color: 'bg-orange-500/20 text-orange-400 border-orange-500/50' },
    { label: 'Absent', value: 'Absent', color: 'bg-red-500/20 text-red-400 border-red-500/50' },
    { label: 'Half Day', value: 'Half Day', color: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
    { label: 'Holiday', value: 'Holiday', color: 'bg-purple-500/20 text-purple-400 border-purple-500/50' },
    { label: 'Off', value: 'Off', color: 'bg-slate-500/20 text-slate-400 border-slate-500/50' },
  ];

  // Load existing data when Agent or Date changes
  useEffect(() => {
    if (selectedAgentId && selectedDate) {
      const agent = agents.find(a => a.name === selectedAgentId);
      if (agent) {
        const record = attendanceRecords.find(r => 
          r.date === selectedDate && 
          r.agentName?.toLowerCase() === agent.name?.toLowerCase()
        );
        
        setStatus(record ? record.status : 'Absent');
        
        // [NEW] Load Login/Logout times safely
        setLoginTime(record ? (record.loginTime || '') : '');
        setLogoutTime(record ? (record.logoutTime || '') : '');
      }
    }
  }, [selectedAgentId, selectedDate, agents, attendanceRecords]);

const handleSubmit = () => {
    if (!selectedAgentId) return;
    
    // [FIX] Calculate 'late' boolean based on status
    const isLate = status === 'Late';

    // [FIX] Handle Times: Send NULL if empty string (to avoid text format errors)
    const safeLogin = loginTime ? loginTime : null;
    const safeLogout = logoutTime ? logoutTime : null;

    const updatePayload = [{
      agentName: selectedAgentId,
      date: selectedDate,
      status: status,
      loginTime: safeLogin,
      logoutTime: safeLogout,
      late: isLate // [NEW] Send this to satisfy the DB
    }];

    onSave(updatePayload);
  };

  const filteredAgents = agents.filter(a => 
    a.status === 'Active' && 
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Edit Attendance
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* 1. DATE SELECTION */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target Date</label>
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 font-bold"
            />
          </div>

          {/* 2. AGENT SELECTION */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Employee</label>
            <div className="relative">
              <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-blue-500 appearance-none cursor-pointer hover:bg-slate-700/50 transition-colors"
              >
                <option value="">-- Choose Employee to Edit --</option>
                {filteredAgents.map(agent => (
                  <option key={agent.name} value={agent.name}>{agent.name}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
              </div>
            </div>
          </div>

          {/* 3. EDIT DETAILS */}
          {selectedAgentId ? (
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 space-y-4 animate-in slide-in-from-top-2">
              
              {/* Status Grid */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mark Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {statuses.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setStatus(option.value)}
                      className={`py-2 px-1 rounded-lg text-xs font-bold border transition-all
                        ${status === option.value 
                          ? option.color + ' ring-1 ring-offset-1 ring-offset-slate-900 ' + option.color.split(' ')[0].replace('bg-', 'ring-')
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                        }
                      `}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* [NEW] Login / Logout Times */}
              {['Present', 'Late', 'Half Day'].includes(status) && (
                <div className="grid grid-cols-2 gap-4">
                  {/* Login Time */}
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-green-400 uppercase tracking-wider flex items-center gap-2">
                       <LogIn className="w-3 h-3" /> Login Time
                     </label>
                     <input 
                       type="time" 
                       value={loginTime} 
                       onChange={(e) => setLoginTime(e.target.value)}
                       className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm font-mono outline-none focus:border-green-500"
                     />
                  </div>

                  {/* Logout Time */}
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
                       <LogOut className="w-3 h-3" /> Logout Time
                     </label>
                     <input 
                       type="time" 
                       value={logoutTime} 
                       onChange={(e) => setLogoutTime(e.target.value)}
                       className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm font-mono outline-none focus:border-red-500"
                     />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center text-center text-slate-500">
              <User className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-sm font-medium">Select an agent above to modify their record.</p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-700 bg-slate-800/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-slate-300 hover:bg-slate-700 rounded-xl text-sm font-bold transition-all">
            Close
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={!selectedAgentId}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all
              ${selectedAgentId 
                ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/20 active:scale-95' 
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }
            `}
          >
            <Save className="w-4 h-4" /> Save Record
          </button>
        </div>

      </div>
    </div>
  );
};

export default EditAttendanceModal;