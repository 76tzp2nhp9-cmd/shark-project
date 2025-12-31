import React from 'react';
import { Calendar } from 'lucide-react';

const DateFilterBar = ({ filterType, setFilterType, dateVal, setDateVal, endVal, setEndVal, selectedMonth, handleMonthChange }) => {
  
  // [FIX] This function must be defined INSIDE the component
  const getMonthInputValue = (monthStr) => {
    if (!monthStr) return new Date().toISOString().slice(0, 7);
    const [month, year] = monthStr.split(' ');
    const date = new Date(`${month} 1, ${year}`);
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${m}`;
  };

  return (
    <div className="bg-slate-800 p-3 rounded-lg border border-slate-600 flex flex-wrap gap-4 items-center mb-6">
      {/* ... (Keep your existing JSX) ... */}
       <div className="flex items-center gap-2">
        <span className="text-slate-400 text-sm font-medium"><Calendar className="w-4 h-4 inline"/> Filter:</span>
        <select 
          value={filterType} 
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-slate-700 text-white text-sm border border-slate-600 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="Daily">Daily</option>
          <option value="Weekly">Weekly</option>
          <option value="Monthly">Monthly</option>
          <option value="Custom">Custom Range</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        {filterType === 'Monthly' && (
           <input 
             type="month" 
             value={getMonthInputValue(selectedMonth)} 
             onChange={handleMonthChange}
             className="bg-slate-700 text-white text-sm border border-slate-600 rounded px-2 py-1 [color-scheme:dark]"
           />
        )}
        {(filterType === 'Daily' || filterType === 'Weekly') && (
          <input 
            type="date" 
            value={dateVal} 
            onChange={(e) => setDateVal(e.target.value)}
            className="bg-slate-700 text-white text-sm border border-slate-600 rounded px-2 py-1 [color-scheme:dark]"
          />
        )}
        {filterType === 'Custom' && (
          <>
            <input 
              type="date" 
              value={dateVal} 
              onChange={(e) => setDateVal(e.target.value)}
              className="bg-slate-700 text-white text-sm border border-slate-600 rounded px-2 py-1 [color-scheme:dark]"
            />
            <span className="text-slate-400">-</span>
            <input 
              type="date" 
              value={endVal} 
              onChange={(e) => setEndVal(e.target.value)}
              className="bg-slate-700 text-white text-sm border border-slate-600 rounded px-2 py-1 [color-scheme:dark]"
            />
          </>
        )}
      </div>
    </div>
  );
};

export default DateFilterBar;