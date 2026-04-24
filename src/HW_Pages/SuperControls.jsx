import React, { useState, useMemo } from 'react';
import { Upload, Calendar as CalendarIcon, FileText, Search } from 'lucide-react';

export default function SuperControls({ agents, sales, attendance, hrRecords, holidays = [], selectedMonth }) {
  const [dialerStats, setDialerStats] = useState({});
  const [uploadDate, setUploadDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState('All');

  // =================================================================================
  // 1. DATE LOGIC
  // =================================================================================
  const getPayrollRange = (monthInput) => {
    let targetDate = new Date();
    if (monthInput) {
      if (typeof monthInput === 'string' && monthInput.includes('-')) {
        const [year, month] = monthInput.split('-');
        targetDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      } else if (monthInput instanceof Date) {
        targetDate = new Date(monthInput);
      } else if (typeof monthInput === 'number') {
        targetDate.setMonth(targetDate.getMonth() + monthInput);
      }
    }
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    return {
      start: new Date(year, month - 1, 21),
      end: new Date(year, month, 20)
    };
  };

  const { start, end } = getPayrollRange(selectedMonth);
  
  const dateArray = useMemo(() => {
    const arr = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      arr.push(`${yyyy}-${mm}-${dd}`);
    }
    return arr;
  }, [start, end]);

  // =================================================================================
  // 2. CSV UPLOAD HANDLER
  // =================================================================================
  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const rows = text.split('\n').map(row => row.split(','));
      const newDataForDate = {};
      
      for (let i = 1; i < rows.length; i++) {
        if (rows[i].length >= 3) {
          const name = rows[i][0]?.trim().toLowerCase();
          const attempts = parseInt(rows[i][1]) || 0;
          const paidLeads = parseInt(rows[i][2]) || 0;
          if (name) newDataForDate[name] = { attempts, paidLeads };
        }
      }

      setDialerStats(prev => ({
        ...prev,
        [uploadDate]: { ...prev[uploadDate], ...newDataForDate }
      }));
      e.target.value = null; 
    };
    reader.readAsText(file);
  };

  // =================================================================================
  // 3. OPTIMIZED DATA PROCESSING (Fixed Filters & Date Parser)
  // =================================================================================
  const processedData = useMemo(() => {
    const cycleStart = new Date(start); cycleStart.setHours(0, 0, 0, 0);
    const cycleEnd = new Date(end); cycleEnd.setHours(23, 59, 59, 999);

    const qaSalesMap = {};
    const attendanceMap = {};

    // ⭐ THE FIX 1: Universal Date Parser
    const forceYYYYMMDD = (rawDate) => {
      if (!rawDate) return null;
      let dStr = String(rawDate).trim().split(' ')[0].split('T')[0];
      
      // If already perfect
      if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) return dStr;
      
      // If JS can parse it natively (handles MM/DD/YYYY)
      const d = new Date(dStr);
      if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
      
      // If JS failed, it's likely DD/MM/YYYY. We manually flip it.
      const parts = dStr.split(/[\/\-]/);
      if (parts.length === 3) {
        return `${parts[2]}-${String(parts[1]).padStart(2, '0')}-${String(parts[0]).padStart(2, '0')}`;
      }
      
      return null;
    };

    // A. Map QA Sales
    (sales || []).forEach(s => {
      if (s.status === 'Sale' || ['HW- Xfer', 'HW-IBXfer', 'HW-Xfer-CDR'].includes(s.disposition)) {
        const agentClean = s.agentName?.toString().trim().toLowerCase();
        const rawDate = s.timestamp || s.date; 
        const sDate = forceYYYYMMDD(rawDate); 
        
        if (agentClean && sDate) {
          if (!qaSalesMap[agentClean]) qaSalesMap[agentClean] = {};
          qaSalesMap[agentClean][sDate] = (qaSalesMap[agentClean][sDate] || 0) + 1;
        }
      }
    });

    // B. Map Attendance
    (attendance || []).forEach(a => {
      const status = a.status?.toString().trim().toLowerCase(); 
      if (status === 'present' || status === 'late' || status === 'p' || status === 'l') {
        const agentClean = a.agentName?.toString().trim().toLowerCase();
        const aDate = forceYYYYMMDD(a.date);
        if (agentClean && aDate) {
          if (!attendanceMap[agentClean]) attendanceMap[agentClean] = {};
          attendanceMap[agentClean][aDate] = true;
        }
      }
    });

    let stats = (agents || []).map(agent => {
      const targetName = agent.name?.toString().trim().toLowerCase();
      const hrRec = hrRecords?.find(h => h.cnic === agent.cnic || h.agent_name?.toString().trim().toLowerCase() === targetName) || {};
      
      let baseSalary = agent.baseSalary || hrRec.base_salary || 0;
      if (typeof baseSalary === 'string') baseSalary = parseInt(baseSalary.replace(/,/g, '')) || 0;

      const joinDateStr = hrRec.joining_date || agent.activeDate || agent.active_date;
      const joinDate = joinDateStr ? new Date(forceYYYYMMDD(joinDateStr)) : null;

      const leftDateStr = agent.leftDate || agent.left_date || hrRec.left_date || hrRec.leftDate;
      const leftDate = leftDateStr ? new Date(forceYYYYMMDD(leftDateStr)) : null;

      if (['Left', 'Terminated', 'NCNS'].includes(agent.status) && leftDate && leftDate < cycleStart) return null;
      if (joinDate && joinDate > cycleEnd) return null;

      let scannedDays = 0;
      let totalAttempts = 0;
      let totalPaidLeads = 0;
      let totalQASales = 0;
      const dailyData = {};

      dateArray.forEach(dateStr => {
        const dayQASales = qaSalesMap[targetName]?.[dateStr] || 0;
        const isPresent = attendanceMap[targetName]?.[dateStr] || dayQASales > 0;
        
        if (isPresent) scannedDays++;

        const uploadedStats = dialerStats[dateStr]?.[targetName] || { attempts: 0, paidLeads: 0 };
        dailyData[dateStr] = { attempts: uploadedStats.attempts, paidLeads: uploadedStats.paidLeads, qaSales: dayQASales };

        totalAttempts += uploadedStats.attempts;
        totalPaidLeads += uploadedStats.paidLeads;
        totalQASales += dayQASales;
      });

      let validHolidays = 0;
      (holidays || []).forEach(h => {
        const hDateStr = forceYYYYMMDD(h.date);
        if (!dateArray.includes(hDateStr)) return; 
        
        const hDate = new Date(hDateStr); 
        if (joinDate && hDate < joinDate) return; 

        const hasScan = attendanceMap[targetName]?.[hDateStr] || qaSalesMap[targetName]?.[hDateStr] > 0;
        if (!hasScan) validHolidays++;
      });

      const truePaidDays = scannedDays + validHolidays;

      const plConversion = totalAttempts > 0 ? ((totalPaidLeads / totalAttempts) * 100).toFixed(2) : '0.00';
      const qaConversion = totalAttempts > 0 ? ((totalQASales / totalAttempts) * 100).toFixed(2) : '0.00';
      const lpdPL = truePaidDays > 0 ? (totalPaidLeads / truePaidDays).toFixed(2) : '0.00';
      const lpdQA = truePaidDays > 0 ? (totalQASales / truePaidDays).toFixed(2) : '0.00';

      return {
        ...agent,
        team: agent.team || 'Unassigned',
        baseSalary,
        totalDays: truePaidDays, 
        totalAttempts,
        totalPaidLeads,
        totalQASales,
        plConversion,
        qaConversion,
        lpdPL,
        lpdQA,
        dailyData
      };
    }).filter(Boolean); 

    // ⭐ THE FIX 2: Removed "hasActivity". All agents in the team will now always show up!
    return stats.filter(stat => {
      const matchesSearch = !searchQuery || (stat.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTeam = teamFilter === 'All' || stat.team === teamFilter;
      return matchesSearch && matchesTeam; 
    });
  }, [agents, sales, attendance, hrRecords, dialerStats, holidays, dateArray, searchQuery, teamFilter, start, end]);

  const uniqueTeams = [...new Set(processedData.map(s => s.team))].sort();
  const allTeamsList = [...new Set((agents || []).map(a => a.team))].filter(Boolean).sort();

  // =================================================================================
  // 4. RENDER UI
  // =================================================================================
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="w-full flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm mb-2">
        <div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent flex items-center gap-2">
            <FileText className="w-6 h-6 text-purple-400" />
            Performance & Conversion Matrix
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">Dialer Attempts, Paid Leads & QA Sales Analysis</p>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="text-xs text-slate-500 font-medium bg-slate-900/50 px-3 py-1.5 rounded border border-slate-700/50">
            Cycle: <span className="text-slate-300">{start.toDateString()} - {end.toDateString()}</span>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-lg border border-slate-700 shadow-inner">
            <div className="relative">
              <CalendarIcon className="w-3.5 h-3.5 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input 
                type="date" 
                value={uploadDate}
                onChange={(e) => setUploadDate(e.target.value)}
                className="bg-slate-800 text-xs text-slate-200 border border-slate-600 rounded pl-8 pr-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500 [color-scheme:dark]"
              />
            </div>
            <label className="cursor-pointer bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-colors shadow-sm">
              <Upload className="w-3.5 h-3.5" />
              Upload CSV
              <input type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
            </label>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-600 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search agent name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 outline-none focus:ring-2 focus:ring-purple-500">
            <option value="All">All Teams</option>
            {allTeamsList.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[75vh]">
        <div className="overflow-auto relative custom-scrollbar">
          <table className="w-full text-slate-300 border-collapse table-fixed min-w-max">
            <thead className="sticky top-0 z-50 shadow-md">
              <tr className="bg-slate-950">
                <th rowSpan={2} className="p-3 text-left border-b border-r border-slate-800 sticky left-0 z-50 bg-slate-950 w-48 text-xs">Agent Name</th>
                <th rowSpan={2} className="p-2 text-center border-b border-r border-slate-800 sticky left-[192px] z-50 bg-slate-950 text-slate-300 text-[10px] font-bold w-20">SALARY</th>
                <th rowSpan={2} className="p-2 text-center border-b border-r-2 border-slate-600 sticky left-[272px] z-50 bg-slate-950 text-slate-300 text-[10px] font-bold w-14">DAYS</th>

                {dateArray.map(dateStr => {
                  const d = new Date(dateStr);
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <th key={dateStr} colSpan={3} className={`p-1 text-center border-b border-r border-slate-800 w-32 ${isWeekend ? 'bg-slate-800' : 'bg-slate-900'}`}>
                      <div className="text-[10px] text-slate-500 uppercase">{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                      <div className={`text-xs font-bold ${isWeekend ? 'text-slate-500' : 'text-white'}`}>{d.getDate()}</div>
                    </th>
                  );
                })}

                <th rowSpan={2} className="p-2 text-center border-b border-l-2 border-slate-600 bg-slate-900 text-slate-400 text-[10px] font-bold w-16">ATT</th>
                <th rowSpan={2} className="p-2 text-center border-b border-slate-800 bg-blue-900/20 text-blue-400 text-[10px] font-bold w-16">PL</th>
                <th rowSpan={2} className="p-2 text-center border-b border-slate-800 bg-blue-900/20 text-blue-300 text-[10px] font-bold w-16">PL%</th>
                <th rowSpan={2} className="p-2 text-center border-b border-slate-800 bg-indigo-900/20 text-indigo-400 text-[10px] font-bold w-14">LPD PL</th>
                <th rowSpan={2} className="p-2 text-center border-b border-slate-800 bg-green-900/20 text-green-400 text-[10px] font-bold w-16">QA</th>
                <th rowSpan={2} className="p-2 text-center border-b border-slate-800 bg-green-900/20 text-emerald-400 text-[10px] font-bold w-16">QA%</th>
                <th rowSpan={2} className="p-2 text-center border-b border-slate-800 bg-emerald-900/20 text-emerald-300 text-[10px] font-bold w-14">LPD QA</th>
              </tr>
              <tr className="bg-slate-900 text-[9px] uppercase">
                {dateArray.map(dateStr => (
                  <React.Fragment key={dateStr + '-sub'}>
                    <th className="p-1 border-b border-r border-slate-800 text-slate-500 w-10">Att</th>
                    <th className="p-1 border-b border-r border-slate-800 text-blue-400/70 w-10">PL</th>
                    <th className="p-1 border-b border-r border-slate-800 text-green-400/70 w-10">QA</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {uniqueTeams.map(teamName => {
                const teamAgents = processedData.filter(s => s.team === teamName).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                if (teamAgents.length === 0) return null;

                return (
                  <React.Fragment key={teamName}>
                    <tr className="bg-slate-800/80 sticky top-[72px] z-30">
                      <td colSpan={3} className="p-2 px-4 border-r-2 border-slate-600 font-black text-purple-400 uppercase tracking-widest text-sm sticky left-0 z-30 bg-slate-800">
                        {teamName}
                      </td>
                      <td colSpan={dateArray.length * 3 + 7} className="bg-slate-800"></td>
                    </tr>

                    {teamAgents.map((stat) => (
                      <tr key={stat.id} className="hover:bg-slate-800/50 transition-colors group">
                        <td className="p-2 px-3 font-medium border-r border-slate-800 sticky left-0 z-40 bg-slate-900 group-hover:bg-slate-800 text-xs truncate text-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.2)]">
                          {stat.name || 'Unknown Agent'}
                        </td>
                        <td className="p-1 text-center border-r border-slate-800 sticky left-[192px] z-40 bg-slate-900 group-hover:bg-slate-800 text-slate-400 font-mono text-[10px]">
                          {stat.baseSalary.toLocaleString()}
                        </td>
                        <td className="p-1 text-center border-r-2 border-slate-600 sticky left-[272px] z-40 bg-slate-900 group-hover:bg-slate-800 font-bold text-white text-xs">
                          {stat.totalDays}
                        </td>

                        {dateArray.map(dateStr => {
                          const data = stat.dailyData[dateStr];
                          return (
                            <React.Fragment key={dateStr}>
                              <td className="p-1 text-center border-r border-slate-800 text-[10px] font-mono text-slate-500 bg-slate-900/30">
                                {data.attempts > 0 ? data.attempts : '-'}
                              </td>
                              <td className="p-1 text-center border-r border-slate-800 text-[10px] font-mono text-blue-400 bg-blue-900/10">
                                {data.paidLeads > 0 ? data.paidLeads : '-'}
                              </td>
                              <td className="p-1 text-center border-r border-slate-800 text-[10px] font-bold text-green-400 bg-green-900/10">
                                {data.qaSales > 0 ? data.qaSales : '-'}
                              </td>
                            </React.Fragment>
                          );
                        })}

                        <td className="p-2 text-center border-l-2 border-slate-600 border-r border-slate-800 bg-slate-900 text-slate-400 text-[10px] font-mono">{stat.totalAttempts}</td>
                        <td className="p-2 text-center border-r border-slate-800 bg-blue-900/10 text-blue-400 text-xs font-bold">{stat.totalPaidLeads}</td>
                        <td className="p-2 text-center border-r border-slate-800 bg-blue-900/10 text-blue-300 text-[10px] font-mono">{stat.plConversion}%</td>
                        <td className="p-2 text-center border-r border-slate-800 bg-indigo-900/10 text-indigo-400 text-[10px] font-bold">{stat.lpdPL}</td>
                        <td className="p-2 text-center border-r border-slate-800 bg-green-900/10 text-green-400 text-xs font-bold">{stat.totalQASales}</td>
                        <td className="p-2 text-center border-r border-slate-800 bg-green-900/10 text-emerald-400 text-[10px] font-mono">{stat.qaConversion}%</td>
                        <td className="p-2 text-center bg-emerald-900/10 text-emerald-300 text-[10px] font-bold">{stat.lpdQA}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}