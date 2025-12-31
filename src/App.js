// --- Imports for Helper Functions ---
import { getPayrollRange, getDaysArray, formatTime } from './utils/helpers';

// --- Imports for UI Components ---
import StatCard from './components/StatCard';
import DateFilterBar from './components/DateFilterBar';

// --- Imports for Modals ---
import AgentModal from './components/modals/AgentModal';
import SaleModal from './components/modals/SaleModal';
import FineModal from './components/modals/FineModal';
import BonusModal from './components/modals/BonusModal';
import ImportModal from './components/modals/ImportModal';
import HREmployeeModal from './components/modals/HREmployeeModal';
import LateTimeModal from './components/modals/LateTimeModal';

import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from './supabaseClient';
import * as XLSX from 'xlsx';
import { 
  Users, DollarSign, Calendar, AlertCircle, TrendingUp, Download, 
  Plus, Check, X, Upload, LogOut, Lock, Briefcase, Clock,
  Pencil, Trash2, UserX, RotateCcw // <--- Added these new icons
} from 'lucide-react';

// Sample Data (Kept for reference as requested)
const initialAgents = [];
const initialSales = [];
const initialAttendance = [];
const initialFines = [];
const initialBonuses = [];

const AgentPayrollSystem = () => {
  // Login States
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [loginData, setLoginData] = useState({ name: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // App States
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('ams_active_tab') || 'dashboard';
  });
  const [agents, setAgents] = useState([]);
  const [sales, setSales] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [fines, setFines] = useState([]);
  const [bonuses, setBonuses] = useState([]);
  const [hrRecords, setHrRecords] = useState([]); // [NEW] HR State
  
  // [SMART DATE STATE] Automatically detects Jan 2026 cycle if today > Dec 20
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    // If today is after the 20th, we are in the NEXT month's cycle
    if (today.getDate() > 20) {
      today.setMonth(today.getMonth() + 1);
    }
    return `${today.toLocaleString('default', { month: 'long' })} ${today.getFullYear()}`;
  });

  // [NEW] Advanced Date Filter States
  const [filterType, setFilterType] = useState('Monthly'); // Options: Daily, Weekly, Monthly, Custom
  const [customStartDate, setCustomStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);

  // [NEW] Helper: Get the exact Start and End date based on selection
  const getActiveDateRange = useMemo(() => {
    const today = new Date(customStartDate); // Use customStartDate as the "anchor" date
    let start = new Date(today);
    let end = new Date(today);

    if (filterType === 'Daily') {
      // Start and End are the same day
      start = today;
      end = today;
    } 
    else if (filterType === 'Weekly') {
      // Calculate Monday to Sunday of the selected week
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
      start.setDate(diff);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
    } 
    else if (filterType === 'Monthly') {
      // Use your existing "21st to 20th" logic
      const range = getPayrollRange(selectedMonth);
      start = range.start;
      end = range.end;
    } 
    else if (filterType === 'Custom') {
      start = new Date(customStartDate);
      end = new Date(customEndDate);
    }

    // Return strings YYYY-MM-DD for easy comparison
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
      startObj: start,
      endObj: end
    };
  }, [filterType, customStartDate, customEndDate, selectedMonth]);
  
  // [FIX] Late Time State (Persisted in Local Storage)
  const [lateTime, setLateTime] = useState(() => localStorage.getItem('ams_late_time') || '09:30');
  const [showLateTimeModal, setShowLateTimeModal] = useState(false);

  // Handler to save late time
  const handleSetLateTime = (newTime) => {
    setLateTime(newTime);
    localStorage.setItem('ams_late_time', newTime);
    setShowLateTimeModal(false);
  };

  // [NEW] Helper: Convert "January 2026" -> "2026-01" (For Input Value)
  const getMonthInputValue = (monthStr) => {
    if (!monthStr) return new Date().toISOString().slice(0, 7);
    const [month, year] = monthStr.split(' ');
    const date = new Date(`${month} 1, ${year}`);
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${m}`;
  };

  // [NEW] Helper: Convert "2026-01" -> "January 2026" (For App State)
  const handleMonthChange = (e) => {
    if (!e.target.value) return;
    const [year, month] = e.target.value.split('-');
    // Create date object (using middle of month to avoid timezone issues)
    const date = new Date(parseInt(year), parseInt(month) - 1, 15);
    const monthName = date.toLocaleString('default', { month: 'long' });
    setSelectedMonth(`${monthName} ${year}`);
  };

  // [FIX 1] Session Persistence: Check LocalStorage on Load
  useEffect(() => {
    const storedUser = localStorage.getItem('ams_user');
    const storedRole = localStorage.getItem('ams_role');
    
    if (storedUser && storedRole) {
      setCurrentUser(JSON.parse(storedUser));
      setUserRole(storedRole);
      setIsLoggedIn(true);
    }
  }, []);

  // [FIX] Persist activeTab to localStorage whenever it changes
  useEffect(() => {
    if (isLoggedIn) {
      localStorage.setItem('ams_active_tab', activeTab);
    }
  }, [activeTab, isLoggedIn]);

  // Fetch Data from Supabase
  const fetchData = async () => {
      // 1. Fetch Agents
      const { data: agentsData, error: agentsError } = await supabase.from('agents').select('*');
      if (agentsData) setAgents(agentsData);
      if (agentsError) console.error('Error fetching agents:', agentsError);

      // 2. Fetch Sales
      const { data: salesData } = await supabase.from('sales').select('*');
      if (salesData) setSales(salesData);

      // 3. Fetch Fines
      const { data: finesData } = await supabase.from('fines').select('*');
      if (finesData) setFines(finesData);

      // 4. Fetch Bonuses
      const { data: bonusData } = await supabase.from('bonuses').select('*');
      if (bonusData) setBonuses(bonusData);
      
      // 5. Fetch Attendance
      const { data: attData } = await supabase.from('attendance').select('*');
      if (attData) setAttendance(attData);

      // 6. [NEW] Fetch HR Records
      const { data: hrData } = await supabase.from('hr_records').select('*');
      if (hrData) setHrRecords(hrData);
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
    }
  }, [isLoggedIn]); // Only fetch when logged in
    
  // Modals
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [showEditAgent, setShowEditAgent] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [showAddSale, setShowAddSale] = useState(false);
  const [editSale, setEditSale] = useState(null);
  const [showAddFine, setShowAddFine] = useState(false);
  const [showAddBonus, setShowAddBonus] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState('');
  
  // Editing States
  const [editingFine, setEditingFine] = useState(null);
  const [editingBonus, setEditingBonus] = useState(null);
  const [editingHR, setEditingHR] = useState(null);
   
  // [NEW] HR Modal State
  const [showAddEmployee, setShowAddEmployee] = useState(false);

  // [NEW] Reusable Date Filter Component
const DateFilterBar = ({ filterType, setFilterType, dateVal, setDateVal, endVal, setEndVal, selectedMonth, handleMonthChange }) => {
  return (
    <div className="bg-slate-800 p-3 rounded-lg border border-slate-600 flex flex-wrap gap-4 items-center mb-6">
      
      {/* 1. Filter Type Selector */}
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

      {/* 2. Inputs based on Type */}
      <div className="flex items-center gap-2">
        
        {/* Monthly: Show your existing Month Picker */}
        {filterType === 'Monthly' && (
           <input 
             type="month" 
             value={getMonthInputValue(selectedMonth)} 
             onChange={handleMonthChange}
             className="bg-slate-700 text-white text-sm border border-slate-600 rounded px-2 py-1 [color-scheme:dark]"
           />
        )}

        {/* Daily or Weekly: Show Single Date Picker */}
        {(filterType === 'Daily' || filterType === 'Weekly') && (
          <input 
            type="date" 
            value={dateVal} 
            onChange={(e) => setDateVal(e.target.value)}
            className="bg-slate-700 text-white text-sm border border-slate-600 rounded px-2 py-1 [color-scheme:dark]"
          />
        )}

        {/* Custom: Show Start & End Date Pickers */}
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
    
  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  // [FIX] Replaced Shift with Center
  const [centerFilter, setCenterFilter] = useState('All');
  const [evaluators, setEvaluators] = useState(['John Doe', 'Jane Smith']);

  // Login Logic
  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');

    let role = '';
    let user = null;

    // Check Admin
    if (loginData.name === "Admin" && loginData.password === "admin123") {
      role = 'Admin';
      user = { name: 'Admin' };
    } 
    // Check QA
    else if (loginData.name === "QA" && loginData.password === "qa123") {
      role = 'QA';
      user = { name: 'QA' };
    }
    // [NEW] Check HR
    else if (loginData.name === "HR" && loginData.password === "hr123") {
      role = 'HR';
      user = { name: 'HR Manager' };
    }
    // Check Agents
    else {
      const agent = agents.find(a => 
        a.name.toLowerCase() === loginData.name.toLowerCase() && 
        a.password === loginData.password
      );
      if (agent) {
        role = 'Agent';
        user = agent;
      }
    }

    if (role && user) {
      setUserRole(role);
      setCurrentUser(user);
      setIsLoggedIn(true);
      // [FIX] Save session
      localStorage.setItem('ams_user', JSON.stringify(user));
      localStorage.setItem('ams_role', role);
    } else {
      setLoginError('Invalid Username or Password');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoginData({ name: '', password: '' });
    setUserRole('');
    setCurrentUser(null);
    setActiveTab('dashboard');
    setSearchQuery('');
    setTeamFilter('All');
    setStatusFilter('All');
    
    // [FIX] Clear session AND tab preference
    localStorage.removeItem('ams_user');
    localStorage.removeItem('ams_role');
    localStorage.removeItem('ams_active_tab'); // <-- Add this line
  };

// --- FILTERING LOGIC ---

  // 1. Helper: validAgents Set (Optimized for performance)
  // This creates a Set of names of agents who match the selected Team/Center
  const validAgentNames = useMemo(() => {
    const relevantAgents = userRole === 'Agent' 
      ? agents.filter(a => a.name === currentUser?.name)
      : agents;
      
    return new Set(relevantAgents.filter(a => {
      const matchTeam = teamFilter === 'All' || teamFilter === 'All Teams' || a.team === teamFilter;
      const matchCenter = centerFilter === 'All' || centerFilter === 'All Centers' || a.center === centerFilter;
      return matchTeam && matchCenter;
    }).map(a => a.name));
  }, [agents, teamFilter, centerFilter, userRole, currentUser]);

  const dateRange = useMemo(() => getPayrollRange(selectedMonth), [selectedMonth]);

  // 2. Monthly Stats (Respects Team/Center)
  const monthlyStats = useMemo(() => {
    const filteredAgentsList = agents.filter(a => validAgentNames.has(a.name));

    const agentStats = filteredAgentsList.map(agent => {
      const approvedSales = sales.filter(s => 
        s.agentName === agent.name && 
        (s.status === 'Sale' || s.disposition === 'HW- Xfer' || s.disposition === 'HW-IBXfer') && 
        dateRange.includes(s.date)
      );
      
      const totalSales = approvedSales.length;
      const totalRevenue = approvedSales.reduce((sum, s) => sum + (s.amount || 0), 0);
      
      const agentFines = fines.filter(f => 
        f.agentName === agent.name && 
        dateRange.includes(f.date)
      ).reduce((sum, f) => sum + (f.amount || 0), 0);
      
      const agentBonuses = bonuses.filter(b => 
        b.agentName === agent.name && 
        b.month === selectedMonth 
      ).reduce((sum, b) => sum + (b.amount || 0), 0);
      
      const netSalary = (agent.baseSalary || 0) + agentBonuses - agentFines;
      
      return {
        ...agent,
        totalSales,
        totalRevenue: totalRevenue || 0,
        totalFines: agentFines || 0,
        totalBonuses: agentBonuses || 0,
        netSalary: netSalary || 0
      };
    });
    
    return agentStats.sort((a, b) => b.totalSales - a.totalSales);
  }, [agents, sales, fines, bonuses, selectedMonth, dateRange, validAgentNames]);

  // 3. Dashboard Stats (Respects Team/Center + Date Range)
  const dashboardStats = useMemo(() => {
    const { start, end } = getActiveDateRange;

    // Only count agents matching the filter
    const activeAgentCount = agents.filter(a => a.status === 'Active' && validAgentNames.has(a.name)).length;

    // Filter sales by Date AND by Valid Agents (Team/Center)
    const relevantSales = sales.filter(s => 
       validAgentNames.has(s.agentName) &&
       (s.status === 'Sale' || s.disposition === 'HW- Xfer' || s.disposition === 'HW-IBXfer') &&
       s.date >= start && s.date <= end
    );

    const totalSalesCount = relevantSales.length;
    const totalRevenue = relevantSales.reduce((sum, s) => sum + (s.amount || 0), 0);
    
    // Payroll usually respects the monthly cycle, but filtered by team
    const totalPayroll = monthlyStats.reduce((sum, a) => sum + a.netSalary, 0);
    
    return { totalAgents: activeAgentCount, totalSalesCount, totalRevenue, totalPayroll };
  }, [agents, sales, monthlyStats, getActiveDateRange, validAgentNames]);

  // 4. Top Performers (Respects Team/Center + Date Range)
  const filteredPerformerStats = useMemo(() => {
    const { start, end } = getActiveDateRange;
    const relevantAgents = agents.filter(a => validAgentNames.has(a.name));

    const stats = relevantAgents.map(agent => {
      const agentSales = sales.filter(s => 
        s.agentName === agent.name && 
        (s.status === 'Sale' || s.disposition === 'HW- Xfer' || s.disposition === 'HW-IBXfer') &&
        s.date >= start && s.date <= end
      );

      const totalSales = agentSales.length;
      const totalRevenue = agentSales.reduce((sum, s) => sum + (s.amount || 0), 0);
      const safeNetSalary = agent.baseSalary || 0;

      return { ...agent, totalSales, totalRevenue, netSalary: safeNetSalary };
    });

    return stats.sort((a, b) => b.totalSales - a.totalSales);
  }, [agents, sales, getActiveDateRange, validAgentNames]);

  // 5. Sales Table (Respects Team/Center)
  const filteredSales = useMemo(() => {
    const { start, end } = getActiveDateRange;
    return sales.filter(sale => {
      const matchesSearch = sale.agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            sale.campaignType?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDate = sale.date >= start && sale.date <= end;
      const matchesStatus = statusFilter === 'All' || statusFilter === 'All Status' || sale.status === statusFilter;
      // Check if agent is in allowed list (Team/Center)
      const matchesTeamCenter = validAgentNames.has(sale.agentName);
      
      return matchesSearch && matchesDate && matchesStatus && matchesTeamCenter;
    });
  }, [sales, searchQuery, getActiveDateRange, statusFilter, validAgentNames]);

  // 6. Attendance Table (Respects Team/Center)
  const filteredAttendance = useMemo(() => {
    const { start, end } = getActiveDateRange;
    return attendance.filter(record => {
      const matchesSearch = record.agentName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDate = record.date >= start && record.date <= end;
      const matchesTeamCenter = validAgentNames.has(record.agentName);
      return matchesSearch && matchesDate && matchesTeamCenter;
    });
  }, [attendance, searchQuery, getActiveDateRange, validAgentNames]);

  // 7. Agents Table (Respects Team/Center)
  const filteredAgents = useMemo(() => {
    return agents.filter(agent => {
       const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase());
       const matchesStatus = statusFilter === 'All' || statusFilter === 'All Status' || agent.status === statusFilter;
       // We use validAgentNames logic here explicitly to match the dropdowns
       const matchesTeam = teamFilter === 'All' || teamFilter === 'All Teams' || agent.team === teamFilter;
       const matchesCenter = centerFilter === 'All' || centerFilter === 'All Centers' || agent.center === centerFilter;
       
       return matchesSearch && matchesStatus && matchesTeam && matchesCenter;
    });
  }, [agents, searchQuery, statusFilter, teamFilter, centerFilter]);

  // 8. Fines (Respects Team/Center)
  const filteredFines = useMemo(() => {
    return fines.filter(fine => {
      const matchesSearch = fine.agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            fine.reason.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTeamCenter = validAgentNames.has(fine.agentName);
      return matchesSearch && fine.month === selectedMonth && matchesTeamCenter;
    });
  }, [fines, searchQuery, selectedMonth, validAgentNames]);

  // 9. Bonuses (Respects Team/Center)
  const filteredBonuses = useMemo(() => {
    return bonuses.filter(bonus => {
      const matchesSearch = bonus.agentName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTeamCenter = validAgentNames.has(bonus.agentName);
      return matchesSearch && bonus.month === selectedMonth && matchesTeamCenter;
    });
  }, [bonuses, searchQuery, selectedMonth, validAgentNames]);

  // 10. HR (Respects Team/Center - matches by Name)
  const filteredHR = useMemo(() => {
    return hrRecords.filter(rec => {
       const matchesSearch = rec.agent_name.toLowerCase().includes(searchQuery.toLowerCase());
       // Optional: Filter HR records if they match an existing agent in the filtered team/center
       const matchesTeamCenter = validAgentNames.has(rec.agent_name) || teamFilter === 'All'; 
       return matchesSearch && matchesTeamCenter;
    });
  }, [hrRecords, searchQuery, validAgentNames, teamFilter]);

  // Add Agent
  const handleAddAgent = async (formData) => {
    const newAgent = { ...formData, status: 'Active', activeDate: new Date().toISOString().split('T')[0], leftDate: null };
    const { data, error } = await supabase.from('agents').insert([newAgent]).select();

    if (error) { alert('Error adding agent: ' + error.message); } 
    else { setAgents([...agents, ...data]); setShowAddAgent(false); }
  };

  // [FIX] Edit Agent - Now saves to Database
const handleEditAgent = async (formData) => {
    // [FIX] Use .eq('cnic', ...) instead of .eq('id', ...)
    const { error } = await supabase.from('agents').update(formData).eq('cnic', editingAgent.cnic);
    
    if (error) { alert('Error updating agent: ' + error.message); }
    else {
      // [FIX] Update local state using cnic
      setAgents(agents.map(a => a.cnic === editingAgent.cnic ? { ...a, ...formData } : a));
      setShowEditAgent(false);
      setEditingAgent(null);
    }
  };

  // [FIXED] Mark as Left with Error Handling
 // 2. Mark as Left (Use cnic)
  const handleMarkAsLeft = async (agentCnic) => {
    if (window.confirm('Are you sure?')) {
      const leftDate = new Date().toISOString().split('T')[0];
      // [FIX] Use .eq('cnic', ...)
      const { error } = await supabase.from('agents').update({ status: 'Left', leftDate }).eq('cnic', agentCnic);
      if (!error) {
        setAgents(agents.map(a => a.cnic === agentCnic ? { ...a, status: 'Left', leftDate } : a));
      } else {
        alert("Update Failed: " + error.message);
      }
    }
  };

// 3. Reactivate (Use cnic)
  const handleReactivateAgent = async (agentCnic) => {
    if (window.confirm('Reactivate?')) {
      // [FIX] Use .eq('cnic', ...)
      const { error } = await supabase.from('agents').update({ status: 'Active', leftDate: null }).eq('cnic', agentCnic);
      if (!error) {
         setAgents(agents.map(a => a.cnic === agentCnic ? { ...a, status: 'Active', leftDate: null } : a));
      }
    }
  };

// 4. Delete (Use cnic)
  const handleDeleteAgent = async (agentCnic) => {
    if (window.confirm('Delete this agent?')) {
      // [FIX] Use .eq('cnic', ...)
      const { error } = await supabase.from('agents').delete().eq('cnic', agentCnic);
      if (!error) setAgents(agents.filter(a => a.cnic !== agentCnic));
    }
  };


// [FIXED] Add Sale (Manual) with Correct Status Logic
  const handleAddSale = async (formData) => {
    const { amount, ...restOfData } = formData; 

    // Generate Timestamp manually
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const formattedTimestamp = `${mm}/${dd}/${yyyy} ${hh}:${min}:${ss}`;

    const disposition = formData.disposition ? formData.disposition.trim() : '';

    const newSale = {
      timestamp: formattedTimestamp,
      ...restOfData,
      // [FIX] Strict check for Sale status
      status: (disposition === 'HW- Xfer' || disposition === 'HW-IBXfer') ? 'Sale' : 'Unsuccessful',
      date: new Date().toISOString().split('T')[0],
      month: selectedMonth
    };

    const { data, error } = await supabase.from('sales').insert([newSale]).select();

    if (error) {
      alert('Error adding sale: ' + error.message);
    } else {
      setSales([...sales, ...data]);
      setShowAddSale(false);
    }
  };

  // [FIX] Edit Sale - Now saves to Database
  const handleEditSale = async (formData) => {
    const updatedStatus = (formData.disposition === 'HW- Xfer' || formData.disposition === 'HW-IBXfer') ? 'Sale' : 'Unsuccessful';
    const { error } = await supabase.from('sales').update({ ...formData, status: updatedStatus }).eq('id', editSale.id);

    if (error) { alert('Error updating sale'); }
    else {
      setSales(sales.map(s => s.id === editSale.id ? { ...s, ...formData, status: updatedStatus } : s));
      setEditSale(null);
    }
  };

  // [FIX] Update Sale Field directly to DB
  const updateSaleField = async (saleId, field, value) => {
    const { error } = await supabase.from('sales').update({ [field]: value }).eq('id', saleId);
    if (!error) {
       // Logic for fine on Dock Details
       if (field === 'dockDetails' && value && value.trim()) {
           const sale = sales.find(s => s.id === saleId);
           if (!sale.dockDetails || sale.dockDetails !== value) {
               const newFine = {
                 agentName: sale.agentName,
                 reason: `Dock Details: ${value}`,
                 amount: 1000,
                 date: new Date().toISOString().split('T')[0],
                 month: selectedMonth
               };
               // Save fine to DB
               const { data: fineData } = await supabase.from('fines').insert([newFine]).select();
               if(fineData) setFines(prev => [...prev, ...fineData]);
           }
       }
       setSales(prev => prev.map(s => s.id === saleId ? { ...s, [field]: value } : s));
    }
  };

  // Update Disposition
  const updateSaleDisposition = async (saleId, newDisposition) => {
    const newStatus = (newDisposition === 'HW- Xfer' || newDisposition === 'HW-IBXfer') ? 'Sale' : 'Unsuccessful';
    const { error } = await supabase.from('sales').update({ disposition: newDisposition, status: newStatus }).eq('id', saleId);
    if (!error) {
       setSales(sales.map(s => s.id === saleId ? { ...s, disposition: newDisposition, status: newStatus } : s));
    }
  };

  // Add Fine
  const handleAddFine = async (formData) => {
    const newFine = { ...formData, date: new Date().toISOString().split('T')[0], month: selectedMonth };
    const { data, error } = await supabase.from('fines').insert([newFine]).select();
    if (!error) { setFines([...fines, ...data]); setShowAddFine(false); }
  };

  // Add Bonus
  const handleAddBonus = async (formData) => {
    const newBonus = { ...formData, month: selectedMonth };
    const { data, error } = await supabase.from('bonuses').insert([newBonus]).select();
    if (!error) { setBonuses([...bonuses, ...data]); setShowAddBonus(false); }
  };

  // [NEW] Add Employee (HR)
  const handleAddEmployee = async (formData) => {
    const { data, error } = await supabase.from('hr_records').insert([formData]).select();
    if(error) alert('Error adding employee: ' + error.message);
    else {
      setHrRecords([...hrRecords, ...data]);
      setShowAddEmployee(false);
    }
  };

// [FIXED] Handle Import Function
 // [FIXED] Handle Import with Duplicate Prevention
  const handleImport = (file, lateTimeVal) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      let lines = [];
      if (file.name.endsWith('.csv')) {
        const text = e.target.result;
        lines = text.split('\n').filter(line => line.trim());
      } else {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          lines = rows.map(row => row.map(cell => (cell === null || cell === undefined) ? '' : cell).join(',')).filter(line => line.trim());
        } catch (error) {
          const text = new TextDecoder().decode(e.target.result);
          lines = text.split('\n').filter(line => line.trim());
        }
      }
      
      // --- IMPORT AGENTS ---
      if (importType === 'agents') {
        const newAgents = lines.slice(1).map((line, idx) => {
          const values = line.split(',').map(v => v.trim());
          if(!values[0]) return null;
          return {
            name: values[0], 
            team: values[1], 
            // [FIX] Map 3rd column to 'center' instead of 'shift'
            center: values[2] || 'Phase 7', 
            baseSalary: parseInt(values[3]) || 0,
            cnic: values[5] || '', 
            password: '123', 
            status: 'Active',
            activeDate: new Date().toISOString().split('T')[0], 
            leftDate: null
          };
        }).filter(Boolean);

        const { data, error } = await supabase.from('agents').insert(newAgents).select();
        if(!error) {
            setAgents([...agents, ...data]);
            alert('Success! Agents imported.');
        } else {
            alert('Agents Import Failed: ' + error.message);
        }

      // --- IMPORT SALES ---
       // --- IMPORT SALES (FIXED DATE LOGIC) ---
      } else if (importType === 'sales') {
        const newSales = lines.slice(1).map((line, idx) => {
          const values = line.split(',').map(v => v.trim());
          if(!values[1]) return null; 
          
          const disposition = values[12] ? values[12].trim() : '';
          const timestampRaw = values[0]; // e.g., "12/29/2025 17:22:38"

          // [FIX] Extract Date correctly from CSV Timestamp
          let finalDate = new Date().toISOString().split('T')[0]; // Default: Today
          
          if (timestampRaw) {
             const d = new Date(timestampRaw);
             if (!isNaN(d.getTime())) {
                // Manually construct YYYY-MM-DD to avoid timezone shifting
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                finalDate = `${year}-${month}-${day}`;
             }
          }

          return {
            timestamp: timestampRaw || new Date().toISOString(), 
            agentName: values[1] || '',      
            customerName: values[2] || '',   
            phoneNumber: values[3] || '',    
            state: values[4] || '',          
            zip: values[5] || '',            
            address: values[6] || '',        
            campaignType: values[7] || '',   
            center: values[8] || '',         
            teamLead: values[9] || '',       
            comments: values[10] || '',      
            listId: values[11] || '',        
            
            disposition: disposition, 
            duration: values[13] || '', 
            xferTime: values[14] || '',
            xferAttempts: values[15] || '', 
            feedbackBeforeXfer: values[16] || '', 
            feedbackAfterXfer: values[17] || '',
            grading: values[18] || '', 
            dockDetails: values[19] || '', 
            evaluator: values[20] || '',
            
            status: (disposition === 'HW- Xfer' || disposition === 'HW-IBXfer') ? 'Sale' : 'Unsuccessful',
            
            // [FIX] Use the date extracted from CSV, not "Today"
            date: finalDate, 
            month: selectedMonth
          };
        }).filter(Boolean);

        const { data, error } = await supabase.from('sales').insert(newSales).select();
        if(!error) setSales([...sales, ...data]);
        else alert('Sales Import Failed: ' + error.message);

      // --- IMPORT ATTENDANCE (WITH DUPLICATE CHECK) ---
      } else if (importType === 'attendance') {
         const rows = lines.map(line => line.split(',').map(v => v.trim()));
         const dataRows = rows.slice(1);
         const dateMap = {};
         
         // 1. Parse CSV Data
         dataRows.forEach(row => {
            const name = row[2] ? row[2].trim().toLowerCase() : '';
            const timeStr = row[3] ? row[3].trim() : '';
            if (name && timeStr) {
               const dateTimeRegex = /(\d{1,2}\/\d{1,2}\/\d{4}) (\d{1,2}:\d{2}(:\d{2})?) ?(AM|PM)/i;
               const match = timeStr.match(dateTimeRegex);
               if (match) {
                 let [_, datePart, timePart, __, ampm] = match;
                 timePart = timePart + ' ' + ampm;
                 const dateParts = datePart.split('/');
                 let month = dateParts[0]; let day = dateParts[1];
                 if (parseInt(month) > 12) [month, day] = [day, month];
                 month = month.padStart(2, '0'); day = day.padStart(2, '0');
                 const date = `${dateParts[2]}-${month}-${day}`;
                 const timeParts = timePart.split(' ');
                 const hm = timeParts[0].split(':');
                 let hour = parseInt(hm[0]);
                 if (timeParts[1].toUpperCase() === 'PM' && hour !== 12) hour += 12;
                 if (timeParts[1].toUpperCase() === 'AM' && hour === 12) hour = 0;
                 const time = `${hour.toString().padStart(2, '0')}:${hm[1]}`;
                 if (!dateMap[date]) dateMap[date] = {};
                 if (!dateMap[date][name]) dateMap[date][name] = new Set();
                 dateMap[date][name].add(time);
               }
            }
         });

         const activeAgents = agents.filter(a => a.status === 'Active');
         const newAttendance = [];
         const threshold = lateTimeVal || lateTime;

         // 2. Build Potential New Records
         Object.keys(dateMap).forEach(date => {
           activeAgents.forEach(agent => {
             const agentKey = agent.name.toLowerCase();
             const times = dateMap[date][agentKey] ? Array.from(dateMap[date][agentKey]).sort() : [];
             const status = times.length > 0 ? 'Present' : 'Absent';
             const loginTime = times.length > 0 ? times[0] : '';
             const logoutTime = times.length > 1 ? times[times.length - 1] : '';
             const isLate = (loginTime && threshold && loginTime > threshold) ? true : false;
             
             newAttendance.push({
               date: date, agentName: agent.name, loginTime: loginTime,
               logoutTime: logoutTime, status: status, late: isLate
             });
           });
         });

         // 3. [NEW] Filter Out Duplicates
         // Only keep records where NO match is found in existing 'attendance' state
         const uniqueAttendance = newAttendance.filter(newItem => {
            const isDuplicate = attendance.some(existingItem => 
                existingItem.agentName === newItem.agentName &&
                existingItem.date === newItem.date &&
                existingItem.loginTime === newItem.loginTime
            );
            return !isDuplicate;
         });

         // 4. Insert Unique Records Only
         if (uniqueAttendance.length === 0) {
             alert("All records are duplicates. No new data added.");
         } else {
             const { data, error } = await supabase.from('attendance').insert(uniqueAttendance).select();
             if(!error) { 
                 setAttendance([...attendance, ...data]); 
                 alert(`Success! Added ${data.length} new records. (${newAttendance.length - data.length} duplicates skipped)`); 
             } 
             else { alert('Attendance Import Failed: ' + error.message); }
         }
      }
      setShowImportModal(false);
    };
    if (file.name.endsWith('.csv')) { reader.readAsText(file); } 
    else { reader.readAsArrayBuffer(file); }
  };

  // --- FINE HANDLERS ---
  const handleEditFine = async (formData) => {
    const { error } = await supabase.from('fines').update(formData).eq('id', editingFine.id);
    if (error) alert('Error updating fine: ' + error.message);
    else {
      setFines(fines.map(f => f.id === editingFine.id ? { ...f, ...formData } : f));
      setShowAddFine(false);
      setEditingFine(null);
    }
  };

  const handleDeleteFine = async (id) => {
    if (window.confirm('Delete this fine?')) {
      const { error } = await supabase.from('fines').delete().eq('id', id);
      if (!error) setFines(fines.filter(f => f.id !== id));
    }
  };

  // --- BONUS HANDLERS ---
  const handleEditBonus = async (formData) => {
    const { error } = await supabase.from('bonuses').update(formData).eq('id', editingBonus.id);
    if (error) alert('Error updating bonus: ' + error.message);
    else {
      setBonuses(bonuses.map(b => b.id === editingBonus.id ? { ...b, ...formData } : b));
      setShowAddBonus(false);
      setEditingBonus(null);
    }
  };

  const handleDeleteBonus = async (id) => {
    if (window.confirm('Delete this bonus?')) {
      const { error } = await supabase.from('bonuses').delete().eq('id', id);
      if (!error) setBonuses(bonuses.filter(b => b.id !== id));
    }
  };

  // --- HR HANDLERS ---
  const handleEditHR = async (formData) => {
    const { error } = await supabase.from('hr_records').update(formData).eq('id', editingHR.id);
    if (error) alert('Error updating employee: ' + error.message);
    else {
      setHrRecords(hrRecords.map(h => h.id === editingHR.id ? { ...h, ...formData } : h));
      setShowAddEmployee(false);
      setEditingHR(null);
    }
  };

  const handleToggleHRStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Active' ? 'Left' : 'Active';
    const { error } = await supabase.from('hr_records').update({ status: newStatus }).eq('id', id);
    if (!error) {
       setHrRecords(hrRecords.map(h => h.id === id ? { ...h, status: newStatus } : h));
    }
  };

  const handleDeleteHR = async (id) => {
    if (window.confirm('Delete this employee record?')) {
      const { error } = await supabase.from('hr_records').delete().eq('id', id);
      if (!error) setHrRecords(hrRecords.filter(h => h.id !== id));
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const csv = monthlyStats.map(a => 
      `${a.name},${a.team},${a.baseSalary},${a.totalSales},${a.totalBonuses},${a.totalFines},${a.netSalary}`
    ).join('\n');
    const header = 'Agent Name,Team,Base Salary,Sales,Bonus,Fines,Net Salary\n';
    const blob = new Blob([header + csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll_${selectedMonth.replace(' ', '_')}.csv`;
    a.click();
  };

  // LOGIN SCREEN
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-100 p-4 rounded-full">
              <Lock className="w-10 h-10 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-center text-slate-800 mb-2">Welcome Back</h1>
          <p className="text-center text-slate-500 mb-8">Login to Shark Management System</p>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Username</label>
              <input 
  type="text" 
  className="w-full px-4 py-3 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-slate-700 text-white placeholder-slate-400"
                placeholder="Enter username"
                value={loginData.name}
                onChange={e => setLoginData({...loginData, name: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
              <input 
  type="password" 
  className="w-full px-4 py-3 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-slate-700 text-white placeholder-slate-400"
                placeholder="••••••••"
                value={loginData.password}
                onChange={e => setLoginData({...loginData, password: e.target.value})}
                required
              />
            </div>

            {loginError && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">{loginError}</span>
              </div>
            )}

            <button 
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Sign In
            </button>
          </form>
          
          <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-semibold text-slate-600 mb-2">Demo Credentials:</p>
            <div className="space-y-1 text-xs text-slate-600">
              <p><span className="font-bold">Admin:</span> Admin / admin123</p>
              <p><span className="font-bold">QA:</span> QA / qa123</p>
              <p><span className="font-bold">HR:</span> HR / hr123</p>
              <p><span className="font-bold">Agent:</span> Ahmed Khan / 123</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MAIN DASHBOARD
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 text-white p-2 rounded-lg">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Shark Management System</h1>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span className={`px-2 py-0.5 rounded-full font-medium ${
                    userRole === 'Admin' ? 'bg-purple-100 text-purple-700' : 
                    userRole === 'QA' ? 'bg-orange-100 text-orange-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {userRole}
                  </span>
                  <span>• {currentUser?.name}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* [NEW] Optimistic Native Month Picker */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input 
                  type="month"
                  value={getMonthInputValue(selectedMonth)}
                  onChange={handleMonthChange}
                  className="pl-10 pr-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 [color-scheme:dark]"
                />
              </div>

              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-red-400 hover:bg-slate-700 rounded-lg transition"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto">
            {['dashboard', 'sales', 'attendance', 'payroll'].map(tab => {
              if (userRole === 'Agent' && (tab === 'payroll')) return null;
              
              return (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setSearchQuery('');
                    setTeamFilter('All');
                    setStatusFilter('All');
                  }}
                  className={`px-6 py-3 text-sm font-medium capitalize transition-colors whitespace-nowrap ${
  activeTab === tab
    ? 'border-b-2 border-blue-400 text-blue-400'
    : 'text-slate-400 hover:text-white'
}`}
                >
                  {tab}
                </button>
              );
            })}

            <button 
              onClick={() => { setActiveTab('monthly_matrix'); setSearchQuery(''); }}
              className={`px-6 py-3 text-sm font-medium capitalize whitespace-nowrap transition-colors ${
                activeTab === 'monthly_matrix' 
                  ? 'border-b-2 border-blue-400 text-blue-400' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly Matrix
            </button>

            {userRole === 'Admin' && (
              <>
                <button
                  onClick={() => { setActiveTab('agents'); setSearchQuery(''); }}
                  className={`px-6 py-3 text-sm font-medium capitalize transition-colors ${activeTab === 'agents' ? 'border-b-2 border-blue-400 text-blue-400' : 'text-slate-400 hover:text-white'}`}
                >
                  Agents
                </button>
                <button
                  onClick={() => { setActiveTab('fines'); setSearchQuery(''); }}
                  className={`px-6 py-3 text-sm font-medium capitalize transition-colors ${activeTab === 'fines' ? 'border-b-2 border-blue-400 text-blue-400' : 'text-slate-400 hover:text-white'}`}
                >
                  Fines
                </button>
                <button
                  onClick={() => { setActiveTab('bonuses'); setSearchQuery(''); }}
                  className={`px-6 py-3 text-sm font-medium capitalize transition-colors ${activeTab === 'bonuses' ? 'border-b-2 border-blue-400 text-blue-400' : 'text-slate-400 hover:text-white'}`}
                >
                  Bonuses
                </button>
              </>
            )}
            {/* [NEW] HR Tab */}
            {(userRole === 'Admin' || userRole === 'HR') && (
              <button
                  onClick={() => { setActiveTab('hr'); setSearchQuery(''); }}
                  className={`px-6 py-3 text-sm font-medium capitalize transition-colors ${activeTab === 'hr' ? 'border-b-2 border-blue-400 text-blue-400' : 'text-slate-400 hover:text-white'}`}
              >
                  HR Team
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* [NEW] Add Filter Bar Here */}
    <DateFilterBar 
        filterType={filterType} setFilterType={setFilterType}
        dateVal={customStartDate} setDateVal={setCustomStartDate}
        endVal={customEndDate} setEndVal={setCustomEndDate}
        selectedMonth={selectedMonth} handleMonthChange={handleMonthChange}
    />
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {userRole === 'Admin' && (
                <StatCard
                  icon={<Users className="w-6 h-6" />}
                  label="Active Agents"
                  value={dashboardStats.totalAgents}
                  color="blue"
                />
              )}
              <StatCard
                icon={<TrendingUp className="w-6 h-6" />}
                label="Total Sales"
                value={dashboardStats.totalSalesCount}
                color="green"
              />
              <StatCard
                icon={<DollarSign className="w-6 h-6" />}
                label="Revenue"
                value={`${(dashboardStats.totalRevenue / 1000).toFixed(0)}K PKR`}
                color="purple"
              />
              {userRole === 'Admin' && (
                <StatCard
                  icon={<Calendar className="w-6 h-6" />}
                  label="Total Payroll"
                  value={`${(dashboardStats.totalPayroll / 1000).toFixed(0)}K PKR`}
                  color="orange"
                />
              )}
            </div>

            {/* Top Performers */}
            <div className="bg-slate-800/50 rounded-xl shadow-sm border border-slate-600 p-4">
              <h2 className="text-lg font-semibold text-white mb-4">
                {userRole === 'Agent' ? 'My Performance' : 'Top Performers'} - {selectedMonth}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      {userRole !== 'Agent' && <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">Rank</th>}
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">Agent</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">Team</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-200">Sales</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-200">Revenue</th>
                      {userRole !== 'Agent' && <th className="text-right py-3 px-4 text-sm font-medium text-slate-200">Net Salary</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPerformerStats.slice(0, userRole === 'Agent' ? 1 : 10).map((agent, idx) => (
                    <tr key={agent.id || idx} className="border-b border-slate-700 hover:bg-slate-700">
                        {userRole !== 'Agent' && (
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                              idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                              idx === 1 ? 'bg-slate-100 text-slate-700' :
                              idx === 2 ? 'bg-orange-100 text-orange-700' :
                              'bg-slate-50 text-slate-600'
                            }`}>
                              {idx + 1}
                            </span>
                          </td>
                        )}
                        <td className="py-3 px-4 font-medium text-white">{agent.name}</td>
                        <td className="py-3 px-4 text-slate-300">{agent.team}</td>
                        <td className="py-3 px-4 text-right font-semibold text-green-600">{agent.totalSales}</td>
                        <td className="py-3 px-4 text-right text-slate-100">{agent.totalRevenue.toLocaleString()} PKR</td>
                        {userRole !== 'Agent' && (
                          <td className="py-3 px-4 text-right font-semibold text-blue-600">{agent.netSalary.toLocaleString()} PKR</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* [NEW] HR Tab Content */}
       {/* HR Tab */}
        {activeTab === 'hr' && (
          <div className="space-y-6">
             <div className="flex justify-between items-center">
                 <h2 className="text-xl font-semibold text-white">HR - Employment Data</h2>
                 <button onClick={() => setShowAddEmployee(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <Plus className="w-4 h-4"/> Add Employee
                 </button>
             </div>

             <div className="bg-slate-800/50 rounded-xl shadow-sm border border-slate-600 p-4">
                <input type="text" placeholder="Search employee..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 placeholder-slate-400 w-full" />
             </div>

             <div className="bg-slate-800/80 rounded-xl shadow-sm border border-slate-600 overflow-hidden">
                 <table className="w-full text-left">
                     <thead className="bg-slate-900">
                         <tr>
                             <th className="py-3 px-4 text-sm font-medium text-slate-200">No.</th>
                             <th className="py-3 px-4 text-sm font-medium text-slate-200">Name</th>
                             <th className="py-3 px-4 text-sm font-medium text-slate-200">Designation</th>
                             <th className="py-3 px-4 text-sm font-medium text-slate-200">CNIC</th>
                             <th className="py-3 px-4 text-sm font-medium text-slate-200">Joining Date</th>
                             <th className="py-3 px-4 text-sm font-medium text-slate-200">Status</th>
                             <th className="py-3 px-4 text-sm font-medium text-center text-slate-200">Actions</th>
                         </tr>
                     </thead>
                     <tbody>
                         {filteredHR.map((rec, idx) => (
                             <tr key={rec.id} className="border-b border-slate-700 hover:bg-slate-700">
                                 <td className="py-3 px-4 text-slate-300">{idx + 1}</td>
                                 <td className="py-3 px-4 text-white font-medium">{rec.agent_name}</td>
                                 <td className="py-3 px-4 text-slate-300">{rec.designation}</td>
                                 <td className="py-3 px-4 text-slate-300">{rec.cnic}</td>
                                 <td className="py-3 px-4 text-slate-300">{rec.joining_date}</td>
                                 <td className="py-3 px-4">
                                     <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        (rec.status || 'Active') === 'Active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                     }`}>
                                        {rec.status || 'Active'}
                                     </span>
                                 </td>
                                 <td className="py-3 px-4">
                                    <div className="flex items-center justify-center gap-2">
                                        <button onClick={() => { setEditingHR(rec); setShowAddEmployee(true); }} className="p-1.5 bg-blue-500/10 text-blue-400 rounded hover:bg-blue-500/20" title="Edit"><Pencil className="w-4 h-4" /></button>
                                        <button onClick={() => handleToggleHRStatus(rec.id, rec.status || 'Active')} className={`p-1.5 rounded transition-colors ${rec.status === 'Active' ? 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`} title={rec.status === 'Active' ? "Mark Left" : "Reactivate"}>
                                            {rec.status === 'Active' ? <UserX className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                                        </button>
                                        <button onClick={() => handleDeleteHR(rec.id)} className="p-1.5 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20" title="Delete"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
          </div>
        )}

        {/* Agents Tab */}
        {activeTab === 'agents' && (
          
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Agent Management</h2>
              <div className="flex gap-3">
                {userRole === 'Admin' && (
                  <>
                    <button
                      onClick={() => { setImportType('agents'); setShowImportModal(true); }}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Import CSV
                    </button>
                    <button
                      onClick={() => setShowAddAgent(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Agent
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Search and Filters */}
          {/* Search and Filters */}
            <div className="bg-slate-800/50 rounded-xl shadow-sm border border-slate-600 p-4">
              <div className="grid grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="Search agents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={teamFilter}
                  onChange={(e) => setTeamFilter(e.target.value)}
                  className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>All Teams</option>
                  <option>Team A</option>
                  <option>Team B</option>
                  <option>Team C</option>
                </select>

                {/* [FIX] Center Filter instead of Shift */}
                <select
                  value={centerFilter}
                  onChange={(e) => setCenterFilter(e.target.value)}
                  className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>All Centers</option>
                  <option>Phase 4 - HomeWarranty</option>
                  <option>Phase 4 - 5th Floor</option>
                  <option>Phase 7</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>All Status</option>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>
            </div>

            {/* Agents Table */}
            <div className="bg-slate-800/80 rounded-xl shadow-sm border border-slate-600 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">No.</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">CNIC</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">Team</th>
                    {/* [FIX] Changed Header to Center */}
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">Center</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-200">Base Salary</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-slate-200">Status</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-slate-200">Active Date</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-slate-200">Left Date</th>
                    {userRole === 'Admin' && (
                      <th className="text-center py-3 px-4 text-sm font-medium text-slate-200">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredAgents.map((agent, idx) => (
                    <tr key={agent.cnic || idx} className="border-b border-slate-700 hover:bg-slate-700">
                      <td className="py-3 px-4 text-slate-300">{idx + 1}</td>
                      <td className="py-3 px-4 font-medium text-white">{agent.name}</td>
                      <td className="py-3 px-4 text-slate-400 text-xs font-mono">{agent.cnic || '-'}</td>
                      <td className="py-3 px-4 text-slate-300">{agent.team}</td>
                      
                      {/* [FIX] Display Center */}
                      <td className="py-3 px-4 text-slate-300 text-xs">{agent.center || '-'}</td>
                      
                      <td className="py-3 px-4 text-right text-slate-100">
                        {agent.baseSalary ? agent.baseSalary.toLocaleString() : 0}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          agent.status === 'Active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {agent.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-400 text-xs">
                        {agent.activeDate || '-'}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-400 text-xs">
                        {agent.leftDate || '-'}
                      </td>

                      {userRole === 'Admin' && (
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => { setEditingAgent(agent); setShowEditAgent(true); }}
                              className="p-1.5 bg-blue-500/10 text-blue-400 rounded hover:bg-blue-500/20 transition-colors"
                              title="Edit Agent"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            {agent.status === 'Active' ? (
                              <button
                                onClick={() => handleMarkAsLeft(agent.cnic)} 
                                className="p-1.5 bg-orange-500/10 text-orange-400 rounded hover:bg-orange-500/20 transition-colors"
                                title="Mark as Left"
                              >
                                <UserX className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleReactivateAgent(agent.cnic)}
                                className="p-1.5 bg-green-500/10 text-green-400 rounded hover:bg-green-500/20 transition-colors"
                                title="Reactivate"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteAgent(agent.cnic)}
                              className="p-1.5 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 transition-colors"
                              title="Delete Agent"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sales Tab */}
        {activeTab === 'sales' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Sales Management</h2>
              <div className="flex gap-3">
                {userRole === 'Admin' && (
                  <>
                    <button
                      onClick={() => { setImportType('sales'); setShowImportModal(true); }}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Import CSV
                    </button>
                    <button
                      onClick={() => {
                        const name = window.prompt('Enter evaluator name:');
                        if (name && name.trim()) {
                          setEvaluators(prev => [...prev, name.trim()]);
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Evaluator
                    </button>
                  </>
                )}
                {(userRole === 'Admin' || userRole === 'Agent') && (
                  <button
                    onClick={() => setShowAddSale(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Submit Sale
                  </button>
                )}
              </div>
            </div>
{/* [NEW] Add Filter Bar Here */}
    <DateFilterBar 
        filterType={filterType} setFilterType={setFilterType}
        dateVal={customStartDate} setDateVal={setCustomStartDate}
        endVal={customEndDate} setEndVal={setCustomEndDate}
        selectedMonth={selectedMonth} handleMonthChange={handleMonthChange}
    />
            {/* Search and Filters */}
            <div className="bg-slate-800/50 rounded-xl shadow-sm border border-slate-600 p-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Search by agent or campaign..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>All Status</option>
                  <option>Sale</option>
                  <option>Unsuccessful</option>
                </select>
              </div>
            </div>
          <div className="bg-slate-800/80 rounded-xl shadow-sm border border-slate-600 overflow-x-auto">
              <table className="w-full min-w-max">
                <thead className="bg-slate-900">
                  <tr>
                    {/* [NEW] Row Number Header */}
                    <th className="text-left py-3 px-2 text-xs font-medium text-slate-200">No.</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-slate-200">Timestamp</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-slate-200">Agent Name</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-slate-200">Customer Name</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-slate-200">Phone Number</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-slate-200">State</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-slate-200">Zip</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-slate-200">Address</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-slate-200">Campaign Type</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-slate-200">Center</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-slate-200">Team Lead</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-slate-200">Comments</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-slate-200">List ID</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-slate-200">Disposition</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-slate-200">Duration</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-slate-200">Xfer Time</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-slate-200">Xfer Attempts</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-slate-200">Feedback (Before Xfer)</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-slate-200">Feedback (After Xfer)</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-slate-200">Grading</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-slate-200">Dock Details</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-slate-200">Evaluator</th>
                    {(userRole === 'Admin' || userRole === 'QA') && <th className="text-center py-3 px-2 text-xs font-medium text-slate-200">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((sale, idx) => (
                    <tr key={sale.id} className="border-b border-slate-700 hover:bg-slate-700">
                      {/* [NEW] Row Number Cell */}
                      <td className="py-2 px-2 text-xs text-slate-300">{idx + 1}</td>
                      <td className="py-2 px-2 text-xs text-slate-300">{sale.timestamp || sale.date}</td>
                      <td className="py-2 px-2 text-xs font-medium text-white">{sale.agentName}</td>
                      <td className="py-2 px-2 text-xs text-slate-300">{sale.customerName || '-'}</td>
                      <td className="py-2 px-2 text-xs text-slate-300">{sale.phoneNumber || '-'}</td>
                      <td className="py-2 px-2 text-xs text-slate-300">{sale.state || '-'}</td>
                      <td className="py-2 px-2 text-xs text-slate-300">{sale.zip || '-'}</td>
                      <td className="py-2 px-2 text-xs text-slate-300">{sale.address || '-'}</td>
                      <td className="py-2 px-2 text-xs text-slate-300">{sale.campaignType || '-'}</td>
                      <td className="py-2 px-2 text-xs text-slate-300">{sale.center || '-'}</td>
                      <td className="py-2 px-2 text-xs text-slate-300">{sale.teamLead || '-'}</td>
                      <td className="py-2 px-2 text-xs text-slate-300">{sale.comments || '-'}</td>
                      <td className="py-2 px-2 text-xs text-slate-300">{sale.listId || '-'}</td>
                      {/* (Keep the rest of your Sales columns exactly as they were...) */}
                      {(userRole === 'Admin' || userRole === 'QA') ? (
                        <td className="py-2 px-2">
                          <select
                            value={sale.disposition || ''}
                            onChange={(e) => updateSaleDisposition(sale.id, e.target.value)}
                            className="w-full px-1 py-1 text-xs bg-slate-700 text-white border border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">-</option>
                            <option>HW- Xfer</option>
		<option>HW-IBXfer</option>
		<option>Unsuccessful</option>
		<option>HUWT</option>
		<option>DNC</option>
		<option>DNQ</option>
		<option>DNQ-Dup</option>
		<option>HW-Xfer-CDR</option>
		<option>DNQ-Webform</option>
		<option>Review Pending</option>
                          </select>
                        </td>
                      ) : (
                        <td className="py-2 px-2 text-xs text-slate-300">{sale.disposition || '-'}</td>
                      )}


                      <td className="py-2 px-2">
                        {(userRole === 'Admin' || userRole === 'QA') ? (
                          <input
                            type="text"
                            value={sale.duration || ''}
                            onChange={(e) => updateSaleField(sale.id, 'duration', e.target.value)}
                            className="w-full px-1 py-1 text-xs bg-slate-700 text-white border border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="text-xs text-slate-300">{sale.duration || '-'}</span>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        {(userRole === 'Admin' || userRole === 'QA') ? (
                          <input
                            type="text"
                            value={sale.xferTime || ''}
                            onChange={(e) => updateSaleField(sale.id, 'xferTime', e.target.value)}
                            className="w-full px-1 py-1 text-xs bg-slate-700 text-white border border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="text-xs text-slate-300">{sale.xferTime || '-'}</span>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        {(userRole === 'Admin' || userRole === 'QA') ? (
                          <select
                            value={sale.xferAttempts || ''}
                            onChange={(e) => updateSaleField(sale.id, 'xferAttempts', e.target.value)}
                            className="w-full px-1 py-1 text-xs bg-slate-700 text-white border border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">-</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                            <option value="5">5</option>
                          </select>
                        ) : (
                          <span className="text-xs text-slate-300">{sale.xferAttempts || '-'}</span>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        {(userRole === 'Admin' || userRole === 'QA') ? (
                          <input
                            type="text"
                            value={sale.feedbackBeforeXfer || ''}
                            onChange={(e) => updateSaleField(sale.id, 'feedbackBeforeXfer', e.target.value)}
                            className="w-full px-1 py-1 text-xs bg-slate-700 text-white border border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="text-xs text-slate-300">{sale.feedbackBeforeXfer || '-'}</span>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        {(userRole === 'Admin' || userRole === 'QA') ? (
                          <input
                            type="text"
                            value={sale.feedbackAfterXfer || ''}
                            onChange={(e) => updateSaleField(sale.id, 'feedbackAfterXfer', e.target.value)}
                            className="w-full px-1 py-1 text-xs bg-slate-700 text-white border border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="text-xs text-slate-300">{sale.feedbackAfterXfer || '-'}</span>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        {(userRole === 'Admin' || userRole === 'QA') ? (
                          <select
                            value={sale.grading || ''}
                            onChange={(e) => updateSaleField(sale.id, 'grading', e.target.value)}
                            className="w-full px-1 py-1 text-xs bg-slate-700 text-white border border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">-</option>
                            <option value="Good">Good</option>
                            <option value="Bad">Bad</option>
                            <option value="Worst">Worst</option>
                          </select>
                        ) : (
                          <span className="text-xs text-slate-300">{sale.grading || '-'}</span>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        {(userRole === 'Admin' || userRole === 'QA') ? (
                          <input
                            type="text"
                            value={sale.dockDetails || ''}
                            onChange={(e) => updateSaleField(sale.id, 'dockDetails', e.target.value)}
                            className="w-full px-1 py-1 text-xs bg-slate-700 text-white border border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="text-xs text-slate-300">{sale.dockDetails || '-'}</span>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        {(userRole === 'Admin' || userRole === 'QA') ? (
                          <select
                            value={sale.evaluator || ''}
                            onChange={(e) => updateSaleField(sale.id, 'evaluator', e.target.value)}
                            className="w-full px-1 py-1 text-xs bg-slate-700 text-white border border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">-</option>
                            {evaluators.map(e => <option key={e} value={e}>{e}</option>)}
                          </select>
                        ) : (
                          <span className="text-xs text-slate-300">{sale.evaluator || '-'}</span>
                        )}
                      </td>

                      {(userRole === 'Admin' || userRole === 'QA') && (
                        <td className="py-2 px-2 text-center">
                          <button 
		onClick={() => setEditSale(sale)} 
		className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
			>
			Edit
			</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

{/* Attendance Tab */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            {/* Header Section */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Attendance Records</h2>
              <div className="flex gap-3">
                {/* Late Time Button */}
                {userRole === 'Admin' && (
                  <button 
                    onClick={() => setShowLateTimeModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors border border-slate-600"
                  >
                    <Clock className="w-4 h-4" />
                    Set Threshold: {formatTime(lateTime)}
                  </button>
                )}

                {/* Import Button */}
                {userRole === 'Admin' && (
                  <button 
                    onClick={() => { setImportType('attendance'); setShowImportModal(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Import from Machine
                  </button>
                )}
              </div>
            </div>
{/* [NEW] Add Filter Bar Here */}
    <DateFilterBar 
        filterType={filterType} setFilterType={setFilterType}
        dateVal={customStartDate} setDateVal={setCustomStartDate}
        endVal={customEndDate} setEndVal={setCustomEndDate}
        selectedMonth={selectedMonth} handleMonthChange={handleMonthChange}
    />
            {/* Search Section */}
            <div className="bg-slate-800/50 rounded-xl shadow-sm border border-slate-600 p-4">
              <input
                type="text"
                placeholder="Search by agent name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-white placeholder-slate-400"
              />
            </div>

            {/* Table Section */}
            <div className="bg-slate-800/80 rounded-xl shadow-sm border border-slate-600 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">No.</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">Agent</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">Login</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">Logout</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-slate-200">Status</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-slate-200">Late</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendance.map((record, idx) => (
                    <tr key={record.id} className="border-b border-slate-700 hover:bg-slate-700">
                      <td className="py-3 px-4 text-slate-300">{idx + 1}</td>
                      <td className="py-3 px-4 text-slate-300">{record.date}</td>
                      <td className="py-3 px-4 font-medium text-white">{record.agentName}</td>
                      <td className="py-3 px-4 text-slate-300">{formatTime(record.loginTime)}</td>
                      <td className="py-3 px-4 text-slate-300">{formatTime(record.logoutTime)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${record.status === 'Present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{record.status}</span>
                      </td>
                      <td className="py-3 px-4 text-center">{record.late && <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">Late</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

       {/* Fines Tab */}
        {activeTab === 'fines' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Fines Management</h2>
              {userRole === 'Admin' && (
                <button onClick={() => setShowAddFine(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"><Plus className="w-4 h-4" /> Add Fine</button>
              )}
            </div>
            {/* Search ... (Keep existing search div) */} 
            <div className="bg-slate-800/50 rounded-xl shadow-sm border border-slate-600 p-4">
              <input type="text" placeholder="Search by agent or reason..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-white placeholder-slate-400" />
            </div>

            <div className="bg-slate-800/80 rounded-xl shadow-sm border border-slate-600 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">No.</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">Agent</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">Reason</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-200">Amount</th>
                    {userRole === 'Admin' && <th className="text-center py-3 px-4 text-sm font-medium text-slate-200">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredFines.map((fine, idx) => (
                    <tr key={fine.id} className="border-b border-slate-700 hover:bg-slate-700">
                      <td className="py-3 px-4 text-slate-300">{idx + 1}</td>
                      <td className="py-3 px-4 text-slate-300">{fine.date}</td>
                      <td className="py-3 px-4 font-medium text-white">{fine.agentName}</td>
                      <td className="py-3 px-4 text-slate-300">{fine.reason}</td>
                      <td className="py-3 px-4 text-right font-semibold text-red-600">{fine.amount.toLocaleString()} PKR</td>
                      {userRole === 'Admin' && (
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => { setEditingFine(fine); setShowAddFine(true); }} className="p-1.5 bg-blue-500/10 text-blue-400 rounded hover:bg-blue-500/20" title="Edit"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteFine(fine.id)} className="p-1.5 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20" title="Delete"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

       {/* Bonuses Tab */}
        {activeTab === 'bonuses' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Bonuses Management</h2>
              {userRole === 'Admin' && (
                <button onClick={() => setShowAddBonus(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"><Plus className="w-4 h-4" /> Add Bonus</button>
              )}
            </div>
            {/* Search ... */}
            <div className="bg-slate-800/50 rounded-xl shadow-sm border border-slate-600 p-4">
              <input type="text" placeholder="Search by agent name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-white" />
            </div>

            <div className="bg-slate-800/80 rounded-xl shadow-sm border border-slate-600 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">No.</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">Agent</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">Period</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">Type</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-200">Target</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-200">Actual</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-200">Amount</th>
                    {userRole === 'Admin' && <th className="text-center py-3 px-4 text-sm font-medium text-slate-200">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredBonuses.map((bonus, idx) => (
                    <tr key={bonus.id} className="border-b border-slate-700 hover:bg-slate-700">
                      <td className="py-3 px-4 text-slate-300">{idx + 1}</td>
                      <td className="py-3 px-4 font-medium text-white">{bonus.agentName}</td>
                      <td className="py-3 px-4 text-slate-300">{bonus.period}</td>
                      <td className="py-3 px-4"><span className={`px-3 py-1 rounded-full text-xs font-medium ${bonus.type === 'Weekly' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{bonus.type}</span></td>
                      <td className="py-3 px-4 text-right text-slate-100">{bonus.targetSales}</td>
                      <td className="py-3 px-4 text-right font-semibold text-green-400">{bonus.actualSales}</td>
                      <td className="py-3 px-4 text-right font-semibold text-green-400">{bonus.amount.toLocaleString()} PKR</td>
                      {userRole === 'Admin' && (
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                             <button onClick={() => { setEditingBonus(bonus); setShowAddBonus(true); }} className="p-1.5 bg-blue-500/10 text-blue-400 rounded hover:bg-blue-500/20" title="Edit"><Pencil className="w-4 h-4" /></button>
                             <button onClick={() => handleDeleteBonus(bonus.id)} className="p-1.5 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20" title="Delete"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payroll Tab */}
        {activeTab === 'payroll' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Monthly Payroll - {selectedMonth}</h2>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export to CSV
              </button>
            </div>

          <div className="bg-slate-800/80 rounded-xl shadow-sm border border-slate-600 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">No.</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">Agent</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-200">Base Salary</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-200">Sales</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-200">Bonus</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-200">Fines</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-200 bg-slate-900">Net Salary</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyStats.map((agent, idx) => (
                    <tr key={agent.id} className="border-b border-slate-700 hover:bg-slate-700">
                      <td className="py-3 px-4 text-slate-300">{idx + 1}</td>
                      <td className="py-3 px-4 font-medium text-white">{agent.name}</td>
                      <td className="py-3 px-4 text-right text-slate-100">{agent.baseSalary.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-semibold text-green-600">{agent.totalSales}</td>
                      <td className="py-3 px-4 text-right text-green-600">+{agent.totalBonuses.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-red-600">-{agent.totalFines.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-bold text-blue-400 bg-slate-900">{agent.netSalary.toLocaleString()} PKR</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-900 font-semibold border-t-2 border-slate-600">
                    <td className="py-4 px-4 text-white"></td> {/* Empty No. column */}
                    <td className="py-4 px-4 text-white">TOTAL</td>
                    <td className="py-4 px-4 text-right text-slate-100">{monthlyStats.reduce((s, a) => s + a.baseSalary, 0).toLocaleString()}</td>
                    <td className="py-4 px-4 text-right text-green-400">{monthlyStats.reduce((s, a) => s + a.totalSales, 0)}</td>
                    <td className="py-4 px-4 text-right text-green-400">+{monthlyStats.reduce((s, a) => s + a.totalBonuses, 0).toLocaleString()}</td>
                    <td className="py-4 px-4 text-right text-red-400">-{monthlyStats.reduce((s, a) => s + a.totalFines, 0).toLocaleString()}</td>
                    <td className="py-4 px-4 text-right font-bold text-blue-400 bg-slate-900">{monthlyStats.reduce((s, a) => s + a.netSalary, 0).toLocaleString()} PKR</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* NEW MONTHLY SALES MATRIX TAB */}
        {/* Monthly Matrix Tab */}
        {activeTab === 'monthly_matrix' && (
          <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h2 className="text-xl text-white font-bold">Daily Sales Breakdown ({selectedMonth})</h2>
                <div className="text-sm text-slate-400">
                  Cycle: {dateRange.start.toDateString()} - {dateRange.end.toDateString()}
                </div>
             </div>
             
             <div className="bg-slate-800 rounded-xl overflow-x-auto border border-slate-600">
                <table className="w-full text-slate-300 border-collapse">
                  <thead>
                    <tr>
                      {/* [NEW] Row Number Header */}
                      <th className="p-3 text-center bg-slate-900 border-b border-r border-slate-700 min-w-[50px]">No.</th>
                      
                      {/* Agent Name (Sticky Left) */}
                      <th className="p-3 text-left bg-slate-900 border-b border-r border-slate-700 sticky left-0 z-10 min-w-[150px]">Agent Name</th>
                      
                      {/* Date Columns */}
                      {getDaysArray(dateRange.start, dateRange.end).map(dateStr => {
                        const d = new Date(dateStr);
                        return (
                          <th key={dateStr} className="p-2 text-center bg-slate-900 border-b border-slate-700 min-w-[40px]">
                            <div className="text-xs text-slate-500">{d.toLocaleDateString('en-US', { weekday: 'narrow' })}</div>
                            <div className="font-bold text-white">{d.getDate()}</div>
                          </th>
                        );
                      })}
                      <th className="p-3 text-center bg-slate-900 border-b border-l border-slate-700 font-bold text-green-400">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* [FIX] Added idx for row numbers */}
                    {agents.filter(a => a.status === 'Active').map((agent, idx) => {
                      const agentSales = sales.filter(s => 
                          s.agentName === agent.name && 
                          (s.status === 'Sale' || s.disposition === 'HW- Xfer' || s.disposition === 'HW-IBXfer')
                      );
                      let rowTotal = 0;
                      
                      return (
                        <tr key={agent.id} className="hover:bg-slate-700">
                          {/* [NEW] Row Number Cell */}
                          <td className="p-3 text-center border-r border-slate-700 bg-slate-800/50">{idx + 1}</td>

                          {/* Agent Name (Sticky Left) */}
                          <td className="p-3 font-medium text-white border-r border-slate-700 bg-slate-800 sticky left-0">{agent.name}</td>
                          
                          {/* Daily Counts */}
                          {getDaysArray(dateRange.start, dateRange.end).map(dateStr => {
                            const dailyCount = agentSales.filter(s => s.date === dateStr).length;
                            rowTotal += dailyCount;
                            return (
                              <td key={dateStr} className={`p-2 text-center border-b border-slate-700 ${dailyCount > 0 ? 'bg-green-900/20 text-green-400 font-bold' : 'text-slate-600'}`}>
                                {dailyCount > 0 ? dailyCount : '-'}
                              </td>
                            );
                          })}
                          <td className="p-3 text-center border-l border-slate-700 font-bold text-white bg-slate-800/50">{rowTotal}</td>
                        </tr>
                      );
                    })}
                  </tbody>
               </table>
             </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {/* Add this with the other modals */}
      {/* Modals Section - MUST BE INSIDE THE MAIN DIV */}
      {showAddAgent && <AgentModal onClose={() => setShowAddAgent(false)} onSubmit={handleAddAgent} />}
      {showEditAgent && <AgentModal onClose={() => { setShowEditAgent(false); setEditingAgent(null); }} onSubmit={handleEditAgent} agent={editingAgent} isEdit={true} />}
      {showAddSale && <SaleModal agents={agents} currentUser={currentUser} userRole={userRole} onClose={() => setShowAddSale(false)} onSubmit={handleAddSale} />}
      {editSale && <SaleModal agents={agents} currentUser={currentUser} userRole={userRole} onClose={() => setEditSale(null)} onSubmit={handleEditSale} sale={editSale} isEdit={true} />}
      {showAddFine && <FineModal agents={agents} onClose={() => { setShowAddFine(false); setEditingFine(null); }} onSubmit={editingFine ? handleEditFine : handleAddFine} fine={editingFine} isEdit={!!editingFine} />}
      {showAddBonus && <BonusModal agents={agents} onClose={() => { setShowAddBonus(false); setEditingBonus(null); }} onSubmit={editingBonus ? handleEditBonus : handleAddBonus} bonus={editingBonus} isEdit={!!editingBonus} />}
      {showImportModal && <ImportModal importType={importType} onClose={() => setShowImportModal(false)} onImport={handleImport} setLateTime={setLateTime} currentGlobalLateTime={lateTime} />}
      {showAddEmployee && <HREmployeeModal onClose={() => { setShowAddEmployee(false); setEditingHR(null); }} onSubmit={editingHR ? handleEditHR : handleAddEmployee} employee={editingHR} isEdit={!!editingHR} />}
      
      {/* Late Time Modal */}
      {showLateTimeModal && <LateTimeModal currentLateTime={lateTime} onClose={() => setShowLateTimeModal(false)} onSubmit={handleSetLateTime} />}

    </div> // <--- THIS must be the very last line before );
  );
};

export default AgentPayrollSystem;