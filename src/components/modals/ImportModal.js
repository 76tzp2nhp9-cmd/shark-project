import React, { useState } from 'react';

// Import Modal
const ImportModal = ({ importType, onClose, onImport, setLateTime }) => {
  const [lateTimeInput, setLateTimeInput] = useState('19:00');
  const getFormatInfo = () => {
    switch(importType) {
      case 'agents': 
        // [FIXED] Updated format description to include CNIC
        return { 
          title: 'Import Agents', 
          format: 'Name, Team, Shift, Base Salary, CNIC', 
          example: 'John Doe, Team A, Morning, 40000, 42101-1234567-1' 
        };
      case 'sales': return { title: 'Import Sales', format: 'Agent Name,Customer Name,Phone Number,State,Zip,Address,Campaign Type,Center,Team Lead,Comments,List ID,Disposition,Duration,Xfer Time,Xfer Attempts,Feedback Before Xfer,Feedback After Xfer,Grading,Dock Details,Evaluator,Amount,Status', example: 'Ahmed Khan,John Doe,1234567890,CA,90210,123 Main St,Campaign A,Center A,Lead A,Good call,123,Sale,10:00,5,Good,Excellent,A,B,C,D,5000,Sale' };
      case 'attendance': return { title: 'Import Attendance from Machine', format: 'Columns: AC-No., No., Name, Time, State, New State, Exception, Operation', example: 'Sheet with headers in first row' };
      default: return { title: 'Import Data', format: '', example: '' };
    }
  };

  const info = getFormatInfo();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (importType === 'attendance') {
        setLateTime(lateTimeInput);
      }
      onImport(file, importType === 'attendance' ? lateTimeInput : null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h3 className="text-xl font-semibold text-slate-800 mb-4">{info.title}</h3>
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-900 mb-2">CSV Format Required:</p>
            <code className="text-xs text-blue-700 block mb-2">{info.format}</code>
            <p className="text-xs text-blue-600">Example: {info.example}</p>
          </div>
          {importType === 'attendance' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Late Time Threshold</label>
              <input type="time" value={lateTimeInput} onChange={(e) => setLateTimeInput(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
          )}
          <input type="file" accept=".xls,.xlsx,.csv" onChange={handleFileChange} className="w-full px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-white placeholder-slate-400" />
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700 font-medium">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;