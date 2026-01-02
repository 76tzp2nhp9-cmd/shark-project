// --- Imports for Helper Functions ---
import { getPayrollRange, getDaysArray, formatTime } from './utils/helpers';

// --- Imports for UI Components ---
import StatCard from './components/StatCard';

// --- Imports for Modals ---
import SaleModal from './components/modals/SaleModal';
import FineModal from './components/modals/FineModal';
import BonusModal from './components/modals/BonusModal';
import ImportModal from './components/modals/ImportModal';
import LateTimeModal from './components/modals/LateTimeModal';

import SimpleAddModal from './components/modals/SimpleAddModal';

import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from './supabaseClient';
import * as XLSX from 'xlsx';
import { 
  Users, DollarSign, Calendar, AlertCircle, TrendingUp, Download, 
  Plus, X, Upload, LogOut, Lock, Clock,
  Pencil, Trash2, UserX, Shield, RotateCcw // <--- Added these new icons
} from 'lucide-react';

// --- HELPER: Count Business Days (Mon-Fri) ---
// PASTE THIS RIGHT BEFORE 'const AgentPayrollSystem = ...'
const countWorkingDays = (start, end) => {
    let count = 0;
    let curDate = new Date(start);
    const stopDate = new Date(end);

    while (curDate <= stopDate) {
        const day = curDate.getDay();
        // 0 = Sunday, 6 = Saturday. Count only if NOT Sat/Sun
        if (day !== 0 && day !== 6) {
            count++;
        }
        curDate.setDate(curDate.getDate() + 1);
    }
    return count;
};

const AgentPayrollSystem = () => {

  // Login States
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [loginData, setLoginData] = useState({ name: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false); // <--- ADD THIS LINE

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

  // Inside AgentPayrollSystem component
const [teams, setTeams] = useState(['Team A', 'Team B', 'Team C']);
const [centers, setCenters] = useState(['Phase 4 - HomeWarranty', 'Phase 4 - 5th Floor', 'Phase 7']);

// Modal visibility states
const [showAddTeamModal, setShowAddTeamModal] = useState(false);
const [showAddCenterModal, setShowAddCenterModal] = useState(false);
  
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
  const [filterType, setFilterType] = useState('Daily'); // Options: Daily, Weekly, Monthly, Custom
  const [customStartDate, setCustomStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);

   const [adminList, setAdminList] = useState([]);
const [showAdminModal, setShowAdminModal] = useState(false);

// Add this fetch function inside your component
const fetchAdmins = async () => {
    const { data } = await supabase.from('admins').select('*').order('id');
    setAdminList(data || []);
};

// Add this Effect to load admins ONLY if the logged-in user is an Admin
useEffect(() => {
    if (userRole === 'Admin') {
        fetchAdmins();
    }
}, [userRole, showAdminModal]); // Refresh when modal opens/closes

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

// Inside App.js
const handleAddTeam = async (teamName) => {
    if (teamName && !teams.includes(teamName)) {
      const { error } = await supabase.from('teams').insert([{ name: teamName }]);
      if (!error) setTeams([...teams, teamName]);
      else if (error.code === '23505') alert("Team already exists in database.");
    }
    setShowAddTeamModal(false);
  };

const handleAddCenter = async (centerName) => {
    if (centerName && !centers.includes(centerName)) {
      // [FIXED] Now adds to Supabase 'centers' table
      const { error } = await supabase.from('centers').insert([{ name: centerName }]);
      if (!error) setCenters([...centers, centerName]);
      else if (error.code === '23505') alert("Center already exists in database.");
      else alert("Error: " + error.message);
    }
    setShowAddCenterModal(false);
  };

  // Handler to save late time
  const handleSetLateTime = (newTime) => {
    setLateTime(newTime);
    localStorage.setItem('ams_late_time', newTime);
    setShowLateTimeModal(false);
  };

  // --- ADMIN MANAGEMENT HANDLERS ---
const handleCreateAdmin = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newAdmin = {
        name: formData.get('name'),
        password: formData.get('password'),
        role: formData.get('role')
    };

    const { error } = await supabase.from('admins').insert([newAdmin]);
    if (error) alert('Error: ' + error.message);
    else {
        alert('New system user created!');
        fetchAdmins(); // Refresh list
        e.target.reset();
    }
};

const handleDeleteAdmin = async (id) => {
    if (window.confirm('Revoke access for this user?')) {
        await supabase.from('admins').delete().eq('id', id);
        fetchAdmins();
    }
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
// Fetch Data from Supabase (Unlimited Rows)
  const fetchData = async () => {
    // --- HELPER: Recursively fetch ALL rows (bypassing 1000 limit) ---
    const fetchAllRows = async (tableName) => {
        let allData = [];
        let from = 0;
        const step = 1000;
        let more = true;

        while (more) {
            const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .range(from, from + step - 1);

            if (error) {
                console.error(`Error fetching ${tableName}:`, error.message);
                throw error;
            }

            if (data && data.length > 0) {
                allData = [...allData, ...data];
                from += step;
                // If we got less than the step (1000), we've reached the end
                if (data.length < step) more = false;
            } else {
                more = false; // No data returned, stop
            }
        }
        return allData;
    };

    try {
        setLoading(true);

        // 1. Fetch Agents (Standard fetch is fine for agents list)
        const { data: agentsData } = await supabase.from('agents').select('*');
        if (agentsData) setAgents(agentsData);

        // 2. Fetch ALL Sales (Critical for large datasets)
        const allSales = await fetchAllRows('sales');
        // Sort by ID descending (Newest first)
        allSales.sort((a, b) => b.id - a.id);
        setSales(allSales);

        // 3. Fetch ALL Attendance (Critical for salary calc)
        const allAttendance = await fetchAllRows('attendance');
        setAttendance(allAttendance);

        // 4. Fetch ALL Fines & Bonuses
        const allFines = await fetchAllRows('fines');
        setFines(allFines);

        const allBonuses = await fetchAllRows('bonuses');
        setBonuses(allBonuses);

        // 5. Fetch HR Records
        const { data: hrData } = await supabase.from('hr_records').select('*');
        if (hrData) setHrRecords(hrData);

        // 6. Fetch Teams & Centers
        const { data: teamData } = await supabase.from('teams').select('name');
        if (teamData) setTeams(teamData.map(t => t.name));

        const { data: centerData } = await supabase.from('centers').select('name');
        if (centerData) setCenters(centerData.map(c => c.name));

    } catch (error) {
        console.error("Error fetching data:", error.message);
        alert("System Error: Failed to load data. Check console.");
    } finally {
        setLoading(false);
    }
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
  
const [agentStatusFilter, setAgentStatusFilter] = useState('All');
const [salesStatusFilter, setSalesStatusFilter] = useState('All');
const [attendanceStatusFilter, setAttendanceStatusFilter] = useState('All');
  
  // [FIX] Replaced Shift with Center
  const [centerFilter, setCenterFilter] = useState('All');
  const [evaluators, setEvaluators] = useState(['John Doe', 'Jane Smith']);

 // Login Logic
// --- LOGIN LOGIC (Dual Table Check) ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);

    try {
        // 1. Check ADMINS Table first (Admin, HR, QA)
        const { data: adminUser, error: adminError } = await supabase
            .from('admins')
            .select('*')
            .eq('name', loginData.name)
            .eq('password', loginData.password)
            .single();

        if (adminUser) {
            setUserRole(adminUser.role);
            setCurrentUser(adminUser);
            setIsLoggedIn(true);
            localStorage.setItem('ams_user', JSON.stringify(adminUser));
            localStorage.setItem('ams_role', adminUser.role);
            return; // Stop here, we found the user
        }

        // 2. If not found, check AGENTS Table
        const { data: agentUser, error: agentError } = await supabase
            .from('agents')
            .select('*')
            .eq('name', loginData.name) // Using name as login for agents
            .eq('password', loginData.password)
            .single();

        if (agentUser) {
            // Agents always have the role 'Agent'
            setUserRole('Agent');
            setCurrentUser(agentUser);
            setIsLoggedIn(true);
            localStorage.setItem('ams_user', JSON.stringify(agentUser));
            localStorage.setItem('ams_role', 'Agent');
        } else {
            setLoginError('Invalid Username or Password');
        }

    } catch (error) {
        console.error("Login Error:", error);
        setLoginError('An error occurred during login');
    } finally {
        setLoading(false);
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
  setCenterFilter('All');
  
  // [FIX] Reset the three new independent status filters
  setAgentStatusFilter('All');
  setSalesStatusFilter('All');
  setAttendanceStatusFilter('All');
  
  localStorage.removeItem('ams_user');
  localStorage.removeItem('ams_role');
  localStorage.removeItem('ams_active_tab');
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

// 2. Monthly Stats (Calculates Prorated Salary + Bank Info + Sales-based Attendance)
// 2. Monthly Stats (Calculates Prorated Salary + Smart Attendance + Bank Info)
  const monthlyStats = useMemo(() => {
    // 1. Get Cycle Dates (e.g., Dec 21 - Jan 20)
    const { start, end } = getPayrollRange(selectedMonth); 
    
    // 2. Calculate Total Business Days (Mon-Fri) in this cycle
    const totalWorkingDays = countWorkingDays(start, end);

    // 3. Filter Agents based on selection
    const filteredAgentsList = agents.filter(a => validAgentNames.has(a.name));

    const agentStats = filteredAgentsList.map(agent => {
        // --- A. Sales Stats ---
        // Filter sales within the date range
        const approvedSales = sales.filter(s => 
            s.agentName === agent.name && 
            (s.status === 'Sale' || s.disposition === 'HW- Xfer' || s.disposition === 'HW-IBXfer') && 
            new Date(s.date) >= start && new Date(s.date) <= end
        );
        
        const totalSales = approvedSales.length;
        
        // --- B. Financials (Bonus & Fines) ---
        const agentBonuses = bonuses.filter(b => 
            b.agentName === agent.name && 
            b.month === selectedMonth 
        ).reduce((sum, b) => sum + (b.amount || 0), 0);

        const agentFines = fines.filter(f => 
            f.agentName === agent.name && 
            f.month === selectedMonth 
        ).reduce((sum, f) => sum + (f.amount || 0), 0);

        // --- C. Smart Attendance Calculation (Attendance OR Sales) ---
        
        // 1. Get dates from Attendance (Present/Late)
        const attendanceDates = attendance
            .filter(att => 
                att.agentName === agent.name &&
                new Date(att.date) >= start && new Date(att.date) <= end &&
                (att.status === 'Present' || att.status === 'Late')
            )
            .map(att => att.date); // Assumes format YYYY-MM-DD

        // 2. Get dates from Sales (If they made a sale, they were present)
        const salesDates = approvedSales.map(s => s.date); // Assumes format YYYY-MM-DD

        // 3. Merge into a SET to remove duplicates (e.g., marked present AND made a sale)
        const uniqueDaysWorked = new Set([...attendanceDates, ...salesDates]);
        
        // This is the new "Days Present" count
        const daysPresent = uniqueDaysWorked.size;

        // --- D. Prorated Salary Calculation ---
        // Formula: (Base / WorkingDays) * ActualDaysWorked
        const baseSalary = agent.baseSalary || 0;
        let earnedBase = 0;

        if (totalWorkingDays > 0) {
            const dailyRate = baseSalary / totalWorkingDays;
            earnedBase = Math.round(dailyRate * daysPresent);
        } else {
            earnedBase = baseSalary;
        }

        // --- E. Fetch Bank Details from HR ---
        const hrRecord = hrRecords.find(h => 
            (agent.cnic && h.cnic === agent.cnic) || 
            (h.agent_name.toLowerCase() === agent.name.toLowerCase())
        );

        const bankName = hrRecord?.bank_name || '-';
        const accountNo = hrRecord?.account_number || '-';

        // --- F. Final Net Salary ---
        const netSalary = earnedBase + agentBonuses - agentFines;
        
        return {
            ...agent,
            totalSales,
            totalFines: agentFines || 0,
            totalBonuses: agentBonuses || 0,
            daysPresent,       // Now includes days with Sales!
            totalWorkingDays,  
            earnedBase,        
            netSalary: netSalary > 0 ? netSalary : 0, 
            bankName,          
            accountNo          
        };
    });
    
    return agentStats.sort((a, b) => b.totalSales - a.totalSales);
  }, [agents, sales, fines, bonuses, attendance, hrRecords, selectedMonth, validAgentNames]);

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
    const matchesSearch = 
      sale.agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.customerName?.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesDate = sale.date >= start && sale.date <= end;
    
    // [FIX] Use salesStatusFilter and check against the disposition field
    const matchesStatus = salesStatusFilter === 'All' || sale.disposition === salesStatusFilter;
    
    const matchesTeamCenter = validAgentNames.has(sale.agentName);
    
    return matchesSearch && matchesDate && matchesStatus && matchesTeamCenter;
  });
}, [sales, searchQuery, getActiveDateRange, salesStatusFilter, validAgentNames]);

  // 6. Attendance Table (Respects Team/Center)
const filteredAttendance = useMemo(() => {
  const { start, end } = getActiveDateRange;
  
  return attendance.filter(record => {
    const matchesSearch = record.agentName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDate = record.date >= start && record.date <= end;
    const matchesTeamCenter = validAgentNames.has(record.agentName);
    
    // [FIX] Independent Attendance Filter Logic
    let matchesStatus = true;
    if (attendanceStatusFilter === 'Present') matchesStatus = record.status === 'Present';
    else if (attendanceStatusFilter === 'Absent') matchesStatus = record.status === 'Absent';
    else if (attendanceStatusFilter === 'Late') matchesStatus = record.status === 'Present' && record.late === true;
    else if (attendanceStatusFilter === 'OnTime') matchesStatus = record.status === 'Present' && record.late === false;

    return matchesSearch && matchesDate && matchesTeamCenter && matchesStatus;
  });
}, [attendance, searchQuery, getActiveDateRange, validAgentNames, attendanceStatusFilter]);

  // 7. Agents Table (Respects Team/Center)
const filteredAgents = useMemo(() => {
  return agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTeam = teamFilter === 'All' || agent.team === teamFilter;
    const matchesCenter = centerFilter === 'All' || agent.center === centerFilter;
    
    // [FIX] Use agentStatusFilter
    const matchesStatus = agentStatusFilter === 'All' || agent.status === agentStatusFilter;
    
    return matchesSearch && matchesTeam && matchesCenter && matchesStatus;
  });
}, [agents, searchQuery, teamFilter, centerFilter, agentStatusFilter]);

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

// 10. HR (Respects Team, Center, AND Status)
const filteredHR = useMemo(() => {
return hrRecords.filter(rec => {
    // 1. Search
    const matchesSearch = rec.agent_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (rec.cnic && rec.cnic.includes(searchQuery));
    
    // 2. Team & Center (We check if the agent name exists in the valid list for the selected Team/Center)
    // Note: validAgentNames is already calculated based on teamFilter and centerFilter
    const matchesTeamCenter = validAgentNames.has(rec.agent_name) || (teamFilter === 'All' && centerFilter === 'All');

    // 3. Status Filter (Active vs Left)
    const matchesStatus = agentStatusFilter === 'All' || rec.status === agentStatusFilter;

    return matchesSearch && matchesTeamCenter && matchesStatus;
});
}, [hrRecords, searchQuery, validAgentNames, teamFilter, centerFilter, agentStatusFilter]);

// --- UNIFIED AGENT SAVE (Handles Add + Edit + Syncs HR) ---
const handleSaveAgent = async (e) => {
    e.preventDefault();
    
    // 1. Prepare Agent Data (Payroll & Access)
    const agentPayload = {
        name: editingAgent.name,
        team: editingAgent.team,
        center: editingAgent.center,
        baseSalary: parseInt(editingAgent.baseSalary) || 0,
        cnic: editingAgent.cnic,
        password: editingAgent.password || '123',
        status: editingAgent.status || 'Active',
        active_date: editingAgent.active_date || new Date().toISOString().split('T')[0],
        // If editing, keep existing leftDate, else null
        leftDate: editingAgent.leftDate || null 
    };

    // 2. Prepare HR Data (Employment & Bank)
    const hrPayload = {
        agent_name: editingAgent.name,
        father_name: editingAgent.father_name || '',
        cnic: editingAgent.cnic,
        designation: 'Agent',
        joining_date: editingAgent.active_date || new Date().toISOString().split('T')[0],
        bank_name: editingAgent.bank_name || '',
        account_number: editingAgent.account_number || '',
        status: editingAgent.status || 'Active'
    };

    try {
        setLoading(true);

        // --- Step A: Upsert to Agents Table ---
        // We use CNIC as the unique key to update if exists, or insert if new
        const { error: agentError } = await supabase
            .from('agents')
            .upsert(agentPayload, { onConflict: 'cnic' });

        if (agentError) throw agentError;

        // --- Step B: Upsert to HR Records ---
        // We try to match by CNIC. 
        // Note: If you change CNIC, it treats it as a new person (database limitation).
        const { error: hrError } = await supabase
            .from('hr_records')
            .upsert(hrPayload, { onConflict: 'cnic' });

        if (hrError) throw hrError;

        alert('Agent saved & synced to HR records successfully!');
        setShowAddAgent(false);
        setEditingAgent(null);
        fetchData(); // Refresh Data

    } catch (error) {
        console.error("Save Error:", error.message);
        alert('Error saving agent: ' + error.message);
    } finally {
        setLoading(false);
    }
};

  // [FIXED] Mark as Left with Error Handling
 // 2. Mark as Left (Use cnic)
const handleMarkAsLeft = async (agentCnic) => {
  if (window.confirm('Are you sure you want to mark this agent as Left?')) {
    const leftDate = new Date().toISOString().split('T')[0];

    try {
      // 1. Update Agents table (Payroll side)
      const { error: agentError } = await supabase
        .from('agents')
        .update({ status: 'Left', leftDate })
        .eq('cnic', agentCnic);

      if (agentError) throw agentError;

      // 2. Update HR Records table (Employment side)
      const { error: hrError } = await supabase
        .from('hr_records')
        .update({ status: 'Left' })
        .eq('cnic', agentCnic);

      if (hrError) throw hrError;

      // 3. Update local state for both tabs
      setAgents(agents.map(a => a.cnic === agentCnic ? { ...a, status: 'Left', leftDate } : a));
      setHrRecords(hrRecords.map(h => h.cnic === agentCnic ? { ...h, status: 'Left' } : h));

      alert("Agent status updated to 'Left' in both systems.");
    } catch (error) {
      console.error('Error updating status:', error.message);
      alert("Failed to update status: " + error.message);
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
  if (window.confirm('CRITICAL: This will permanently delete the agent from Payroll and HR records. Continue?')) {
    try {
      // 1. Delete from Agents table
      const { error: agentError } = await supabase
        .from('agents')
        .delete()
        .eq('cnic', agentCnic);

      if (agentError) throw agentError;

      // 2. Delete from HR Records table
      const { error: hrError } = await supabase
        .from('hr_records')
        .delete()
        .eq('cnic', agentCnic);

      if (hrError) throw hrError;

      // 3. Remove from local state
      setAgents(agents.filter(a => a.cnic !== agentCnic));
      setHrRecords(hrRecords.filter(h => h.cnic !== agentCnic));

      alert("Agent permanently removed from both systems.");
    } catch (error) {
      console.error('Error deleting records:', error.message);
      alert("Delete Failed: " + error.message);
    }
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
// --- UNIFIED HR SAVE FUNCTION (Handles Add + Edit + Syncs to Agents DB) ---
const handleSaveHR = async (e) => {
    e.preventDefault(); 
    
    // 1. Prepare Data for HR Table
    const hrPayload = {
        agent_name: editingHR.agent_name,
        father_name: editingHR.father_name || '',
        cnic: editingHR.cnic,
        designation: editingHR.designation,
        joining_date: editingHR.joining_date,
        bank_name: editingHR.bank_name || '',
        account_number: editingHR.account_number || '',
        status: editingHR.status || 'Active'
    };

    // 2. Prepare Data for Agents Table (Syncing Job Info)
    const agentPayload = {
        team: editingHR.team,
        center: editingHR.center,
        baseSalary: parseInt(editingHR.baseSalary) || 0
    };

    try {
        setLoading(true);

        // A. Save to HR Records
        if (editingHR.id) {
            const { error } = await supabase.from('hr_records').update(hrPayload).eq('id', editingHR.id);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('hr_records').insert([hrPayload]);
            if (error) throw error;
        }

        // B. Sync to Agents Table (Find by CNIC or Name)
        if (editingHR.cnic) {
            await supabase.from('agents').update(agentPayload).eq('cnic', editingHR.cnic);
        } else {
            await supabase.from('agents').update(agentPayload).eq('name', editingHR.agent_name);
        }

        alert('Employee record saved & synced successfully!');
        setShowAddEmployee(false);
        setEditingHR(null);
        fetchData(); // Refresh UI

    } catch (error) {
        console.error('Error saving HR record:', error.message);
        alert('Error saving record: ' + error.message);
    } finally {
        setLoading(false);
    }
};

  //Handle Import
const handleImport = (file, lateTimeVal) => {
  if (!file) return;

  // --- HELPER 1: Fix Excel Dates ---
  const normalizeDate = (input) => {
    if (!input) return new Date().toISOString().split('T')[0];
    const cleanInput = input.toString().replace(/['"]/g, '').trim();
    if (!isNaN(cleanInput) && !isNaN(Number(cleanInput))) {
      const serial = Number(cleanInput);
      const date = new Date((serial - 25569) * 86400 * 1000 + (12 * 60 * 60 * 1000)); 
      return date.toISOString().split('T')[0];
    }
    const date = new Date(cleanInput);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  };

  // --- HELPER 2: Fix Excel Times ---
  const normalizeTime = (input) => {
    if (!input) return '';
    if (input.toString().includes(':')) return input.toString().trim();
    if (!isNaN(input)) {
        const val = parseFloat(input);
        const decimalPart = val % 1; 
        const totalSeconds = Math.round(decimalPart * 86400); 
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return input;
  };

  // --- HELPER 3: Safe Row Reader ---
  const safeRow = (row) => {
     if (!row || !Array.isArray(row)) return [];
     return row.map(cell => (cell === null || cell === undefined) ? '' : String(cell).trim());
  };

  const reader = new FileReader();
  
  reader.onload = async (e) => {
    try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const rows = rawRows.filter(row => row.length > 0);

        // --- 1. IMPORT AGENTS ---
        if (importType === 'agents') {
            const uniquePayroll = new Map();
            const uniqueHr = new Map();
            let tempIdCount = 0; 
            
            const dataRows = rows.slice(1); 

            dataRows.forEach((rawLine) => {
                const values = safeRow(rawLine);
                if (!values[0]) return; 

                const name = values[0];
                const team = values[1];
                const center = values[2] || 'Phase 7';
                const baseSalary = parseInt(values[3]) || 0;
                
                let cnic = values[4] ? values[4] : '';
                if (!cnic || cnic === '') {
                    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
                    const cleanName = name.replace(/\s+/g, ''); 
                    cnic = `TEMP-${cleanName}-${randomSuffix}`;
                    tempIdCount++;
                }

                const fatherName = values[5] || '';
                const bankName = values[6] || '';
                const accountNumber = values[7] || '';
                const joiningDate = normalizeDate(values[8]);

                const uniqueKey = cnic; 

                const payrollObj = {
                    name: name,
                    team: team,
                    center: center,
                    baseSalary: baseSalary,
                    cnic: cnic, 
                    password: '123',
                    status: 'Active',
                    activeDate: joiningDate, 
                    leftDate: null
                };

                const hrObj = {
                    agent_name: name,
                    father_name: fatherName,
                    cnic: cnic, 
                    designation: 'Agent',
                    joining_date: joiningDate,
                    status: 'Active',
                    bank_name: bankName,
                    account_number: accountNumber
                };

                uniquePayroll.set(uniqueKey, payrollObj);
                uniqueHr.set(uniqueKey, hrObj);
            });

            const payrollBatch = Array.from(uniquePayroll.values());
            const hrBatch = Array.from(uniqueHr.values());

            const { data: agentData, error: agentError } = await supabase.from('agents').upsert(payrollBatch).select();
            if (agentError) throw new Error(agentError.message);

            const { data: hrData, error: hrError } = await supabase.from('hr_records').upsert(hrBatch).select();
            if (hrError) throw new Error(hrError.message);

            setAgents([...agents, ...agentData]);
            setHrRecords([...hrRecords, ...hrData]);
            
            let msg = `Success! Processed ${agentData.length} Agents.`;
            if (tempIdCount > 0) msg += `\n(${tempIdCount} were assigned TEMP IDs)`;
            alert(msg);
        }

        // --- 2. IMPORT SALES ---
        else if (importType === 'sales') {
            const newSales = rows.slice(1).map((rawLine) => {
                const values = safeRow(rawLine);
                if(!values[1]) return null; 
                
                const disposition = values[12] || '';
                const timestampRaw = values[0]; 
                const finalDate = normalizeDate(timestampRaw);
                const xferTimeFixed = normalizeTime(values[14]);

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
                    xferTime: xferTimeFixed, 
                    xferAttempts: values[15] || '', 
                    feedbackBeforeXfer: values[16] || '', 
                    feedbackAfterXfer: values[17] || '',
                    grading: values[18] || '', 
                    dockDetails: values[19] || '', 
                    evaluator: values[20] || '',
                    status: (disposition === 'HW- Xfer' || disposition === 'HW-IBXfer') ? 'Sale' : 'Unsuccessful',
                    date: finalDate, 
                    month: selectedMonth
                };
            }).filter(Boolean);

            const { data, error } = await supabase.from('sales').insert(newSales).select();
            if(!error) {
                setSales([...sales, ...data]);
                alert(`Success! Imported ${data.length} Sales records.`);
            } else {
                throw new Error(error.message);
            }
        }

        // --- 3. IMPORT ATTENDANCE ---
        else if (importType === 'attendance') {
            const dataRows = rows.slice(1);
            const dateMap = {};
            
            dataRows.forEach(rawLine => {
                const row = safeRow(rawLine);
                const name = row[2] ? row[2].toLowerCase() : '';
                const timeStr = row[3] || '';
                
                if (name && timeStr) {
                    const dateTimeRegex = /(\d{1,2}\/\d{1,2}\/\d{4}) (\d{1,2}:\d{2}(:\d{2})?) ?(AM|PM)/i;
                    const match = timeStr.match(dateTimeRegex);
                    if (match) {
                        let [datePart, timePart, ampm] = match;
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

            const uniqueAttendance = newAttendance.filter(newItem => {
                const isDuplicate = attendance.some(existingItem => 
                    existingItem.agentName === newItem.agentName &&
                    existingItem.date === newItem.date &&
                    existingItem.loginTime === newItem.loginTime
                );
                return !isDuplicate;
            });

            if (uniqueAttendance.length > 0) {
                const { data, error } = await supabase.from('attendance').insert(uniqueAttendance).select();
                if(!error) { 
                    setAttendance([...attendance, ...data]); 
                    alert(`Success! Added ${data.length} records.`); 
                } else {
                    throw new Error(error.message);
                }
            } else {
                alert("All records were duplicates.");
            }
        }
    
    } catch (error) {
        console.error(error);
        alert('Import Failed: ' + error.message);
    }
    
    setShowImportModal(false);
  }; // End reader.onload
  
  reader.readAsArrayBuffer(file);
}; // End handleImport

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

// Export to CSV (Updated with Bank & Attendance)
  const exportToCSV = () => {
    const csv = monthlyStats.map(a => 
      `${a.name},${a.bankName},${a.accountNo},${a.baseSalary},${a.daysPresent}/${a.totalWorkingDays},${a.earnedBase},${a.totalSales},${a.totalBonuses},${a.totalFines},${a.netSalary}`
    ).join('\n');
    
    const header = 'Agent Name,Bank Name,Account No,Full Base Salary,Attendance,Earned Base Salary,Sales,Bonus,Fines,Net Salary\n';
    
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
          {/* Demo Credentials DIV removed from here */}
        </div>
      </div>
    );
  }

  // MAIN DASHBOARD
  // Main Return Agent Payroll System
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

              {userRole === 'Admin' && (
    <button 
        onClick={() => setShowAdminModal(true)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm border border-slate-500 transition-colors mr-2"
    >
        <Shield className="w-4 h-4" />
        Manage Access
    </button>
)}

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
            filterType={filterType}
            setFilterType={setFilterType}
            dateVal={customStartDate}
            setDateVal={setCustomStartDate}
            endVal={customEndDate}
            setEndVal={setCustomEndDate}
            selectedMonth={selectedMonth}
            handleMonthChange={(e) => {/* your month change logic */}}
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

        {/* HR Team Management */}

{activeTab === 'hr' && (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">HR - Employment Data</h2>
            <button onClick={() => { setEditingHR({}); setShowAddEmployee(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Plus className="w-4 h-4"/> Add Employee
            </button>
        </div>

        {/* --- NEW FILTER GRID (Matches Sales Tab) --- */}
        <div className="bg-slate-800/50 rounded-xl shadow-sm border border-slate-600 p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* 1. Search Input */}
                <input
                    type="text"
                    placeholder="Search by name or CNIC..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {/* 2. Team Filter */}
                <select
                    value={teamFilter}
                    onChange={(e) => setTeamFilter(e.target.value)}
                    className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="All">All Teams</option>
                    {teams.map(t => <option key={t} value={t}>{t}</option>)}
                </select>

                {/* 3. Center Filter */}
                <select
                    value={centerFilter}
                    onChange={(e) => setCenterFilter(e.target.value)}
                    className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="All">All Centers</option>
                    {centers.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                {/* 4. Status Filter (Customized for HR) */}
                <select
                    value={agentStatusFilter}
                    onChange={(e) => setAgentStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="All">All Status</option>
                    <option value="Active">Active Only</option>
                    <option value="Left">Left / Ex-Employees</option>
                </select>
            </div>
        </div>

        {/* --- HR TABLE --- */}
        <div className="w-full overflow-x-auto rounded-lg shadow-md border border-slate-700">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-900">
                    <tr>
                        <th className="py-3 px-4 text-sm font-medium text-slate-200 min-w-[60px]">No.</th>
                        <th className="py-3 px-4 text-sm font-medium text-slate-200 min-w-[180px]">Name</th>
                        <th className="py-3 px-4 text-sm font-medium text-slate-200 min-w-[180px]">Father Name</th>
                        <th className="py-3 px-4 text-sm font-medium text-slate-200 min-w-[150px]">Designation</th>
                        <th className="py-3 px-4 text-sm font-medium text-slate-200 min-w-[120px]">Team</th>
                        <th className="py-3 px-4 text-sm font-medium text-slate-200 min-w-[120px]">Center</th>
                        <th className="py-3 px-4 text-sm font-medium text-slate-200 min-w-[100px]">Salary</th>
                        <th className="py-3 px-4 text-sm font-medium text-slate-200 min-w-[160px]">CNIC</th>
                        <th className="py-3 px-4 text-sm font-medium text-slate-200 min-w-[180px]">Bank Name</th>
                        <th className="py-3 px-4 text-sm font-medium text-slate-200 min-w-[180px]">Account No</th>
                        <th className="py-3 px-4 text-sm font-medium text-slate-200 min-w-[140px]">Joining Date</th>
                        <th className="py-3 px-4 text-sm font-medium text-slate-200 min-w-[100px]">Status</th>
                        <th className="py-3 px-4 text-sm font-medium text-center text-slate-200 min-w-[140px]">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredHR.map((rec, idx) => {
                        const agentProfile = agents.find(a => 
                            (a.cnic && a.cnic === rec.cnic) || 
                            (a.name.toLowerCase() === rec.agent_name.toLowerCase())
                        ) || {};

                        return (
                            <tr key={rec.id} className="border-b border-slate-700 hover:bg-slate-700">
                                <td className="py-3 px-4 text-slate-300">{idx + 1}</td>
                                <td className="py-3 px-4 text-white font-medium">{rec.agent_name}</td>
                                <td className="py-3 px-4 text-slate-300">{rec.father_name || '-'}</td>
                                <td className="py-3 px-4 text-slate-300">{rec.designation}</td>
                                <td className="py-3 px-4 text-slate-300">{agentProfile.team || '-'}</td>
                                <td className="py-3 px-4 text-slate-300">{agentProfile.center || '-'}</td>
                                <td className="py-3 px-4 text-slate-300">{agentProfile.baseSalary || '-'}</td>
                                <td className="py-3 px-4 text-slate-300">{rec.cnic}</td>
                                <td className="py-3 px-4 text-slate-300">{rec.bank_name || '-'}</td>
                                <td className="py-3 px-4 text-slate-300 font-mono text-xs">{rec.account_number || '-'}</td>
                                <td className="py-3 px-4 text-slate-300">{rec.joining_date}</td>
                                <td className="py-3 px-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        (rec.status || 'Active') === 'Active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                    }`}>{rec.status || 'Active'}</span>
                                </td>
                                <td className="py-3 px-4">
                                    <div className="flex items-center justify-center gap-2">
                                        <button 
                                            onClick={() => { 
                                                const linkedAgent = agents.find(a => (a.cnic && a.cnic === rec.cnic) || (a.name === rec.agent_name)) || {};
                                                setEditingHR({ 
                                                    ...rec, 
                                                    team: linkedAgent.team || '', 
                                                    center: linkedAgent.center || '', 
                                                    baseSalary: linkedAgent.baseSalary || '' 
                                                }); 
                                                setShowAddEmployee(true); 
                                            }} 
                                            className="p-1.5 bg-blue-500/10 text-blue-400 rounded hover:bg-blue-500/20" 
                                            title="Edit"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleToggleHRStatus(rec.id, rec.status || 'Active')} className="p-1.5 bg-orange-500/10 text-orange-400 rounded hover:bg-orange-500/20">
                                            {rec.status === 'Active' ? <UserX className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                                        </button>
                                        <button onClick={() => handleDeleteHR(rec.id)} className="p-1.5 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    </div>
)}

        {/* Agent Management */}

{activeTab === 'agents' && (
    <div className="space-y-6">
     
        {/* Header & Buttons */}
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">Agent Management</h2>
            <div className="flex gap-3">
                {userRole === 'Admin' && (
                    <>
                        <button onClick={() => setShowAddCenterModal(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">
                            <Plus className="w-4 h-4" /> Add Center
                        </button>
                        <button onClick={() => setShowAddTeamModal(true)} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium">
                            <Plus className="w-4 h-4" /> Add Team
                        </button>
                        <button onClick={() => { setImportType('agents'); setShowImportModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
                            <Upload className="w-4 h-4" /> Import CSV
                        </button>
                        <button onClick={() => { setEditingAgent({}); setShowAddAgent(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                            <Plus className="w-4 h-4" /> Add Agent
                        </button>
                    </>
                )}
            </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-800/50 rounded-xl shadow-sm border border-slate-600 p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input type="text" placeholder="Search agents..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="All">All Teams</option>
                    {teams.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={centerFilter} onChange={(e) => setCenterFilter(e.target.value)} className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="All">All Centers</option>
                    {centers.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={agentStatusFilter} onChange={(e) => setAgentStatusFilter(e.target.value)} className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="All">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Left">Inactive/Left</option>
                </select>
            </div>
        </div>

        {/* Scrollable Table Container */}
        <div className="w-full overflow-x-auto rounded-lg shadow-md border border-slate-700">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-900">
                    <tr>
                        <th className="py-3 px-4 text-sm font-medium text-slate-200 min-w-[60px]">No.</th>
                        <th className="py-3 px-4 text-sm font-medium text-slate-200 min-w-[180px]">Name</th>
                        <th className="py-3 px-4 text-sm font-medium text-slate-200 min-w-[150px]">CNIC</th>
                        <th className="py-3 px-4 text-sm font-medium text-slate-200 min-w-[150px]">Team</th>
                        <th className="py-3 px-4 text-sm font-medium text-slate-200 min-w-[150px]">Center</th>
                        <th className="py-3 px-4 text-sm font-medium text-slate-200 text-right min-w-[120px]">Base Salary</th>
                        <th className="py-3 px-4 text-sm font-medium text-slate-200 text-center min-w-[100px]">Status</th>
                        <th className="py-3 px-4 text-sm font-medium text-slate-200 text-center min-w-[120px]">Active Date</th>
                        <th className="py-3 px-4 text-sm font-medium text-slate-200 text-center min-w-[120px]">Left Date</th>
                        {userRole === 'Admin' && <th className="py-3 px-4 text-sm font-medium text-slate-200 text-center min-w-[140px]">Actions</th>}
                    </tr>
                </thead>
                <tbody>
                    {filteredAgents.map((agent, idx) => (
                        <tr key={agent.cnic || idx} className="border-b border-slate-700 hover:bg-slate-700">
                            <td className="py-3 px-4 text-slate-300">{idx + 1}</td>
                            <td className="py-3 px-4 font-medium text-white">{agent.name}</td>
                            <td className="py-3 px-4 text-slate-400 text-xs font-mono">{agent.cnic || '-'}</td>
                            <td className="py-3 px-4 text-slate-300">{agent.team}</td>
                            <td className="py-3 px-4 text-slate-300 text-xs">{agent.center || '-'}</td>
                            <td className="py-3 px-4 text-right text-slate-100 font-mono">{agent.baseSalary ? agent.baseSalary.toLocaleString() : 0}</td>
                            <td className="py-3 px-4 text-center">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${agent.status === 'Active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {agent.status}
                                </span>
                            </td>
                            <td className="py-3 px-4 text-center text-slate-400 text-xs">{agent.active_date || agent.activeDate || '-'}</td>
                            <td className="py-3 px-4 text-center text-slate-400 text-xs">{agent.leftDate || '-'}</td>
                            
                            {userRole === 'Admin' && (
                                <td className="py-3 px-4">
                                    <div className="flex items-center justify-center gap-2">
                                        <button onClick={() => { 
                                            // Find HR data to pre-fill bank info if available
                                            const hrData = hrRecords.find(h => h.cnic === agent.cnic) || {};
                                            setEditingAgent({ ...agent, ...hrData }); 
                                            setShowAddAgent(true); 
                                        }} className="p-1.5 bg-blue-500/10 text-blue-400 rounded hover:bg-blue-500/20 transition-colors" title="Edit">
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        
                                        <button onClick={() => agent.status === 'Active' ? handleMarkAsLeft(agent.cnic) : handleReactivateAgent(agent.cnic)} 
                                            className={`p-1.5 rounded transition-colors ${agent.status === 'Active' ? 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}>
                                            {agent.status === 'Active' ? <UserX className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                                        </button>
                                        
                                        <button onClick={() => handleDeleteAgent(agent.cnic)} className="p-1.5 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 transition-colors" title="Delete">
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
    filterType={filterType} 
    setFilterType={setFilterType}
    dateVal={customStartDate} 
    setDateVal={setCustomStartDate}
    endVal={customEndDate} 
    setEndVal={setCustomEndDate}
    selectedMonth={selectedMonth} 
    handleMonthChange={handleMonthChange}
/>
            {/* Sales Tab Search and Filters */}
<div className="bg-slate-800/50 rounded-xl shadow-sm border border-slate-600 p-4 mb-6">
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    {/* 1. Search Input */}
    <input
      type="text"
      placeholder="Search by agent, customer, or phone..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
    />

    {/* 2. Dynamic Team Filter */}
    <select
      value={teamFilter}
      onChange={(e) => setTeamFilter(e.target.value)}
      className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="All">All Teams</option>
      {teams.map(t => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>

    {/* 3. Dynamic Center Filter */}
    <select
      value={centerFilter}
      onChange={(e) => setCenterFilter(e.target.value)}
      className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="All">All Centers</option>
      {centers.map(c => (
        <option key={c} value={c}>{c}</option>
      ))}
    </select>

<select
  value={salesStatusFilter}
  onChange={(e) => setSalesStatusFilter(e.target.value)}
  className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
>
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
        <textarea
        value={sale.feedbackBeforeXfer || ''}
        onChange={(e) => updateSaleField(sale.id, 'feedbackBeforeXfer', e.target.value)}
        rows={4} // Shows 4 lines of height by default
        className="w-full min-w-[250px] px-2 py-1 text-xs bg-slate-700 text-white border border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
        />
    ) : (
        <div className="text-xs text-slate-300 whitespace-pre-wrap min-w-[250px] max-w-md">
        {sale.feedbackBeforeXfer || '-'}
        </div>
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
    filterType={filterType} 
    setFilterType={setFilterType}
    dateVal={customStartDate} 
    setDateVal={setCustomStartDate}
    endVal={customEndDate} 
    setEndVal={setCustomEndDate}
    selectedMonth={selectedMonth} 
    handleMonthChange={handleMonthChange}
/>
            {/* Attendance Tab Search and Filters */}
<div className="bg-slate-800/50 rounded-xl shadow-sm border border-slate-600 p-4 mb-6">
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    {/* 1. Search Input */}
    <input
      type="text"
      placeholder="Search by agent name..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
    />

    {/* 2. Dynamic Team Filter */}
    <select
      value={teamFilter}
      onChange={(e) => setTeamFilter(e.target.value)}
      className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="All">All Teams</option>
      {teams.map(t => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>

    {/* 3. Dynamic Center Filter */}
    <select
      value={centerFilter}
      onChange={(e) => setCenterFilter(e.target.value)}
      className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="All">All Centers</option>
      {centers.map(c => (
        <option key={c} value={c}>{c}</option>
      ))}
    </select>

    <select
  value={attendanceStatusFilter}
  onChange={(e) => setAttendanceStatusFilter(e.target.value)}
  className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
>
  <option value="All">All Status</option>
  <option value="Present">Present</option>
  <option value="Absent">Absent</option>
  <option value="Late">Late</option>
  <option value="OnTime">On Time</option>
</select>

  </div>
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

    {/* SEARCH & FILTER Bar */}
    <div className="bg-slate-800/50 rounded-xl shadow-sm border border-slate-600 p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <input
          type="text"
          placeholder="Search by agent name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="All">All Teams</option>
          {teams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={centerFilter}
          onChange={(e) => setCenterFilter(e.target.value)}
          className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="All">All Centers</option>
          {centers.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={agentStatusFilter}
          onChange={(e) => setAgentStatusFilter(e.target.value)}
          className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="All">All Status</option>
          <option value="Active">Active Only</option>
          <option value="Left">Left Only</option>
        </select>
      </div>
    </div>

    {/* PAYROLL TABLE SECTION */}
    {(() => {
      // Define displayedPayroll here to filter the list based on dropdowns
      const displayedPayroll = monthlyStats.filter(agent => {
        const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTeam = teamFilter === 'All' || agent.team === teamFilter;
        const matchesCenter = centerFilter === 'All' || agent.center === centerFilter;
        const matchesStatus = agentStatusFilter === 'All' || agent.status === agentStatusFilter;
        return matchesSearch && matchesTeam && matchesCenter && matchesStatus;
      });

      return (
        <div className="bg-slate-800/80 rounded-xl shadow-sm border border-slate-600 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-900">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">No.</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">Agent</th>
                {/* [NEW] Bank Details Column */}
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">Bank Details</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-200">Full Base</th>
                {/* [NEW] Attendance Column */}
                <th className="text-center py-3 px-4 text-sm font-medium text-slate-200">Attendance</th>
                {/* [NEW] Earned Base Column */}
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-200">Earned Base</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-200">Sales</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-200">Bonus</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-200">Fines</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-200 bg-slate-900">Net Salary</th>
              </tr>
            </thead>
            <tbody>
              {displayedPayroll.map((agent, idx) => (
                <tr key={agent.id} className="border-b border-slate-700 hover:bg-slate-700">
                  <td className="py-3 px-4 text-slate-300">{idx + 1}</td>
                  <td className="py-3 px-4 font-medium text-white">
                    {agent.name}
                    <div className="text-[10px] text-slate-400">{agent.status}</div>
                  </td>
                  
                  {/* Bank Details Cell */}
                  <td className="py-3 px-4">
                    <div className="text-xs text-white">{agent.bankName}</div>
                    <div className="text-[10px] font-mono text-slate-400">{agent.accountNo}</div>
                  </td>

                  {/* Full Base Salary */}
                  <td className="py-3 px-4 text-right text-slate-400 text-xs">
                    {agent.baseSalary.toLocaleString()}
                  </td>

                  {/* Attendance Ratio Cell */}
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-xs font-bold">
                      {agent.daysPresent} / {agent.totalWorkingDays}
                    </span>
                  </td>

                  {/* Earned Base Salary Cell */}
                  <td className="py-3 px-4 text-right text-slate-100 font-medium">
                    {agent.earnedBase.toLocaleString()}
                  </td>

                  <td className="py-3 px-4 text-right font-semibold text-green-600">{agent.totalSales}</td>
                  <td className="py-3 px-4 text-right text-green-600">+{agent.totalBonuses.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-red-600">-{agent.totalFines.toLocaleString()}</td>
                  
                  {/* Final Net Salary Cell */}
                  <td className="py-3 px-4 text-right font-bold text-blue-400 bg-slate-900">
                    {agent.netSalary.toLocaleString()} PKR
                  </td>
                </tr>
              ))}
              
              {/* TOTAL ROW */}
              <tr className="bg-slate-900 font-semibold border-t-2 border-slate-600">
                <td className="py-4 px-4 text-white"></td>
                <td className="py-4 px-4 text-white">TOTAL</td>
                <td className="py-4 px-4 text-white"></td>
                <td className="py-4 px-4 text-right text-slate-400">
                  {displayedPayroll.reduce((s, a) => s + (a.baseSalary || 0), 0).toLocaleString()}
                </td>
                <td className="py-4 px-4 text-center text-slate-400">-</td>
                <td className="py-4 px-4 text-right text-white">
                  {displayedPayroll.reduce((s, a) => s + (a.earnedBase || 0), 0).toLocaleString()}
                </td>
                <td className="py-4 px-4 text-right text-green-400">
                  {displayedPayroll.reduce((s, a) => s + (a.totalSales || 0), 0)}
                </td>
                <td className="py-4 px-4 text-right text-green-400">
                  +{displayedPayroll.reduce((s, a) => s + (a.totalBonuses || 0), 0).toLocaleString()}
                </td>
                <td className="py-4 px-4 text-right text-red-400">
                  -{displayedPayroll.reduce((s, a) => s + (a.totalFines || 0), 0).toLocaleString()}
                </td>
                <td className="py-4 px-4 text-right font-bold text-blue-400 bg-slate-900">
                  {displayedPayroll.reduce((s, a) => s + (a.netSalary || 0), 0).toLocaleString()} PKR
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    })()}
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
        {/* --- INLINE AGENT MODAL (Handles Add & Edit) --- */}
{(showAddAgent || showEditAgent) && (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                <h2 className="text-xl font-bold text-white">
                    {editingAgent?.cnic ? 'Edit Agent Details' : 'Add New Agent'}
                </h2>
                <button onClick={() => { setShowAddAgent(false); setShowEditAgent(false); }} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <form onSubmit={handleSaveAgent} className="p-6 space-y-6">
                
                {/* 1. Personal Info */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Full Name</label>
                            <input type="text" required value={editingAgent?.name || ''} onChange={e => setEditingAgent({...editingAgent, name: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Father Name</label>
                            <input type="text" value={editingAgent?.father_name || ''} onChange={e => setEditingAgent({...editingAgent, father_name: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">CNIC (ID)</label>
                            <input type="text" required value={editingAgent?.cnic || ''} onChange={e => setEditingAgent({...editingAgent, cnic: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Login Password</label>
                            <input type="text" value={editingAgent?.password || '123'} onChange={e => setEditingAgent({...editingAgent, password: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm" />
                        </div>
                    </div>
                </div>

                {/* 2. Job Details */}
                <div className="space-y-4 pt-4 border-t border-slate-800">
                    <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider">Job & Location</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Team</label>
                            <select value={editingAgent?.team || ''} onChange={e => setEditingAgent({...editingAgent, team: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm">
                                <option value="">Select Team</option>
                                {teams.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Center</label>
                            <select value={editingAgent?.center || ''} onChange={e => setEditingAgent({...editingAgent, center: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm">
                                <option value="">Select Center</option>
                                {centers.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Base Salary (PKR)</label>
                            <input type="number" value={editingAgent?.baseSalary || ''} onChange={e => setEditingAgent({...editingAgent, baseSalary: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Joining Date</label>
                            <input type="date" value={editingAgent?.active_date || editingAgent?.activeDate || ''} onChange={e => setEditingAgent({...editingAgent, active_date: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm" />
                        </div>
                    </div>
                </div>

                {/* 3. Banking Info */}
                <div className="space-y-4 pt-4 border-t border-slate-800">
                    <h3 className="text-sm font-semibold text-green-400 uppercase tracking-wider">Banking Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Bank Name</label>
                            <input type="text" placeholder="e.g. Meezan Bank" value={editingAgent?.bank_name || ''} onChange={e => setEditingAgent({...editingAgent, bank_name: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Account No</label>
                            <input type="text" placeholder="Account / IBAN" value={editingAgent?.account_number || ''} onChange={e => setEditingAgent({...editingAgent, account_number: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm font-mono" />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
                    <button type="button" onClick={() => { setShowAddAgent(false); setShowEditAgent(false); }} className="px-4 py-2 text-slate-300 hover:text-white text-sm">Cancel</button>
                    <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium">
                        {editingAgent?.cnic ? 'Update Agent' : 'Create Agent'}
                    </button>
                </div>
            </form>
        </div>
    </div>
)}

      {showAddSale && <SaleModal agents={agents} currentUser={currentUser} userRole={userRole} onClose={() => setShowAddSale(false)} onSubmit={handleAddSale} />}
      {editSale && <SaleModal agents={agents} currentUser={currentUser} userRole={userRole} onClose={() => setEditSale(null)} onSubmit={handleEditSale} sale={editSale} isEdit={true} />}
      {showAddFine && <FineModal agents={agents} onClose={() => { setShowAddFine(false); setEditingFine(null); }} onSubmit={editingFine ? handleEditFine : handleAddFine} fine={editingFine} isEdit={!!editingFine} />}
      {showAddBonus && <BonusModal agents={agents} onClose={() => { setShowAddBonus(false); setEditingBonus(null); }} onSubmit={editingBonus ? handleEditBonus : handleAddBonus} bonus={editingBonus} isEdit={!!editingBonus} />}
      {showImportModal && <ImportModal importType={importType} onClose={() => setShowImportModal(false)} onImport={handleImport} setLateTime={setLateTime} currentGlobalLateTime={lateTime} />}
     {/* --- INLINE HR MODAL (Replaces Imported Component) --- */}
{showAddEmployee && (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                <h2 className="text-xl font-bold text-white">{editingHR?.id ? 'Edit Employee' : 'Add New Employee'}</h2>
                <button onClick={() => setShowAddEmployee(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveHR} className="p-6 space-y-6">
                
                {/* 1. Personal Info */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Full Name</label>
                            <input type="text" required value={editingHR?.agent_name || ''} onChange={e => setEditingHR({...editingHR, agent_name: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Father Name</label>
                            <input type="text" value={editingHR?.father_name || ''} onChange={e => setEditingHR({...editingHR, father_name: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">CNIC</label>
                            <input type="text" required value={editingHR?.cnic || ''} onChange={e => setEditingHR({...editingHR, cnic: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Joining Date</label>
                            <input type="date" required value={editingHR?.joining_date || ''} onChange={e => setEditingHR({...editingHR, joining_date: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm" />
                        </div>
                    </div>
                </div>

                {/* 2. Job & Salary */}
                <div className="space-y-4 pt-4 border-t border-slate-800">
                    <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider">Job Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Designation</label>
                            <input type="text" value={editingHR?.designation || ''} onChange={e => setEditingHR({...editingHR, designation: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Base Salary</label>
                            <input type="number" value={editingHR?.baseSalary || ''} onChange={e => setEditingHR({...editingHR, baseSalary: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Team</label>
                            <select value={editingHR?.team || ''} onChange={e => setEditingHR({...editingHR, team: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm">
                                <option value="">Select Team</option>
                                {teams.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Center</label>
                            <select value={editingHR?.center || ''} onChange={e => setEditingHR({...editingHR, center: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm">
                                <option value="">Select Center</option>
                                {centers.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* 3. Bank Details */}
                <div className="space-y-4 pt-4 border-t border-slate-800">
                    <h3 className="text-sm font-semibold text-green-400 uppercase tracking-wider">Bank Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Bank Name</label>
                            <input type="text" placeholder="e.g. Meezan Bank" value={editingHR?.bank_name || ''} onChange={e => setEditingHR({...editingHR, bank_name: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Account No</label>
                            <input type="text" placeholder="Account No / IBAN" value={editingHR?.account_number || ''} onChange={e => setEditingHR({...editingHR, account_number: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm font-mono" />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
                    <button type="button" onClick={() => setShowAddEmployee(false)} className="px-4 py-2 text-slate-300 hover:text-white text-sm">Cancel</button>
                    <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium">{editingHR?.id ? 'Update Record' : 'Create Employee'}</button>
                </div>
            </form>
        </div>
    </div>
)}
      
      {/* Late Time Modal */}
      {showLateTimeModal && <LateTimeModal currentLateTime={lateTime} onClose={() => setShowLateTimeModal(false)} onSubmit={handleSetLateTime} />}

{/* Bottom of App.js return statement */}
{showAddTeamModal && <SimpleAddModal title="Add Team" onClose={() => setShowAddTeamModal(false)} onSubmit={handleAddTeam} placeholder="Team Name" />}
      {showAddCenterModal && <SimpleAddModal title="Add Center" onClose={() => setShowAddCenterModal(false)} onSubmit={handleAddCenter} placeholder="Center Name" />}
     

{/* --- MANAGE ADMINS / HR / QA MODAL --- */}
{showAdminModal && (
<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
    <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800">
            <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Shield className="w-6 h-6 text-blue-400" />
                    System Access Management
                </h2>
                <p className="text-slate-400 text-xs mt-1">Manage Admin, HR, and QA accounts.</p>
            </div>
            <button onClick={() => setShowAdminModal(false)} className="text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
        </div>

        <div className="p-6 space-y-8">
            
            {/* 1. Create New User Form */}
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                <h3 className="text-xs font-bold text-green-400 uppercase tracking-wider mb-3">Add New Access</h3>
                <form onSubmit={handleCreateAdmin} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Username</label>
                        <input name="name" required placeholder="Name" className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:border-blue-500 outline-none" />
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Password</label>
                        <input name="password" required placeholder="Password" className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:border-blue-500 outline-none" />
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Role</label>
                        <select name="role" className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:border-blue-500 outline-none">
                            <option value="HR">HR</option>
                            <option value="QA">QA</option>
                            <option value="Admin">Admin</option>
                        </select>
                    </div>
                    <button type="submit" className="bg-green-600 hover:bg-green-500 text-white font-medium py-2 px-4 rounded text-sm transition-colors h-10">
                        Create
                    </button>
                </form>
            </div>

            {/* 2. Existing Admins List */}
            <div>
                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">Active System Users</h3>
                <div className="overflow-hidden rounded-lg border border-slate-700">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-800 text-slate-300 text-xs uppercase">
                            <tr>
                                <th className="px-4 py-3">Name</th>
                                <th className="px-4 py-3">Role</th>
                                <th className="px-4 py-3">Password</th>
                                <th className="px-4 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700 bg-slate-900">
                            {adminList.map((admin) => (
                                <tr key={admin.id} className="hover:bg-slate-800">
                                    <td className="px-4 py-3 font-medium text-white">{admin.name}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                            admin.role === 'Admin' ? 'bg-purple-500/20 text-purple-400' :
                                            admin.role === 'HR' ? 'bg-orange-500/20 text-orange-400' :
                                            'bg-blue-500/20 text-blue-400'
                                        }`}>
                                            {admin.role}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{admin.password}</td>
                                    <td className="px-4 py-3 text-right">
                                        {/* Prevent deleting yourself */}
                                        {admin.name !== 'Admin' && (
                                            <button 
                                                onClick={() => handleDeleteAdmin(admin.id)} 
                                                className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>
)}

    </div> // <--- THIS must be the very last line before );
  );
};

export default AgentPayrollSystem;



// CHanges are going to be made in this file only

// Added the Payroll Tab code and fixed the totals calculation in the payroll table

// Also added row numbers in the Monthly Sales Matrix tab