// --- Imports for Helper Functions ---
import { getPayrollRange, getDaysArray, formatTime, getStandardMonthRange } from './utils/helpers';

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
  Pencil, Trash2, UserX, Shield, RotateCcw,
  CheckCircle, XCircle, ThumbsDown, AlertTriangle// <--- ENSURE THESE ARE HERE
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

// [NEW] Helper: Convert "January 2026" -> "2026-01" (For Input Value)
const getMonthInputValue = (monthStr) => {
  if (!monthStr) return new Date().toISOString().slice(0, 7);
  const [month, year] = monthStr.split(' ');
  const date = new Date(`${month} 1, ${year}`);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${m}`;
};

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

const AgentPayrollSystem = () => {

  const [salesSubTab, setSalesSubTab] = useState('list');
  const [attendanceSubTab, setAttendanceSubTab] = useState('daily');
  const [employeesSubTab, setEmployeesSubTab] = useState('agents');
  const [managementSubTab, setManagementSubTab] = useState('payroll');

  // --- MANAGEMENT SPECIFIC MODALS STATE ---
  const [showMgmtBonus, setShowMgmtBonus] = useState(false);
  const [showMgmtFine, setShowMgmtFine] = useState(false);

  // 2. Add State inside your component
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionType, setTransactionType] = useState('bonus'); // 'bonus' or 'fine'

  // Login States
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [designationFilter, setDesignationFilter] = useState('All');
  // Add this near your other state variables
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('currentUser')) || null);
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
    if (['Admin', 'SuperAdmin'].includes(userRole)) {
      fetchAdmins();
    }
  }, [userRole, showAdminModal]);// Refresh when modal opens/closes

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

  // [FIX] Default to 19:15 (7:15 PM) to match your requested shift start
  const [lateTime, setLateTime] = useState(() => localStorage.getItem('ams_late_time') || '19:15');
  const [showLateTimeModal, setShowLateTimeModal] = useState(false);

  // --- [NEW] Update Admin Password ---
  const handleUpdateAdminPassword = async (id, currentName) => {
    const newPassword = prompt(`Enter new password for user "${currentName}":`);

    if (newPassword !== null && newPassword.trim() !== "") {
      const { error } = await supabase
        .from('admins')
        .update({ password: newPassword.trim() })
        .eq('id', id);

      if (error) {
        alert("Error updating password: " + error.message);
      } else {
        alert("Password updated successfully!");
        fetchAdmins(); // Refresh the list to show the new password
      }
    }
  };


  // --- [NEW] LEAVE MANAGEMENT STATE ---
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    id: null,
    name: '',
    status: 'Left',
    date: new Date().toISOString().split('T')[0] // Defaults to Today
  });

  // Open the modal
  const handleOpenLeaveModal = (agent) => {
    setLeaveForm({
      id: agent.id,      // Keep just in case
      cnic: agent.cnic,
      name: agent.name,
      status: 'Left', // Default selection
      date: new Date().toISOString().split('T')[0]
    });
    setShowLeaveModal(true);
  };

  // Submit the change to Supabase
  // Submit the change to Supabase
  const confirmAgentLeave = async () => {
    if (!leaveForm.date) return alert("Please select a date.");
    if (!leaveForm.cnic) return alert("Error: Agent CNIC is missing.");

    // 1. Update Agents Table
    const { error: agentError } = await supabase
      .from('agents')
      .update({
        status: leaveForm.status,
        left_date: leaveForm.date
      })
      .eq('cnic', leaveForm.cnic); // [FIX] Use CNIC instead of ID

    if (agentError) {
      alert("Error updating Agent table: " + agentError.message);
      return;
    }

    // 2. Update HR Records Table (Sync status)
    const { error: hrError } = await supabase
      .from('hr_records')
      .update({
        status: leaveForm.status,
        left_date: leaveForm.date
      })
      .eq('cnic', leaveForm.cnic);

    if (hrError) {
      console.warn("HR Update failed (might not exist):", hrError.message);
    }

    alert(`Agent marked as ${leaveForm.status}`);
    setShowLeaveModal(false);
    fetchData(); // Refresh the list
  };


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

    // 7. [NEW] Fetch Holidays
    const { data: holidayData } = await supabase
      .from('holidays')
      .select('*')
      .order('date', { ascending: true });
    if (holidayData) setHolidays(holidayData);

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

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState('All');

  const [agentStatusFilter, setAgentStatusFilter] = useState('All');
  const [salesStatusFilter, setSalesStatusFilter] = useState('All');
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState('All');

  // [FIX] Replaced Shift with Center
  const [centerFilter, setCenterFilter] = useState('All');
  const [evaluators, setEvaluators] = useState(['John Doe', 'Jane Smith']);

  const [holidays, setHolidays] = useState([]);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ date: '', name: '' });

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
  // --- LOGIN LOGIC (Dual Table Check + Status Check) ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);

    try {
      // 1. Check ADMINS Table first
      const { data: adminUser } = await supabase
        .from('admins')
        .select('*')
        .eq('name', loginData.name)
        .eq('password', loginData.password)
        .maybeSingle(); // Use maybeSingle to avoid errors if not found

      if (adminUser) {
        // Admins don't usually have a 'status' column, but if they are deleted, they can't login anyway.
        setUserRole(adminUser.role);
        setCurrentUser(adminUser);
        setIsLoggedIn(true);
        localStorage.setItem('ams_user', JSON.stringify(adminUser));
        localStorage.setItem('ams_role', adminUser.role);
        setLoading(false);
        return;
      }

      // 2. If not found, check AGENTS Table
      const { data: agentUser } = await supabase
        .from('agents')
        .select('*')
        .eq('name', loginData.name)
        .eq('password', loginData.password)
        .maybeSingle();

      if (agentUser) {
        // [CRITICAL FIX] Check if Agent is 'Left'
        if (agentUser.status === 'Left') {
          setLoginError('Access Denied: Account is deactivated (Left).');
          setLoading(false);
          return;
        }

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

  // [NEW] Security Watchdog: Immediate Logout on Password/Status Change
  useEffect(() => {
    if (!isLoggedIn || !currentUser) return;

    // Determine which table to watch based on role
    const tableName = userRole === 'Agent' ? 'agents' : 'admins';
    const userId = currentUser.id;

    // Create a Realtime Subscription
    const channel = supabase
      .channel(`security_watchdog_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for UPDATE and DELETE
          schema: 'public',
          table: tableName,
          filter: `id=eq.${userId}` // Only listen for THIS user's ID
        },
        (payload) => {
          // 1. Handle Deletion (Account removed)
          if (payload.eventType === 'DELETE') {
            alert("Security Alert: Your account has been removed. Logging out.");
            handleLogout();
          }

          // 2. Handle Updates (Password or Status change)
          if (payload.eventType === 'UPDATE') {
            const newUser = payload.new;

            // Check if Password Changed
            // (Compares DB password with the one stored in your browser session)
            if (newUser.password !== currentUser.password) {
              alert("Security Alert: Your password has been changed. Please login again.");
              handleLogout();
              return;
            }

            // Check Status (For Agents)
            if (newUser.status === 'Left') {
              alert("Security Alert: Your access has been revoked (Status: Left).");
              handleLogout();
              return;
            }
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount or logout
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isLoggedIn, currentUser, userRole]);

  // --- MANAGEMENT PAYROLL STATS (Fixed Date Parsing + Visibility) ---
 const managementPayrollStats = useMemo(() => {
    // 1. ROBUST DATE PARSING
    let year, month;

    if (selectedMonth.includes('-')) {
      const parts = selectedMonth.split('-');
      year = parseInt(parts[0]);
      month = parseInt(parts[1]);
    } else {
      const dateObj = new Date(Date.parse(`1 ${selectedMonth}`)); 
      if (!isNaN(dateObj.getTime())) {
        year = dateObj.getFullYear();
        month = dateObj.getMonth() + 1; 
      } else {
        const now = new Date();
        year = now.getFullYear();
        month = now.getMonth() + 1;
      }
    }

    const currentMonthStr = `${year}-${String(month).padStart(2, '0')}`; 

    if (isNaN(year) || isNaN(month)) return { standard: [], agentCycle: [] };

    // --- HELPER 1: Precise Working Days (Monday - Saturday) ---
    const getSafeWorkingDays = (start, end) => {
      if (!start || !end || isNaN(start) || isNaN(end)) return 26;

      let count = 0;
      let curDate = new Date(start);
      // Ensure we don't mutate the original start date object if passed elsewhere
      curDate = new Date(curDate.getTime());
      
      while (curDate <= end) {
        const dayOfWeek = curDate.getDay();
        // [FIX] Only exclude Sunday (0). Allow Saturday (6).
        if (dayOfWeek !== 0) { 
          count++;
        }
        curDate.setDate(curDate.getDate() + 1);
      }
      return count > 0 ? count : 26;
    };

    // --- HELPER 2: Speed Optimization ---
    const attendanceMap = new Map();
    attendance.forEach(att => {
      if (att.agentName) {
        const key = att.agentName.trim().toLowerCase();
        if (!attendanceMap.has(key)) attendanceMap.set(key, []);
        attendanceMap.get(key).push(att);
      }
    });

    const bonusMap = new Map();
    bonuses.filter(b => b.month === selectedMonth || b.month === currentMonthStr)
      .forEach(b => {
        const key = (b.agentName || '').trim().toLowerCase();
        bonusMap.set(key, (bonusMap.get(key) || 0) + (b.amount || 0));
      });

    const fineMap = new Map();
    fines.filter(f => f.month === selectedMonth || f.month === currentMonthStr)
      .forEach(f => {
        const key = (f.agentName || '').trim().toLowerCase();
        fineMap.set(key, (fineMap.get(key) || 0) + (f.amount || 0));
      });

    // 2. Process All HR Records
    const allStats = hrRecords.map(emp => {
      const cycleType = (emp.payroll_cycle_type || '').toLowerCase().trim();
      const designation = (emp.designation || '').toLowerCase().trim();
      const empNameKey = (emp.agent_name || '').trim().toLowerCase();

      // A. Determine Cycle Dates
      let cycleStart, cycleEnd;
      if (cycleType.includes('agent')) { // Matches "agent cycle" or "Agent Cycle (21st-20th)"
        const prevMonth = month - 1 === 0 ? 12 : month - 1;
        const prevYear = month - 1 === 0 ? year - 1 : year;
        cycleStart = new Date(prevYear, prevMonth - 1, 21);
        cycleEnd = new Date(year, month - 1, 20);
      } else {
        // Standard Cycle: 1st to End of Month
        cycleStart = new Date(year, month - 1, 1);
        cycleEnd = new Date(year, month, 0); // Last day of month
      }
      // Normalize Hours
      cycleStart.setHours(0, 0, 0, 0);
      cycleEnd.setHours(23, 59, 59, 999);

      // B. Calculate Working Days (Now includes Saturdays)
      const totalWorkingDays = getSafeWorkingDays(cycleStart, cycleEnd);

      // C. Get Attendance (Scans + Holidays)
      const empAttRecords = attendanceMap.get(empNameKey) || [];
      
      // 1. Count Actual Scans
      const scannedPresent = empAttRecords.filter(a => {
        const d = new Date(a.date);
        d.setHours(0,0,0,0);
        return d >= cycleStart && d <= cycleEnd && (a.status === 'Present' || a.status === 'Late');
      }).length;

      // 2. Count Payable Holidays
      let paidHolidays = 0;
      // joining date check
      const joinDate = emp.joining_date ? new Date(emp.joining_date) : null;
      if (joinDate) joinDate.setHours(0,0,0,0);

      holidays.forEach(h => {
        const hDate = new Date(h.date);
        hDate.setHours(0,0,0,0);

        // Must be in cycle
        if (hDate < cycleStart || hDate > cycleEnd) return;
        
        // Must be after joining
        if (joinDate && hDate < joinDate) return;

        // Don't double count if they worked (scanned) on holiday
        // Check strict string match or date object match
        const workedOnHoliday = empAttRecords.some(a => a.date === h.date);
        
        if (!workedOnHoliday) {
           paidHolidays++;
        }
      });

      // Total Days = Scans + Holidays
      const daysPresent = scannedPresent + paidHolidays;

      // D. Financials
      let rawSalary = emp.base_salary || emp.baseSalary || 0;
      if (typeof rawSalary === 'string') rawSalary = parseInt(rawSalary.replace(/,/g, '')) || 0;

      let earnedBase = 0;
      if (totalWorkingDays > 0) {
        earnedBase = Math.round((rawSalary / totalWorkingDays) * daysPresent);
      } else {
        earnedBase = rawSalary;
      }

      const totalBonus = bonusMap.get(empNameKey) || 0;
      const totalFine = fineMap.get(empNameKey) || 0;
      const netSalary = earnedBase + totalBonus - totalFine;

      return {
        ...emp,
        cycleTypeNormalized: cycleType,
        designationNormalized: designation,
        baseSalary: rawSalary,
        daysPresent,
        totalWorkingDays,
        earnedBase,
        totalBonus,
        totalFine,
        netSalary
      };
    });

    // 3. Filter Lists
    // EXCLUDE Regular Agents (Only show management/HR/QA etc)
    // Using includes() handles "senior agent", "agent", etc. differently if needed, 
    // but based on your code 'agent' is the exact string to exclude.
    const managementStaff = allStats.filter(e => e.designationNormalized !== 'agent');

    return {
      // Table 1: Standard (Default)
      standard: managementStaff.filter(e => !e.cycleTypeNormalized.includes('agent')),

      // Table 2: Agent Cycle
      agentCycle: managementStaff.filter(e => e.cycleTypeNormalized.includes('agent'))
    };
  }, [hrRecords, selectedMonth, attendance, bonuses, fines, holidays]); // Added 'holidays' dependency

  // --- HELPER: Get Management List (Designation != Agent) ---
  const managementEmployees = useMemo(() => {
    if (!hrRecords) return [];
    return hrRecords
      .filter(emp => {
        const des = (emp.designation || '').toLowerCase().trim();
        return des !== 'agent' && des !== '';
      })
      .map(emp => emp.agent_name) // Just get the names as simple strings
      .sort();
  }, [hrRecords]);

  // --- FILTERING LOGIC ---

  // Add this helper inside the component (e.g. near other useMemos)
  const allPossibleSellers = useMemo(() => {
    // 1. Get all Active Agents
    const agentNames = agents.map(a => a.name);

    // 2. Get all HR/Management Names
    const hrNames = hrRecords.map(h => h.agent_name);

    // 3. Merge and Remove Duplicates
    return [...new Set([...agentNames, ...hrNames])].filter(Boolean).sort();
  }, [agents, hrRecords]);

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

  // 2. Monthly Stats (Merged: Promoted Agents + Accurate Old Calc + Agent Restriction)
  const monthlyStats = useMemo(() => {
    // 1. Get Range as STRINGS (YYYY-MM-DD) to fix Timezone/Skipping issues
    const range = getPayrollRange(selectedMonth);

    // Convert to strict strings (YYYY-MM-DD)
    const startStr = new Date(range.start).toISOString().split('T')[0];
    const endStr = new Date(range.end).toISOString().split('T')[0];

    // Helper: Parse Date for HR checks (remains strictly for Logic checks)
    const parseDate = (val) => {
      if (!val) return null;
      const d = new Date(val);
      if (isNaN(d.getTime())) return null;
      d.setHours(0, 0, 0, 0);
      return d;
    };

    // Cycle Start/End (Time-adjusted) for "Joining Date" & "Left Date" logic only
    const cycleStart = new Date(startStr); cycleStart.setHours(0, 0, 0, 0);
    const cycleEnd = new Date(endStr); cycleEnd.setHours(23, 59, 59, 999);

    // Count Working Days using the strings
    const totalWorkingDays = countWorkingDays(startStr, endStr);

    // ---------------------------------------------------------
    // STEP A: CREATE MERGED LIST (Enable Promoted Agents)
    // ---------------------------------------------------------
    let combinedList = [...agents];

    // [FIX] Filter by String Comparison
    const relevantSales = sales.filter(s => s.date >= startStr && s.date <= endStr);

    const activeSalesMap = new Map();
    relevantSales.forEach(s => {
      if (!activeSalesMap.has(s.agentName)) {
        activeSalesMap.set(s.agentName, { team: s.team || s.teamLead, center: s.center });
      }
    });

    hrRecords.forEach(hr => {
      const isAgent = agents.some(a => a.cnic === hr.cnic);
      const salesInfo = activeSalesMap.get(hr.agent_name);

      if (!isAgent && salesInfo) {
        combinedList.push({
          name: hr.agent_name,
          cnic: hr.cnic,
          team: salesInfo.team || hr.team || 'Unassigned',
          center: salesInfo.center || hr.center || 'Phase 7',
          activeDate: hr.joining_date,
          status: 'Promoted', // Internal flag
          designation: hr.designation,
          baseSalary: 0
        });
      }
    });

    // ---------------------------------------------------------
    // STEP B: FILTERING
    // ---------------------------------------------------------
    const filteredAgentsList = combinedList.filter(a => {
      // Permission Check
      if (userRole === 'Agent') {
        const loggedInCnic = currentUser?.cnic || JSON.parse(localStorage.getItem('ams_user'))?.cnic;
        if (!loggedInCnic || a.cnic !== loggedInCnic) return false;
      }

      // Team/Center Check
      if (userRole !== 'Agent') {
        const matchTeam = teamFilter === 'All' || teamFilter === 'All Teams' || a.team === teamFilter;
        const matchCenter = centerFilter === 'All' || centerFilter === 'All Centers' || a.center === centerFilter;
        if (!matchTeam || !matchCenter) return false;
      }

      // Joining Date Check
      const hrRec = hrRecords.find(h => h.cnic === a.cnic);
      const joinStr = hrRec?.joining_date || a.activeDate || a.active_date;
      const joinDate = parseDate(joinStr);
      if (joinDate && joinDate.getTime() > cycleEnd.getTime()) return false;

      // Left Date Check
      if (a.status !== 'Promoted') {
        const isInactive = ['Left', 'Terminated', 'NCNS'].includes(a.status) ||
          ['Left', 'Terminated', 'NCNS'].includes(hrRec?.status);

        if (isInactive) {
          const dateValue = a.leftDate || a.left_date || hrRec?.leftDate || hrRec?.left_date;
          const leaveDate = parseDate(dateValue);
          // If they left strictly BEFORE the cycle started -> HIDE
          if (leaveDate && leaveDate.getTime() < cycleStart.getTime()) return false;
          if (!leaveDate) return false; // Safety
        }
      }
      return true;
    });

    // ---------------------------------------------------------
    // STEP C: ACCURATE CALCULATIONS (Using Strings)
    // ---------------------------------------------------------
    const agentStats = filteredAgentsList.map(agent => {
      const targetName = agent.name?.toString().trim().toLowerCase();

      // [FIX] String Comparison for Sales
      const approvedSales = sales.filter(s => {
        const saleName = s.agentName?.toString().trim().toLowerCase();
        const nameMatch = saleName === targetName;
        const statusMatch = s.status === 'Sale' || ['HW- Xfer', 'HW-IBXfer', 'HW-Xfer-CDR'].includes(s.disposition);

        // ROBUST CHECK: Compare Strings directly
        const dateMatch = s.date >= startStr && s.date <= endStr;

        return nameMatch && statusMatch && dateMatch;
      });

      // [FIX] String Comparison for Attendance
      const agentAttendance = attendance.filter(att => {
        const attName = att.agentName?.toString().trim().toLowerCase();
        // ROBUST CHECK: Compare Strings directly
        const dateMatch = att.date >= startStr && att.date <= endStr;
        return attName === targetName && dateMatch;
      });

      // Daily Breakdown Loop
      let dialingDays = 0;
      let daysOn0 = 0, daysOn1 = 0, daysOn2 = 0, daysOn3 = 0;

      let loopDate = new Date(startStr);
      const loopEnd = new Date(endStr);

      while (loopDate <= loopEnd) {
        const dateStr = loopDate.toISOString().split('T')[0];

        // 1. Check Attendance (Exact String Match)
        const attRecord = agentAttendance.find(a => a.date === dateStr);
        const isMarkedPresent = attRecord && (attRecord.status === 'Present' || attRecord.status === 'Late');

        // 2. Check Sales (Exact String Match)
        const dailySalesCount = approvedSales.filter(s => s.date === dateStr).length;

        // 3. Check Holidays
        const isHoliday = holidays.some(h => h.date === dateStr);

        // A day is "Paid" if: Present OR Sales OR Holiday
        const isPaidDay = isMarkedPresent || dailySalesCount > 0 || isHoliday;

        if (isPaidDay) {
          dialingDays++;

          if (dailySalesCount > 0) {
            if (dailySalesCount === 1) daysOn1++;
            else if (dailySalesCount === 2) daysOn2++;
            else if (dailySalesCount >= 3) daysOn3++;
          }
          // Only count as "Zero Day" if it's NOT a holiday
          else if (!isHoliday) {
            daysOn0++;
          }
        }

        // Next Day
        loopDate.setDate(loopDate.getDate() + 1);
      }

      // Financials
      const agentBonuses = bonuses.filter(b => b.agentName?.toString().trim().toLowerCase() === targetName && b.month === selectedMonth)
        .reduce((sum, b) => sum + (b.amount || 0), 0);
      const agentFines = fines.filter(f => f.agentName?.toString().trim().toLowerCase() === targetName && f.month === selectedMonth)
        .reduce((sum, f) => sum + (f.amount || 0), 0);

      const baseSalary = agent.baseSalary || 0;
      let earnedBase = 0;
      if (totalWorkingDays > 0) {
        const dailyRate = baseSalary / totalWorkingDays;
        earnedBase = Math.round(dailyRate * dialingDays);
      } else {
        earnedBase = baseSalary;
      }

      const netSalary = earnedBase + agentBonuses - agentFines;
      const hrRecord = hrRecords.find(h => (agent.cnic && h.cnic === agent.cnic) || (h.agent_name?.toString().trim().toLowerCase() === targetName));
      const finalLeftDate = agent.status === 'Promoted' ? null : (agent.leftDate || agent.left_date || hrRecord?.leftDate || null);

      return {
        ...agent,
        leftDate: finalLeftDate,
        isPromoted: agent.status === 'Promoted',
        designation: agent.designation || hrRecord?.designation || 'Agent',
        totalSales: approvedSales.length,
        lpd: dialingDays > 0 ? (approvedSales.length / dialingDays).toFixed(2) : "0.00",
        dialingDays, daysOn0, daysOn1, daysOn2, daysOn3,
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

    return agentStats.sort((a, b) => a.name.localeCompare(b.name));
  }, [agents, sales, fines, bonuses, attendance, hrRecords, selectedMonth, teamFilter, centerFilter, userRole, currentUser, holidays]);

  const managementStats = useMemo(() => {
    const agentRange = getPayrollRange(selectedMonth); // 21st - 20th
    const standardRange = getStandardMonthRange(selectedMonth); // 1st - 31st

    // This filters HR records for anyone whose designation is NOT 'Agent'
    const managers = hrRecords.filter(rec => rec.designation !== 'Agent');

    return managers.map(mgr => {
      // Check which cycle criteria they follow (based on your DB column)
      const isAgentCycle = mgr.payroll_cycle_type === 'Agent Cycle';
      const { start, end } = isAgentCycle ? agentRange : standardRange;

      const totalWorkingDays = countWorkingDays(start, end);

      const attRecords = attendance.filter(att =>
        att.agentName === mgr.agent_name &&
        new Date(att.date) >= start &&
        new Date(att.date) <= end
      );

      const daysPresent = attRecords.filter(a => a.status === 'Present' || a.status === 'Late').length;

      // [FIXED] Read directly from HR Record (base_salary)
      // We fallback to 0 if missing. 
      // Note: Supabase returns snake_case 'base_salary'.
      // Make sure this line matches the DB column name
      const baseSalary = mgr.base_salary || mgr.baseSalary || 0;

      const earnedBase = totalWorkingDays > 0 ? Math.round((baseSalary / totalWorkingDays) * daysPresent) : 0;

      return { ...mgr, baseSalary, daysPresent, totalWorkingDays, earnedBase, netSalary: earnedBase };
    });
  }, [hrRecords, agents, attendance, selectedMonth]);

  // 9. Bonuses (Respects Team/Center)
  const filteredBonuses = useMemo(() => {
    return bonuses.filter(bonus => {
      const matchesSearch = bonus.agentName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTeamCenter = validAgentNames.has(bonus.agentName);
      return matchesSearch && bonus.month === selectedMonth && matchesTeamCenter;
    });
  }, [bonuses, searchQuery, selectedMonth, validAgentNames]);

  // 3. Dashboard Stats (Updated: Revenue -> Total Bonus)
  // 3. Dashboard Stats (FIXED: Counts all sales & includes HW-Xfer-CDR)
  const dashboardStats = useMemo(() => {
    const { start, end } = getActiveDateRange;

    // Filter sales by Date AND Team/Center (Ignore Agent Name to capture all revenue)
    const relevantSales = sales.filter(s => {
      // 1. Date Check
      const dateMatch = s.date >= start && s.date <= end;

      // 2. Team/Center Check (Use sale's own data to include HR/Managers)
      const teamMatch = teamFilter === 'All' || teamFilter === 'All Teams' || s.team === teamFilter;
      const centerMatch = centerFilter === 'All' || centerFilter === 'All Centers' || s.center === centerFilter;

      // 3. Disposition Check (FIXED: Added HW-Xfer-CDR)
      const isSale = s.status === 'Sale' ||
        ['HW- Xfer', 'HW-IBXfer', 'HW-Xfer-CDR'].includes(s.disposition);

      return dateMatch && teamMatch && centerMatch && isSale;
    });

    const totalSalesCount = relevantSales.length;

    // Calculate Total Bonus
    const totalBonusPayout = filteredBonuses.reduce((sum, b) => sum + (b.amount || 0), 0);

    // Payroll Calculation
    const totalPayroll = monthlyStats.reduce((sum, a) => sum + a.netSalary, 0);

    // Active Agent Count
    const activeAgentCount = agents.filter(a => a.status === 'Active').length;

    return { totalAgents: activeAgentCount, totalSalesCount, totalBonusPayout, totalPayroll };
  }, [agents, sales, filteredBonuses, monthlyStats, getActiveDateRange, teamFilter, centerFilter, holidays]);


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
  }, [agents, sales, monthlyStats, getActiveDateRange, validAgentNames, holidays]);

  // 5. Sales Table (Smart Filter: Agents + HR Only)
  const filteredSales = useMemo(() => {
    const { start, end } = getActiveDateRange;

    // Normalize dates
    const sDate = new Date(start); sDate.setHours(0, 0, 0, 0);
    const eDate = new Date(end); eDate.setHours(23, 59, 59, 999);

    // [STEP 1] Create a "White List" of known people
    // We combine Active Agents AND HR Records.
    // If a name is not in this list, it's considered "Junk/Random" and hidden.
    const validPeopleSet = new Set([
      ...agents.map(a => a.name),          // Active Agents
      ...hrRecords.map(h => h.agent_name)  // HR/Management
    ]);

    return sales.filter(sale => {
      // 1. Search Query
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        (sale.agentName && sale.agentName.toLowerCase().includes(query)) ||
        (sale.customerName && sale.customerName.toLowerCase().includes(query)) ||
        (sale.phone && sale.phone.toString().includes(query)) ||
        (sale.leadId && sale.leadId.toString().includes(query));

      if (!matchesSearch) return false;

      // 2. Date Check
      const saleDate = new Date(sale.date);
      const matchesDate = saleDate >= sDate && saleDate <= eDate;

      // 3. Status Filter
      const matchesStatus = salesStatusFilter === 'All' || sale.disposition === salesStatusFilter;

      // 4. Team & Center Check
      const matchesTeam = teamFilter === 'All' || teamFilter === 'All Teams' || sale.team === teamFilter;
      const matchesCenter = centerFilter === 'All' || centerFilter === 'All Centers' || sale.center === centerFilter;

      // 5. [THE FIX] Validity Check
      // Only show this sale if the name belongs to a real person in your system.
      // This blocks the "random entries" like Sarah/Abdullah/etc.
      const isRealPerson = validPeopleSet.has(sale.agentName);

      // 6. Permission Check (Agent View)
      let matchesPermission = true;
      if (userRole === 'Agent') {
        const currentName = currentUser?.name || JSON.parse(localStorage.getItem('ams_user'))?.name;
        if (sale.agentName !== currentName) matchesPermission = false;
      }

      return matchesDate && matchesStatus && matchesTeam && matchesCenter && matchesPermission && isRealPerson;
    });
  }, [sales, searchQuery, getActiveDateRange, salesStatusFilter, teamFilter, centerFilter, userRole, currentUser, agents, hrRecords]);

  // MOVE THIS TO THE TOP LEVEL OF YOUR COMPONENT
  // [FIXED] Sales Stats: Calculates from RAW Data (ignores search/status filters)
  const salesStats = useMemo(() => {
    const { start, end } = getActiveDateRange;
    const stats = { unsuccessful: 0, dncDnq: 0, sales: 0, pending: 0 };

    sales.forEach(sale => {
      // 1. Date Check
      if (sale.date < start || sale.date > end) return;

      // 2. Team & Center Check (Apply Global Filters)
      if (teamFilter !== 'All' && teamFilter !== 'All Teams' && sale.team !== teamFilter) return;
      if (centerFilter !== 'All' && centerFilter !== 'All Centers' && sale.center !== centerFilter) return;

      // 3. Permission Check (If Agent, only show own sales)
      if (userRole === 'Agent') {
        const currentName = currentUser?.name || JSON.parse(localStorage.getItem('ams_user'))?.name;
        if (sale.agentName !== currentName) return;
      }

      // 4. Calculate Stats (Includes ALL records, even if Agent is deleted)
      const disp = sale.disposition;

      // Sales
      if (['HW- Xfer', 'HW-IBXfer', 'HW-Xfer-CDR'].includes(disp)) {
        stats.sales++;
      }
      // DNC / DNQ
      else if (['DNC', 'DNQ', 'DNQ-Dup', 'DNQ-Webform'].includes(disp)) {
        stats.dncDnq++;
      }
      // Pending
      else if (['Review Pending', 'Pending Review'].includes(disp)) {
        stats.pending++;
      }
      // Unsuccessful
      else if (disp === 'Unsuccessful' || disp === 'HUWT') {
        stats.unsuccessful++;
      }
    });

    return stats;
  }, [sales, getActiveDateRange, teamFilter, centerFilter, userRole, currentUser]);

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


  // 10. HR (Respects Team, Center, Status AND Designation)
  const filteredHR = useMemo(() => {
    return hrRecords.filter(rec => {
      // 1. Search
      const matchesSearch = rec.agent_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (rec.cnic && rec.cnic.includes(searchQuery));

      // 2. Team & Center 
      const matchesTeamCenter = validAgentNames.has(rec.agent_name) || (teamFilter === 'All' && centerFilter === 'All');

      // 3. Status Filter
      const matchesStatus = agentStatusFilter === 'All' || rec.status === agentStatusFilter;

      // 4. [UPDATED] Designation Filter Logic
      let matchesDesignation = true;
      if (designationFilter === 'All') {
        matchesDesignation = true;
      } else if (designationFilter === 'All Management') {
        // Show everyone who is NOT an Agent
        matchesDesignation = rec.designation !== 'Agent';
      } else {
        // Show specific designation (e.g., "HR", "QA")
        matchesDesignation = rec.designation === designationFilter;
      }

      return matchesSearch && matchesTeamCenter && matchesStatus && matchesDesignation;
    });
  }, [hrRecords, searchQuery, validAgentNames, teamFilter, centerFilter, agentStatusFilter, designationFilter]);

  // --- HOLIDAY MANAGEMENT ---
  const fetchHolidays = async () => {
    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .order('date', { ascending: true });
    if (!error) setHolidays(data || []);
  };

  const handleAddHoliday = async () => {
    if (!newHoliday.date || !newHoliday.name) return alert("Please fill in both date and name");

    const { error } = await supabase
      .from('holidays')
      .insert([newHoliday]);

    if (error) {
      alert("Error adding holiday: " + error.message);
    } else {
      setNewHoliday({ date: '', name: '' }); // Reset form
      fetchHolidays(); // Refresh list
    }
  };

  const handleDeleteHoliday = async (id) => {
    if (!window.confirm("Are you sure you want to remove this holiday?")) return;

    const { error } = await supabase
      .from('holidays')
      .delete()
      .eq('id', id);

    if (!error) fetchHolidays();
  };

  // Add fetchHolidays to your initial useEffect so it loads on startup
  // Look for: useEffect(() => { fetchAgents(); ... }, []);
  // Add: fetchHolidays(); inside that list.

  const handleSaveAgent = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Prepare Data
      const joiningDate = editingAgent.active_date || editingAgent.activeDate || new Date().toISOString().split('T')[0];
      const validName = editingAgent.name ? editingAgent.name.trim() : "Unknown";
      const validCnic = editingAgent.cnic ? editingAgent.cnic.trim() : "";

      if (!validCnic) throw new Error("CNIC is required.");

      // --- AGENT PAYLOAD ---
      const agentPayload = {
        name: validName,
        cnic: validCnic,
        Phone: editingAgent.contact_number || editingAgent.Phone || '',
        email: editingAgent.email || '',
        address: editingAgent.address || '',
        password: editingAgent.password || '',
        team: editingAgent.team || 'Unassigned',
        center: editingAgent.center || 'Phase 7',
        baseSalary: editingAgent.baseSalary ? parseInt(editingAgent.baseSalary) : 0,
        activeDate: joiningDate,
        status: editingAgent.status || 'Active',
        leftDate: editingAgent.status === 'Left' ? editingAgent.leftDate : null
      };

      // --- HR PAYLOAD ---
      const hrPayload = {
        agent_name: validName,
        father_name: editingAgent.father_name || '',
        cnic: validCnic,
        Phone: editingAgent.contact_number || editingAgent.Phone || '',
        email: editingAgent.email || '',
        address: editingAgent.address || '',
        base_salary: editingAgent.baseSalary ? parseInt(editingAgent.baseSalary) : 0,
        joining_date: joiningDate,
        bank_name: editingAgent.bank_name || '',
        account_number: editingAgent.account_number || '',
        status: editingAgent.status || 'Active',
        designation: editingAgent.designation || 'Agent'
      };

      // [CRITICAL FIX] Use the 'original_cnic' we saved when opening the modal
      const oldCnic = editingAgent.original_cnic;

      // Check if we are renaming: We have an Old CNIC, and it is different from the Input
      const isRenaming = showEditAgent && oldCnic && oldCnic !== validCnic;

      if (isRenaming) {
        // === SCENARIO A: CNIC CHANGED (UPDATE OLD RECORD) ===
        console.log(`Renaming Agent from ${oldCnic} to ${validCnic}`);

        // 1. Check if new CNIC is taken
        const { data: conflict } = await supabase.from('agents').select('cnic').eq('cnic', validCnic).maybeSingle();
        if (conflict) throw new Error("The new CNIC is already in use.");

        // 2. Update AGENTS Table (Target OLD CNIC)
        const { error: agentError } = await supabase
          .from('agents')
          .update(agentPayload)
          .eq('cnic', oldCnic);

        if (agentError) throw new Error(`Agent Rename Failed: ${agentError.message}`);

        // 3. Update HR RECORDS Table (Target OLD CNIC)
        const { error: hrError } = await supabase
          .from('hr_records')
          .update(hrPayload)
          .eq('cnic', oldCnic);

        if (hrError) console.warn(`HR Rename Warning: ${hrError.message}`);

        // 4. Update UI (Replace Old ID with New ID in list)
        const mergedData = { ...agentPayload, ...hrPayload };

        setAgents(prev => prev.map(a => a.cnic === oldCnic ? { ...a, ...mergedData } : a));
        setHrRecords(prev => prev.map(h => h.cnic === oldCnic ? { ...h, ...mergedData } : h));

      } else if (showEditAgent) {
        // === SCENARIO B: NORMAL EDIT (SAME CNIC) ===

        const { error: agentError } = await supabase.from('agents').upsert(agentPayload, { onConflict: 'cnic' });
        if (agentError) throw new Error(`Agent Update Failed: ${agentError.message}`);

        const { error: hrError } = await supabase.from('hr_records').upsert(hrPayload, { onConflict: 'cnic' });
        if (hrError) console.warn(`HR Sync Warning: ${hrError.message}`);

        // Update UI
        setAgents(prev => prev.map(a => a.cnic === editingAgent.cnic ? { ...a, ...agentPayload } : a));
        setHrRecords(prev => {
          const exists = prev.some(h => h.cnic === editingAgent.cnic);
          const uiPayload = { ...hrPayload, baseSalary: agentPayload.baseSalary };

          if (exists) return prev.map(h => h.cnic === editingAgent.cnic ? { ...h, ...uiPayload } : h);
          return [...prev, { ...uiPayload, id: Math.random() }]; // Fallback if not found in local state
        });

      } else {
        // === SCENARIO C: CREATE NEW AGENT ===

        // 1. Upsert Agent
        const { data: savedAgent, error: agentError } = await supabase
          .from('agents')
          .upsert(agentPayload, { onConflict: 'cnic' })
          .select();

        if (agentError) throw new Error(`Agent DB Error: ${agentError.message}`);

        // 2. Upsert HR Record
        const { data: savedHR, error: hrError } = await supabase
          .from('hr_records')
          .upsert(hrPayload, { onConflict: 'cnic' })
          .select();

        if (hrError) console.error("HR Sync Error:", hrError);

        // 3. Update UI
        if (savedAgent && savedAgent.length > 0) {
          setAgents(prev => {
            const exists = prev.some(a => a.cnic === validCnic);
            if (exists) return prev.map(a => a.cnic === validCnic ? savedAgent[0] : a);
            return [...prev, savedAgent[0]];
          });
        }

        if (savedHR && savedHR.length > 0) {
          const hrWithSalary = { ...savedHR[0], baseSalary: agentPayload.baseSalary };
          setHrRecords(prev => {
            const exists = prev.some(h => h.cnic === validCnic);
            if (exists) return prev.map(h => h.cnic === validCnic ? hrWithSalary : h);
            return [...prev, hrWithSalary];
          });
        }
      }

      setShowAddAgent(false);
      setShowEditAgent(false);
      setEditingAgent(null);
      alert("Success! Agent saved.");

    } catch (error) {
      console.error("Save Error:", error);
      alert("Error: " + error.message);
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

  // --- ATTENDANCE STATE ---
  const [showEditAttendanceModal, setShowEditAttendanceModal] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState(null);

  // --- HANDLER: Quick Add/Update (Mark Present/Absent from Table) ---
  const handleQuickAttendance = async (employeeName, newStatus, existingId = null) => {
    // 1. Define Defaults
    const defaultLogin = "19:00";
    const defaultLogout = "05:00";

    // [FIX] If Absent, send "00:00" to satisfy DB constraint, otherwise use default
    const loginTime = newStatus === 'Absent' ? "00:00" : defaultLogin;
    const logoutTime = newStatus === 'Absent' ? "00:00" : defaultLogout;

    const isLate = false;

    const payload = {
      date: customStartDate,
      agentName: employeeName,
      status: newStatus,
      loginTime: loginTime,
      logoutTime: logoutTime,
      late: isLate
    };

    let error;
    let data;

    if (existingId) {
      // Update existing record
      const res = await supabase.from('attendance').update(payload).eq('id', existingId).select();
      error = res.error;
      data = res.data;

      if (!error && data.length > 0) {
        setAttendance(attendance.map(a => a.id === existingId ? data[0] : a));
      }
    } else {
      // Insert new record
      const res = await supabase.from('attendance').insert([payload]).select();
      error = res.error;
      data = res.data;

      if (!error && data.length > 0) {
        setAttendance([...attendance, ...data]);
      }
    }

    if (error) alert(`Error: ${error.message}`);
  };

  // --- HANDLER: Edit Modal Update ---
  const handleUpdateAttendance = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const status = formData.get('status');

    let newLogin = formData.get('loginTime');
    let newLogout = formData.get('logoutTime');

    // [FIX] If setting to Absent, force "00:00" to satisfy DB Not-Null Constraint
    if (status === 'Absent') {
      newLogin = "00:00";
      newLogout = "00:00";
    }

    // Ensure we don't send empty strings if user cleared the box manually
    if (!newLogin) newLogin = "00:00";
    if (!newLogout) newLogout = "00:00";

    // Auto-calculate late
    const isLate = (status === 'Present' || status === 'Late') && newLogin > "19:15";

    const updatedRecord = {
      loginTime: newLogin,
      logoutTime: newLogout,
      status: status,
      late: isLate
    };

    const { error } = await supabase
      .from('attendance')
      .update(updatedRecord)
      .eq('id', editingAttendance.id);

    if (error) {
      alert("Error updating attendance: " + error.message);
    } else {
      setAttendance(attendance.map(a =>
        a.id === editingAttendance.id ? { ...a, ...updatedRecord } : a
      ));
      setShowEditAttendanceModal(false);
      setEditingAttendance(null);
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

  // --- HANDLER: Add Management Fine ---
  const handleSaveMgmtFine = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const newFine = {
      agentName: formData.get('employeeName'), // Using 'agentName' column so it matches DB schema
      reason: formData.get('reason'),
      amount: parseInt(formData.get('amount')),
      date: new Date().toISOString().split('T')[0],
      month: selectedMonth
    };

    const { data, error } = await supabase.from('fines').insert([newFine]).select();

    if (error) {
      alert("Error adding fine: " + error.message);
    } else {
      setFines([...fines, ...data]); // Update local state
      setShowMgmtFine(false);
      alert("Fine added successfully!");
    }
  };

  // --- HANDLER: Add Management Bonus ---
  const handleSaveMgmtBonus = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const newBonus = {
      agentName: formData.get('employeeName'),
      type: 'Monthly', // Management bonuses are usually monthly
      period: selectedMonth,
      amount: parseInt(formData.get('amount')),
      month: selectedMonth,
      targetSales: 0, // Not applicable for management
      actualSales: 0
    };

    const { data, error } = await supabase.from('bonuses').insert([newBonus]).select();

    if (error) {
      alert("Error adding bonus: " + error.message);
    } else {
      setBonuses([...bonuses, ...data]);
      setShowMgmtBonus(false);
      alert("Bonus added successfully!");
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
      // 1. Sanitize Data
      const designationClean = (editingHR.designation || 'Agent').trim();
      const isAgent = designationClean.toLowerCase() === 'agent';

      // [FIX] Detect CNIC Rename
      const validCnic = editingHR.cnic ? editingHR.cnic.trim() : "";
      const oldCnic = editingHR.original_cnic; // Must come from Edit Button
      const isRenaming = editingHR.id && oldCnic && oldCnic !== validCnic;

      if (!validCnic) throw new Error("CNIC is required.");

      // 2. Prepare HR Payload
      const hrPayload = {
        agent_name: editingHR.agent_name,
        father_name: editingHR.father_name || '',
        cnic: validCnic,
        Phone: editingHR.contact_number,
        email: editingHR.email,
        address: editingHR.address,
        designation: designationClean,
        joining_date: editingHR.joining_date,
        bank_name: editingHR.bank_name || '',
        account_number: editingHR.account_number || '',
        status: editingHR.status || 'Active',
        payroll_cycle_type: editingHR.payroll_cycle_type || 'Agent Cycle',
        base_salary: editingHR.baseSalary ? parseInt(editingHR.baseSalary) : 0
      };

      // 3. Prepare Agent Payload
      const agentSyncPayload = {
        name: editingHR.agent_name,
        baseSalary: parseInt(editingHR.baseSalary) || 0,
        Phone: editingHR.contact_number,
        email: editingHR.email,
        address: editingHR.address,
        status: editingHR.status || 'Active',
        team: editingHR.team || 'Unassigned',
        center: editingHR.center || 'Phase 7'
      };

      if (editingHR.id) {
        //Options: === UPDATE EXISTING ===

        // A. Handle Renaming Conflict Check (Agents Table)
        if (isRenaming && isAgent) {
          const { data: conflict } = await supabase.from('agents').select('cnic').eq('cnic', validCnic).maybeSingle();
          if (conflict) throw new Error("This new CNIC is already assigned to another agent.");
        }

        // B. Update HR Table (Safe to use ID)
        const { error: hrError } = await supabase
          .from('hr_records')
          .update(hrPayload)
          .eq('id', editingHR.id);

        if (hrError) throw new Error(`HR Update Failed: ${hrError.message}`);

        // C. Handle Agents Table Logic (Sync)
        if (isAgent) {
          if (isRenaming) {
            // [CRITICAL FIX] If CNIC changed, find the OLD agent and update them
            const { error: renameError } = await supabase
              .from('agents')
              .update({ ...agentSyncPayload, cnic: validCnic }) // Set new CNIC
              .eq('cnic', oldCnic); // Find by OLD CNIC

            if (renameError) console.error("Agent Rename Failed:", renameError);
          } else {
            // Normal Update
            const { error: agentError } = await supabase
              .from('agents')
              .upsert({ ...agentSyncPayload, cnic: validCnic }, { onConflict: 'cnic' });
            if (agentError) console.warn("Agent Sync Warning:", agentError);
          }
        }
        else {
          // If NOT an agent (e.g. changed to Manager), remove from Agents table
          const targetCnic = isRenaming ? oldCnic : validCnic;
          if (targetCnic) {
            await supabase.from('agents').delete().eq('cnic', targetCnic);
            setAgents(prev => prev.filter(a => a.cnic !== targetCnic));
          }
        }

        // Update Local State
        setHrRecords(prev => prev.map(h => h.id === editingHR.id ? { ...h, ...hrPayload, baseSalary: hrPayload.base_salary } : h));

        if (isAgent) {
          setAgents(prev => {
            // If renaming, replace the old CNIC entry
            if (isRenaming) {
              return prev.map(a => a.cnic === oldCnic ? { ...a, ...agentSyncPayload, cnic: validCnic } : a);
            }
            // Otherwise standard upsert logic in state
            const exists = prev.some(a => a.cnic === validCnic);
            return exists
              ? prev.map(a => a.cnic === validCnic ? { ...a, ...agentSyncPayload } : a)
              : [...prev, { ...agentSyncPayload, cnic: validCnic }];
          });
        }

      } else {
        //Options: === CREATE NEW ===

        // 1. Insert into HR
        const { data: newHR, error: hrError } = await supabase
          .from('hr_records')
          .insert([hrPayload])
          .select();

        if (hrError) throw new Error(`HR Insert Failed: ${hrError.message}`);

        // 2. Insert into Agents (If Role is Agent)
        if (isAgent && editingHR.cnic) {
          const agentInsertPayload = {
            ...agentSyncPayload,
            cnic: editingHR.cnic,
            password: '123', // [FIX] Added default password
            activeDate: editingHR.joining_date,
            leftDate: null
          };

          const { error: agentError } = await supabase.from('agents').upsert(agentInsertPayload, { onConflict: 'cnic' });

          if (!agentError) {
            // Add to local agent state (Avoid Duplicates)
            setAgents(prev => {
              if (prev.some(a => a.cnic === editingHR.cnic)) return prev;
              return [...prev, agentInsertPayload];
            });
          }
        }

        if (newHR) {
          const hrWithSalary = { ...newHR[0], baseSalary: hrPayload.base_salary };
          setHrRecords(prev => [...prev, hrWithSalary]);
        }
      }

      alert('Record saved successfully!');
      setShowAddEmployee(false);
      setEditingHR(null);

    } catch (error) {
      console.error("Save Error:", error);
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

        // --- 3. IMPORT ATTENDANCE (Night Shift + Weekend Fix) ---
        else if (importType === 'attendance') {
          // A. Group raw scans by "Shift Date" (not just Calendar Date)
          const dailyGroups = {};

          // Config: Hour to cut off "yesterday's shift"
          // If scan is before 12:00 PM (noon), it belongs to previous day
          const SHIFT_CUTOFF_HOUR = 12;

          rows.slice(1).forEach((rawLine) => {
            const values = safeRow(rawLine);

            // Map Columns (Col 2 = Name, Col 3 = Time)
            const nameRaw = values[2];
            const dateTimeRaw = values[3];

            if (!nameRaw || !dateTimeRaw) return;

            const dt = new Date(dateTimeRaw);
            if (isNaN(dt.getTime())) return;

            // --- LOGIC 1: Handle Night Shift (5:00 AM belongs to prev date) ---
            let shiftDate = new Date(dt); // Copy date
            const scanHour = dt.getHours();

            if (scanHour < SHIFT_CUTOFF_HOUR) {
              // If before 12 PM, move 'shiftDate' back by 1 day
              shiftDate.setDate(shiftDate.getDate() - 1);
            }

            // --- LOGIC 2: Skip Weekends (Sat/Sun) ---
            // getDay(): 0 = Sunday, 6 = Saturday
            const dayOfWeek = shiftDate.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) {
              return; // Skip this row entirely
            }

            // Generate Key based on SHIFT Date
            const dateKey = shiftDate.toISOString().split('T')[0];
            const compositeKey = `${nameRaw}-${dateKey}`;

            // Store full Date object for sorting later (crucial for night shift sorting)
            if (!dailyGroups[compositeKey]) {
              dailyGroups[compositeKey] = {
                date: dateKey,
                name: nameRaw,
                scans: [dt] // Store actual Date objects, not just strings
              };
            } else {
              dailyGroups[compositeKey].scans.push(dt);
            }
          });

          // B. Process groups
          const newAttendance = Object.values(dailyGroups).map(group => {
            // Sort scans chronologically (Earliest to Latest)
            // This works perfectly even if Login is Jan 1st 19:00 and Logout is Jan 2nd 05:00
            group.scans.sort((a, b) => a - b);

            const firstScan = group.scans[0];
            let lastScanDate = null;

            if (group.scans.length > 1) {
              const potentialLast = group.scans[group.scans.length - 1];

              // Ignore double tap if within 5 mins (300,000 ms)
              const diffMs = potentialLast - firstScan;
              if (diffMs > 300000) {
                lastScanDate = potentialLast;
              }
            }

            return {
              // --- MAPPED EXACTLY TO YOUR SCHEMA ---
              date: group.date,
              agentName: group.name,
              loginTime: normalizeTime(firstScan.toLocaleTimeString('en-GB', { hour12: false })),
              logoutTime: lastScanDate ? normalizeTime(lastScanDate.toLocaleTimeString('en-GB', { hour12: false })) : '',
              status: 'Present',
              late: false,
              cnic: null
            };
          });

          // C. Insert into Supabase
          const { data, error } = await supabase
            .from('attendance')
            .upsert(newAttendance, { onConflict: 'date, agentName' })
            .select();

          if (!error) {
            alert(`Success! Processed ${data.length} records (Weekends excluded).`);
            window.location.reload();
          } else {
            throw new Error(error.message);
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


  // 2. Mark as Left / Reactivate (Saves Date to BOTH tables)
  const handleToggleHRStatus = async (id, currentStatus, cnic, agentName) => {
    if (!id) return alert("Error: Record ID is missing.");

    const newStatus = currentStatus === 'Active' ? 'Left' : 'Active';
    // Calculate date: Today if leaving, NULL if reactivating
    const leftDateVal = newStatus === 'Left' ? new Date().toISOString().split('T')[0] : null;

    const confirmMsg = newStatus === 'Left'
      ? `Mark ${agentName} as LEFT?`
      : `Reactivate ${agentName}?`;

    if (window.confirm(confirmMsg)) {
      try {
        setLoading(true);

        // A. Update HR Record (Now saving leftDate here too!)
        const { error: hrError } = await supabase
          .from('hr_records')
          .update({
            status: newStatus,
            left_date: leftDateVal // Make sure your DB column is 'left_date' or 'leftDate'
          })
          .eq('id', id);

        if (hrError) throw hrError;

        // B. Sync with Agents Table (Only if they exist there)
        let agentUpdateQuery = supabase.from('agents').update({ status: newStatus, leftDate: leftDateVal });

        if (cnic && cnic.trim() !== '') {
          await agentUpdateQuery.eq('cnic', cnic);
        } else if (agentName) {
          await agentUpdateQuery.eq('name', agentName);
        }

        // C. Update Local State (Both Tabs)
        // We now update 'left_date' in local HR state immediately
        setHrRecords(prev => prev.map(h => h.id === id ? { ...h, status: newStatus, left_date: leftDateVal } : h));

        setAgents(prev => prev.map(a => {
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
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/20 rounded-full opacity-50 pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600/20 rounded-full opacity-50 pointer-events-none"></div>

        {/* Login Card */}
        <div className="bg-slate-900/80 border border-slate-800 p-10 rounded-3xl shadow-2xl w-full max-w-md relative z-10">

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
                className="w-full px-4 py-3.5 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-white placeholder-slate-600 text-sm"
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
                className="w-full px-4 py-3.5 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-white placeholder-slate-600 text-sm"
                placeholder="••••••••"
                value={loginData.password}
                onChange={e => setLoginData({ ...loginData, password: e.target.value })}
                required
              />
            </div>

            {/* Error Message */}
            {loginError && (
              <div className="flex items-center gap-3 text-red-400 text-sm bg-red-500 p-4 rounded-xl border border-red-500/20">
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

  // Reusable Sub-Navigation Component
  const SubTabBar = ({ tabs, activeSubTab, setActiveSubTab }) => {
    return (
      <div className="bg-slate-800/50 border-b border-slate-700 mb-6">
        <div className="flex gap-2 px-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${activeSubTab === tab.id
                ? 'border-b-2 border-green-400 text-green-400'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // MAIN DASHBOARD

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchQuery(''); // Reset search when switching tabs
  };

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
                  <span className={`px-2 py-0.5 rounded-full font-medium ${userRole === 'SuperAdmin' ? 'bg-red-100 text-red-700 border border-red-200' : // Red for Super
                    userRole === 'Admin' ? 'bg-purple-100 text-purple-700' :                       // Purple for Admin
                      userRole === 'IT' ? 'bg-indigo-100 text-indigo-700' :                          // Indigo for IT
                        userRole === 'TL' ? 'bg-yellow-100 text-yellow-800' :                          // Yellow for Team Lead
                          userRole === 'QA' ? 'bg-orange-100 text-orange-700' :                          // Orange for QA
                            'bg-green-100 text-green-700'                                                  // Green for Agents
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

              {/* Allow Admin, SuperAdmin, AND IT to manage access */}
              {['Admin', 'SuperAdmin'].includes(userRole) && (
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


      {/* Navigation Tabs - Main Header Buttons */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
            {[
              'dashboard',
              'sales',
              'attendance',
              'payroll',
              'employees',
              'bonuses',
              'fines',
              'management',
              'super_controls' // <--- Use lowercase ID here
            ].map(tab => {

              // 1. SUPER ADMIN: Sees everything
              if (userRole === 'SuperAdmin') {
                // Pass (show all)
              }

              // 2. AGENT: Restricted View
              else if (userRole === 'Agent') {
                if (['payroll', 'employees', 'management', 'super_controls'].includes(tab)) return null;
              }

              // 3. TL (Team Lead): Operational View
              else if (userRole === 'TL') {
                // TLs don't see Payroll, HR Records, Management, or Super Controls
                if (['payroll', 'employees', 'super_controls', 'management'].includes(tab)) return null;
              }

              // 4. IT Support: System View
              else if (userRole === 'IT') {
                // IT mainly needs Management (Access) and Dashboard. Hide operations.
                if (['sales', 'payroll', 'employees', 'bonuses', 'fines', 'super_controls'].includes(tab)) return null;
              }

              // 5. ADMIN / HR / QA: Existing Logic
              else {
                if (tab === 'super_controls') return null; // Only SuperAdmin sees this

                // QA restrictions
                if (userRole === 'QA' && ['payroll', 'employees', 'management'].includes(tab)) return null;
              }

              return (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`px-6 py-3 text-sm font-medium capitalize transition-colors whitespace-nowrap ${activeTab === tab
                    ? tab === 'super_controls'
                      ? 'border-b-2 border-purple-500 text-purple-400' // Special color for Super Tab
                      : 'border-b-2 border-blue-400 text-blue-400'
                    : 'text-slate-400 hover:text-white'
                    }`}
                >
                  {/* Display Name Logic */}
                  {tab === 'super_controls' ? 'Super Controls' : tab}
                </button>
              );
            })}

            {/* --- MANUAL BUTTONS REMOVED --- */}
            {/* The manual blocks for Employees, Bonuses, Fines, Management are deleted */}
            {/* because the loop above now creates them for you. */}

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
              {/* [UPDATED] Visible to all Management/Ops Roles */}
              {['Admin', 'SuperAdmin', 'HR', 'TL', 'IT'].includes(userRole) && (
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

              {/* [UPDATED] Financials - Only for Admin, SuperAdmin, HR */}
              {['Admin', 'SuperAdmin', 'HR'].includes(userRole) && (
                <StatCard
                  icon={<Calendar className="w-6 h-6" />}
                  label="Total Payroll"
                  value={`${(dashboardStats.totalPayroll / 1000).toFixed(0)}K PKR`}
                  color="orange"
                />
              )}
            </div>

            {/* Top Performers Table */}
            <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-600 p-4">
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



        {/* Agent Management */}

        {activeTab === 'employees' && (
          <div className="space-y-6">


            <SubTabBar
              tabs={[
                { id: 'agents', label: 'Agents' },
                { id: 'hr', label: 'HR Records' }
              ]}
              activeSubTab={employeesSubTab}
              setActiveSubTab={setEmployeesSubTab}
            />

            {employeesSubTab === 'agents' && (
              <div className="space-y-6">

                {/* Header & Buttons */}
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-white">Agent Management</h2>
                  <div className="flex gap-3">
                    {['Admin', 'SuperAdmin'].includes(userRole) && (
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
                <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-600 p-4">
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

                        {['Admin', 'SuperAdmin'].includes(userRole) && <th className="py-3 px-4 text-sm font-medium text-slate-200 text-center min-w-[140px]">Actions</th>}
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

                            {['Admin', 'SuperAdmin'].includes(userRole) && (
                              <td className="py-3 px-4">
                                <div className="flex items-center justify-center gap-2">
                                  <button onClick={() => {
                                    const hrInfo = hrRecords.find(h => h.cnic === agent.cnic) || {};
                                    setEditingAgent({
                                      ...agent,
                                      ...hrInfo,
                                      contact_number: agent.Phone || hrInfo.Phone,
                                      active_date: hrInfo.joining_date || agent.activeDate,
                                      original_cnic: agent.cnic
                                    });
                                    setShowEditAgent(true);
                                    setShowAddAgent(true);
                                  }} className="p-1.5 bg-blue-500/10 text-blue-400 rounded hover:bg-blue-500/20 transition-colors" title="Edit">
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleOpenLeaveModal(agent)}
                                    className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded transition-colors"
                                    title="Mark as Left / Terminated"
                                  >
                                    <UserX className="w-5 h-5" />
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

            {employeesSubTab === 'hr' && (
              <div className="space-y-6">
                {/* HR Team Management */}
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-white">HR - Employment Data</h2>
                  <button
                    onClick={() => {
                      setEditingHR({
                        id: null,
                        agent_name: '',
                        father_name: '',
                        designation: 'Agent',
                        payroll_cycle_type: 'Agent Cycle',
                        contact_number: '',
                        email: '',
                        address: '',
                        cnic: '',
                        joining_date: new Date().toISOString().split('T')[0],
                        team: '',
                        center: '',
                        baseSalary: '',
                        bank_name: '',
                        account_number: '',
                        original_cnic: null
                      });
                      setShowAddEmployee(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Employee
                  </button>
                </div>

                {/* Filter Grid */}
                <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-600 p-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4"> {/* Changed cols-4 to cols-5 */}

                    {/* Existing Search Input */}
                    <input type="text" placeholder="Search by name or CNIC..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />

                    {/* Existing Team Filter */}
                    <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="All">All Teams</option>
                      {teams.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>

                    {/* Existing Center Filter */}
                    <select value={centerFilter} onChange={(e) => setCenterFilter(e.target.value)} className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="All">All Centers</option>
                      {centers.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    {/* Designation Filter */}
                    <select
                      value={designationFilter}
                      onChange={(e) => setDesignationFilter(e.target.value)}
                      className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="All">All Designations</option>

                      {/* [NEW] Add this option */}
                      <option value="All Management">All Management</option>

                      {/* Dynamically list unique designations from DB */}
                      {[...new Set(hrRecords.map(h => h.designation))].filter(Boolean).sort().map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>

                    {/* Existing Status Filter */}
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
                            {/* [FIXED] Salary Display (Checks HR Record first for Management) */}
                            <td className="py-3 px-4 text-right text-slate-100 font-mono">
                              {rec.base_salary
                                ? parseInt(rec.base_salary).toLocaleString()
                                : (agentProfile.baseSalary ? agentProfile.baseSalary.toLocaleString() : 0)
                              }
                            </td>
                            <td className="py-3 px-4 text-slate-400 text-xs font-mono">{rec.cnic}</td>

                            {/* [FIXED] Joining Date + Left Date (Check both HR and Agent records) */}
                            <td className="py-3 px-4">
                              <div className="text-slate-300 text-sm">{rec.joining_date}</div>

                              {/* Show Left Date if status is Left */}
                              {rec.status === 'Left' && (
                                <div className="text-[10px] text-red-400 font-medium mt-0.5">
                                  {/* Check Agent Profile first, then fallback to HR Record */}
                                  Left: {agentProfile.leftDate || rec.left_date || rec.leftDate || 'N/A'}
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
                                    baseSalary: rec.base_salary || rec.baseSalary || linkedAgent.baseSalary || '',
                                    bank_name: rec.bank_name || linkedAgent.bank_name || '',
                                    account_number: rec.account_number || linkedAgent.account_number || '',
                                    payroll_cycle_type: rec.payroll_cycle_type || 'Agent Cycle'
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
          </div>
        )}

        {/* Sales TAB */}

        {activeTab === 'sales' && (
          <div className="space-y-6">

            <SubTabBar
              tabs={[
                { id: 'list', label: 'Sales List' },
                { id: 'matrix', label: 'Monthly Matrix' }
              ]}
              activeSubTab={salesSubTab}
              setActiveSubTab={setSalesSubTab}
            />

            {salesSubTab === 'list' && (
              <div className="space-y-6">

                {/* Header Section */}
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-white">Sales Management</h2>
                  <div className="flex gap-3">
                    {['Admin', 'SuperAdmin'].includes(userRole) && (
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
                <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-600 p-4">
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
                        {(userRole === 'Admin' || userRole === 'QA' || userRole === 'SuperAdmin') && <th className="text-center py-4 px-3 text-xs font-bold text-slate-400 uppercase">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {filteredSales.map((sale, idx) => {
                        const disp = sale.disposition;
                        let rowColor = "hover:bg-slate-700";
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
                                  className="w-full px-2 py-1 text-xs bg-slate-900 text-white border border-slate-600 rounded outline-none focus:ring-1 focus:ring-blue-500"
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

                            {/* Editable Dock Details (FINE AMOUNT) */}
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                inputMode="numeric"
                                placeholder="Fine"
                                defaultValue={sale.dockDetails || ''}

                                // --- 1. RESTRICTION: Disable if not Admin/QA ---
                                disabled={!['Admin', 'QA', 'SuperAdmin'].includes(userRole)}

                                onInput={(e) => {
                                  e.target.value = e.target.value.replace(/\D/g, '');
                                }}

                                onBlur={(e) => {
                                  const val = e.target.value;
                                  if (val !== sale.dockDetails) {
                                    updateSaleField(sale.id, 'dockDetails', val);
                                  }
                                }}

                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.target.blur();
                                  }
                                }}

                                // --- 2. STYLING: Dim text if disabled ---
                                className={`w-full px-1 py-1 text-xs border border-slate-600 rounded text-center font-mono outline-none transition-colors
                              ${userRole !== 'Admin' && userRole !== 'QA'
                                    ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed' // Disabled Style
                                    : 'bg-slate-700 text-white placeholder-slate-400 focus:ring-1 focus:ring-blue-500' // Enabled Style
                                  }`}
                              />
                            </td>

                            {/* DOCK REASON (Fine Reason) */}
                            <td className="py-2 px-2 align-middle">
                              <input
                                type="text"
                                placeholder="Reason..."
                                defaultValue={sale.dockReason || sale.dockreason || ''}

                                // --- 1. RESTRICTION: Disable if not Admin/QA ---
                                disabled={!['Admin', 'QA', 'SuperAdmin'].includes(userRole)}

                                onBlur={(e) => {
                                  const val = e.target.value;
                                  updateSaleField(sale.id, 'dockreason', val);
                                }}

                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') e.target.blur();
                                }}

                                // --- 2. STYLING: Dim text if disabled ---
                                className={`w-full px-1 py-1 text-xs border border-slate-600 rounded text-left transition-colors
                              ${userRole !== 'Admin' && userRole !== 'QA'
                                    ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed' // Disabled Style
                                    : 'bg-slate-700 text-white focus:ring-1 focus:ring-blue-500' // Enabled Style
                                  }`}
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
            {salesSubTab === 'matrix' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  
{/* [FIXED] Sales Matrix Header & Action Bar */}
               {/* [FIXED] Sales Matrix Header - Added 'w-full' */}
                <div className="w-full flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm mb-2">
                  
                  {/* LEFT SIDE: Title & Subtitle */}
                  <div>
                    <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                      Sales Performance Matrix
                    </h2>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Daily Breakdown for {selectedMonth}
                    </p>
                  </div>

                  {/* RIGHT SIDE: Cycle Dates & Buttons */}
                  <div className="flex flex-col md:flex-row items-center gap-4">
                    
                    {/* Cycle Text */}
                    <div className="text-xs text-slate-500 font-medium bg-slate-900/50 px-3 py-1.5 rounded border border-slate-700/50">
                      Cycle: <span className="text-slate-300">{getPayrollRange(selectedMonth).start.toDateString()} - {getPayrollRange(selectedMonth).end.toDateString()}</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setShowAddBonus(true)}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-all shadow-lg shadow-green-900/20"
                      >
                        <Plus className="w-4 h-4" /> Add Bonus
                      </button>
                      <button
                        onClick={() => setShowAddFine(true)}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-all shadow-lg shadow-red-900/20"
                      >
                        <Plus className="w-4 h-4" /> Add Fine
                      </button>
                    </div>
                  </div>
                </div>
                </div>

                {/* --- FILTERS --- */}
                <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-600 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input
                      type="text"
                      placeholder="Search agent name..."
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
                    <select value={agentStatusFilter} onChange={(e) => setAgentStatusFilter(e.target.value)} className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="All">All Status</option>
                      <option value="Active">Active</option>
                      <option value="Left">Left / Ex-Employees</option>
                    </select>
                  </div>
                </div>

                {/* --- MATRIX LOGIC STARTS HERE --- */}
                {(() => {
                  // 1. Prepare Dates
                  const { start, end } = getPayrollRange(selectedMonth);
                  const dateArray = getDaysArray(start, end);

                  // 2. [CRITICAL FIX] Calculate Filtered Data ONCE at the top
                  // This list will be used by BOTH the Rows (Body) and the Grand Total (Footer)
                  const displayedStats = monthlyStats.filter(stat => {
                    // Search Filter
                    const matchesSearch = !searchQuery || (stat.name && stat.name.toLowerCase().includes(searchQuery.toLowerCase()));

                    // Status Filter (Active/Left)
                    const matchesStatus = agentStatusFilter === 'All' || stat.status === agentStatusFilter;

                    // Team Filter
                    const matchesTeam = teamFilter === 'All' || stat.team === teamFilter;

                    // Center Filter
                    const matchesCenter = centerFilter === 'All' || stat.center === centerFilter;

                    return matchesSearch && matchesStatus && matchesTeam && matchesCenter;
                  });

                  // 3. Extract Unique Teams from the FILTERED list (so empty teams don't show)
                  const uniqueTeams = [...new Set(displayedStats.map(s => s.team))].filter(Boolean).sort();

                  return (
                    <div className="bg-slate-900 rounded-xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                      <div className="overflow-auto relative">
                        <table className="w-full text-slate-300 border-collapse table-fixed">

                          {/* --- HEADER --- */}
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
                              {dateArray.map(dateStr => {
                                const d = new Date(dateStr);
                                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                return (
                                  <th key={dateStr} className={`p-2 text-center border-b border-slate-800 w-10 ${isWeekend ? 'bg-slate-800' : 'bg-slate-900'}`}>
                                    <div className="text-[10px] text-slate-500 uppercase">{d.toLocaleDateString('en-US', { weekday: 'narrow' })}</div>
                                    <div className={`text-xs font-bold ${isWeekend ? 'text-slate-500' : 'text-white'}`}>{d.getDate()}</div>
                                  </th>
                                );
                              })}
                              <th className="p-3 text-center bg-slate-950 border-b border-l border-slate-800 font-bold text-green-400 sticky right-0 z-40 w-16 shadow-[-4px_0_10px_rgba(0,0,0,0.5)]">TOTAL</th>
                            </tr>
                          </thead>

                          {/* --- BODY --- */}
                          <tbody className="divide-y divide-slate-800">
                            {uniqueTeams.map(teamName => {
                              // Filter and Sort Agents for this Team (from displayedStats)
                              const teamAgents = displayedStats
                                .filter(s => s.team === teamName)
                                .sort((a, b) => a.name.localeCompare(b.name));

                              if (teamAgents.length === 0) return null;

                              // Calculate Team Sub-Totals
                              const teamTotalSales = teamAgents.reduce((sum, a) => sum + a.totalSales, 0);
                              const teamTotalDays = teamAgents.reduce((sum, a) => sum + a.dialingDays, 0);
                              const teamAvgLPD = teamTotalDays > 0 ? (teamTotalSales / teamTotalDays).toFixed(2) : "0.00";

                              // Get sales relevant to this team for daily breakdown
                              const teamAllSales = sales.filter(s =>
                                (s.status === 'Sale' || s.disposition === 'HW- Xfer' || s.disposition === 'HW-IBXfer') &&
                                teamAgents.some(a => a.name?.toString().trim().toLowerCase() === s.agentName?.toString().trim().toLowerCase())
                              );

                              return (
                                <React.Fragment key={teamName}>
                                  {/* Team Header Row */}
                                  <tr className="bg-slate-800/80 sticky top-[53px] z-30">
                                    <td colSpan={2} className="p-2 px-4 border-r border-slate-700 font-black text-blue-400 uppercase tracking-widest text-sm sticky left-0 z-30 bg-slate-800">
                                      {teamName}
                                    </td>
                                    <td className="text-center font-bold text-blue-300 border-r border-slate-700 bg-slate-800">{teamAvgLPD}</td>
                                    <td className="text-center text-slate-400 border-r border-slate-700 bg-slate-800">{teamTotalDays}</td>
                                    <td colSpan={4} className="bg-slate-800 border-r border-slate-700"></td>

                                    {dateArray.map(d => {
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

                                  {/* Agent Rows */}
                                  {teamAgents.map((stat, idx) => {
                                    const agentSales = sales.filter(s =>
                                      s.agentName?.toString().trim().toLowerCase() === stat.name?.toString().trim().toLowerCase() &&
                                      (s.status === 'Sale' || s.disposition === 'HW- Xfer' || s.disposition === 'HW-IBXfer')
                                    );

                                    // Get Agent's Join Date for comparison
                                    const hrRec = hrRecords.find(h => h.cnic === stat.cnic) || {};
                                    const joinDateStr = hrRec.joining_date || stat.activeDate || stat.active_date;
                                    const joinDate = joinDateStr ? new Date(joinDateStr) : null;
                                    if (joinDate) joinDate.setHours(0, 0, 0, 0);

                                    // [NEW CODE] - Checks for ANY inactive status (Left, Terminated, NCNS)
                                    const isInactive = stat.status !== 'Active' && stat.status !== 'Promoted';
                                    const rowClass = isInactive ? 'bg-red-900/10 hover:bg-red-900/20' : 'hover:bg-blue-900/10';
                                    const nameClass = isInactive ? 'text-red-400' : 'text-slate-200';

                                    return (
                                      <tr key={stat.id} className={`${rowClass} transition-colors group`}>
                                        <td className="p-2 text-center border-r border-slate-800 bg-slate-900 text-slate-600 font-mono text-[10px] sticky left-0 z-10 group-hover:text-white">{idx + 1}</td>

                                        <td className="p-2 px-3 font-medium border-r border-slate-800 bg-slate-900 sticky left-12 z-10 truncate text-xs">
                                          <div className={nameClass}>{stat.name}</div>
                                          {stat.isPromoted ? (
                                            <div className="text-[9px] text-red-500 font-bold uppercase mt-0.5 tracking-tighter">
                                              PROMOTED TO {stat.designation.toUpperCase()}
                                            </div>
                                          ) : (
                                            isInactive && (
                                              <div className="text-[9px] text-red-500/80 font-mono mt-0.5 font-bold">
                                                {stat.status.toUpperCase()}: {stat.leftDate || 'N/A'}
                                              </div>
                                            )
                                          )}
                                        </td>

                                        <td className="p-1 text-center border-r border-slate-800 bg-blue-500/5 font-bold text-blue-400 text-xs">{stat.lpd}</td>
                                        <td className="p-1 text-center border-r border-slate-800 text-slate-400 text-[10px]">{stat.dialingDays}</td>
                                        <td className="p-1 text-center text-red-400 text-[10px]">{stat.daysOn0}</td>
                                        <td className="p-1 text-center text-orange-300/80 text-[10px]">{stat.daysOn1}</td>
                                        <td className="p-1 text-center text-yellow-300/80 text-[10px]">{stat.daysOn2}</td>
                                        <td className="p-1 text-center border-r border-slate-800 text-green-400 font-bold text-[10px]">{stat.daysOn3}</td>

                                        {dateArray.map(dateStr => {
                                          const currentDate = new Date(dateStr);
                                          currentDate.setHours(0, 0, 0, 0);

                                          // 1. Check for Holiday
                                          const isHoliday = holidays.some(h => h.date === dateStr);

                                          // 2. Is this date BEFORE they joined?
                                          const isBeforeJoining = joinDate && currentDate < joinDate;

                                          const dailyCount = agentSales.filter(s => s.date === dateStr).length;
                                          
                                          // check attendance for '0' vs 'A' logic
                                          const hasAttendance = attendance.some(a =>
                                            a.date === dateStr &&
                                            a.agentName?.toString().trim().toLowerCase() === stat.name?.toString().trim().toLowerCase() &&
                                            (a.status === 'Present' || a.status === 'Late')
                                          );

                                          // check if others worked (to decide if it was a working day)
                                          const isWorkingDay = sales.some(s => s.date === dateStr && (s.status === 'Sale' || ['HW- Xfer', 'HW-IBXfer'].includes(s.disposition)));

                                          let cellContent = '-';
                                          let cellClass = 'text-slate-700';

                                          // PRIORITY 1: Sales (Green) - Work done overrides everything
                                          if (dailyCount > 0) {
                                            cellContent = dailyCount;
                                            cellClass = 'bg-green-500/10 text-green-400 font-bold';
                                          }
                                          // PRIORITY 2: Holiday (Purple 'H') - Only if NO sales
                                          else if (isHoliday) {
                                            cellContent = 'H';
                                            cellClass = 'text-purple-400 font-bold bg-purple-900/20';
                                          }
                                          // PRIORITY 3: Normal Status (0, A, or -)
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
                            })}
                          </tbody>

                          {/* --- FOOTER (Grand Totals using DISPLAYEDSTATS) --- */}
                          <tfoot className="sticky bottom-0 z-40 shadow-[0_-4px_10px_rgba(0,0,0,0.5)]">
                            <tr className="bg-slate-950 border-t-2 border-blue-500 font-black text-white">
                              <td colSpan={2} className="p-3 text-left sticky left-0 bg-slate-950 z-50 uppercase tracking-tighter">Grand Total</td>
                              <td className="text-center text-blue-400 bg-slate-950">
                                {/* Calculate Average LPD for VISIBLE agents only */}
                                {(displayedStats.reduce((s, a) => s + a.totalSales, 0) / (displayedStats.reduce((s, a) => s + a.dialingDays, 0) || 1)).toFixed(2)}
                              </td>
                              <td className="text-center text-slate-400 bg-slate-950">
                                {displayedStats.reduce((s, a) => s + a.dialingDays, 0)}
                              </td>
                              <td colSpan={4} className="bg-slate-950"></td>

                              {dateArray.map(d => {
                                // Grand Total for each day must check displayedStats
                                // We check if the sale belongs to ANY agent in the displayedStats list
                                const dailyGrandTotal = sales.filter(s =>
                                  s.date === d &&
                                  (s.status === 'Sale' || s.disposition === 'HW- Xfer' || s.disposition === 'HW-IBXfer') &&
                                  displayedStats.some(agent => agent.name?.toString().trim().toLowerCase() === s.agentName?.toString().trim().toLowerCase())
                                ).length;

                                return (
                                  <td key={d} className="bg-slate-950 text-center text-xs font-bold text-green-400">
                                    {dailyGrandTotal > 0 ? dailyGrandTotal : ''}
                                  </td>
                                );
                              })}

                              <td className="p-3 text-center text-green-400 text-lg sticky right-0 bg-slate-950 z-50 shadow-[-4px_0_10px_rgba(0,0,0,0.5)]">
                                {displayedStats.reduce((s, a) => s + a.totalSales, 0)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

          </div>
        )}
        ```

        {/* =====================================================================================
            TAB: MANAGEMENT PAYROLL (Buttons Added + Data Fixed)
           ===================================================================================== */}
        {activeTab === 'management' && (

          <div className="space-y-6">
            <SubTabBar
              tabs={[
                { id: 'payroll', label: 'Payroll' },
                { id: 'attendance', label: 'Attendance' }
              ]}
              activeSubTab={managementSubTab}
              setActiveSubTab={setManagementSubTab}
            />

            {managementSubTab === 'payroll' && (
              <div className="space-y-8 animate-in fade-in duration-300">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-800 p-6 rounded-2xl border border-slate-700">
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                      Management Payroll
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                      Payroll Breakdown for {selectedMonth}
                    </p>
                  </div>

                  {/* [NEW] Action Buttons for Management */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowMgmtBonus(true)} // Opens NEW Modal
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-green-900/20"
                    >
                      <Plus className="w-4 h-4" /> Add Bonus
                    </button>
                    <button
                      onClick={() => setShowMgmtFine(true)} // Opens NEW Modal
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-red-900/20"
                    >
                      <Plus className="w-4 h-4" /> Add Fine
                    </button>
                  </div>
                </div>

                {/* --- RENDER TABLES --- */}
                {(() => {
                  const { standard, agentCycle } = managementPayrollStats;

                  const renderPayrollTable = (title, staffList, badgeColor) => (
                    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden mb-8 shadow-xl">
                      <div className="p-5 border-b border-slate-700 flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-white">{title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${badgeColor} text-white font-medium`}>
                          {staffList.length} Employees
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider">
                              <th className="p-4 font-medium border-b border-slate-700">Employee</th>
                              <th className="p-4 font-medium border-b border-slate-700">Designation</th>
                              <th className="p-4 font-medium border-b border-slate-700 text-center">Attendance</th>
                              <th className="p-4 font-medium border-b border-slate-700 text-right">Base Salary</th>
                              <th className="p-4 font-medium border-b border-slate-700 text-right">Earned Base</th>
                              <th className="p-4 font-medium border-b border-slate-700 text-right text-green-400">Bonus</th>
                              <th className="p-4 font-medium border-b border-slate-700 text-right text-red-400">Fine</th>
                              <th className="p-4 font-medium border-b border-slate-700 text-right text-blue-400">Net Salary</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700">
                            {staffList.length > 0 ? (
                              staffList.map((emp, idx) => (
                                <tr key={idx} className="hover:bg-slate-700/20 text-sm group">
                                  <td className="p-4 font-medium text-white">{emp.agent_name}</td>
                                  <td className="p-4 text-slate-400">{emp.designation}</td>
                                  <td className="p-4 text-center">
                                    <span className={`px-2 py-1 rounded text-xs font-mono ${emp.daysPresent === emp.totalWorkingDays ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-blue-300'}`}>
                                      {emp.daysPresent} / {emp.totalWorkingDays}
                                    </span>
                                  </td>
                                  <td className="p-4 text-right text-slate-400 font-mono text-xs">
                                    {emp.baseSalary?.toLocaleString()}
                                  </td>
                                  <td className="p-4 text-right text-slate-200 font-mono">
                                    {emp.earnedBase?.toLocaleString()}
                                  </td>
                                  <td className="p-4 text-right font-mono text-green-400">
                                    {emp.totalBonus > 0 ? `+${emp.totalBonus.toLocaleString()}` : '-'}
                                  </td>
                                  <td className="p-4 text-right font-mono text-red-400">
                                    {emp.totalFine > 0 ? `-${emp.totalFine.toLocaleString()}` : '-'}
                                  </td>
                                  <td className="p-4 text-right font-bold font-mono text-blue-300 text-base bg-slate-800/30">
                                    {emp.netSalary?.toLocaleString()} <span className="text-xs text-slate-500">PKR</span>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="8" className="p-8 text-center text-slate-500 italic">
                                  No employees found in this cycle.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );

                  return (
                    <>
                      {renderPayrollTable("Standard Month Cycle (1st - 30th)", standard, "bg-purple-500/20 border border-purple-500/30")}
                      {renderPayrollTable("Agent Cycle (21st - 20th)", agentCycle, "bg-orange-500/20 border border-orange-500/30")}
                    </>
                  );
                })()}
              </div>
            )}

            {managementSubTab === 'attendance' && (
              <div className="space-y-6">
                {/* =====================================================================================
    TAB: MANAGEMENT ATTENDANCE MATRIX (HR/QA/TL/IT Staff)
   ===================================================================================== */}

                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-xl text-white font-bold">Management Attendance Matrix ({selectedMonth})</h2>
                      <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Login Times • Late Tracking • Non-Agent Staff</p>
                    </div>
                  </div>

                  {/* --- [ADDED] FILTER BAR --- */}
                  <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-600 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <input
                        type="text"
                        placeholder="Search employee..."
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
                      <select value={agentStatusFilter} onChange={(e) => setAgentStatusFilter(e.target.value)} className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="All">All Status</option>
                        <option value="Active">Active</option>
                        <option value="Left">Left / Ex-Employees</option>
                      </select>
                    </div>
                  </div>

                  {/* --- LOGIC STARTS --- */}
                  {(() => {
                    // Helper: Format time to 12-hour
                    const formatTo12Hour = (timeStr) => {
                      if (!timeStr) return '';
                      const [h, m] = timeStr.toString().split(':');
                      if (!h || !m) return timeStr;
                      let hours = parseInt(h);
                      const ampm = hours >= 12 ? 'PM' : 'AM';
                      hours = hours % 12;
                      hours = hours ? hours : 12;
                      return `${hours}:${m} ${ampm}`;
                    };

                    // Helper: Calculate late status
                    const getLateStatus = (timeStr) => {
                      if (!timeStr) return { isLate: false, color: 'text-green-400' };
                      const [h, m] = timeStr.toString().split(':').map(Number);
                      let loginMins = h * 60 + m;
                      if (h < 12) loginMins += 1440;
                      const shiftStartMins = 19 * 60;
                      const diff = loginMins - shiftStartMins;
                      if (diff <= 0) return { isLate: false, color: 'text-green-400' };
                      else if (diff <= 10) return { isLate: true, color: 'text-yellow-400 font-bold' };
                      else return { isLate: true, color: 'text-red-500 font-bold' };
                    };

                    // [FIXED] Filter Logic using Search/Team/Center/Status
                    const allManagementStaff = hrRecords
                      .filter(emp => {
                        // 1. Must NOT be an Agent
                        const designation = (emp.designation || '').toLowerCase().trim();
                        if (designation === 'agent') return false;

                        // 2. Search Filter
                        const matchesSearch = !searchQuery || (emp.agent_name && emp.agent_name.toLowerCase().includes(searchQuery.toLowerCase()));

                        // 3. Team Filter
                        const matchesTeam = teamFilter === 'All' || emp.team === teamFilter;

                        // 4. Center Filter
                        const matchesCenter = centerFilter === 'All' || emp.center === centerFilter;

                        // 5. Status Filter (Allows seeing Left employees)
                        const matchesStatus = agentStatusFilter === 'All' || emp.status === agentStatusFilter;

                        return matchesSearch && matchesTeam && matchesCenter && matchesStatus;
                      })
                      .sort((a, b) => a.agent_name.localeCompare(b.agent_name));

                    // Split by cycle type
                    const agentCycleStaff = allManagementStaff.filter(emp =>
                      (emp.payroll_cycle_type || '').toLowerCase().includes('agent')
                    );

                    const standardCycleStaff = allManagementStaff.filter(emp =>
                      !(emp.payroll_cycle_type || '').toLowerCase().includes('agent')
                    );

                    // Reusable table renderer
                    const renderAttendanceTable = (staff, cycleType, themeColor) => {
                      if (staff.length === 0) return null;

                      const { start, end } = cycleType === 'agent'
                        ? getPayrollRange(selectedMonth)
                        : getStandardMonthRange(selectedMonth);

                      const dateArray = getDaysArray(start, end);

                      return (
                        <div className="bg-slate-900 rounded-xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[70vh] mb-8">
                          <div className="p-4 bg-slate-800 border-b border-slate-700">
                            <h3 className={`text-lg font-bold ${themeColor === 'orange' ? 'text-orange-400' : 'text-purple-400'}`}>
                              {cycleType === 'agent' ? 'Agent Cycle (21st - 20th)' : 'Standard Month Cycle (1st - End of Month)'}
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">
                              Cycle: {start.toDateString()} - {end.toDateString()}
                            </p>
                          </div>

                          <div className="overflow-auto relative">
                            <table className="w-full text-slate-300 border-collapse table-fixed">

                              {/* --- HEADER --- */}
                              <thead className="sticky top-0 z-40 shadow-md">
                                <tr className="bg-slate-950">
                                  <th className="p-3 text-center border-b border-r border-slate-800 sticky left-0 z-50 bg-slate-950 w-12">No.</th>
                                  <th className="p-3 text-left border-b border-r border-slate-800 sticky left-12 z-50 bg-slate-950 w-44">Employee Name</th>
                                  <th className="p-3 text-left border-b border-r border-slate-800 bg-slate-950 w-32">Designation</th>

                                  {/* Attendance Metrics */}
                                  <th className="p-2 text-center border-b border-slate-800 bg-green-900/20 text-green-400 text-[10px] font-bold w-10" title="Days Present">P</th>
                                  <th className="p-2 text-center border-b border-slate-800 bg-yellow-900/20 text-yellow-400 text-[10px] font-bold w-10" title="Days Late">L</th>
                                  <th className="p-2 text-center border-b border-r border-slate-800 bg-red-900/20 text-red-400 text-[10px] font-bold w-10" title="Days Absent">A</th>

                                  {/* Date Columns */}
                                  {dateArray.map(dateStr => {
                                    const d = new Date(dateStr);
                                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                    return (
                                      <th key={dateStr} className={`p-2 text-center border-b border-slate-800 w-16 ${isWeekend ? 'bg-slate-800' : 'bg-slate-900'}`}>
                                        <div className="text-[10px] text-slate-500 uppercase">{d.toLocaleDateString('en-US', { weekday: 'narrow' })}</div>
                                        <div className={`text-xs font-bold ${isWeekend ? 'text-slate-500' : 'text-white'}`}>{d.getDate()}</div>
                                      </th>
                                    );
                                  })}

                                  {/* Summary Column */}
                                  <th className="p-3 text-center bg-slate-950 border-b border-l border-slate-800 font-bold text-yellow-400 sticky right-0 z-40 w-20 shadow-[-4px_0_10px_rgba(0,0,0,0.5)]">
                                    LATE %
                                  </th>
                                </tr>
                              </thead>

                              <tbody className="divide-y divide-slate-800">
                                {staff.map((emp, idx) => {
                                  const joinDate = emp.joining_date ? new Date(emp.joining_date) : null;
                                  if (joinDate) joinDate.setHours(0, 0, 0, 0);

                                  const empRecords = attendance.filter(a => a.agentName === emp.agent_name);
                                  // 1. Calculate Scanned Presents
                                  const scannedPresent = empRecords.filter(a => a.status === 'Present').length;

                                  // 2. [NEW] Calculate Valid Holidays (Add to Present count)
                                  let validHolidays = 0;
                                  holidays.forEach(h => {
                                      // Must be in current view
                                      if (!dateArray.includes(h.date)) return;
                                      
                                      // Must be after joining
                                      const hDate = new Date(h.date); hDate.setHours(0,0,0,0);
                                      if (joinDate && hDate < joinDate) return;

                                      // Don't double count if they actually worked on the holiday
                                      const hasScan = empRecords.some(a => a.date === h.date && a.status === 'Present');
                                      if (!hasScan) {
                                          validHolidays++;
                                      }
                                  });

                                  // [FINAL P COUNT] = Scans + Holidays
                                  const presentCount = scannedPresent + validHolidays;

                                  const lateCount = empRecords.filter(a =>
                                    a.status === 'Present' && getLateStatus(a.loginTime).isLate
                                  ).length;

                                  let absentCount = 0;
                                  dateArray.forEach(dStr => {
                                    const dObj = new Date(dStr);
                                    dObj.setHours(0, 0, 0, 0);
                                    if (dObj.getDay() === 0 || dObj.getDay() === 6) return;
                                    if (dObj > new Date()) return;
                                    if (joinDate && dObj < joinDate) return;

                                    // [FIX] Check for Holiday to prevent false Absents
                                    const isHoliday = holidays.some(h => h.date === dStr);
                                    const hasRec = empRecords.some(a => a.date === dStr);

                                    if (!hasRec) {
                                        // Only increment Absent if it is NOT a holiday
                                        if (!isHoliday) absentCount++;
                                    }
                                    else if (empRecords.find(a => a.date === dStr).status === 'Absent') {
                                        absentCount++;
                                    }
                                  });

                                  const latePercentage = presentCount > 0 ? Math.round((lateCount / presentCount) * 100) : 0;

                                  // Visual for Left Employees
                                  const isLeft = emp.status === 'Left';
                                  const rowClass = isLeft ? 'hover:bg-red-900/10' : `hover:${themeColor === 'orange' ? 'bg-orange-900/10' : 'bg-purple-900/10'}`;
                                  const nameClass = isLeft ? 'text-red-400' : 'text-slate-200';

                                  return (
                                    <tr key={emp.id} className={`${rowClass} transition-colors group`}>
                                      <td className="p-2 text-center border-r border-slate-800 bg-slate-900 text-slate-600 font-mono text-[10px] sticky left-0 z-10 group-hover:text-white">{idx + 1}</td>
                                      <td className="p-2 px-3 font-medium border-r border-slate-800 bg-slate-900 sticky left-12 z-10 truncate text-xs">
                                        <div className={nameClass}>{emp.agent_name}</div>
                                        {isLeft && <div className="text-[9px] text-red-500 font-mono mt-0.5">LEFT</div>}
                                      </td>
                                      <td className="p-2 px-3 text-xs text-slate-400 border-r border-slate-800 bg-slate-900">{emp.designation}</td>

                                      <td className="p-1 text-center border-b border-slate-800 text-green-400 font-bold text-[10px]">{presentCount}</td>
                                      <td className="p-1 text-center border-b border-slate-800 text-yellow-400 font-bold text-[10px]">{lateCount}</td>
                                      <td className="p-1 text-center border-b border-r border-slate-800 text-red-400 font-bold text-[10px]">{absentCount}</td>

                                      {/* Daily Cells */}
                                      {dateArray.map(dateStr => {
                                        const currentDate = new Date(dateStr);
                                        currentDate.setHours(0, 0, 0, 0);
                                        const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
                                        const isBeforeJoining = joinDate && currentDate < joinDate;

                                        // 1. [NEW] Check for Holiday
                                        const isHoliday = holidays.some(h => h.date === dateStr);

                                        // Keep your existing record lookup
                                        const record = empRecords.find(a => a.date === dateStr);

                                        let cellContent = '-';
                                        let cellClass = 'text-slate-700';

                                        if (isBeforeJoining) {
                                          cellContent = '•';
                                          cellClass = 'text-slate-800';
                                        }
                                        // 2. If Present -> Show Time (Prioritize working over holiday)
                                        else if (record && record.status === 'Present') {
                                            cellContent = formatTo12Hour(record.loginTime) || 'OK';
                                            const status = getLateStatus(record.loginTime);
                                            if (status.isLate) {
                                              cellClass = `bg-slate-800/50 ${status.color} font-mono text-[10px]`;
                                            } else {
                                              cellClass = 'text-green-400 font-mono text-[10px]';
                                            }
                                        } 
                                        // 3. [NEW] If Holiday -> Show 'H' (Purple)
                                        else if (isHoliday) {
                                          cellContent = 'H';
                                          cellClass = 'bg-purple-900/40 text-purple-400 font-bold';
                                        }
                                        // 4. If Explicit Absent
                                        else if (record && record.status === 'Absent') {
                                          cellContent = 'A';
                                          cellClass = 'bg-red-500/10 text-red-500 font-bold';
                                        } 
                                        // 5. Default (Weekend or Implicit Absent)
                                        else {
                                          if (isWeekend) {
                                            cellContent = '';
                                            cellClass = 'bg-slate-800/30';
                                          } else if (currentDate <= new Date()) {
                                            // Only mark 'A' if it was NOT a holiday
                                            cellContent = 'A';
                                            cellClass = 'text-red-500/50 font-bold';
                                          }
                                        }

                                        return (
                                          <td key={dateStr} className={`p-1 text-center border-b border-slate-800 text-[11px] ${cellClass}`}>
                                            {cellContent}
                                          </td>
                                        );
                                      })}

                                      {/* Row Summary */}
                                      <td className={`p-2 text-center font-bold sticky right-0 z-10 bg-slate-900 shadow-[-4px_0_10px_rgba(0,0,0,0.5)] ${latePercentage > 20 ? 'text-red-400' : 'text-slate-400'}`}>
                                        {latePercentage}%
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>

                              {/* --- FOOTER --- */}
                              <tfoot className="sticky bottom-0 z-40 shadow-[0_-4px_10px_rgba(0,0,0,0.5)]">
                                <tr className={`bg-slate-950 border-t-2 ${themeColor === 'orange' ? 'border-orange-500' : 'border-purple-500'} font-black text-white`}>
                                  <td colSpan={3} className="p-3 text-left sticky left-0 bg-slate-950 z-50 uppercase tracking-tighter">Total</td>

                                  {/* Grand Metrics */}
                                  <td className="text-center text-green-400 bg-slate-950 text-[10px]">
                                    {attendance.filter(a =>
                                      a.status === 'Present' &&
                                      staff.some(s => s.agent_name === a.agentName)
                                    ).length}
                                  </td>
                                  <td className="text-center text-yellow-400 bg-slate-950 text-[10px]">
                                    {attendance.filter(a =>
                                      a.late === true &&
                                      staff.some(s => s.agent_name === a.agentName)
                                    ).length}
                                  </td>
                                  <td className="text-center text-red-400 bg-slate-950 border-r border-slate-800 text-[10px]">
                                    -
                                  </td>

                                  {/* Daily Grand Totals */}
                                  {dateArray.map(d => {
                                    const dailyTotal = attendance.filter(a =>
                                      a.date === d &&
                                      a.status === 'Present' &&
                                      staff.some(s => s.agent_name === a.agentName)
                                    ).length;
                                    return (
                                      <td key={d} className="bg-slate-950 text-center text-[10px] font-bold text-slate-500">
                                        {dailyTotal > 0 ? dailyTotal : ''}
                                      </td>
                                    );
                                  })}

                                  <td className={`p-3 text-center ${themeColor === 'orange' ? 'text-orange-400' : 'text-purple-400'} text-lg sticky right-0 bg-slate-950 z-50 shadow-[-4px_0_10px_rgba(0,0,0,0.5)]`}>
                                    -
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      );
                    };

                    return (
                      <>
                        {/* Table 1: Agent Cycle (21st - 20th) */}
                        {renderAttendanceTable(agentCycleStaff, 'agent', 'orange')}

                        {/* Table 2: Standard Cycle (1st - End of Month) */}
                        {renderAttendanceTable(standardCycleStaff, 'standard', 'purple')}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================================
            TAB: ATTENDANCE Tab (Fixed Time Calculation Logic)
           ===================================================================================== */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">

            <SubTabBar
              tabs={[
                { id: 'daily', label: 'Daily Attendance' },
                { id: 'matrix', label: 'Attendance Matrix' }
              ]}
              activeSubTab={attendanceSubTab}
              setActiveSubTab={setAttendanceSubTab}
            />

            {attendanceSubTab === 'daily' && (
              <div className="space-y-6">

                {/* Header */}
                <div className="flex justify-between items-center bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Clock className="w-6 h-6 text-blue-400" /> Daily Attendance
                    </h2>
                    <div className="flex items-center gap-3 text-sm mt-1">
                      <span className="text-slate-400">Status for <span className="text-blue-400 font-mono font-bold">{customStartDate}</span></span>
                      <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                      <span className="text-slate-400">Late Threshold: <span className="text-yellow-400 font-mono font-bold">{formatTime(lateTime)}</span></span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    {/* Set Late Time Button (Admin Only) */}
                    {['Admin', 'SuperAdmin'].includes(userRole) && (
                      <button
                        onClick={() => setShowLateTimeModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors text-sm font-medium shadow-lg shadow-purple-900/20"
                      >
                        <Clock className="w-4 h-4" /> Set Late Time
                      </button>
                    )}

                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    />



                    {['Admin', 'SuperAdmin'].includes(userRole) && (
                      <button
                        onClick={() => { setImportType('attendance'); setShowImportModal(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors text-sm font-medium shadow-lg shadow-blue-900/20"
                      >
                        <Upload className="w-4 h-4" /> Import CSV
                      </button>
                    )}
                    {['Admin', 'HR', 'SuperAdmin'].includes(userRole) && (
                      <button
                        onClick={() => { setShowHolidayModal(true); fetchHolidays(); }}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
                      >
                        <Calendar className="w-4 h-4" />
                        Holidays
                      </button>
                    )}
                  </div>
                </div>

                {/* Attendance Table */}
                <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider">
                        <tr>
                          <th className="p-4 font-medium border-b border-slate-700">Employee Name</th>
                          <th className="p-4 font-medium border-b border-slate-700">Designation</th>
                          <th className="p-4 font-medium border-b border-slate-700 text-center">Login / Logout</th>
                          <th className="p-4 font-medium border-b border-slate-700 text-center">Late Status</th>
                          <th className="p-4 font-medium border-b border-slate-700 text-center">Status</th>
                          <th className="p-4 font-medium border-b border-slate-700 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {(() => {
                          // 1. Get Unique List of ALL Employees
                          const allStaff = [
                            ...agents.map(a => ({ name: a.name, role: 'Agent', status: a.status, cnic: a.cnic })),
                            ...hrRecords.map(h => ({ name: h.agent_name, role: h.designation || 'Staff', status: h.status, cnic: h.cnic }))
                          ].filter(p => p.status === 'Active')
                            .sort((a, b) => a.name.localeCompare(b.name));

                          let uniqueStaff = Array.from(new Map(allStaff.map(item => [item.name, item])).values());

                          // [NEW] Filter for Agent users - show ONLY their own record
                          if (userRole === 'Agent') {
                            const loggedInCnic = currentUser?.cnic || JSON.parse(localStorage.getItem('ams_user'))?.cnic;
                            uniqueStaff = uniqueStaff.filter(emp => emp.cnic === loggedInCnic);
                          }

                          // --- HELPER: Bulletproof Time Parser ---
                          // Handles "19:00", "07:00 PM", "7:00pm", "19:00:00"
                          const getMinutes = (timeStr) => {
                            if (!timeStr) return 0;

                            // Normalize string (Remove spaces, uppercase)
                            const cleanStr = timeStr.toString().trim().toUpperCase();
                            const isPM = cleanStr.includes('PM');
                            const isAM = cleanStr.includes('AM');

                            // Extract just the numbers (HH:MM)
                            // Remove letters to handle "07:00PM" -> "07:00"
                            const timePart = cleanStr.replace(/[A-Z\s]/g, '');
                            let [h, m] = timePart.split(':').map(Number);

                            if (isNaN(h)) h = 0;
                            if (isNaN(m)) m = 0;

                            // 12-hour to 24-hour conversion
                            if (isPM && h < 12) h += 12;
                            if (isAM && h === 12) h = 0;

                            return h * 60 + m;
                          };

                          return uniqueStaff.map((emp, idx) => {
                            // --- DEBUGGING: Remove this after fixing ---
                            // Check if we can find this employee in the attendance list
                            const found = attendance.find(a => a.agentName?.toString().trim().toLowerCase() === emp.name.toString().trim().toLowerCase());
                            if (!found && idx < 5) {
                              // Log the first few failures to the Console (F12)
                              console.log("FAILED MATCH:", emp.name);
                              console.log("Available Attendance Names:", attendance.map(a => a.agentName));
                            }
                            // ------------------------------------------

                            const record = attendance.find(a =>
                              a.agentName?.toString().trim().toLowerCase() === emp.name.toString().trim().toLowerCase() &&
                              a.date === customStartDate
                            );

                            // --- DISPLAY LOGIC ---
                            const isAbsent = !record || record.status === 'Absent';

                            let timeDisplay;
                            if (isAbsent) {
                              timeDisplay = <span className="text-slate-600 text-xs italic">-- : --</span>;
                            } else {
                              timeDisplay = (
                                <div className="flex flex-col items-center">
                                  <span className="text-white font-mono text-xs">{formatTime(record.loginTime)}</span>
                                  <span className="text-slate-500 font-mono text-[10px]">{formatTime(record.logoutTime)}</span>
                                </div>
                              );
                            }

                            // --- DYNAMIC LATE CALCULATION ---
                            let lateBadge = <span className="text-slate-600 text-xs">-</span>;

                            if (record && !isAbsent && record.loginTime) {
                              let loginMinutes = getMinutes(record.loginTime);
                              // Use the Global 'lateTime' state (e.g. "18:45" or "19:15")
                              // Default fallback is 19:15 (7:15 PM)
                              let cutoffMinutes = getMinutes(lateTime || "19:15");

                              // --- NIGHT SHIFT FIX ---
                              // If Threshold is PM (e.g., 6:45 PM -> 1125 mins)
                              // And Login is AM (e.g., 1:00 AM -> 60 mins)
                              // Treat Login as "Next Day" by adding 24 hours (1440 mins)
                              if (cutoffMinutes > 720 && loginMinutes < 720) {
                                loginMinutes += 1440;
                              }

                              if (loginMinutes > cutoffMinutes) {
                                const diff = loginMinutes - cutoffMinutes;

                                if (diff <= 10) {
                                  // Late <= 10 mins (Grace Period - Yellow)
                                  lateBadge = (
                                    <div className="flex items-center justify-center gap-1 px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded text-[10px] font-bold border border-yellow-500/20 w-fit mx-auto">
                                      <Clock className="w-3 h-3" />
                                      <span>Late ({diff}m)</span>
                                    </div>
                                  );
                                } else {
                                  // Late > 10 mins (Red)
                                  lateBadge = (
                                    <div className="flex items-center justify-center gap-1 px-2 py-1 bg-red-500/10 text-red-400 rounded text-[10px] font-bold border border-red-500/20 w-fit mx-auto">
                                      <AlertTriangle className="w-3 h-3" />
                                      <span>Late ({diff}m)</span>
                                    </div>
                                  );
                                }
                              } else {
                                lateBadge = <span className="text-green-500/50 text-[10px] font-medium tracking-wide">ON TIME</span>;
                              }
                            }

                            // Status Badge
                            let statusBadge;
                            if (isAbsent) {
                              statusBadge = (
                                <div className="flex items-center justify-center gap-1.5 px-2 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 w-fit mx-auto">
                                  <XCircle className="w-3 h-3" />
                                  <span className="text-[10px] font-bold">ABSENT</span>
                                </div>
                              );
                            } else {
                              statusBadge = (
                                <div className="flex items-center justify-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 w-fit mx-auto">
                                  <CheckCircle className="w-3 h-3" />
                                  <span className="text-[10px] font-bold">PRESENT</span>
                                </div>
                              );
                            }

                            return (
                              <tr key={idx} className="hover:bg-slate-700/30 transition-colors border-b border-slate-800 last:border-0">
                                <td className="p-4 text-white font-medium">{emp.name}</td>
                                <td className="p-4 text-slate-400 text-xs">{emp.role}</td>
                                <td className="p-4 text-center">{timeDisplay}</td>
                                <td className="p-4 text-center">{lateBadge}</td>
                                <td className="p-4 text-center">{statusBadge}</td>

                                {/* ACTION BUTTONS */}
                                <td className="p-4">
                                  <div className="flex items-center justify-center gap-2">

                                    {isAbsent && (
                                      <button
                                        onClick={() => handleQuickAttendance(emp.name, 'Present', record?.id)}
                                        className="p-1.5 bg-green-500/10 text-green-400 rounded hover:bg-green-500/20 transition-colors border border-green-500/20"
                                        title="Mark Present (Default Time)"
                                      >
                                        <CheckCircle className="w-4 h-4" />
                                      </button>
                                    )}

                                    {!isAbsent && (
                                      <button
                                        onClick={() => handleQuickAttendance(emp.name, 'Absent', record?.id)}
                                        className="p-1.5 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 transition-colors border border-red-500/20"
                                        title="Mark Absent"
                                      >
                                        <XCircle className="w-4 h-4" />
                                      </button>
                                    )}

                                    {!isAbsent && record && (
                                      <button
                                        onClick={() => { setEditingAttendance(record); setShowEditAttendanceModal(true); }}
                                        className="p-1.5 bg-blue-500/10 text-blue-400 rounded hover:bg-blue-500/30 transition-colors border border-blue-500/20"
                                        title="Manual Edit"
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {attendanceSubTab === 'matrix' && (
              <div className="space-y-6">

{/* [FIXED] Attendance Matrix Header & Action Bar */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-800 p-6 rounded-2xl border border-slate-700 mb-6">
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                      Attendance Matrix
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                      Presence & Late Status for {selectedMonth}
                    </p>
                  </div>

                   {/* RIGHT SIDE: Cycle Dates & Buttons */}
                  <div className="flex flex-col md:flex-row items-center gap-4">
                    
                    {/* Cycle Text */}
                    <div className="text-xs text-slate-500 font-medium bg-slate-900/50 px-3 py-1.5 rounded border border-slate-700/50">
                      Cycle: <span className="text-slate-300">{getPayrollRange(selectedMonth).start.toDateString()} - {getPayrollRange(selectedMonth).end.toDateString()}</span>
                    </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowAddBonus(true)} // [FIXED] Matches your existing state
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-green-900/20"
                    >
                      <Plus className="w-4 h-4" /> Add Bonus
                    </button>
                    <button
                      onClick={() => setShowAddFine(true)} // [FIXED] Matches your existing state
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-red-900/20"
                    >
                      <Plus className="w-4 h-4" /> Add Fine
                    </button>
                  </div>
                  </div>
                </div>

                {/* 1. [NEW] SEARCH & FILTER BAR */}
                <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-600 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input
                      type="text"
                      placeholder="Search agent name..."
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
                    <select value={agentStatusFilter} onChange={(e) => setAgentStatusFilter(e.target.value)} className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="All">All Status</option>
                      <option value="Active">Active</option>
                      <option value="Left">Left / Terminated / Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                  <div className="overflow-auto relative">
                    <table className="w-full text-slate-300 border-collapse table-fixed">

                      {/* --- HEADER --- */}
                      <thead className="sticky top-0 z-40 shadow-md">
                        <tr className="bg-slate-950">
                          <th className="p-3 text-center border-b border-r border-slate-800 sticky left-0 z-50 bg-slate-950 w-12">No.</th>
                          <th className="p-3 text-left border-b border-r border-slate-800 sticky left-12 z-50 bg-slate-950 w-44">Agent Name</th>
                          <th className="p-2 text-center border-b border-slate-800 bg-green-900/20 text-green-400 text-[10px] font-bold w-10" title="Days Present">P</th>
                          <th className="p-2 text-center border-b border-slate-800 bg-yellow-900/20 text-yellow-400 text-[10px] font-bold w-10" title="Days Late">L</th>
                          <th className="p-2 text-center border-b border-r border-slate-800 bg-red-900/20 text-red-400 text-[10px] font-bold w-10" title="Days Absent">A</th>

                          {/* Date Columns */}
                          {getDaysArray(getPayrollRange(selectedMonth).start, getPayrollRange(selectedMonth).end).map(dateStr => {
                            const d = new Date(dateStr);
                            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                            return (
                              <th key={dateStr} className={`p-2 text-center border-b border-slate-800 w-16 ${isWeekend ? 'bg-slate-800' : 'bg-slate-900'}`}>
                                <div className="text-[10px] text-slate-500 uppercase">{d.toLocaleDateString('en-US', { weekday: 'narrow' })}</div>
                                <div className={`text-xs font-bold ${isWeekend ? 'text-slate-500' : 'text-white'}`}>{d.getDate()}</div>
                              </th>
                            );
                          })}
                          <th className="p-3 text-center bg-slate-950 border-b border-l border-slate-800 font-bold text-yellow-400 sticky right-0 z-40 w-20 shadow-[-4px_0_10px_rgba(0,0,0,0.5)]">
                            LATE %
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-800">
                        {(() => {
                          // 1. Setup Dates for Logic
                          const { start, end } = getPayrollRange(selectedMonth);
                          const dateArray = getDaysArray(start, end);

                          // Create Date Objects for Cycle Boundaries
                          const cycleStart = new Date(start); cycleStart.setHours(0, 0, 0, 0);
                          const cycleEnd = new Date(end); cycleEnd.setHours(23, 59, 59, 999); // [NEW] Needed for future check

                          // 2. [UPDATED] FILTERING LOGIC
                          let filteredAgents = agents.filter(a => {
                            // A. Permission: If Agent, only show self
                            if (userRole === 'Agent') {
                              const loggedInCnic = currentUser?.cnic || JSON.parse(localStorage.getItem('ams_user'))?.cnic;
                              if (a.cnic !== loggedInCnic) return false;
                            }

                            // B. Standard Filters
                            const matchesSearch = !searchQuery || (a.name && a.name.toLowerCase().includes(searchQuery.toLowerCase()));
                            const matchesTeam = teamFilter === 'All' || a.team === teamFilter;
                            const matchesCenter = centerFilter === 'All' || a.center === centerFilter;

                            // C. Status Filter
                            const matchesStatus =
                              agentStatusFilter === 'All' ? true :
                                agentStatusFilter === 'Active' ? a.status === 'Active' :
                                  a.status !== 'Active';

                            // Find HR Record (Used for dates)
                            const hrRec = hrRecords.find(h => h.cnic === a.cnic);

                            // D. HIDE OLD INACTIVE AGENTS (Left BEFORE this month)
                            if (['Left', 'Terminated', 'NCNS'].includes(a.status)) {
                              const dateStr = a.leftDate || a.left_date || hrRec?.leftDate || hrRec?.left_date;
                              if (dateStr) {
                                const leaveDate = new Date(dateStr);
                                leaveDate.setHours(0, 0, 0, 0);
                                // If left strictly BEFORE cycle start -> Hide
                                if (leaveDate.getTime() < cycleStart.getTime()) return false;
                              }
                            }

                            // E. [NEW] HIDE FUTURE AGENTS (Joining AFTER this month)
                            const joinStr = hrRec?.joining_date || a.activeDate || a.active_date;
                            if (joinStr) {
                              const joinDate = new Date(joinStr);
                              joinDate.setHours(0, 0, 0, 0);
                              // If joining strictly AFTER cycle end -> Hide
                              if (joinDate.getTime() > cycleEnd.getTime()) return false;
                            }

                            return matchesSearch && matchesTeam && matchesCenter && matchesStatus;
                          });

                          // --- HELPERS (Keep as is) ---
                          const formatTo12Hour = (timeStr) => {
                            if (!timeStr) return '';
                            const [h, m] = timeStr.toString().split(':');
                            if (!h || !m) return timeStr;
                            let hours = parseInt(h);
                            const ampm = hours >= 12 ? 'PM' : 'AM';
                            hours = hours % 12;
                            hours = hours ? hours : 12;
                            return `${hours}:${m} ${ampm}`;
                          };

                          const getLateStatus = (timeStr) => {
                            if (!timeStr) return { isLate: false, color: 'text-green-400' };
                            const [h, m] = timeStr.toString().split(':').map(Number);
                            let loginMins = h * 60 + m;
                            if (h < 12) loginMins += 1440;
                            const shiftStartMins = 19 * 60;
                            const diff = loginMins - shiftStartMins;
                            if (diff <= 0) return { isLate: false, color: 'text-green-400' };
                            else if (diff <= 10) return { isLate: true, color: 'text-yellow-400 font-bold' };
                            else return { isLate: true, color: 'text-red-500 font-bold' };
                          };

                          const uniqueTeams = [...new Set([...teams, ...filteredAgents.map(a => a.team)])].filter(Boolean).sort();

                          return uniqueTeams.map(teamName => {
                            const teamAgents = filteredAgents
                              .filter(a => a.team === teamName)
                              .sort((a, b) => a.name.localeCompare(b.name));

                            if (teamAgents.length === 0) return null;

                            // --- TEAM SUMMARY ---
                           // [UPDATED] Team Total Present (Records + Holidays)
                            const teamTotalPresent = teamAgents.reduce((sum, agent) => {
                              // A. Count Database Presents
                              const recordsCount = attendance.filter(a =>
                                a.agentName?.toString().trim().toLowerCase() === agent.name?.toString().trim().toLowerCase() &&
                                a.status === 'Present'
                              ).length;

                              // B. Count Valid Holidays (that don't have a record)
                              const hrRec = hrRecords.find(h => h.cnic === agent.cnic) || {};
                              const joinDateStr = hrRec.joining_date || agent.activeDate;
                              const jDate = joinDateStr ? new Date(joinDateStr) : null;
                              if (jDate) jDate.setHours(0,0,0,0);

                              let holidayCount = 0;
                              holidays.forEach(h => {
                                if (!dateArray.includes(h.date)) return; // Must be in view
                                if (jDate && new Date(h.date) < jDate) return; // Must be after joining

                                // Only count holiday if they weren't ALREADY marked Present that day
                                const hasRecord = attendance.some(a => 
                                  a.agentName?.toString().trim().toLowerCase() === agent.name?.toString().trim().toLowerCase() &&
                                  a.date === h.date && 
                                  a.status === 'Present'
                                );
                                if (!hasRecord) holidayCount++;
                              });

                              return sum + recordsCount + holidayCount;
                            }, 0);

                            const teamTotalLate = teamAgents.reduce((sum, agent) => {
                              return sum + attendance.filter(a =>
                                a.agentName?.toString().trim().toLowerCase() === agent.name?.toString().trim().toLowerCase() &&
                                getLateStatus(a.loginTime).isLate
                              ).length;
                            }, 0);

                            return (
                              <React.Fragment key={teamName}>
                                {userRole !== 'Agent' && (
                                  <tr className="bg-slate-800/80 sticky top-[53px] z-30">
                                    <td colSpan={2} className="p-2 px-4 border-r border-slate-700 font-black text-blue-400 uppercase tracking-widest text-sm sticky left-0 z-30 bg-slate-800">
                                      {teamName}
                                    </td>
                                    <td className="text-center font-bold text-green-500/50 bg-slate-800 text-[10px]">{teamTotalPresent}</td>
                                    <td className="text-center font-bold text-yellow-500/50 bg-slate-800 text-[10px]">{teamTotalLate}</td>
                                    <td className="text-center bg-slate-800 border-r border-slate-700"></td>
                                    {dateArray.map(d => {
                                      const dailyPresentCount = attendance.filter(a =>
                                        a.date === d &&
                                        a.status === 'Present' &&
                                        teamAgents.some(agent => agent.name === a.agentName)
                                      ).length;
                                      return (
                                        <td key={d} className={`text-center text-[10px] border-b border-slate-700 font-bold ${dailyPresentCount > 0 ? 'text-blue-300 bg-blue-500/10' : 'text-slate-600 bg-slate-800/30'}`}>
                                          {dailyPresentCount > 0 ? dailyPresentCount : '-'}
                                        </td>
                                      );
                                    })}
                                    <td className="text-center font-black text-slate-500 sticky right-0 z-30 bg-slate-800 shadow-[-4px_0_10px_rgba(0,0,0,0.5)]">-</td>
                                  </tr>
                                )}

                                {/* --- AGENT ROWS --- */}
                                {teamAgents.map((agent, idx) => {
                                  const hrRec = hrRecords.find(h => h.cnic === agent.cnic) || {};
                                  const joinDateStr = hrRec.joining_date || agent.activeDate;
                                  const joinDate = joinDateStr ? new Date(joinDateStr) : null;
                                  if (joinDate) joinDate.setHours(0, 0, 0, 0);

                                  // --- AGENT STATS CALCULATION ---
                                  const agentRecs = attendance.filter(a =>
                                    a.agentName?.toString().trim().toLowerCase() === agent.name?.toString().trim().toLowerCase()
                                  );

                                  // 1. Base Present Count (From Scans)
                                  const scannedPresent = agentRecs.filter(a => a.status === 'Present').length;

                                  // 2. Holiday Count (Add 'H' days to Present)
                                  let validHolidays = 0;
                                  holidays.forEach(h => {
                                      // Ensure holiday is in current view
                                      if (!dateArray.includes(h.date)) return;
                                      
                                      // Ensure holiday is NOT before joining
                                      const hDate = new Date(h.date); hDate.setHours(0,0,0,0);
                                      if (joinDate && hDate < joinDate) return;

                                      // Ensure we don't double count if they worked on holiday
                                      const hasScan = agentRecs.some(a => a.date === h.date && a.status === 'Present');
                                      if (!hasScan) {
                                          validHolidays++;
                                      }
                                  });

                                  // [FINAL P COUNT] = Scans + Holidays
                                  const presentCount = scannedPresent + validHolidays;

                                  const lateCount = agentRecs.filter(a =>
                                    a.status === 'Present' &&
                                    getLateStatus(a.loginTime).isLate
                                  ).length;

                                  // Absent Calculation (Remains loop-based for accuracy)
                                  let absentCount = 0;
                                  dateArray.forEach(dStr => {
                                    const dObj = new Date(dStr);
                                    dObj.setHours(0, 0, 0, 0);
                                    if (dObj.getDay() === 0 || dObj.getDay() === 6) return; // Weekend
                                    if (dObj > new Date()) return; // Future
                                    if (joinDate && dObj < joinDate) return; // Before Join

                                    // If no Present record AND no Holiday -> Absent
                                    const isHoliday = holidays.some(h => h.date === dStr);
                                    const hasRec = agentRecs.some(a => a.date === dStr);
                                    
                                    if (!isHoliday && !hasRec) absentCount++;
                                    else if (agentRecs.find(a => a.date === dStr)?.status === 'Absent') absentCount++;
                                  });

                                  const latePercentage = presentCount > 0 ? Math.round((lateCount / presentCount) * 100) : 0;

                                  // Visual for Inactive
                                  const isInactive = agent.status !== 'Active';
                                  const rowClass = isInactive ? 'bg-red-900/10 hover:bg-red-900/20' : 'hover:bg-blue-900/10';
                                  const nameClass = isInactive ? 'text-red-400' : 'text-slate-200';

                                  return (
                                    <tr key={agent.id} className={`${rowClass} transition-colors group`}>
                                      <td className="p-2 text-center border-r border-slate-800 bg-slate-900 text-slate-600 font-mono text-[10px] sticky left-0 z-10 group-hover:text-white">{idx + 1}</td>

                                      <td className="p-2 px-3 font-medium border-r border-slate-800 bg-slate-900 sticky left-12 z-10 truncate text-xs">
                                        <div className={nameClass}>{agent.name}</div>
                                        {/* Status Label */}
                                        {isInactive && (
                                          <div className="text-[9px] text-red-500/80 font-mono mt-0.5 font-bold">
                                            {agent.status.toUpperCase()}: {agent.leftDate || agent.left_date || hrRec.left_date || 'N/A'}
                                          </div>
                                        )}
                                      </td>

                                      <td className="p-1 text-center border-b border-slate-800 text-green-400 font-bold text-[10px]">{presentCount}</td>
                                      <td className="p-1 text-center border-b border-slate-800 text-yellow-400 font-bold text-[10px]">{lateCount}</td>
                                      <td className="p-1 text-center border-b border-r border-slate-800 text-red-400 font-bold text-[10px]">{absentCount}</td>

                                      {dateArray.map(dateStr => {
                                        const currentDate = new Date(dateStr);
                                        currentDate.setHours(0, 0, 0, 0);
                                        const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
                                        const isBeforeJoining = joinDate && currentDate < joinDate;
                                        
                                        // 1. Check for Holiday
                                        const isHoliday = holidays.some(h => h.date === dateStr);
                                        
                                        const record = agentRecs.find(a => a.date === dateStr);

                                        let cellContent = '-';
                                        let cellClass = 'text-slate-700';

                                        if (isBeforeJoining) {
                                          cellContent = '•';
                                          cellClass = 'text-slate-800';
                                        } 
                                        // A. If Record Exists (Present/Late) -> Show Time (Prioritize working over holiday)
                                        else if (record && record.status === 'Present') {
                                            cellContent = formatTo12Hour(record.loginTime) || 'OK';
                                            const status = getLateStatus(record.loginTime);
                                            if (status.isLate) {
                                              cellClass = `bg-slate-800/50 ${status.color} font-mono text-[10px]`;
                                            } else {
                                              cellClass = 'text-green-400 font-mono text-[10px]';
                                            }
                                        } 
                                        // B. If Holiday -> Show 'H' (Overrides Absent/Weekend)
                                        else if (isHoliday) {
                                          cellContent = 'H';
                                          cellClass = 'bg-purple-900/40 text-purple-400 font-bold';
                                        }
                                        // C. If Record is Explicit Absent
                                        else if (record && record.status === 'Absent') {
                                          cellContent = 'A';
                                          cellClass = 'bg-red-500/10 text-red-500 font-bold';
                                        } 
                                        // D. No Record
                                        else {
                                          if (isWeekend) {
                                            cellContent = '';
                                            cellClass = 'bg-slate-800/30';
                                          } else if (currentDate <= new Date()) {
                                            cellContent = 'A';
                                            cellClass = 'text-red-500/50 font-bold';
                                          }
                                        }
                                        
                                        return (
                                          <td key={dateStr} className={`p-1 text-center border-b border-slate-800 text-[11px] ${cellClass}`}>
                                            {cellContent}
                                          </td>
                                        );
                                      })}
                                      <td className={`p-2 text-center font-bold sticky right-0 z-10 bg-slate-900 shadow-[-4px_0_10px_rgba(0,0,0,0.5)] ${latePercentage > 20 ? 'text-red-400' : 'text-slate-400'}`}>
                                        {latePercentage}%
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
                        <tr className="bg-slate-950 border-t-2 border-purple-500 font-black text-white">
                          <td colSpan={2} className="p-3 text-left sticky left-0 bg-slate-950 z-50 uppercase tracking-tighter">Grand Total</td>
                          <td className="text-center text-green-400 bg-slate-950 text-[10px]">
                            {attendance.filter(a => a.status === 'Present').length}
                          </td>
                          <td className="text-center text-yellow-400 bg-slate-950 text-[10px]">
                            {attendance.filter(a => a.late === true).length}
                          </td>
                          <td className="text-center text-red-400 bg-slate-950 border-r border-slate-800 text-[10px]">-</td>
                          {getDaysArray(getPayrollRange(selectedMonth).start, getPayrollRange(selectedMonth).end).map(d => {
                            const dailyTotal = attendance.filter(a => a.date === d && a.status === 'Present').length;
                            return (
                              <td key={d} className="bg-slate-950 text-center text-[10px] font-bold text-slate-500">
                                {dailyTotal > 0 ? dailyTotal : ''}
                              </td>
                            );
                          })}
                          <td className="p-3 text-center text-purple-400 text-lg sticky right-0 bg-slate-950 z-50 shadow-[-4px_0_10px_rgba(0,0,0,0.5)]">-</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}



        {/* Fines Tab */}
        {activeTab === 'fines' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Fines Management</h2>

              <button onClick={() => setShowAddFine(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"><Plus className="w-4 h-4" /> Add Fine</button>

            </div>
            {/* Search ... (Keep existing search div) */}
            <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-600 p-4">
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
                    <th className="text-center py-3 px-4 text-sm font-medium text-slate-200">Actions</th>
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

                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => { setEditingFine(fine); setShowAddFine(true); }} className="p-1.5 bg-blue-500/10 text-blue-400 rounded hover:bg-blue-500/20" title="Edit"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteFine(fine.id)} className="p-1.5 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>

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

              <button onClick={() => setShowAddBonus(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"><Plus className="w-4 h-4" /> Add Bonus</button>

            </div>
            {/* Search ... */}
            <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-600 p-4">
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
                    <th className="text-center py-3 px-4 text-sm font-medium text-slate-200">Actions</th>
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

                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => { setEditingBonus(bonus); setShowAddBonus(true); }} className="p-1.5 bg-blue-500/10 text-blue-400 rounded hover:bg-blue-500/20" title="Edit"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteBonus(bonus.id)} className="p-1.5 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>

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

{/* [FIXED] Payroll Header & Action Bar */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-800 p-6 rounded-2xl border border-slate-700 mb-6">
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                      Agent Payroll
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                      Salary Breakdown for {selectedMonth}
                    </p>
                  </div>

                   {/* RIGHT SIDE: Cycle Dates & Buttons */}
                  <div className="flex flex-col md:flex-row items-center gap-4">
                    
                    {/* Cycle Text */}
                    <div className="text-xs text-slate-500 font-medium bg-slate-900/50 px-3 py-1.5 rounded border border-slate-700/50">
                      Cycle: <span className="text-slate-300">{getPayrollRange(selectedMonth).start.toDateString()} - {getPayrollRange(selectedMonth).end.toDateString()}</span>
                    </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowAddBonus(true)} // [FIXED] Matches your existing state
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-green-900/20"
                    >
                      <Plus className="w-4 h-4" /> Add Bonus
                    </button>
                    <button
                      onClick={() => setShowAddFine(true)} // [FIXED] Matches your existing state
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-red-900/20"
                    >
                      <Plus className="w-4 h-4" /> Add Fine
                    </button>

<button
                onClick={exportToCSV}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-green-900/20"
              >
                <Download className="w-4 h-4" />
                Export to CSV
              </button>

                  </div>
                  </div>
                </div>
                
            {/* SEARCH & FILTER Bar */}
            <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-600 p-4 mb-6">
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
                        <tr
                          key={agent.id}
                          className={`transition-colors border-b border-slate-800 ${['Left', 'Terminated', 'NCNS'].includes(agent.status)
                            ? 'bg-red-900/10 hover:bg-red-900/20'
                            : 'hover:bg-slate-800/50'
                            }`}
                        >
                          <td className="py-3 px-4 text-slate-300">{idx + 1}</td>
                          <td className="py-3 px-4 font-medium text-white">
                            {agent.name}

                            {/* [UPDATED] Dynamic Status Label (Matches Matrix Style) */}
                            {(() => {
                              // Check if agent is inactive
                              const isInactive = ['Left', 'Terminated', 'NCNS'].includes(agent.status);

                              if (isInactive) {
                                // Show RED label with Date for inactive agents
                                return (
                                  <div className="text-[9px] text-red-500 font-mono mt-0.5 font-bold uppercase">
                                    {agent.status}: {agent.leftDate || agent.left_date || 'N/A'}
                                  </div>
                                );
                              }

                              // Show simple GREEN label for active agents
                              return (
                                <div className="text-[10px] text-green-400/60 mt-0.5">
                                  Active
                                </div>
                              );
                            })()}
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
      </div>

      {/* Modals */}
      {/* Add this with the other modals */}
      {/* Modals Section - MUST BE INSIDE THE MAIN DIV */}
      {/* --- INLINE AGENT MODAL (Handles Add & Edit) --- */}
      {(showAddAgent || showEditAgent) && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl overscroll-contain transform-gpu">

            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800">
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
                    <input type="text" value={editingAgent?.password || ''} onChange={e => setEditingAgent({ ...editingAgent, password: e.target.value })} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm outline-none focus:ring-1 focus:ring-blue-500" />
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
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800">
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

                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium">Payroll Cycle</label>
                    <select
                      value={editingHR?.payroll_cycle_type || 'Agent Cycle'}
                      onChange={e => setEditingHR({ ...editingHR, payroll_cycle_type: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="Agent Cycle">Agent Cycle (21st - 20th)</option>
                      <option value="Standard Month">Standard Month (1st - 31st)</option>
                    </select>
                  </div>

                  {/* Designation Input inside showAddEmployee Modal */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium">Designation</label>
                    <input
                      type="text"
                      value={editingHR?.designation || ''} // <--- CHANGE THIS LINE (Remove 'Agent')
                      onChange={e => setEditingHR({ ...editingHR, designation: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>

                  {/* Base Salary */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium">Base Salary (PKR)</label>
                    <input
                      type="text" // Change to text prevents scroll wheel changes
                      inputMode="numeric" // Shows number pad on mobile
                      pattern="[0-9]*"
                      placeholder="Salary in PKR"
                      value={editingHR?.baseSalary || ''}
                      onChange={e => {
                        // Only allow numbers
                        const val = e.target.value;
                        if (/^\d*$/.test(val)) {
                          setEditingHR({ ...editingHR, baseSalary: val });
                        }
                      }}
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
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
              <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
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
                      {/* Options for Manage Access */}
                      <option value="Admin">Admin</option>
                      <option value="QA">QA</option>
                      <option value="HR">HR</option>
                      <option value="IT">IT</option>
                      <option value="TL">TL</option>

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
                      {adminList
                        .filter(admin => {
                          // [FIX] Hide SuperAdmin from everyone else
                          if (admin.role === 'SuperAdmin' && userRole !== 'SuperAdmin') {
                            return false;
                          }
                          return true;
                        })
                        .map((admin) => (
                          <tr key={admin.id} className="hover:bg-slate-800">
                            <td className="px-4 py-3 font-medium text-white">{admin.name}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${admin.role === 'Admin' ?
                                'bg-purple-500/20 text-purple-400' :
                                admin.role === 'HR' ?
                                  'bg-orange-500/20 text-orange-400' :
                                  'bg-blue-500/20 text-blue-400'
                                }`}>
                                {admin.role}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-500 font-mono text-xs">{admin.password}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {/* Edit Password Button */}
                                <button
                                  onClick={() => handleUpdateAdminPassword(admin.id, admin.name)}
                                  className="text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-blue-500/10 transition-colors"
                                  title="Change Password"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>

                                {/* Delete Button - Hidden for 'Admin' and 'SuperAdmin' */}
                                {(admin.name !== 'Admin' && admin.role !== 'SuperAdmin') && (
                                  <button
                                    onClick={() => handleDeleteAdmin(admin.id)}
                                    className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition-colors"
                                    title="Revoke Access"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
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

      {/* =================================================================================
          SEPARATE MODALS FOR MANAGEMENT (To fix Dropdown Issues)
         ================================================================================= */}

      {/* 1. MANAGEMENT FINE MODAL */}
      {showMgmtFine && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-800">
              <h3 className="font-bold text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" /> Add Management Fine
              </h3>
              <button onClick={() => setShowMgmtFine(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveMgmtFine} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Select Employee</label>
                <select name="employeeName" required className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:ring-2 focus:ring-red-500 outline-none">
                  <option value="">-- Choose Employee --</option>
                  {managementEmployees.map((name, idx) => (
                    <option key={idx} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Fine Amount (PKR)</label>
                <input name="amount" type="number" required placeholder="e.g. 1000" className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:ring-2 focus:ring-red-500 outline-none" />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Reason</label>
                <input name="reason" type="text" required placeholder="e.g. Late Arrival" className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:ring-2 focus:ring-red-500 outline-none" />
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowMgmtFine(false)} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-red-900/20 transition-colors">Save Fine</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. MANAGEMENT BONUS MODAL */}
      {showMgmtBonus && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-800">
              <h3 className="font-bold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-500" /> Add Management Bonus
              </h3>
              <button onClick={() => setShowMgmtBonus(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveMgmtBonus} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Select Employee</label>
                <select name="employeeName" required className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:ring-2 focus:ring-green-500 outline-none">
                  <option value="">-- Choose Employee --</option>
                  {managementEmployees.map((name, idx) => (
                    <option key={idx} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Bonus Amount (PKR)</label>
                <input name="amount" type="number" required placeholder="e.g. 5000" className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:ring-2 focus:ring-green-500 outline-none" />
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowMgmtBonus(false)} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-green-900/20 transition-colors">Save Bonus</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================================
          ATTENDANCE EDIT MODAL (Manually Correct Time)
         ================================================================================= */}
      {showEditAttendanceModal && editingAttendance && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" /> Edit Attendance
              </h3>
              <button onClick={() => setShowEditAttendanceModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleUpdateAttendance} className="p-6 space-y-4">

              <div className="text-center mb-4 bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Employee</p>
                <p className="text-lg font-bold text-white">{editingAttendance.agentName}</p>
                <p className="text-xs text-blue-400 font-mono mt-1">{editingAttendance.date}</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Status</label>
                <select
                  name="status"
                  defaultValue={editingAttendance.status}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  onChange={(e) => {
                    // Visual Helper: If they select Absent, clear the inputs locally
                    if (e.target.value === 'Absent') {
                      document.getElementsByName('loginTime')[0].value = '';
                      document.getElementsByName('logoutTime')[0].value = '';
                    } else if (e.target.value === 'Present' && !document.getElementsByName('loginTime')[0].value) {
                      document.getElementsByName('loginTime')[0].value = '19:00';
                      document.getElementsByName('logoutTime')[0].value = '05:00';
                    }
                  }}
                >
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Half Day">Half Day</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Login Time</label>
                  <input
                    name="loginTime"
                    type="time"
                    defaultValue={editingAttendance.loginTime}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Logout Time</label>
                  <input
                    name="logoutTime"
                    type="time"
                    defaultValue={editingAttendance.logoutTime}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowEditAttendanceModal(false)} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-900/20 transition-colors">Update Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- HOLIDAY MANAGEMENT MODAL --- */}
      {showHolidayModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-800 rounded-xl max-w-lg w-full border border-slate-700 shadow-2xl">

            {/* Header */}
            <div className="p-6 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                Manage Holidays
              </h2>
              <button onClick={() => setShowHolidayModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">

              {/* Add New Form */}
              <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 space-y-4">
                <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">Add New Holiday</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Date</label>
                    <input
                      type="date"
                      value={newHoliday.date}
                      onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Holiday Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Eid-ul-Fitr"
                      value={newHoliday.name}
                      onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddHoliday}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded font-medium transition-colors"
                >
                  Add Holiday
                </button>
              </div>

              {/* List of Existing Holidays */}
              {/* List of Holidays (Filtered by Selected Month) */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider mb-2">
                  Holidays ({selectedMonth})
                </h3>
                
                {(() => {
                   // Filter logic
                   const { start, end } = getPayrollRange(selectedMonth);
                   const currentMonthHolidays = holidays.filter(h => h.date >= start && h.date <= end);

                   if (currentMonthHolidays.length === 0) {
                     return <p className="text-slate-500 text-sm italic">No holidays in this month.</p>;
                   }

                   return currentMonthHolidays.map((h) => (
                    <div key={h.id} className="flex justify-between items-center bg-slate-700/50 p-3 rounded border border-slate-700">
                      <div>
                        <div className="text-white font-medium">{h.name}</div>
                        <div className="text-xs text-slate-400">{new Date(h.date).toLocaleDateString()}</div>
                      </div>
                      <button
                        onClick={() => handleDeleteHoliday(h.id)}
                        className="text-red-400 hover:text-red-300 p-2 hover:bg-red-500/10 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ));
                })()}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* --- [NEW] LEAVE / TERMINATION MODAL --- */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl max-w-md w-full border border-slate-700 shadow-2xl p-6">

            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <UserX className="text-red-400" />
              Mark Employee as Left
            </h3>

            <p className="text-slate-400 mb-6">
              Update status for <span className="text-white font-bold">{leaveForm.name}</span>.
            </p>

            <div className="space-y-4">

              {/* 1. Select Status */}
              <div>
                <label className="block text-xs text-slate-500 uppercase font-bold mb-2">Select Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Left', 'Terminated', 'NCNS'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setLeaveForm({ ...leaveForm, status })}
                      className={`px-3 py-2 rounded text-sm font-medium border transition-colors ${leaveForm.status === status
                        ? 'bg-red-600 border-red-500 text-white'
                        : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                        }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Select Date */}
              <div>
                <label className="block text-xs text-slate-500 uppercase font-bold mb-2">Exit Date</label>
                <input
                  type="date"
                  value={leaveForm.date}
                  onChange={(e) => setLeaveForm({ ...leaveForm, date: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  * You can select a past date.
                </p>
              </div>

            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowLeaveModal(false)}
                className="flex-1 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmAgentLeave}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium shadow-lg shadow-red-900/20"
              >
                Confirm Update
              </button>
            </div>

          </div>
        </div>
      )}

    </div> // <--- THIS must be the very last line before );
  );
};

export default AgentPayrollSystem;

// Editing Payroll tab Status