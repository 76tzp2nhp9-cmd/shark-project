import React, { useState } from 'react';
import { X, Upload, FileText } from 'lucide-react';

const ImportModal = ({ importType, onClose, onImport, setLateTime }) => {
  const [lateTimeInput, setLateTimeInput] = useState('19:00');

  const getFormatInfo = () => {
    switch(importType) {
      case 'agents': 
        return { 
          title: 'Import Agents', 
          // [UPDATED] Added new columns here
          format: 'Name, Team, Center, Base Salary, CNIC, Father Name, Bank Name, Account Number, Joining Date', 
          example: 'John Doe, Team A, Phase 4, 50000, 42101-1234567-1, Robert Doe, Meezan Bank, 1234567890, 2024-01-01' 
        };
      case 'sales': 
        return { 
          title: 'Import Sales', 
          format: 'Agent Name, Customer Name, Phone Number, State, Zip, Address, Campaign Type, Center, Team Lead, Comments, List ID, Disposition...', 
          example: 'Ahmed Khan, John Doe, 1234567890, CA, 90210, ...' 
        };
      case 'attendance': 
        return { 
          title: 'Import Attendance', 
          format: 'Columns: AC-No., No., Name, Time, State, New State, Exception, Operation', 
          example: 'Machine Generated CSV' 
        };
      default: 
        return { title: 'Import Data', format: '', example: '' };
    }
  };

  const info = getFormatInfo();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (importType === 'attendance') {
        // Update the state in App.js if function is provided
        if (setLateTime) setLateTime(lateTimeInput);
      }
      // Pass the file object directly, preserving your original logic
      onImport(file, importType === 'attendance' ? lateTimeInput : null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-slate-700">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">{info.title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Instructions Box */}
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-100 mb-2">CSV Format Required:</p>
                <code className="text-xs text-blue-300 font-mono block mb-2 break-words leading-relaxed">
                  {info.format}
                </code>
                <p className="text-[10px] text-slate-400 italic">Example: {info.example}</p>
              </div>
            </div>
          </div>

          {/* Late Time Input (Only for Attendance) */}
          {importType === 'attendance' && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Late Time Threshold</label>
              <input 
                type="time" 
                value={lateTimeInput} 
                onChange={(e) => setLateTimeInput(e.target.value)} 
                className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
          )}

          {/* File Upload Area */}
          <div className="relative group">
            <input 
              type="file" 
              accept=".xls,.xlsx,.csv" 
              onChange={handleFileChange} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
            />
            <div className="border-2 border-dashed border-slate-600 rounded-xl p-6 flex flex-col items-center justify-center group-hover:border-blue-500 group-hover:bg-slate-700/50 transition-all">
              <Upload className="w-8 h-8 text-slate-400 group-hover:text-blue-400 mb-2 transition-colors" />
              <span className="text-sm text-slate-300 font-medium">Click to Upload File</span>
              <span className="text-xs text-slate-500 mt-1">Supports .csv and .xlsx</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end mt-6">
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

export default ImportModal;