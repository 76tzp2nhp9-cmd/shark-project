import React, { useState } from 'react';
import { Upload, X, Calendar, Clock, FileText, Users, ClipboardCheck } from 'lucide-react';

const ImportModal = ({ importType, onClose, onImport }) => {
  // State for Sales Import
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // State for Attendance Import
  const [lateTimeInput, setLateTimeInput] = useState('19:00');

  // Helper to get dynamic content based on import type
  const getContent = () => {
    switch(importType) {
      case 'agents': 
        return { 
          title: 'Import Agents', 
          icon: <Users className="w-5 h-5 text-blue-500" />,
          format: 'Name, Team, Center, Base Salary, CNIC, Father Name, Bank Name, Account Number, Joining Date', 
          example: 'John Doe, Team A, Phase 4, 50000, 42101-1234567-1, Robert Doe, Meezan Bank, 1234567890, 2024-01-01' 
        };
      case 'sales': 
        return { 
          title: 'Import Sales', 
          icon: <ClipboardCheck className="w-5 h-5 text-green-500" />,
          format: 'Agent Name, Customer Name, Phone Number, State, Zip, Address, Campaign Type, Center, Team Lead, Comments, List ID, Disposition, Feedback...', 
          example: 'Ahmed Khan, John Doe, 1234567890, CA, 90210, ...' 
        };
      case 'attendance': 
        return { 
          title: 'Import Attendance', 
          icon: <Clock className="w-5 h-5 text-orange-500" />,
          format: 'Columns: AC-No., No., Name, Time, State, New State, Exception, Operation', 
          example: 'Machine Generated CSV' 
        };
      default: 
        return { title: 'Import Data', icon: <Upload className="w-5 h-5" />, format: '', example: '' };
    }
  };

  const content = getContent();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Pass all potential arguments. App.js will use the one it needs.
      // onImport(file, lateTimeVal, manualDate)
      onImport(file, lateTimeInput, selectedDate);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-slate-800/30">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            {content.icon}
            {content.title}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-md text-slate-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          
          {/* --- CONDITIONAL INPUTS --- */}

          {/* 1. SALES: Show Date Picker */}
          {importType === 'sales' && (
            <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-4">
              <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Calendar className="w-3 h-3" /> Select Import Date
              </label>
              <input 
                type="date" 
                className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-2">
                This date will be applied to <strong>all records</strong> in this file.
              </p>
            </div>
          )}

          {/* 2. ATTENDANCE: Show Late Time Threshold */}
          {importType === 'attendance' && (
            <div className="bg-orange-900/10 border border-orange-500/20 rounded-xl p-4">
               <label className="block text-[10px] font-black text-orange-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Clock className="w-3 h-3" /> Late Time Threshold
              </label>
              <input 
                type="time" 
                value={lateTimeInput} 
                onChange={(e) => setLateTimeInput(e.target.value)} 
                className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-800 text-white outline-none focus:ring-2 focus:ring-orange-500" 
              />
               <p className="text-xs text-slate-400 mt-2">
                Logins after this time will be marked as <strong>Late</strong>.
              </p>
            </div>
          )}

          {/* Format Instructions Box */}
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
             <div className="flex items-start gap-3">
               <FileText className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
               <div className="w-full">
                 <p className="text-sm font-bold text-slate-200 mb-1">Required CSV Columns:</p>
                 <p className="text-xs text-slate-400 font-mono break-words leading-relaxed">
                   {content.format}
                 </p>
                 <div className="mt-2 pt-2 border-t border-slate-700">
                    <p className="text-[10px] text-slate-500 italic">Example: {content.example}</p>
                 </div>
               </div>
             </div>
          </div>

          {/* File Upload Area */}
          <label className="border-2 border-dashed border-slate-600 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-slate-800/50 transition-all group">
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              className="hidden" 
              onChange={handleFileChange} 
            />
            <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6 text-slate-400 group-hover:text-blue-400" />
            </div>
            <p className="text-sm font-medium text-slate-300">Click to Upload File</p>
            <p className="text-xs text-slate-500 mt-1">Supports .xlsx and .csv</p>
          </label>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-800/30 border-t border-slate-800 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white font-medium transition-colors text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;