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
  Users, Edit, DollarSign, Calendar, AlertCircle, TrendingUp, Download,
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

// Handler to save late time (Database + Local)
  const handleSetLateTime = async (newTime) => {
    // 1. Optimistic Update (Updates UI immediately)
    setLateTime(newTime);
    localStorage.setItem('ams_late_time', newTime);
    setShowLateTimeModal(false);

    try {
      // 2. Save to Supabase 'settings' table
      const { error } = await supabase
        .from('settings')
        .upsert({ key: 'late_time', value: newTime }, { onConflict: 'key' });

      if (error) throw error;
      console.log("✅ Late time saved to database:", newTime);

    } catch (error) {
      console.error("Error saving settings:", error.message);
      alert("Warning: Updated locally, but failed to save to database: " + error.message);
    }
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

      const { data: settingsData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'late_time')
        .maybeSingle();

      if (settingsData?.value) {
        setLateTime(settingsData.value);
        localStorage.setItem('ams_late_time', settingsData.value);
      }

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
          <span className="text-slate-400 text-sm font-medium"><Calendar className="w-4 h-4 inline" /> Filter:</span>
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

  // [FIX] Lock Body Scroll when any Modal is Open
  useEffect(() => {
    // Check if ANY modal is currently true
    const isAnyModalOpen =
      showAddAgent ||
      showEditAgent ||
      showAddEmployee ||
      showAddSale ||
      showAddFine ||
      showAddBonus ||
      showImportModal ||
      showAdminModal ||
      showLateTimeModal ||
      showAddTeamModal ||
      showAddCenterModal;

    if (isAnyModalOpen) {
      // Disable scrolling on the main body
      document.body.style.overflow = 'hidden';
    } else {
      // Re-enable scrolling
      document.body.style.overflow = 'unset';
    }

    // Cleanup function
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [
    showAddAgent,
    showEditAgent,
    showAddEmployee,
    showAddSale,
    showAddFine,
    showAddBonus,
    showImportModal,
    showAdminModal,
    showLateTimeModal,
    showAddTeamModal,
    showAddCenterModal
  ]);

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

// 2. Monthly Stats (Final Strict Fix)
  const monthlyStats = useMemo(() => {
    // 1. Define Cycle Boundaries
    const { start, end } = getPayrollRange(selectedMonth);
    
    // Normalize to Midnight for accurate comparison
    const cycleStart = new Date(start); cycleStart.setHours(0,0,0,0);
    const cycleEnd = new Date(end); cycleEnd.setHours(23,59,59,999);

    const totalWorkingDays = countWorkingDays(start, end);

    // --- HELPER: Safe Date Parser ---
    const parseDate = (val) => {
        if (!val) return null;
        const d = new Date(val);
        if (isNaN(d.getTime())) return null;
        d.setHours(0,0,0,0);
        return d;
    };

    // [FIX] Filter Agents (Robust)
    const filteredAgentsList = agents.filter(a => {
      // 1. Team/Center Check
      if (!validAgentNames.has(a.name)) return false;

      // 2. Joining Date Check (Hide Future Hires)
      const hrRec = hrRecords.find(h => h.cnic === a.cnic);
      // Check HR joining date first, then Agent activeDate
      const joinStr = hrRec?.joining_date || a.activeDate || a.active_date;
      const joinDate = parseDate(joinStr);

      // If joined AFTER this cycle ended -> HIDE
      if (joinDate && joinDate.getTime() > cycleEnd.getTime()) {
          return false;
      }

      // 3. Left Date Check (Hide Past Leavers)
      // Check if status is Left in EITHER table
      const isLeft = a.status === 'Left' || hrRec?.status === 'Left';

      if (isLeft) {
        // [CRITICAL] Check 'leftDate' specifically as requested
        const dateValue = a.leftDate || a.left_date || hrRec?.leftDate || hrRec?.left_date;
        const leaveDate = parseDate(dateValue);
        
        if (leaveDate) {
            // STRICT RULE: If they left strictly BEFORE the cycle started -> HIDE
            // Example: Left Dec 24. 
            // - Jan Cycle (Dec 21 - Jan 20): Dec 24 < Dec 21? NO. -> SHOW.
            // - Feb Cycle (Jan 21 - Feb 20): Dec 24 < Jan 21? YES. -> HIDE.
            if (leaveDate.getTime() < cycleStart.getTime()) {
                return false;
            }
        } else {
            // SAFETY: If status is 'Left' but NO DATE is found, 
            // hide them to prevent "Ghost Agents" in future months.
            return false;
        }
      }

      return true;
    });

    const agentStats = filteredAgentsList.map(agent => {
      // Get approved sales for this date range
      const approvedSales = sales.filter(s =>
        s.agentName === agent.name &&
        (s.status === 'Sale' || s.disposition === 'HW- Xfer' || s.disposition === 'HW-IBXfer') &&
        new Date(s.date) >= start && new Date(s.date) <= end
      );

      const agentAttendance = attendance.filter(att =>
        att.agentName === agent.name &&
        new Date(att.date) >= start && new Date(att.date) <= end
      );

      // Daily Breakdown
      let dialingDays = 0;
      let daysOn0 = 0, daysOn1 = 0, daysOn2 = 0, daysOn3 = 0; 

      let loopDate = new Date(start);
      while (loopDate <= end) {
        const dateStr = loopDate.toISOString().split('T')[0];

        const attRecord = agentAttendance.find(a => a.date === dateStr);
        const isMarkedPresent = attRecord && (attRecord.status === 'Present' || attRecord.status === 'Late');
        const dailySalesCount = approvedSales.filter(s => s.date === dateStr).length;
        const isWorkingDay = isMarkedPresent || dailySalesCount > 0;

        if (isWorkingDay) {
          dialingDays++; 
          if (dailySalesCount === 0) daysOn0++;
          else if (dailySalesCount === 1) daysOn1++;
          else if (dailySalesCount === 2) daysOn2++;
          else if (dailySalesCount === 3) daysOn3++;
        }
        loopDate.setDate(loopDate.getDate() + 1);
      }

      // Financials
      const agentBonuses = bonuses.filter(b => b.agentName === agent.name && b.month === selectedMonth)
        .reduce((sum, b) => sum + (b.amount || 0), 0);
      const agentFines = fines.filter(f => f.agentName === agent.name && f.month === selectedMonth)
        .reduce((sum, f) => sum + (f.amount || 0), 0);

      const baseSalary = agent.baseSalary || 0;
      let earnedBase = 0;
      if (totalWorkingDays > 0) {
        const dailyRate = baseSalary / totalWorkingDays;
        earnedBase = Math.round(dailyRate * dialingDays); 
      } else {
        earnedBase = baseSalary;
      }

      const hrRecord = hrRecords.find(h => (agent.cnic && h.cnic === agent.cnic) || (h.agent_name.toLowerCase() === agent.name.toLowerCase()));
      const netSalary = earnedBase + agentBonuses - agentFines;

      // Find the Left Date for Display
      const finalLeftDate = agent.leftDate || agent.left_date || hrRecord?.leftDate || null;

      return {
        ...agent,
        leftDate: finalLeftDate,
        totalSales: approvedSales.length,
        lpd: dialingDays > 0 ? (approvedSales.length / dialingDays).toFixed(2) : "0.00",
        dialingDays,     
        daysOn0, daysOn1, daysOn2, daysOn3,         
        totalFines: agentFines || 0,
        totalBonuses: agentBonuses || 0,
        daysPresent: dialingDays,
        totalWorkingDays,
        earnedBase,
        netSalary: netSalary > 0 ? netSalary : 0,
        bankName: hrRecord?.bank_name || '-',
        accountNo: hrRecord?.account_number || '-'
      };
    });

    return agentStats.sort((a, b) => b.totalSales - a.totalSales);
  }, [agents, sales, fines, bonuses, attendance, hrRecords, selectedMonth, validAgentNames]);

  // 9. Bonuses (Respects Team/Center)
  const filteredBonuses = useMemo(() => {
    return bonuses.filter(bonus => {
      const matchesSearch = bonus.agentName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTeamCenter = validAgentNames.has(bonus.agentName);
      return matchesSearch && bonus.month === selectedMonth && matchesTeamCenter;
    });
  }, [bonuses, searchQuery, selectedMonth, validAgentNames]);

  // 3. Dashboard Stats (Updated: Revenue -> Total Bonus)
  const dashboardStats = useMemo(() => {
    const { start, end } = getActiveDateRange;

    // Only count agents matching the filter
    const activeAgentCount = agents.filter(a => a.status === 'Active' && validAgentNames.has(a.name)).length;

    // Filter sales by Date
    const relevantSales = sales.filter(s =>
      validAgentNames.has(s.agentName) &&
      (s.status === 'Sale' || s.disposition === 'HW- Xfer' || s.disposition === 'HW-IBXfer') &&
      s.date >= start && s.date <= end
    );

    const totalSalesCount = relevantSales.length;

    // [CHANGED] Calculate Total Bonus (instead of Revenue)
    // We use filteredBonuses which already respects the Team & Month filters
    const totalBonusPayout = filteredBonuses.reduce((sum, b) => sum + (b.amount || 0), 0);

    // Payroll Calculation (Sum of Net Salaries)
    const totalPayroll = monthlyStats.reduce((sum, a) => sum + a.netSalary, 0);

    return { totalAgents: activeAgentCount, totalSalesCount, totalBonusPayout, totalPayroll };
  }, [agents, sales, filteredBonuses, monthlyStats, getActiveDateRange, validAgentNames]);


  // 4. Top Performers (Updated: Shows Real Bonus & Net Salary)
  const filteredPerformerStats = useMemo(() => {
    const { start, end } = getActiveDateRange;
    const relevantAgents = agents.filter(a => validAgentNames.has(a.name));

    const stats = relevantAgents.map(agent => {
      // 1. Calculate Sales Count for the date range
      const agentSales = sales.filter(s =>
        s.agentName === agent.name &&
        (s.status === 'Sale' || s.disposition === 'HW- Xfer' || s.disposition === 'HW-IBXfer') &&
        s.date >= start && s.date <= end
      );

      // 2. Fetch Financials from Monthly Payroll Stats
      // This gets the REAL Calculated Salary (Base + Bonus - Fines)
      const payrollData = monthlyStats.find(m => m.name === agent.name) || {};

      return {
        ...agent,
        totalSales: agentSales.length,
        totalBonuses: payrollData.totalBonuses || 0, // [NEW] Bonus Amount
        netSalary: payrollData.netSalary || 0        // [NEW] Actual Salary
      };
    });

    return stats.sort((a, b) => b.totalSales - a.totalSales);
  }, [agents, sales, monthlyStats, getActiveDateRange, validAgentNames]);

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

  // MOVE THIS TO THE TOP LEVEL OF YOUR COMPONENT
  const salesStats = useMemo(() => {
    const stats = { unsuccessful: 0, dncDnq: 0, sales: 0, pending: 0 };

    filteredSales.forEach(sale => {
      const disp = sale.disposition;
      if (['HW- Xfer', 'HW-IBXfer', 'HW-Xfer-CDR'].includes(disp)) {
        stats.sales++;
      } else if (['DNC', 'DNQ', 'DNQ-Webform'].includes(disp)) {
        stats.dncDnq++;
      } else if (['Review Pending', 'Pending Review'].includes(disp)) {
        stats.pending++;
      } else if (disp === 'Unsuccessful') {
        stats.unsuccessful++;
      }
    });

    return stats;
  }, [filteredSales]);

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

  const handleSaveAgent = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Prepare Data
      const joiningDate = editingAgent.active_date || new Date().toISOString().split('T')[0];
      const validName = editingAgent.name ? editingAgent.name.trim() : "Unknown";
      const validCnic = editingAgent.cnic ? editingAgent.cnic.trim() : "";

      if (!validCnic) throw new Error("CNIC is required.");

      // --- AGENT PAYLOAD (Keep baseSalary here) ---
      const agentPayload = {
        name: validName,
        cnic: validCnic,
        Phone: editingAgent.contact_number || '',
        email: editingAgent.email || '',
        address: editingAgent.address || '',
        password: editingAgent.password || '123',
        team: editingAgent.team || 'Unassigned',
        center: editingAgent.center || 'Phase 7',
        baseSalary: editingAgent.baseSalary ? parseInt(editingAgent.baseSalary) : 0, // Saved here
        activeDate: joiningDate,
        status: editingAgent.status || 'Active',
        leftDate: editingAgent.status === 'Left' ? editingAgent.leftDate : null
      };

      // --- HR PAYLOAD (REMOVED baseSalary to fix crash) ---
      const hrPayload = {
        agent_name: validName,
        father_name: editingAgent.father_name || '',
        cnic: validCnic,
        Phone: editingAgent.contact_number || '',
        email: editingAgent.email || '',
        address: editingAgent.address || '',
        // baseSalary removed from here
        joining_date: joiningDate,
        bank_name: editingAgent.bank_name || '',
        account_number: editingAgent.account_number || '',
        status: editingAgent.status || 'Active',
        designation: editingAgent.designation || 'Agent'
      };

      if (showEditAgent) {
        // === UPDATE ===
        const { error: agentError } = await supabase.from('agents').update(agentPayload).eq('cnic', editingAgent.cnic);
        if (agentError) throw new Error(`Agent Update Failed: ${agentError.message}`);

        const { error: hrError } = await supabase.from('hr_records').upsert(hrPayload, { onConflict: 'cnic' });
        if (hrError) throw new Error(`HR Update Failed: ${hrError.message}`);

        // Update UI
        setAgents(prev => prev.map(a => a.cnic === editingAgent.cnic ? { ...a, ...agentPayload } : a));

        // When updating local HR state, we can keep baseSalary in memory for display purposes, 
        // even if it's not in the HR DB table.
        setHrRecords(prev => {
          const exists = prev.find(h => h.cnic === editingAgent.cnic);
          const uiPayload = { ...hrPayload, baseSalary: agentPayload.baseSalary }; // Merge for UI only

          if (exists) return prev.map(h => h.cnic === editingAgent.cnic ? { ...h, ...uiPayload } : h);
          return [...prev, { ...uiPayload, id: Math.random() }];
        });

      } else {
        // === CREATE ===
        const exists = agents.some(a => a.cnic === editingAgent.cnic);
        if (exists) throw new Error("An agent with this CNIC already exists.");

        // 1. Insert Agent
        const { data: newAgent, error: agentError } = await supabase.from('agents').insert([agentPayload]).select();
        if (agentError) throw new Error(`Agent DB Error: ${agentError.message}`);

        // 2. Insert HR Record
        const { data: newHR, error: hrError } = await supabase.from('hr_records').insert([hrPayload]).select();

        if (hrError) {
          console.error("FULL HR ERROR:", hrError);
          throw new Error(`HR DB Error: ${hrError.message}`);
        }

        // 3. Update UI
        if (newAgent) setAgents(prev => [...prev, ...newAgent]);
        // For local state, we manually add baseSalary back so it shows in the table immediately
        if (newHR) {
          const hrWithSalary = { ...newHR[0], baseSalary: agentPayload.baseSalary };
          setHrRecords(prev => [...prev, hrWithSalary]);
        }
      }

      setShowAddAgent(false);
      setShowEditAgent(false);
      setEditingAgent(null);
      alert("Success! Agent and HR Record saved.");

    } catch (error) {
      console.error("Save Error:", error);
      alert("CRITICAL ERROR: " + error.message);
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
  // 3. Reactivate (Syncs Agents + HR)
  const handleReactivateAgent = async (agentCnic) => {
    if (window.confirm('Are you sure you want to Reactivate this agent?')) {
      try {
        // 1. Update Agents Table (Payroll Side)
        const { error: agentError } = await supabase
          .from('agents')
          .update({ status: 'Active', leftDate: null })
          .eq('cnic', agentCnic);

        if (agentError) throw agentError;

        // 2. Update HR Records Table (Employment Side)
        const { error: hrError } = await supabase
          .from('hr_records')
          .update({ status: 'Active' })
          .eq('cnic', agentCnic);

        if (hrError) throw hrError;

        // 3. Update Local State for BOTH Tabs
        setAgents(prev => prev.map(a => a.cnic === agentCnic ? { ...a, status: 'Active', leftDate: null } : a));
        setHrRecords(prev => prev.map(h => h.cnic === agentCnic ? { ...h, status: 'Active' } : h));

        alert("Agent reactivated successfully in both systems.");

      } catch (error) {
        console.error("Reactivation Error:", error.message);
        alert("Failed to reactivate: " + error.message);
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

  const updateSaleField = async (saleId, field, value) => {
    console.log(`Update triggered for Sale: ${saleId}, Field: ${field}, Value: ${value}`);

    // 1. Update the Sale Record (Always happens)
    const { error } = await supabase.from('sales').update({ [field]: value }).eq('id', saleId);

    if (error) {
      console.error("❌ Error updating Sales Table:", error.message);
      return; // Stop if sales update failed
    }

    // 2. Handle Fine Logic (Partial Updates)
    if (field === 'dockDetails' || field === 'dockReason' || field === 'dockreason') {

      // Normalize the field name to handle case sensitivity
      const isAmountEdit = field === 'dockDetails';
      const isReasonEdit = (field === 'dockReason' || field === 'dockreason');

      const cleanValue = isAmountEdit ? parseInt(value) : value;

      // Get current sale state for fallback (only needed if creating NEW fine)
      const sale = sales.find(s => s.id === saleId);

      // Check if fine exists
      const { data: existingFines } = await supabase
        .from('fines')
        .select('id, amount, reason') // Select current values
        .eq('sale_id', saleId);

      if (existingFines && existingFines.length > 0) {
        // === SCENARIO A: FINE EXISTS (UPDATE) ===
        // CRITICAL FIX: Only update the field that changed!

        const updatePayload = {};
        if (isAmountEdit) updatePayload.amount = cleanValue;
        if (isReasonEdit) updatePayload.reason = cleanValue;

        // Send partial update to DB
        await supabase.from('fines').update(updatePayload).eq('sale_id', saleId);

        // Update local state by merging new value with existing state
        setFines(prev => prev.map(f => {
          if (f.sale_id === saleId) {
            return { ...f, ...updatePayload }; // Merge updates
          }
          return f;
        }));
        console.log("✅ Fine Partial Update Success");

      } else {
        // === SCENARIO B: NO FINE EXISTS (INSERT) ===
        // We need BOTH values to create a new row.

        // If we are editing Amount, take Reason from existing sale (or default)
        // If we are editing Reason, take Amount from existing sale
        const amountToSave = isAmountEdit ? cleanValue : parseInt(sale.dockDetails || 0);
        const reasonToSave = isReasonEdit ? cleanValue : (sale.dockReason || sale.dockreason || 'Manual Fine');

        // Only create fine if we have a valid amount > 0
        if (!isNaN(amountToSave) && amountToSave > 0) {
          const newFine = {
            agentName: sale.agentName || sale.agent_name,
            amount: amountToSave,
            reason: reasonToSave,
            date: new Date().toISOString().split('T')[0],
            month: selectedMonth,
            sale_id: saleId
          };

          const { data: fineData, error: insertError } = await supabase.from('fines').insert([newFine]).select();

          if (!insertError && fineData) {
            setFines(prev => [...prev, ...fineData]);
            console.log("✅ New Fine Created");
          }
        }
      }
    }

    // 3. Update local Sales state finally
    setSales(prev => prev.map(s => s.id === saleId ? { ...s, [field]: value } : s));
  };

  const handleDeleteSale = async (id) => {
    // 1. Confirm deletion
    if (!window.confirm("Are you sure you want to permanently delete this sale?")) {
      return;
    }

    try {
      console.log("Attempting to delete sale:", id);

      // STEP A: Delete any associated Fine FIRST (to fix the foreign key error)
      const { error: fineError } = await supabase
        .from('fines')
        .delete()
        .eq('sale_id', id);

      // It's okay if there was no fine, but if there's a real error, stop.
      if (fineError) {
        console.error("Error deleting linked fine:", fineError.message);
        // We don't stop here, because sometimes the fine might not exist, which is fine.
      }

      // STEP B: Delete the Sale
      const { error: saleError } = await supabase
        .from('sales')
        .delete()
        .eq('id', id);

      if (saleError) throw saleError;

      // 3. Update UI (Remove both from local state)
      setSales(prev => prev.filter(sale => sale.id !== id));
      setFines(prev => prev.filter(f => f.sale_id !== id));

      alert("Sale deleted successfully.");

    } catch (error) {
      console.error("Delete Failed:", error.message);
      alert("Failed to delete: " + error.message);
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

  const handleSaveHR = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. HR Payload (NO baseSalary)
      const hrPayload = {
        agent_name: editingHR.agent_name,
        father_name: editingHR.father_name || '',
        cnic: editingHR.cnic,
        Phone: editingHR.contact_number,
        email: editingHR.email,
        address: editingHR.address,
        designation: editingHR.designation,
        joining_date: editingHR.joining_date,
        bank_name: editingHR.bank_name || '',
        account_number: editingHR.account_number || '',
        status: editingHR.status || 'Active'
      };

      // 2. Agent Payload (INCLUDES baseSalary)
      // This ensures the salary is saved to the correct table
      const agentSyncPayload = {
        name: editingHR.agent_name,
        baseSalary: parseInt(editingHR.baseSalary) || 0, // Saved to Agents Table
        Phone: editingHR.contact_number,
        email: editingHR.email,
        address: editingHR.address,
        status: editingHR.status || 'Active'
      };

      if (editingHR.id) {
        // === UPDATE ===
        // Update HR Table (No Salary)
        const { error } = await supabase.from('hr_records').update(hrPayload).eq('id', editingHR.id);
        if (error) throw new Error(`HR Update Failed: ${error.message}`);

        // Sync Agent Table (With Salary)
        if (editingHR.cnic) {
          await supabase.from('agents').update(agentSyncPayload).eq('cnic', editingHR.cnic);
        }

        // Update UI
        // We merge salary back into local state so you can see it in the table
        setHrRecords(prev => prev.map(h => h.id === editingHR.id ? { ...h, ...hrPayload, baseSalary: agentSyncPayload.baseSalary } : h));
        setAgents(prev => prev.map(a => a.cnic === editingHR.cnic ? { ...a, ...agentSyncPayload } : a));

      } else {
        // === CREATE ===
        const { data: newHR, error } = await supabase.from('hr_records').insert([hrPayload]).select();
        if (error) throw new Error(`HR Insert Failed: ${error.message}`);

        // Sync to Agents
        if (editingHR.cnic) {
          await supabase.from('agents').update(agentSyncPayload).eq('cnic', editingHR.cnic);
        }

        if (newHR) {
          const hrWithSalary = { ...newHR[0], baseSalary: agentSyncPayload.baseSalary };
          setHrRecords(prev => [...prev, hrWithSalary]);
        }

        // Refresh agents to capture the updated salary/info
        const { data: updatedAgents } = await supabase.from('agents').select('*');
        if (updatedAgents) setAgents(updatedAgents);
      }

      alert('Record saved successfully!');
      setShowAddEmployee(false);
      setEditingHR(null);

    } catch (error) {
      console.error('Error:', error.message);
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  //Handle Import
  const handleImport = (file, lateTimeVal, manualDate) => {
    if (!file) return;

    // --- HELPER 1: Force MM/DD/YYYY Format ---
    const normalizeDate = (input) => {
      if (!input) return new Date().toISOString().split('T')[0];

      // Clean the input string
      const cleanInput = input.toString().replace(/['"]/g, '').trim();

      // Handle "01/02/2026" or "1/2/2026"
      if (cleanInput.includes('/')) {
        const datePart = cleanInput.split(' ')[0]; // Remove time (e.g., "9:06")
        const parts = datePart.split('/');

        if (parts.length === 3) {
          // FORCE MAPPING:
          // part[0] is MONTH (01)
          // part[1] is DAY (02)
          // part[2] is YEAR (2026)

          const month = parts[0].padStart(2, '0');
          const day = parts[1].padStart(2, '0');
          let year = parts[2];

          // Handle 2-digit years
          if (year.length === 2) year = '20' + year;

          // Return Standard Database Format: YYYY-MM-DD
          return `${year}-${month}-${day}`;
        }
      }

      // Fallback for other formats (though raw:false usually prevents this)
      return new Date(cleanInput).toISOString().split('T')[0];
    };

    // --- HELPER 2: Fix Excel Times (Kept Same) ---
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

        const rawRows = XLSX.utils.sheet_to_json(worksheet, {
          header: 1, raw: false, // <--- CRITICAL CHANGE: Forces it to read text, not serial numbers
          defval: ""
        });
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
        // --- 2. IMPORT SALES (FIXED) ---
        else if (importType === 'sales') {
          const newSales = rows.slice(1).map((rawLine) => {
            const values = safeRow(rawLine);
            if (!values[1]) return null;

            // 1. Define Variables First
            const disposition = values[12] || '';
            const timestampRaw = values[0];
            const xferTimeFixed = normalizeTime(values[14]);

            // 2. Define Sanitizer Helper
            const sanitizeText = (text) => {
              if (!text) return '';
              return text.replace(/[\r\n]+/g, ' ').trim();
            };

            // 3. Construct the Object
            return {
              // Fix: Use manualDate if provided, otherwise calculate from timestamp
              date: manualDate || normalizeDate(timestampRaw),

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
              month: selectedMonth
            };
          }).filter(Boolean);

          const { data, error } = await supabase.from('sales').insert(newSales).select();
          if (!error) {
            setSales([...sales, ...data]);
            alert(`Success! Imported ${data.length} Sales records.`);
          } else {
            throw new Error(error.message);
          }
        }

        // --- 3. IMPORT ATTENDANCE ---
      // --- 3. IMPORT ATTENDANCE (FIXED) ---
        else if (importType === 'attendance') {
          const dataRows = rows.slice(1);
          const dateMap = {};

          dataRows.forEach(rawLine => {
            const row = safeRow(rawLine);
            // Column 2 is Name, Column 3 is the Date/Time string
            const name = row[2] ? row[2].trim() : ''; 
            const timeStr = row[3] || '';

            if (name && timeStr) {
              // Robust Regex for "MM/DD/YYYY HH:MM AM/PM"
              // Capture Groups: [1]Month, [2]Day, [3]Year, [4]Time, [5]AM/PM
              const match = timeStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}:\d{2})(?::\d{2})?\s?(AM|PM)/i);
              
              if (match) {
                const month = match[1].padStart(2, '0');
                const day = match[2].padStart(2, '0');
                const year = match[3]; // Captures exactly 4 digits (e.g., "2025")
                const timeRaw = match[4];
                const ampm = match[5].toUpperCase();

                // 1. Format Date correctly as YYYY-MM-DD
                const date = `${year}-${month}-${day}`;

                // 2. Format Time to 24-hour (HH:MM)
                let [hours, minutes] = timeRaw.split(':').map(Number);
                if (ampm === 'PM' && hours < 12) hours += 12;
                if (ampm === 'AM' && hours === 12) hours = 0;
                
                const time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

                // 3. Add to Map (Group by Date -> Agent)
                const nameKey = name.toLowerCase();
                
                if (!dateMap[date]) dateMap[date] = {};
                if (!dateMap[date][nameKey]) dateMap[date][nameKey] = new Set();
                
                dateMap[date][nameKey].add(time);
              }
            }
          });

          // Process Map into Database Rows
          const activeAgents = agents; 
          const newAttendance = [];
          const threshold = lateTimeVal || lateTime;

          Object.keys(dateMap).forEach(date => {
            Object.keys(dateMap[date]).forEach(importedNameLower => {
              // Find the agent in your DB (Case-insensitive)
              const agent = activeAgents.find(a => a.name.toLowerCase() === importedNameLower);
              
              if (agent) {
                const times = Array.from(dateMap[date][importedNameLower]).sort();
                const loginTime = times[0];
                const logoutTime = times.length > 1 ? times[times.length - 1] : loginTime;
                
                const status = 'Present';
                const isLate = (loginTime > threshold);

                newAttendance.push({
                  date: date,
                  agentName: agent.name, // Use correct casing from DB
                  loginTime: loginTime,
                  logoutTime: logoutTime,
                  status: status,
                  late: isLate
                });
              }
            });
          });

          // Filter Duplicates before inserting
          const uniqueAttendance = newAttendance.filter(newItem => {
            const isDuplicate = attendance.some(existing => 
              existing.agentName === newItem.agentName && 
              existing.date === newItem.date
            );
            return !isDuplicate;
          });

          if (uniqueAttendance.length > 0) {
            const { data, error } = await supabase.from('attendance').insert(uniqueAttendance).select();
            if (!error) {
              setAttendance([...attendance, ...data]);
              alert(`Success! Imported ${data.length} attendance records.`);
            } else {
              alert('Database Error: ' + error.message);
            }
          } else {
            alert("No new records found. All imported data already exists.");
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

  // 2. Mark as Left / Reactivate (Smart Sync)
  const handleToggleHRStatus = async (id, currentStatus, cnic, agentName) => {
    if (!id) return alert("Error: Record ID is missing.");

    const newStatus = currentStatus === 'Active' ? 'Left' : 'Active';
    // Only set leftDate if we are marking as Left
    const leftDateVal = newStatus === 'Left' ? new Date().toISOString().split('T')[0] : null;

    const confirmMsg = newStatus === 'Left'
      ? `Mark ${agentName} as LEFT?`
      : `Reactivate ${agentName}?`;

    if (window.confirm(confirmMsg)) {
      try {
        setLoading(true);

        // A. Update HR Record
        const { error: hrError } = await supabase
          .from('hr_records')
          .update({ status: newStatus })
          .eq('id', id);

        if (hrError) throw hrError;

        // B. Sync with Agents Table
        // Try deleting by CNIC first, if valid
        let agentUpdateQuery = supabase.from('agents').update({ status: newStatus, leftDate: leftDateVal });

        if (cnic && cnic.trim() !== '') {
          await agentUpdateQuery.eq('cnic', cnic);
        } else if (agentName) {
          // Fallback: If CNIC is missing, match by Name
          console.warn("Syncing by Name because CNIC is missing...");
          await agentUpdateQuery.eq('name', agentName);
        }

        // C. Update Local State (Both Tabs)
        setHrRecords(prev => prev.map(h => h.id === id ? { ...h, status: newStatus } : h));

        setAgents(prev => prev.map(a => {
          // Check if this is the agent we modified
          const isMatch = (cnic && a.cnic === cnic) || (agentName && a.name === agentName);
          if (isMatch) {
            return { ...a, status: newStatus, leftDate: leftDateVal };
          }
          return a;
        }));

        alert(`Success! Status changed to ${newStatus}`);

      } catch (error) {
        console.error("Status Update Error:", error);
        alert("Failed to update status: " + error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  // 3. Delete Record (Smart Sync)
  const handleDeleteHR = async (id, cnic, agentName) => {
    if (window.confirm(`CRITICAL: Permanently delete ${agentName}? \nThis removes them from BOTH HR and Agent lists.`)) {
      try {
        setLoading(true);

        // A. Delete from HR
        const { error: hrError } = await supabase.from('hr_records').delete().eq('id', id);
        if (hrError) throw hrError;

        // B. Delete from Agents (Sync)
        let agentDeleteQuery = supabase.from('agents').delete();

        if (cnic && cnic.trim() !== '') {
          await agentDeleteQuery.eq('cnic', cnic);
        } else if (agentName) {
          // Fallback: Match by Name if CNIC is missing
          await agentDeleteQuery.eq('name', agentName);
        }

        // C. Update Local State (Both Tabs)
        setHrRecords(prev => prev.filter(h => h.id !== id));
        setAgents(prev => prev.filter(a => {
          const isMatch = (cnic && a.cnic === cnic) || (agentName && a.name === agentName);
          return !isMatch; // Keep only those that DON'T match
        }));

        alert("Record deleted from all systems.");

      } catch (error) {
        console.error("Delete Error:", error);
        alert("Failed to delete: " + error.message);
      } finally {
        setLoading(false);
      }
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

  // LOGIN SCREEN (Modern Dark Theme)
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] relative overflow-hidden">
        {/* Background Decorative Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] opacity-50 pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] opacity-50 pointer-events-none"></div>

        {/* Login Card */}
        <div className="bg-slate-900/80 border border-slate-800 p-10 rounded-3xl shadow-2xl w-full max-w-md backdrop-blur-xl relative z-10">

          {/* Logo / Icon Area */}
          <div className="flex justify-center mb-8">
            <div className="bg-gradient-to-tr from-blue-600 to-blue-400 p-4 rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.4)]">
              <Lock className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Header Text */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Welcome Back</h1>
            <p className="text-slate-400 text-sm font-medium">Enter your credentials to access the workspace</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Username</label>
              <input
                type="text"
                className="w-full px-4 py-3.5 bg-slate-950/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-white placeholder-slate-600 text-sm"
                placeholder="e.g. Admin"
                value={loginData.name}
                onChange={e => setLoginData({ ...loginData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Password</label>
              <input
                type="password"
                className="w-full px-4 py-3.5 bg-slate-950/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-white placeholder-slate-600 text-sm"
                placeholder="••••••••"
                value={loginData.password}
                onChange={e => setLoginData({ ...loginData, password: e.target.value })}
                required
              />
            </div>

            {/* Error Message */}
            {loginError && (
              <div className="flex items-center gap-3 text-red-400 text-sm bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="font-medium">{loginError}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white py-4 rounded-xl font-bold text-sm tracking-wide shadow-lg hover:shadow-blue-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
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
                  <span className={`px-2 py-0.5 rounded-full font-medium ${userRole === 'Admin' ? 'bg-purple-100 text-purple-700' :
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
                  className={`px-6 py-3 text-sm font-medium capitalize transition-colors whitespace-nowrap ${activeTab === tab
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
              className={`px-6 py-3 text-sm font-medium capitalize whitespace-nowrap transition-colors ${activeTab === 'monthly_matrix'
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
            {/* Filter Bar */}
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

              {/* [CHANGED] Display Total Bonus */}
              <StatCard
                icon={<DollarSign className="w-6 h-6" />}
                label="Total Bonus"
                value={`${(dashboardStats.totalBonusPayout).toLocaleString()} PKR`}
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

            {/* Top Performers Table */}
            <div className="bg-slate-800/50 rounded-xl shadow-sm border border-slate-600 p-4">
              <h2 className="text-lg font-semibold text-white mb-4">
                {userRole === 'Agent' ? 'My Performance' : 'Top Performers'} - {selectedMonth}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      {userRole !== 'Agent' && <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">Rank</th>}
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">Agent</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">Team</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-200">Sales</th>

                      {/* [CHANGED] Header: Bonus */}
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-200">Bonus</th>

                      {userRole !== 'Agent' && <th className="text-right py-3 px-4 text-sm font-medium text-slate-200">Net Salary</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPerformerStats.slice(0, userRole === 'Agent' ? 1 : 10).map((agent, idx) => (
                      <tr key={agent.id || idx} className="border-b border-slate-700 hover:bg-slate-700">
                        {userRole !== 'Agent' && (
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-700' :
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
                        <td className="py-3 px-4 text-right font-semibold text-white">{agent.totalSales}</td>

                        {/* [CHANGED] Display Bonus Amount */}
                        <td className="py-3 px-4 text-right text-green-400 font-medium">
                          {agent.totalBonuses > 0 ? `+${agent.totalBonuses.toLocaleString()}` : '-'}
                        </td>

                        {userRole !== 'Agent' && (
                          <td className="py-3 px-4 text-right font-bold text-blue-400">
                            {agent.netSalary.toLocaleString()} PKR
                          </td>
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
              <button
                onClick={() => {
                  setEditingHR({
                    id: null,
                    agent_name: '',
                    father_name: '',
                    designation: '',
                    contact_number: '',
                    email: '',
                    address: '',
                    cnic: '',
                    joining_date: new Date().toISOString().split('T')[0],
                    team: '',
                    center: '',
                    baseSalary: '',
                    bank_name: '',
                    account_number: ''
                  });
                  setShowAddEmployee(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Employee
              </button>
            </div>

            {/* Filter Grid */}
            <div className="bg-slate-800/50 rounded-xl shadow-sm border border-slate-600 p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input type="text" placeholder="Search by name or CNIC..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
                    <th className="py-3 px-4 text-sm font-medium text-slate-200 min-w-[50px]">No.</th>
                    <th className="py-3 px-4 text-sm font-medium text-slate-200 min-w-[220px]">Agent</th>
                    <th className="py-3 px-4 text-sm font-medium text-slate-200 min-w-[180px]">Father Name</th>
                    <th className="py-3 px-4 text-sm font-medium text-slate-200 min-w-[200px]">Bank Details</th>
                    <th className="py-3 px-4 text-sm font-medium text-slate-200 min-w-[140px]">Contact No</th>
                    <th className="py-3 px-4 text-sm font-medium text-slate-200 min-w-[140px]">Designation</th>
                    <th className="py-3 px-4 text-sm font-medium text-slate-200 min-w-[120px]">Team</th>
                    <th className="py-3 px-4 text-sm font-medium text-slate-200 min-w-[120px]">Center</th>
                    <th className="py-3 px-4 text-sm font-medium text-slate-200 min-w-[100px]">Salary</th>
                    <th className="py-3 px-4 text-sm font-medium text-slate-200 min-w-[160px]">CNIC</th>
                    <th className="py-3 px-4 text-sm font-medium text-slate-200 min-w-[140px]">Joining Date</th>
                    <th className="py-3 px-4 text-sm font-medium text-center text-slate-200 min-w-[140px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHR.map((rec, idx) => {
                    const agentProfile = agents.find(a => (a.cnic && a.cnic === rec.cnic) || (a.name.toLowerCase() === rec.agent_name.toLowerCase())) || {};

                    return (
                      <tr key={rec.id} className="border-b border-slate-700 hover:bg-slate-700">
                        <td className="py-3 px-4 text-slate-300">{idx + 1}</td>

                        {/* 1. Name & Status Combined */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-white text-sm">{rec.agent_name}</div>
                          <div className={`text-[11px] mt-0.5 font-medium ${rec.status === 'Active' ? 'text-green-400' : 'text-red-400'}`}>
                            {rec.status || 'Active'}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-slate-300 text-sm">{rec.father_name || '-'}</td>

                        {/* 2. Bank Details Combined */}
                        <td className="py-3 px-4">
                          <div className="text-sm text-slate-200">{rec.bank_name || '-'}</div>
                          <div className="text-xs text-slate-500 font-mono">{rec.account_number || '-'}</div>
                        </td>

                        <td className="py-3 px-4 text-slate-300 font-mono text-xs">{rec.Phone || '-'}</td>
                        <td className="py-3 px-4 text-slate-300 text-sm">{rec.designation}</td>
                        <td className="py-3 px-4 text-slate-300 text-sm">{agentProfile.team || '-'}</td>
                        <td className="py-3 px-4 text-slate-300 text-xs">{agentProfile.center || '-'}</td>
                        <td className="py-3 px-4 text-slate-300 text-sm font-mono">{agentProfile.baseSalary || '-'}</td>
                        <td className="py-3 px-4 text-slate-400 text-xs font-mono">{rec.cnic}</td>

                        {/* [CHANGED] Joining Date + Left Date (fetched from Agent Profile) */}
                        <td className="py-3 px-4">
                          <div className="text-slate-300 text-sm">{rec.joining_date}</div>
                          {rec.status === 'Left' && agentProfile.leftDate && (
                            <div className="text-[10px] text-red-400 font-medium mt-0.5">
                              Left: {agentProfile.leftDate}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            {/* Edit Button */}
                            <button onClick={() => {
                              const linkedAgent = agents.find(a => (a.cnic && a.cnic === rec.cnic) || (a.name === rec.agent_name)) || {};
                              setEditingHR({
                                id: rec.id,
                                agent_name: rec.agent_name || '',
                                father_name: rec.father_name || '',
                                designation: rec.designation || '',
                                cnic: rec.cnic || '',
                                joining_date: rec.joining_date || '',
                                contact_number: rec.Phone || rec.contact_number || linkedAgent.Phone || '',
                                email: rec.email || linkedAgent.email || '',
                                address: rec.address || linkedAgent.address || '',
                                team: rec.team || linkedAgent.team || '',
                                center: rec.center || linkedAgent.center || '',
                                baseSalary: rec.baseSalary || linkedAgent.baseSalary || '',
                                bank_name: rec.bank_name || linkedAgent.bank_name || '',
                                account_number: rec.account_number || linkedAgent.account_number || ''
                              });
                              setShowAddEmployee(true);
                            }} className="p-1.5 bg-blue-500/10 text-blue-400 rounded hover:bg-blue-500/20 transition-colors" title="Edit">
                              <Pencil className="w-4 h-4" />
                            </button>

                            {/* Toggle Status Button */}
                            <button
                              onClick={() => handleToggleHRStatus(rec.id, rec.status || 'Active', rec.cnic, rec.agent_name)}
                              className="p-1.5 bg-orange-500/10 text-orange-400 rounded hover:bg-orange-500/20 transition-colors"
                              title={rec.status === 'Active' ? "Mark as Left" : "Reactivate"}
                            >
                              {rec.status === 'Active' ? <UserX className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteHR(rec.id, rec.cnic, rec.agent_name)}
                              className="p-1.5 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 transition-colors"
                              title="Delete Permanently"
                            >
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
                    <button onClick={() => {
                      setEditingAgent({});
                      setShowEditAgent(false);
                      setShowAddAgent(true);
                    }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
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
                    <th className="py-3 px-4 text-sm font-medium text-slate-200 min-w-[50px]">No.</th>
                    <th className="py-3 px-4 text-sm font-medium text-slate-200 min-w-[200px]">Agent</th>
                    <th className="py-3 px-4 text-sm font-medium text-slate-200 min-w-[180px]">Father Name</th>
                    <th className="py-3 px-4 text-sm font-medium text-slate-200 min-w-[200px]">Bank Details</th>
                    <th className="py-3 px-4 text-sm font-medium text-slate-200 min-w-[140px]">CNIC</th>
                    <th className="py-3 px-4 text-sm font-medium text-slate-200 min-w-[140px]">Team</th>
                    <th className="py-3 px-4 text-sm font-medium text-slate-200 min-w-[140px]">Center</th>
                    <th className="py-3 px-4 text-sm font-medium text-slate-200 text-right min-w-[100px]">Salary</th>

                    {/* [CHANGED] Renamed from "Active Date" to "Joining Date" */}
                    <th className="py-3 px-4 text-sm font-medium text-slate-200 text-center min-w-[120px]">Joining Date</th>

                    {userRole === 'Admin' && <th className="py-3 px-4 text-sm font-medium text-slate-200 text-center min-w-[140px]">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredAgents.map((agent, idx) => {
                    // Fetch linked HR Data
                    const linkedHR = hrRecords.find(h => h.cnic === agent.cnic) || {};
                    const displayFatherName = linkedHR.father_name || agent.father_name || '-';

                    return (
                      <tr key={agent.cnic || idx} className="border-b border-slate-700 hover:bg-slate-700">
                        <td className="py-3 px-4 text-slate-300">{idx + 1}</td>

                        {/* 1. Name & Status Combined */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-white text-sm">{agent.name}</div>
                          <div className={`text-[11px] mt-0.5 font-medium ${agent.status === 'Active' ? 'text-green-400' : 'text-red-400'}`}>
                            {agent.status}
                          </div>
                        </td>

                        {/* Father Name */}
                        <td className="py-3 px-4 text-slate-300 text-sm">{displayFatherName}</td>

                        {/* 2. Bank Details Combined */}
                        <td className="py-3 px-4">
                          <div className="text-sm text-slate-200">{linkedHR.bank_name || '-'}</div>
                          <div className="text-xs text-slate-500 font-mono">{linkedHR.account_number || '-'}</div>
                        </td>

                        <td className="py-3 px-4 text-slate-400 text-xs font-mono">{agent.cnic || '-'}</td>
                        <td className="py-3 px-4 text-slate-300 text-sm">{agent.team}</td>
                        <td className="py-3 px-4 text-slate-300 text-xs">{agent.center || '-'}</td>
                        <td className="py-3 px-4 text-right text-slate-100 font-mono">{agent.baseSalary ? agent.baseSalary.toLocaleString() : 0}</td>

                        {/* [CHANGED] Joining Date + Left Date (if applicable) */}
                        <td className="py-3 px-4 text-center">
                          <div className="text-slate-300 text-xs">{linkedHR.joining_date || '-'}</div>
                          {agent.status === 'Left' && agent.leftDate && (
                            <div className="text-[10px] text-red-400 font-medium mt-0.5">
                              Left: {agent.leftDate}
                            </div>
                          )}
                        </td>

                        {userRole === 'Admin' && (
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => {
                                const hrInfo = hrRecords.find(h => h.cnic === agent.cnic) || {};
                                setEditingAgent({
                                  ...agent,
                                  ...hrInfo,
                                  contact_number: agent.Phone || hrInfo.Phone,
                                  active_date: hrInfo.joining_date || agent.activeDate
                                });
                                setShowEditAgent(true);
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sales TAB */}

        {activeTab === 'sales' && (
          <div className="space-y-6">

            {/* Header Section */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Sales Management</h2>
              <div className="flex gap-3">
                {userRole === 'Admin' && (
                  <>
                    <button
                      onClick={() => { setImportType('sales'); setShowImportModal(true); }}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Upload className="w-4 h-4" /> Import CSV
                    </button>
                    <button
                      onClick={() => {
                        const name = window.prompt('Enter evaluator name:');
                        if (name && name.trim()) setEvaluators(prev => [...prev, name.trim()]);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Add Evaluator
                    </button>
                  </>
                )}
                {(userRole === 'Admin' || userRole === 'Agent') && (
                  <button
                    onClick={() => setShowAddSale(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Submit Sale
                  </button>
                )}
              </div>
            </div>

            {/* DISPOSITION DASHBOARD CARDS (RESTORED) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl">
                <p className="text-xs text-green-400 font-bold uppercase">Success Sales</p>
                <p className="text-2xl font-black text-green-500">{salesStats.sales}</p>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl">
                <p className="text-xs text-yellow-400 font-bold uppercase">Unsuccessful</p>
                <p className="text-2xl font-black text-yellow-500">{salesStats.unsuccessful}</p>
              </div>
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
                <p className="text-xs text-red-400 font-bold uppercase">DNC / DNQ</p>
                <p className="text-2xl font-black text-red-500">{salesStats.dncDnq}</p>
              </div>
              <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl">
                <p className="text-xs text-orange-400 font-bold uppercase">Pending Review</p>
                <p className="text-2xl font-black text-orange-500">{salesStats.pending}</p>
              </div>
            </div>

            {/* Date Filter Bar */}
            <DateFilterBar
              filterType={filterType} setFilterType={setFilterType}
              dateVal={customStartDate} setDateVal={setCustomStartDate}
              endVal={customEndDate} setEndVal={setCustomEndDate}
              selectedMonth={selectedMonth} handleMonthChange={handleMonthChange}
            />

            {/* Filters Section */}
            <div className="bg-slate-800/50 rounded-xl shadow-sm border border-slate-600 p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="Search agent, customer, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="All">All Teams</option>
                  {teams.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={centerFilter} onChange={(e) => setCenterFilter(e.target.value)} className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="All">All Centers</option>
                  {centers.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={salesStatusFilter} onChange={(e) => setSalesStatusFilter(e.target.value)} className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="All">All Dispositions</option>
                  <optgroup label="Success">
                    <option value="HW- Xfer">HW- Xfer</option>
                    <option value="HW-IBXfer">HW-IBXfer</option>
                    <option value="HW-Xfer-CDR">HW-Xfer-CDR</option>
                  </optgroup>
                  <optgroup label="Unsuccessful">
                    <option value="Unsuccessful">Unsuccessful</option>
                    <option value="DNC">DNC</option>
                    <option value="DNQ">DNQ</option>
                    <option value="DNQ-Webform">DNQ-Webform</option>
                    <option value="Review Pending">Review Pending</option>
                  </optgroup>
                </select>
              </div>
            </div>

            {/* DATA TABLE (FULL COLUMNS & EDITABLE) */}
            <div className="bg-slate-800/80 rounded-xl border border-slate-600 overflow-auto max-h-[70vh]">
              <table className="w-full min-w-max border-collapse">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-slate-900 border-b border-slate-700">
                    <th className="text-left py-4 px-3 text-xs font-bold text-slate-400 uppercase">No.</th>
                    <th className="text-left py-4 px-3 text-xs font-bold text-slate-400 uppercase">Timestamp</th>
                    <th className="text-left py-4 px-3 text-xs font-bold text-slate-400 uppercase sticky left-0 bg-slate-900">Agent Name</th>
                    <th className="text-left py-4 px-3 text-xs font-bold text-slate-400 uppercase">Customer Name</th>
                    <th className="text-left py-4 px-3 text-xs font-bold text-slate-400 uppercase">Phone Number</th>
                    <th className="text-left py-4 px-3 text-xs font-bold text-slate-400 uppercase">State</th>
                    <th className="text-left py-4 px-3 text-xs font-bold text-slate-400 uppercase">Zip</th>
                    <th className="text-left py-4 px-3 text-xs font-bold text-slate-400 uppercase">Address</th>
                    <th className="text-left py-4 px-3 text-xs font-bold text-slate-400 uppercase text-center">Campaign</th>
                    <th className="text-left py-4 px-3 text-xs font-bold text-slate-400 uppercase">Center</th>
                    <th className="text-left py-4 px-3 text-xs font-bold text-slate-400 uppercase">Team Lead</th>
                    <th className="text-left py-4 px-3 text-xs font-bold text-slate-400 uppercase">Comments</th>
                    <th className="text-left py-4 px-3 text-xs font-bold text-slate-400 uppercase">List ID</th>
                    <th className="text-left py-4 px-3 text-xs font-bold text-slate-400 uppercase min-w-[150px]">Disposition</th>
                    <th className="text-left py-4 px-3 text-xs font-bold text-slate-400 uppercase">Duration</th>
                    <th className="text-left py-4 px-3 text-xs font-bold text-slate-400 uppercase">Xfer Time</th>
                    <th className="text-left py-4 px-3 text-xs font-bold text-slate-400 uppercase">Xfer Attempts</th>
                    <th className="text-left py-4 px-3 text-xs font-bold text-slate-400 uppercase min-w-[250px]">Feedback (Before)</th>
                    <th className="text-left py-4 px-3 text-xs font-bold text-slate-400 uppercase">Feedback (After)</th>
                    <th className="text-left py-4 px-3 text-xs font-bold text-slate-400 uppercase">Grading</th>
                    <th className="text-left py-4 px-3 text-xs font-bold text-slate-400 uppercase">Dock Details</th>
                    <th className="text-left py-4 px-3 text-xs font-bold text-slate-400 uppercase">Dock Reason</th> {/* NEW HEADER */}
                    <th className="text-left py-4 px-3 text-xs font-bold text-slate-400 uppercase">Evaluator</th>
                    {(userRole === 'Admin' || userRole === 'QA') && <th className="text-center py-4 px-3 text-xs font-bold text-slate-400 uppercase">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {filteredSales.map((sale, idx) => {
                    const disp = sale.disposition;
                    let rowColor = "hover:bg-slate-700/50";
                    if (['HW- Xfer', 'HW-IBXfer', 'HW-Xfer-CDR'].includes(disp)) rowColor = "bg-green-900/10 hover:bg-green-900/20";
                    else if (['DNC', 'DNQ', 'DNQ-Dup', 'DNQ-Webform'].includes(disp)) rowColor = "bg-red-900/10 hover:bg-red-900/20";
                    else if (['Review Pending', 'Pending Review'].includes(disp)) rowColor = "bg-orange-900/10 hover:bg-orange-900/20";
                    else if (disp === 'Unsuccessful') rowColor = "bg-yellow-900/10 hover:bg-yellow-900/20";

                    return (
                      <tr key={sale.id} className={`${rowColor} transition-colors`}>
                        <td className="py-3 px-3 text-xs text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-3 px-3 text-xs text-slate-300 whitespace-nowrap">{sale.timestamp || sale.date}</td>
                        <td className="py-3 px-3 text-xs font-bold text-white sticky left-0 bg-inherit">{sale.agentName}</td>
                        <td className="py-3 px-3 text-xs text-slate-300">{sale.customerName || '-'}</td>
                        <td className="py-3 px-3 text-xs text-slate-300 font-mono">{sale.phoneNumber || '-'}</td>
                        <td className="py-3 px-3 text-xs text-slate-400">{sale.state || '-'}</td>
                        <td className="py-3 px-3 text-xs text-slate-400">{sale.zip || '-'}</td>
                        <td className="py-3 px-3 text-xs text-slate-400">{sale.address || '-'}</td>
                        <td className="py-3 px-3 text-xs text-slate-400 text-center">{sale.campaignType || '-'}</td>
                        <td className="py-3 px-3 text-xs text-slate-400">{sale.center || '-'}</td>
                        <td className="py-3 px-3 text-xs text-slate-400">{sale.teamLead || '-'}</td>
                        <td className="py-3 px-3 text-xs text-slate-400">{sale.comments || '-'}</td>
                        <td className="py-3 px-3 text-xs text-slate-400">{sale.listId || '-'}</td>

                        {/* Editable Disposition */}
                        <td className="py-3 px-3">
                          {(userRole === 'Admin' || userRole === 'QA') ? (
                            <select
                              value={sale.disposition || ''}
                              onChange={(e) => updateSaleDisposition(sale.id, e.target.value)}
                              className="w-full px-2 py-1 text-xs bg-slate-900/50 text-white border border-slate-600 rounded outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="">Select...</option>
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
                          ) : (
                           <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide
                              ${['HW- Xfer', 'HW-IBXfer', 'HW-Xfer-CDR'].includes(sale.disposition) ? 'bg-green-500/20 text-green-400' : 
                                ['Unsuccessful', 'HUWT'].includes(sale.disposition) ? 'bg-yellow-500/20 text-yellow-400' :
                                ['Review Pending', 'Pending Review'].includes(sale.disposition) ? 'bg-orange-500/20 text-orange-400' :
                                'bg-red-500/20 text-red-400'}`}>
                              {sale.disposition || '-'}
                            </span>
                          )}
                        </td>

                        {/* Editable Duration */}
                        <td className="py-2 px-2">
                          {(userRole === 'Admin' || userRole === 'QA') ? (
                            <input
                              type="text"
                              // 1. Use defaultValue (Fast typing)
                              defaultValue={sale.duration || ''}

                              // 2. Save only when leaving the box
                              onBlur={(e) => {
                                if (e.target.value !== (sale.duration || '')) {
                                  updateSaleField(sale.id, 'duration', e.target.value);
                                }
                              }}
                              // 3. Save on Enter
                              onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                              className="w-full px-1 py-1 text-xs bg-slate-700 text-white border border-slate-600 rounded"
                            />
                          ) : (
                            <span className="text-xs text-slate-300">{sale.duration || '-'}</span>
                          )}
                        </td>

                        {/* Editable Xfer Time */}
                        <td className="py-2 px-2">
                          {(userRole === 'Admin' || userRole === 'QA') ? (
                            <input
                              type="text"
                              defaultValue={sale.xferTime || ''}
                              onBlur={(e) => {
                                if (e.target.value !== (sale.xferTime || '')) {
                                  updateSaleField(sale.id, 'xferTime', e.target.value);
                                }
                              }}
                              onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                              className="w-full px-1 py-1 text-xs bg-slate-700 text-white border border-slate-600 rounded"
                            />
                          ) : (
                            <span className="text-xs text-slate-300">{sale.xferTime || '-'}</span>
                          )}
                        </td>

                        {/* Editable Xfer Attempts */}
                        <td className="py-2 px-2">
                          {(userRole === 'Admin' || userRole === 'QA') ? (
                            <select value={sale.xferAttempts || ''} onChange={(e) => updateSaleField(sale.id, 'xferAttempts', e.target.value)} className="w-full px-1 py-1 text-xs bg-slate-700 text-white border border-slate-600 rounded">
                              <option value="">-</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option>
                            </select>
                          ) : (
                            <span className="text-xs text-slate-300">{sale.xferAttempts || '-'}</span>
                          )}
                        </td>

                        {/* Editable Feedback (Before) Paragraph Box */}
                        <td className="py-3 px-3">
                          {(userRole === 'Admin' || userRole === 'QA') ? (
                            <textarea
                              // 1. Use defaultValue
                              defaultValue={sale.feedbackBeforeXfer || ''}

                              // 2. Save only when clicking away (Blur)
                              onBlur={(e) => {
                                // Only save if text actually changed
                                if (e.target.value !== (sale.feedbackBeforeXfer || '')) {
                                  updateSaleField(sale.id, 'feedbackBeforeXfer', e.target.value);
                                }
                              }}
                              rows={3}
                              className="w-full min-w-[250px] px-2 py-1 text-xs bg-slate-700 text-white border border-slate-600 rounded resize-y placeholder-slate-500"
                            />
                          ) : (
                            <div className="text-xs text-slate-300 whitespace-pre-wrap min-w-[250px]">{sale.feedbackBeforeXfer || '-'}</div>
                          )}
                        </td>

                        {/* Editable Feedback (After) */}
                        <td className="py-2 px-2">
                          {(userRole === 'Admin' || userRole === 'QA') ? (
                            <input
                              type="text"
                              defaultValue={sale.feedbackAfterXfer || ''}
                              onBlur={(e) => {
                                if (e.target.value !== (sale.feedbackAfterXfer || '')) {
                                  updateSaleField(sale.id, 'feedbackAfterXfer', e.target.value);
                                }
                              }}
                              onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                              className="w-full px-1 py-1 text-xs bg-slate-700 text-white border border-slate-600 rounded"
                            />
                          ) : (
                            <span className="text-xs text-slate-300">{sale.feedbackAfterXfer || '-'}</span>
                          )}
                        </td>

                        {/* Editable Grading */}
                        <td className="py-3 px-3">
                          {(userRole === 'Admin' || userRole === 'QA') ? (
                            <select value={sale.grading || ''} onChange={(e) => updateSaleField(sale.id, 'grading', e.target.value)} className="w-full px-1 py-1 text-xs bg-slate-700 text-white border border-slate-600 rounded">
                              <option value="">-</option><option value="Good">Good</option><option value="Bad">Bad</option><option value="Worst">Worst</option>
                            </select>
                          ) : (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${sale.grading === 'Good' ? 'bg-green-500/20 text-green-400' : sale.grading === 'Bad' ? 'bg-red-500/20 text-red-400' : 'text-slate-500'}`}>
                              {sale.grading || '-'}
                            </span>
                          )}
                        </td>

                        {/* Editable Dock Details */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Fine"
                            // 1. Use defaultValue instead of value for uncontrolled input
                            defaultValue={sale.dockDetails || ''}

                            // 2. Only validate input visually
                            onInput={(e) => {
                              e.target.value = e.target.value.replace(/\D/g, '');
                            }}

                            // 3. Trigger the Database Update ONLY when leaving the field
                            onBlur={(e) => {
                              const val = e.target.value;
                              // Only update if the value actually changed
                              if (val !== sale.dockDetails) {
                                updateSaleField(sale.id, 'dockDetails', val);
                              }
                            }}

                            // 4. Handle "Enter" key
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.target.blur(); // Triggers onBlur
                              }
                            }}

                            className="w-full px-1 py-1 text-xs bg-slate-700 text-white border border-slate-600 rounded text-center font-mono placeholder-slate-400 focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                        </td>

                        {/* DOCK REASON (Fine Reason) */}
                        <td className="py-2 px-2 align-middle">
                          <input
                            type="text"
                            placeholder="Reason..."
                            // [FIX] Check both casing styles to ensure data loads
                            defaultValue={sale.dockReason || sale.dockreason || ''}

                            onBlur={(e) => {
                              const val = e.target.value;
                              // [FIX] Pass 'dockreason' (lowercase) if that is your DB column name
                              updateSaleField(sale.id, 'dockreason', val);
                            }}

                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.target.blur();
                            }}

                            className="w-full px-1 py-1 text-xs bg-slate-700 text-white border border-slate-600 rounded text-left"
                          />
                        </td>

                        {/* Editable Evaluator */}
                        <td className="py-2 px-2">
                          {(userRole === 'Admin' || userRole === 'QA') ? (
                            <select value={sale.evaluator || ''} onChange={(e) => updateSaleField(sale.id, 'evaluator', e.target.value)} className="w-full px-1 py-1 text-xs bg-slate-700 text-white border border-slate-600 rounded">
                              <option value="">-</option>
                              {evaluators.map(e => <option key={e} value={e}>{e}</option>)}
                            </select>
                          ) : (
                            <span className="text-xs text-slate-300">{sale.evaluator || '-'}</span>
                          )}
                        </td>

                        {(userRole === 'Admin' || userRole === 'QA') && (
                          <td className="py-3 px-3 text-center">
                            {/* [FIX] Added 'gap-2' here to separate the buttons */}
                            <div className="flex items-center justify-center gap-2">

                              {/* Edit Button */}
                              <button
                                onClick={() => setEditSale(sale)}
                                className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() => handleDeleteSale(sale.id)}
                                className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>

                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
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
                            <div className={`text-[10px] mt-0.5 ${agent.status === 'Active' ? 'text-green-400' : 'text-red-400'}`}>
    {agent.status}</div>
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

        {/* Monthly Matrix Tab */}

      {activeTab === 'monthly_matrix' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl text-white font-bold">Team Performance Matrix ({selectedMonth})</h2>
                <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Grouped by Team • Daily Breakdown • Sales Frequency</p>
              </div>
              <div className="text-sm text-slate-400 font-medium">
                Cycle: {getPayrollRange(selectedMonth).start.toDateString()} - {getPayrollRange(selectedMonth).end.toDateString()}
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
              <div className="overflow-auto relative">
                <table className="w-full text-slate-300 border-collapse table-fixed">
                  <thead className="sticky top-0 z-40 shadow-md">
                    <tr className="bg-slate-950">
                      <th className="p-3 text-center border-b border-r border-slate-800 sticky left-0 z-50 bg-slate-950 w-12">No.</th>
                      <th className="p-3 text-left border-b border-r border-slate-800 sticky left-12 z-50 bg-slate-950 w-44">Agent Name</th>

                      {/* Metric Headers */}
                      <th className="p-2 text-center border-b border-r border-slate-800 bg-blue-900/40 text-blue-400 text-[10px] font-bold w-14">LPD</th>
                      <th className="p-2 text-center border-b border-r border-slate-800 bg-slate-800 text-slate-400 text-[10px] w-12">DAYS</th>
                      <th className="p-2 text-center border-b border-slate-800 bg-red-900/20 text-red-400 text-[10px] w-10">0s</th>
                      <th className="p-2 text-center border-b border-slate-800 bg-orange-900/20 text-orange-400 text-[10px] w-10">1s</th>
                      <th className="p-2 text-center border-b border-slate-800 bg-yellow-900/20 text-yellow-400 text-[10px] w-10">2s</th>
                      <th className="p-2 text-center border-b border-r border-slate-800 bg-green-900/20 text-green-400 text-[10px] w-10">3s</th>

                      {/* Date Columns */}
                      {getDaysArray(getPayrollRange(selectedMonth).start, getPayrollRange(selectedMonth).end).map(dateStr => {
                        const d = new Date(dateStr);
                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                        return (
                          <th key={dateStr} className={`p-2 text-center border-b border-slate-800 w-10 ${isWeekend ? 'bg-slate-800/50' : 'bg-slate-900'}`}>
                            <div className="text-[10px] text-slate-500 uppercase">{d.toLocaleDateString('en-US', { weekday: 'narrow' })}</div>
                            <div className={`text-xs font-bold ${isWeekend ? 'text-slate-500' : 'text-white'}`}>{d.getDate()}</div>
                          </th>
                        );
                      })}
                      <th className="p-3 text-center bg-slate-950 border-b border-l border-slate-800 font-bold text-green-400 sticky right-0 z-40 w-16 shadow-[-4px_0_10px_rgba(0,0,0,0.5)]">TOTAL</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800">
                    {(() => {
                      const globalWorkDays = new Set();
                      const { start, end } = getPayrollRange(selectedMonth);
                      
                      sales.forEach(s => {
                        if (new Date(s.date) >= start && new Date(s.date) <= end) {
                           if (s.status === 'Sale' || ['HW- Xfer', 'HW-IBXfer'].includes(s.disposition)) {
                              globalWorkDays.add(s.date);
                           }
                        }
                      });

                      return teams.map(teamName => {
                        const teamAgents = monthlyStats.filter(s => s.team === teamName);
                        if (teamAgents.length === 0) return null;

                        const teamAllSales = sales.filter(s => 
                          (s.status === 'Sale' || s.disposition === 'HW- Xfer' || s.disposition === 'HW-IBXfer') &&
                          teamAgents.some(a => a.name === s.agentName)
                        );

                        const teamTotalSales = teamAgents.reduce((sum, a) => sum + a.totalSales, 0);
                        const teamTotalDays = teamAgents.reduce((sum, a) => sum + a.dialingDays, 0);
                        const teamAvgLPD = teamTotalDays > 0 ? (teamTotalSales / teamTotalDays).toFixed(2) : "0.00";

                        return (
                          <React.Fragment key={teamName}>
                            <tr className="bg-slate-800/80 sticky top-[53px] z-30">
                              <td colSpan={2} className="p-2 px-4 border-r border-slate-700 font-black text-blue-400 uppercase tracking-widest text-sm sticky left-0 z-30 bg-slate-800">
                                {teamName}
                              </td>
                              <td className="text-center font-bold text-blue-300 border-r border-slate-700 bg-slate-800">{teamAvgLPD}</td>
                              <td className="text-center text-slate-400 border-r border-slate-700 bg-slate-800">{teamTotalDays}</td>
                              <td colSpan={4} className="bg-slate-800 border-r border-slate-700"></td>
                              
                              {getDaysArray(getPayrollRange(selectedMonth).start, getPayrollRange(selectedMonth).end).map(d => {
                                  const dailyCount = teamAllSales.filter(s => s.date === d).length;
                                  return (
                                    <td key={d} className={`text-center text-[10px] border-b border-slate-700 font-bold ${dailyCount > 0 ? 'text-blue-300 bg-blue-500/10' : 'text-slate-600 bg-slate-800/30'}`}>
                                      {dailyCount > 0 ? dailyCount : '-'}
                                    </td>
                                  );
                              })}

                              <td className="text-center font-black text-green-400 sticky right-0 z-30 bg-slate-800 shadow-[-4px_0_10px_rgba(0,0,0,0.5)]">
                                {teamTotalSales}
                              </td>
                            </tr>

                            {teamAgents.map((stat, idx) => {
                              const agentSales = sales.filter(s =>
                                s.agentName === stat.name &&
                                (s.status === 'Sale' || s.disposition === 'HW- Xfer' || s.disposition === 'HW-IBXfer')
                              );

                              // [NEW] Get Agent's Join Date for comparison
                              const hrRec = hrRecords.find(h => h.cnic === stat.cnic) || {};
                              const joinDateStr = hrRec.joining_date || stat.activeDate || stat.active_date;
                              const joinDate = joinDateStr ? new Date(joinDateStr) : null;
                              if (joinDate) joinDate.setHours(0,0,0,0);

                              const isLeft = stat.status === 'Left';
                              const rowClass = isLeft ? 'bg-red-900/10 hover:bg-red-900/20' : 'hover:bg-blue-900/10';
                              const nameClass = isLeft ? 'text-red-400' : 'text-slate-200';

                              return (
                                <tr key={stat.id} className={`${rowClass} transition-colors group`}>
                                  <td className="p-2 text-center border-r border-slate-800 bg-slate-900 text-slate-600 font-mono text-[10px] sticky left-0 z-10 group-hover:text-white">{idx + 1}</td>
                                  
                                  <td className="p-2 px-3 font-medium border-r border-slate-800 bg-slate-900 sticky left-12 z-10 truncate text-xs">
                                      <div className={nameClass}>{stat.name}</div>
                                      {isLeft && (
                                          <div className="text-[9px] text-red-500/80 font-mono mt-0.5">
                                              LEFT: {stat.leftDate || 'N/A'}
                                          </div>
                                      )}
                                  </td>

                                  <td className="p-1 text-center border-r border-slate-800 bg-blue-500/5 font-bold text-blue-400 text-xs">{stat.lpd}</td>
                                  <td className="p-1 text-center border-r border-slate-800 text-slate-400 text-[10px]">{stat.dialingDays}</td>
                                  <td className="p-1 text-center text-red-400/50 text-[10px]">{stat.daysOn0}</td>
                                  <td className="p-1 text-center text-orange-300/80 text-[10px]">{stat.daysOn1}</td>
                                  <td className="p-1 text-center text-yellow-300/80 text-[10px]">{stat.daysOn2}</td>
                                  <td className="p-1 text-center border-r border-slate-800 text-green-400 font-bold text-[10px]">{stat.daysOn3}</td>

                                  {getDaysArray(getPayrollRange(selectedMonth).start, getPayrollRange(selectedMonth).end).map(dateStr => {
                                    const currentDate = new Date(dateStr);
                                    currentDate.setHours(0,0,0,0);
                                    
                                    // 1. Is this date BEFORE they joined?
                                    const isBeforeJoining = joinDate && currentDate < joinDate;

                                    const dailyCount = agentSales.filter(s => s.date === dateStr).length;
                                    const hasAttendance = attendance.some(a => 
                                      a.date === dateStr && 
                                      a.agentName === stat.name &&
                                      (a.status === 'Present' || a.status === 'Late')
                                    );
                                    const isWorkingDay = globalWorkDays.has(dateStr);

                                    let cellContent = '-';
                                    let cellClass = 'text-slate-700';

                                    if (dailyCount > 0) {
                                      cellContent = dailyCount;
                                      cellClass = 'bg-green-500/10 text-green-400 font-bold';
                                    } 
                                    // [CHANGED] Only mark 0 or A if they have officially joined
                                    else if (!isBeforeJoining) {
                                        if (hasAttendance) {
                                          cellContent = '0';
                                          cellClass = 'bg-red-500/20 text-red-400 font-bold';
                                        } 
                                        else if (isWorkingDay) {
                                          cellContent = 'A';
                                          cellClass = 'text-red-500 font-black';
                                        }
                                    }

                                    return (
                                      <td key={dateStr} className={`p-1 text-center border-b border-slate-800 text-[11px] ${cellClass}`}>
                                        {cellContent}
                                      </td>
                                    );
                                  })}
                                  
                                  <td className="p-2 text-center font-bold text-white bg-slate-900 sticky right-0 z-10 shadow-[-4px_0_10px_rgba(0,0,0,0.5)]">
                                    {stat.totalSales}
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      });
                    })()}
                  </tbody>

                  <tfoot className="sticky bottom-0 z-40 shadow-[0_-4px_10px_rgba(0,0,0,0.5)]">
                    <tr className="bg-slate-950 border-t-2 border-blue-500 font-black text-white">
                      <td colSpan={2} className="p-3 text-left sticky left-0 bg-slate-950 z-50 uppercase tracking-tighter">Grand Total</td>
                      <td className="text-center text-blue-400 bg-slate-950">
                        {(monthlyStats.reduce((s, a) => s + a.totalSales, 0) / (monthlyStats.reduce((s, a) => s + a.dialingDays, 0) || 1)).toFixed(2)}
                      </td>
                      <td className="text-center text-slate-400 bg-slate-950">{monthlyStats.reduce((s, a) => s + a.dialingDays, 0)}</td>
                      <td colSpan={4} className="bg-slate-950"></td>
                      
                      {getDaysArray(getPayrollRange(selectedMonth).start, getPayrollRange(selectedMonth).end).map(d => {
                         const dailyGrandTotal = sales.filter(s => 
                            s.date === d && 
                            (s.status === 'Sale' || s.disposition === 'HW- Xfer' || s.disposition === 'HW-IBXfer') &&
                            validAgentNames.has(s.agentName)
                         ).length;
                         
                         return (
                            <td key={d} className="bg-slate-950 text-center text-xs font-bold text-green-400">
                                {dailyGrandTotal > 0 ? dailyGrandTotal : ''}
                            </td>
                         );
                      })}

                      <td className="p-3 text-center text-green-400 text-lg sticky right-0 bg-slate-950 z-50 shadow-[-4px_0_10px_rgba(0,0,0,0.5)]">
                        {monthlyStats.reduce((s, a) => s + a.totalSales, 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Modals */}
      {/* Add this with the other modals */}
      {/* Modals Section - MUST BE INSIDE THE MAIN DIV */}
      {/* --- INLINE AGENT MODAL (Handles Add & Edit) --- */}
      {(showAddAgent || showEditAgent) && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl overscroll-contain transform-gpu">

            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {editingAgent?.cnic ? 'Edit Agent Details' : 'Add New Agent'}
              </h2>
              <button onClick={() => { setShowAddAgent(false); setShowEditAgent(false); }} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAgent} className="p-6 space-y-6">
              {/* 1. Personal Info */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest border-b border-slate-800 pb-2">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Name & Father Name */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium">Full Name</label>
                    <input type="text" required value={editingAgent?.name || ''} onChange={e => setEditingAgent({ ...editingAgent, name: e.target.value })} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium">Father Name</label>
                    <input type="text" value={editingAgent?.father_name || ''} onChange={e => setEditingAgent({ ...editingAgent, father_name: e.target.value })} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>

                  {/* Contact Info (Phone mapped to contact_number state) */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium">Phone Number</label>
                    {/* Note: We keep state as contact_number, but it saves to 'Phone' column */}
                    <input
                      type="text"
                      placeholder="0300-1234567"
                      value={editingAgent?.contact_number || editingAgent?.Phone || ''}
                      onChange={e => setEditingAgent({ ...editingAgent, contact_number: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium">Email Address</label>
                    <input type="email" placeholder="agent@example.com" value={editingAgent?.email || ''} onChange={e => setEditingAgent({ ...editingAgent, email: e.target.value })} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>

                  {/* Address (Full Width) */}
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1 font-medium">Residential Address</label>
                    <input type="text" placeholder="House #, Street, City" value={editingAgent?.address || ''} onChange={e => setEditingAgent({ ...editingAgent, address: e.target.value })} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>

                  {/* IDs */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium">CNIC (ID)</label>
                    <input type="text" required value={editingAgent?.cnic || ''} onChange={e => setEditingAgent({ ...editingAgent, cnic: e.target.value })} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium">Login Password</label>
                    <input type="text" value={editingAgent?.password || '123'} onChange={e => setEditingAgent({ ...editingAgent, password: e.target.value })} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                </div>
              </div>

              {/* 2. Job Details */}
              <div className="space-y-4 pt-4">
                <h3 className="text-xs font-bold text-purple-400 uppercase tracking-widest border-b border-slate-800 pb-2">Job & Location</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium">Team</label>
                    <select
                      value={editingAgent?.team || ''}
                      onChange={e => setEditingAgent({ ...editingAgent, team: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                      <option value="">Select Team</option>
                      {teams.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium">Center</label>
                    <select
                      value={editingAgent?.center || ''}
                      onChange={e => setEditingAgent({ ...editingAgent, center: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                      <option value="">Select Center</option>
                      {centers.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium">Base Salary (PKR)</label>
                    <input
                      type="number"
                      value={editingAgent?.baseSalary || ''}
                      onChange={e => setEditingAgent({ ...editingAgent, baseSalary: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium">Joining Date</label>
                    <input
                      type="date"
                      value={editingAgent?.active_date || editingAgent?.activeDate || ''}
                      onChange={e => setEditingAgent({ ...editingAgent, active_date: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Banking Info */}
              <div className="space-y-4 pt-4">
                <h3 className="text-xs font-bold text-green-400 uppercase tracking-widest border-b border-slate-800 pb-2">Banking Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium">Bank Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Askari Bank"
                      value={editingAgent?.bank_name || ''}
                      onChange={e => setEditingAgent({ ...editingAgent, bank_name: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium">Account No</label>
                    <input
                      type="text"
                      placeholder="Account / IBAN"
                      value={editingAgent?.account_number || ''}
                      onChange={e => setEditingAgent({ ...editingAgent, account_number: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm font-mono focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-800 mt-4">
                <button type="button" onClick={() => { setShowAddAgent(false); setShowEditAgent(false); }} className="px-4 py-2 text-slate-400 hover:text-white text-sm font-medium transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-bold shadow-lg shadow-blue-500/20 transition-all">
                  {editingAgent?.cnic ? 'Update Agent' : 'Create Agent'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {showAddSale && <SaleModal agents={agents} currentUser={currentUser} userRole={userRole} onClose={() => setShowAddSale(false)} onSubmit={handleAddSale} />}
      {editSale && <SaleModal agents={agents} currentUser={currentUser} userRole={userRole} onClose={() => setEditSale(null)} onSubmit={handleEditSale} sale={editSale} isEdit={true} />}
      {showAddFine && (
        <FineModal
          agents={agents}
          onClose={() => { setShowAddFine(false); setEditingFine(null); }}
          onSubmit={editingFine ? handleEditFine : handleAddFine}
          fine={editingFine}
          isEdit={!!editingFine}
        />
      )}
      {showAddBonus && (
        <BonusModal
          agents={agents}
          onClose={() => { setShowAddBonus(false); setEditingBonus(null); }}
          onSubmit={editingBonus ? handleEditBonus : handleAddBonus}
          bonus={editingBonus}
          isEdit={!!editingBonus}
        />
      )}
      {showImportModal && (
        <ImportModal
          importType={importType}
          onClose={() => setShowImportModal(false)}
          onImport={handleImport}
        />
      )}
      {/* --- INLINE HR MODAL (Corrected) --- */}
      {showAddEmployee && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl overscroll-contain transform-gpu">

            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {editingHR?.id ? 'Edit Employee' : 'Add New Employee'}
              </h2>
              <button onClick={() => setShowAddEmployee(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHR} className="p-6 space-y-6">

              {/* 1. Personal Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Name */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={editingHR?.agent_name || ''}
                      onChange={e => setEditingHR({ ...editingHR, agent_name: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm"
                    />
                  </div>

                  {/* Father Name */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Father Name</label>
                    <input
                      type="text"
                      value={editingHR?.father_name || ''}
                      onChange={e => setEditingHR({ ...editingHR, father_name: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm"
                    />
                  </div>

                  {/* Phone (Contact Number) */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Contact Number</label>
                    <input
                      type="text"
                      placeholder="0300-1234567"
                      value={editingHR?.contact_number || ''}
                      onChange={e => setEditingHR({ ...editingHR, contact_number: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Email</label>
                    <input
                      type="email"
                      value={editingHR?.email || ''}
                      onChange={e => setEditingHR({ ...editingHR, email: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm"
                    />
                  </div>

                  {/* Address */}
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Address</label>
                    <input
                      type="text"
                      value={editingHR?.address || ''}
                      onChange={e => setEditingHR({ ...editingHR, address: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm"
                    />
                  </div>

                  {/* CNIC */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">CNIC</label>
                    <input
                      type="text"
                      required
                      value={editingHR?.cnic || ''}
                      onChange={e => setEditingHR({ ...editingHR, cnic: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm"
                    />
                  </div>

                  {/* Joining Date */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Joining Date</label>
                    <input
                      type="date"
                      required
                      value={editingHR?.joining_date || ''}
                      onChange={e => setEditingHR({ ...editingHR, joining_date: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm"
                    />
                  </div>

                </div>
              </div>

              {/* 2. Job & Location */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <h3 className="text-xs font-bold text-purple-400 uppercase tracking-widest border-b border-slate-800 pb-2">Job & Location</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Team */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium">Team</label>
                    <select
                      value={editingHR?.team || ''}
                      onChange={e => setEditingHR({ ...editingHR, team: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                      <option value="">Select Team</option>
                      {teams.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  {/* Center */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium">Center</label>
                    <select
                      value={editingHR?.center || ''}
                      onChange={e => setEditingHR({ ...editingHR, center: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                      <option value="">Select Center</option>
                      {centers.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  {/* Designation */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium">Designation</label>
                    <input
                      type="text"
                      value={editingHR?.designation || 'Agent'}
                      onChange={e => setEditingHR({ ...editingHR, designation: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>

                  {/* Base Salary */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium">Base Salary (PKR)</label>
                    <input
                      type="number"
                      value={editingHR?.baseSalary || ''}
                      onChange={e => setEditingHR({ ...editingHR, baseSalary: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Banking Info */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <h3 className="text-xs font-bold text-green-400 uppercase tracking-widest border-b border-slate-800 pb-2">Banking Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Bank Name */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium">Bank Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Askari Bank"
                      value={editingHR?.bank_name || ''}
                      onChange={e => setEditingHR({ ...editingHR, bank_name: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>

                  {/* Account No */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium">Account No</label>
                    <input
                      type="text"
                      placeholder="Account / IBAN"
                      value={editingHR?.account_number || ''}
                      onChange={e => setEditingHR({ ...editingHR, account_number: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm font-mono focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-800 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddEmployee(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-bold shadow-lg shadow-blue-500/20 transition-all"
                >
                  {editingHR?.id ? 'Update Record' : 'Create Employee'}
                </button>
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
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${admin.role === 'Admin' ? 'bg-purple-500/20 text-purple-400' :
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


//--------Starting Changes----------//