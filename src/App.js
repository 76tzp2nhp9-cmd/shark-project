import { useEffect } from 'react'; 
import { supabase } from './supabaseClient'; 
import React, { useState, useMemo } from 'react';
import { Users, DollarSign, Calendar, AlertCircle, TrendingUp, Download, Plus, Check, X, Upload, LogOut, Lock, Briefcase } from 'lucide-react';
import * as XLSX from 'xlsx';

// Sample Data (Kept for reference as requested)
const initialAgents = [];
const initialSales = [];
const initialAttendance = [];
const initialFines = [];
const initialBonuses = [];

// HELPER: Calculate the 21st-20th Date Range
const getPayrollRange = (monthStr) => {
  if(!monthStr) return { start: new Date(), end: new Date() };
  
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const [mStr, yStr] = monthStr.split(' ');
  const monthIndex = months.indexOf(mStr);
  const year = parseInt(yStr);

  let startYear = year;
  let startMonth = monthIndex - 1;
  
  if (startMonth < 0) {
    startMonth = 11;
    startYear = year - 1;
  }

  // [FIX] Set hours to 12 (Noon) to avoid timezone shifts
  const startDate = new Date(startYear, startMonth, 21, 12, 0, 0); 
  const endDate = new Date(year, monthIndex, 20, 12, 0, 0);        
  
  return { 
    start: startDate, 
    end: endDate,
    includes: (dateStr) => {
      const d = new Date(dateStr);
      // Reset comparison date to noon as well to match range
      d.setHours(12, 0, 0, 0);
      return d >= startDate && d <= endDate;
    }
  };
};

// [FIXED] HELPER: Generate dates strictly based on Local Time
const getDaysArray = (start, end) => {
  let arr = [];
  for(let dt=new Date(start); dt<=end; dt.setDate(dt.getDate()+1)){
      // [FIX] Construct string manually YYYY-MM-DD using local time
      // This prevents .toISOString() from converting to UTC and shifting the day back
      const year = dt.getFullYear();
      const month = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      arr.push(`${year}-${month}-${day}`);
  }
  return arr;
};

const AgentPayrollSystem = () => {
  // Login States
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [loginData, setLoginData] = useState({ name: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // App States
  const [activeTab, setActiveTab] = useState('dashboard');
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
  
  const [lateTime, setLateTime] = useState('19:00');

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
   
  // [NEW] HR Modal State
  const [showAddEmployee, setShowAddEmployee] = useState(false);
    
  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [shiftFilter, setShiftFilter] = useState('All');
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
    setShiftFilter('All');
    // [FIX] Clear session
    localStorage.removeItem('ams_user');
    localStorage.removeItem('ams_role');
  };

  // Filtered data based on search and filters
    const filteredAgents = useMemo(() => {
    let result = userRole === 'Agent' 
      ? agents.filter(a => a.name === currentUser?.name)
      : agents;

    return result.filter(agent => {
      const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTeam = teamFilter === 'All' || teamFilter === 'All Teams' || agent.team === teamFilter;
      const matchesStatus = statusFilter === 'All' || statusFilter === 'All Status' || agent.status === statusFilter;
      const matchesShift = shiftFilter === 'All' || shiftFilter === 'All Shifts' || agent.shift === shiftFilter;
      return matchesSearch && matchesTeam && matchesStatus && matchesShift;
    });
  }, [agents, searchQuery, teamFilter, statusFilter, shiftFilter, userRole, currentUser]);
// --- UPDATED CALCULATIONS (Uses 21st-20th Logic) ---
  const dateRange = useMemo(() => getPayrollRange(selectedMonth), [selectedMonth]);

// [FIXED] Monthly Matrix Calculation
  const monthlyStats = useMemo(() => {
    const filteredAgentsList = userRole === 'Agent' 
      ? agents.filter(a => a.name === currentUser?.name)
      : agents;

    const agentStats = filteredAgentsList.map(agent => {
      // [FIX] Count as Sale if status is 'Sale' OR disposition matches
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
        totalRevenue,
        totalFines: agentFines,
        totalBonuses: agentBonuses,
        netSalary
      };
    });
    
    return agentStats.sort((a, b) => b.totalSales - a.totalSales);
  }, [agents, sales, fines, bonuses, selectedMonth, dateRange, userRole, currentUser]);

  // Dashboard Stats
// [FIXED] Dashboard Stats Calculation
  const dashboardStats = useMemo(() => {
    const relevantAgents = userRole === 'Agent' ? 1 : agents.filter(a => a.status === 'Active').length;
    
    const relevantSales = userRole === 'Agent' 
      ? sales.filter(s => 
          s.agentName === currentUser?.name && 
          (s.status === 'Sale' || s.disposition === 'HW- Xfer' || s.disposition === 'HW-IBXfer') && 
          dateRange.includes(s.date)
        )
      : sales.filter(s => 
          (s.status === 'Sale' || s.disposition === 'HW- Xfer' || s.disposition === 'HW-IBXfer') && 
          dateRange.includes(s.date)
        );

    const totalSalesCount = relevantSales.length;
    const totalRevenue = relevantSales.reduce((sum, s) => sum + (s.amount || 0), 0);
    const totalPayroll = monthlyStats.filter(a => a.status === 'Active').reduce((sum, a) => sum + a.netSalary, 0);
    
    return { totalAgents: relevantAgents, totalSalesCount, totalRevenue, totalPayroll };
  }, [agents, sales, monthlyStats, dateRange, userRole, currentUser]);

  const filteredSales = useMemo(() => {
    let result = userRole === 'Agent'
      ? sales.filter(s => s.agentName === currentUser?.name)
      : sales;

    return result.filter(sale => {
      const matchesSearch = sale.agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            sale.campaignType?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesMonth = sale.month === selectedMonth;
      const matchesStatus = statusFilter === 'All' || statusFilter === 'All Status' || sale.status === statusFilter;
      return matchesSearch && matchesMonth && matchesStatus;
    });
  }, [sales, searchQuery, selectedMonth, statusFilter, userRole, currentUser]);

  const filteredAttendance = useMemo(() => {
    let result = userRole === 'Agent'
      ? attendance.filter(a => a.agentName === currentUser?.name)
      : attendance;

    return result.filter(record => {
      const matchesSearch = record.agentName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [attendance, searchQuery, userRole, currentUser]);

  const filteredFines = useMemo(() => {
    return fines.filter(fine => {
      const matchesSearch = fine.agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            fine.reason.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesMonth = fine.month === selectedMonth;
      return matchesSearch && matchesMonth;
    });
  }, [fines, searchQuery, selectedMonth]);

  const filteredBonuses = useMemo(() => {
    return bonuses.filter(bonus => {
      const matchesSearch = bonus.agentName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesMonth = bonus.month === selectedMonth;
      return matchesSearch && matchesMonth;
    });
  }, [bonuses, searchQuery, selectedMonth]);

  // [NEW] HR Filters
  const filteredHR = useMemo(() => {
    return hrRecords.filter(rec => 
      rec.agent_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      rec.designation.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [hrRecords, searchQuery]);


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
            shift: values[2],
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

      // --- IMPORT SALES (UPDATED STATUS LOGIC) ---
      } else if (importType === 'sales') {
        const newSales = lines.slice(1).map((line, idx) => {
          const values = line.split(',').map(v => v.trim());
          if(!values[1]) return null; 
          
          // Capture Disposition explicitly to check it
          const disposition = values[12] ? values[12].trim() : '';

          return {
            timestamp: values[0] || new Date().toISOString(), 
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
            
            // [FIX] Strict check for Sale status
            status: (disposition === 'HW- Xfer' || disposition === 'HW-IBXfer') ? 'Sale' : 'Unsuccessful',
            
            date: new Date().toISOString().split('T')[0], 
            month: selectedMonth
          };
        }).filter(Boolean);

        const { data, error } = await supabase.from('sales').insert(newSales).select();
        if(!error) setSales([...sales, ...data]);
        else alert('Sales Import Failed: ' + error.message);

      // --- IMPORT ATTENDANCE ---
      } else if (importType === 'attendance') {
         const rows = lines.map(line => line.split(',').map(v => v.trim()));
         const dataRows = rows.slice(1);
         const dateMap = {};
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
         const { data, error } = await supabase.from('attendance').insert(newAttendance).select();
         if(!error) { setAttendance([...attendance, ...data]); alert("Success! Attendance imported."); } 
         else { alert('Attendance Import Failed: ' + error.message); }
      }
      setShowImportModal(false);
    };
    if (file.name.endsWith('.csv')) { reader.readAsText(file); } 
    else { reader.readAsArrayBuffer(file); }
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

  // Helper: Convert 24h time (18:21) to 12h format (6:21 PM) for display
  const formatTime = (timeStr) => {
    if (!timeStr) return '-';
    const [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12; // the hour '0' should be '12'
    return `${h}:${minutes} ${ampm}`;
  };

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
                    setShiftFilter('All');
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
                    {monthlyStats.slice(0, userRole === 'Agent' ? 1 : 10).map((agent, idx) => (
                      <tr key={agent.id} className="border-b border-slate-700 hover:bg-slate-700">
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
        {activeTab === 'hr' && (
           <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-white">HR - Employment Data</h2>
                <button onClick={() => setShowAddEmployee(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                   <Plus className="w-4 h-4" /> Add Employee
                </button>
             </div>
             
             {/* HR Search */}
             <div className="bg-slate-800/50 rounded-xl shadow-sm border border-slate-600 p-4">
                <input type="text" placeholder="Search employee..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 placeholder-slate-400 w-full" />
             </div>

             <div className="bg-slate-800/80 rounded-xl shadow-sm border border-slate-600 overflow-hidden">
                <table className="w-full text-left">
                   <thead className="bg-slate-900">
                      <tr>
                          <th className="py-3 px-4 text-sm font-medium text-slate-200">Name</th>
                          <th className="py-3 px-4 text-sm font-medium text-slate-200">Designation</th>
                          <th className="py-3 px-4 text-sm font-medium text-slate-200">CNIC</th>
                          <th className="py-3 px-4 text-sm font-medium text-slate-200">Joining Date</th>
                          <th className="py-3 px-4 text-sm font-medium text-slate-200">Bank Details</th>
                          <th className="py-3 px-4 text-sm font-medium text-slate-200">Status</th>
                      </tr>
                   </thead>
                   <tbody>
                      {filteredHR.map((rec) => (
                         <tr key={rec.id} className="border-b border-slate-700 hover:bg-slate-700">
                            <td className="py-3 px-4 text-white font-medium">{rec.agent_name}</td>
                            <td className="py-3 px-4 text-slate-300">{rec.designation}</td>
                            <td className="py-3 px-4 text-slate-300">{rec.cnic}</td>
                            <td className="py-3 px-4 text-slate-300">{rec.joining_date}</td>
                            <td className="py-3 px-4 text-slate-300 text-xs">{rec.bank_name}<br/>{rec.account_number}</td>
                            <td className="py-3 px-4"><span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">{rec.status}</span></td>
                         </tr>
                      ))}
                      {filteredHR.length === 0 && <tr><td colSpan="6" className="p-4 text-center text-slate-500">No records found</td></tr>}
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
                <select
                  value={shiftFilter}
                  onChange={(e) => setShiftFilter(e.target.value)}
                  className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>All Shifts</option>
                  <option>Morning</option>
                  <option>Evening</option>
                  <option>Night</option>
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

            <div className="bg-slate-800/80 rounded-xl shadow-sm border border-slate-600 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-900">
  <tr>
    <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">No.</th>
    <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">Name</th>
    <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">Team</th>
    <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">Shift</th>
    <th className="text-right py-3 px-4 text-sm font-medium text-slate-200">Base Salary</th>
    <th className="text-center py-3 px-4 text-sm font-medium text-slate-200">Status</th>
    <th className="text-center py-3 px-4 text-sm font-medium text-slate-200">Active Date</th>
    <th className="text-center py-3 px-4 text-sm font-medium text-slate-200">Left Date</th>
    {userRole === 'Admin' && (
      <th className="text-center py-3 px-4 text-sm font-medium text-slate-200">Actions</th>
    )}
  </tr>
</thead>
      {/* Change key={agent.id} to key={agent.cnic} */}
<tbody>
  {filteredAgents.map((agent, idx) => (
    // [FIX] Using CNIC as key since ID was removed
    <tr key={agent.cnic || idx} className="border-b border-slate-700 hover:bg-slate-700">
      
      {/* 1. Number Column */}
      <td className="py-3 px-4 text-slate-300">{idx + 1}</td>
      
      {/* 2. Name Column (This was missing) */}
      <td className="py-3 px-4 font-medium text-white">{agent.name}</td>
      
      {/* 3. Team Column (This was missing) */}
      <td className="py-3 px-4 text-slate-300">{agent.team}</td>
      
      {/* 4. Shift Column (This was missing) */}
      <td className="py-3 px-4 text-slate-300">{agent.shift}</td>
      
      {/* 5. Base Salary Column (This was missing) */}
      <td className="py-3 px-4 text-right text-slate-100">
        {agent.baseSalary ? agent.baseSalary.toLocaleString() : 0} PKR
      </td>
      
      {/* 6. Status Column (This was missing) */}
      <td className="py-3 px-4 text-center">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          agent.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {agent.status}
        </span>
      </td>
      
      {/* 7. Active Date (This was missing) */}
      <td className="py-3 px-4 text-center text-slate-100">
        {agent.activeDate || '-'}
      </td>
      
      {/* 8. Left Date (This was missing) */}
      <td className="py-3 px-4 text-center text-slate-100">
        {agent.leftDate || '-'}
      </td>

      {/* 9. Actions Column (Updated to use CNIC) */}
      {userRole === 'Admin' && (
        <td className="py-3 px-4">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setEditingAgent(agent);
                setShowEditAgent(true);
              }}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-xs font-medium transition-colors"
            >
              Edit
            </button>
            
            {agent.status === 'Active' ? (
              <button
                // [FIX] Using agent.cnic instead of agent.id
                onClick={() => handleMarkAsLeft(agent.cnic)} 
                className="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 text-xs font-medium transition-colors"
              >
                Mark Left
              </button>
            ) : (
              <button
                onClick={() => handleReactivateAgent(agent.cnic)}
                className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-xs font-medium transition-colors"
              >
                Reactivate
              </button>
            )}
            
            <button
              onClick={() => handleDeleteAgent(agent.cnic)}
              className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-xs font-medium transition-colors"
            >
              Delete
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
                    {(userRole === 'Admin' || userRole === 'QA') && (
                      <th className="text-center py-3 px-2 text-xs font-medium text-slate-200">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map(sale => (
                    <tr key={sale.id} className="border-b border-slate-700 hover:bg-slate-700">
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
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Attendance Records</h2>
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

            {/* Search */}
            <div className="bg-slate-800/50 rounded-xl shadow-sm border border-slate-600 p-4">
              <input
                type="text"
                placeholder="Search by agent name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-white placeholder-slate-400"
              />
            </div>

            <div className="bg-slate-800/80 rounded-xl shadow-sm border border-slate-600 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">Agent</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">Login</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">Logout</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-slate-200">Status</th>
<th className="text-center py-3 px-4 text-sm font-medium text-slate-200">Late</th>
                  </tr>
                </thead>
              <tbody>
                  {filteredAttendance.map(record => (
                    <tr key={record.id} className="border-b border-slate-700 hover:bg-slate-700">
                      <td className="py-3 px-4 text-slate-300">{record.date}</td>
                      <td className="py-3 px-4 font-medium text-white">{record.agentName}</td>
                      
                      {/* [FIX] Use formatTime to show AM/PM */}
                      <td className="py-3 px-4 text-slate-300">{formatTime(record.loginTime)}</td>
                      <td className="py-3 px-4 text-slate-300">{formatTime(record.logoutTime)}</td>
                      
                      <td className="py-3 px-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          record.status === 'Present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {record.late && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                            Late
                          </span>
                        )}
                      </td>
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
                <button
                  onClick={() => setShowAddFine(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Fine
                </button>
              )}
            </div>

            {/* Search */}
            <div className="bg-slate-800/50 rounded-xl shadow-sm border border-slate-600 p-4">
              <input
                type="text"
                placeholder="Search by agent or reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-white placeholder-slate-400"
              />
            </div>

            <div className="bg-slate-800/80 rounded-xl shadow-sm border border-slate-600 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">Agent</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">Reason</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-200">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFines.map(fine => (
                    <tr key={fine.id} className="border-b border-slate-700 hover:bg-slate-700">
                      <td className="py-3 px-4 text-slate-300">{fine.date}</td>
                      <td className="py-3 px-4 font-medium text-white">{fine.agentName}</td>
                      <td className="py-3 px-4 text-slate-300">{fine.reason}</td>
                      <td className="py-3 px-4 text-right font-semibold text-red-600">{fine.amount.toLocaleString()} PKR</td>
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
                <button
                  onClick={() => setShowAddBonus(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Bonus
                </button>
              )}
            </div>

            {/* Search */}
            <div className="bg-slate-800/50 rounded-xl shadow-sm border border-slate-600 p-4">
              <input
                type="text"
                placeholder="Search by agent name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-white placeholder-slate-400"
              />
            </div>

            <div className="bg-slate-800/80 rounded-xl shadow-sm border border-slate-600 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">Agent</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">Period</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">Type</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-200">Target</th>
<th className="text-right py-3 px-4 text-sm font-medium text-slate-200">Actual</th>
<th className="text-right py-3 px-4 text-sm font-medium text-slate-200">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBonuses.map(bonus => (
                    <tr key={bonus.id} className="border-b border-slate-700 hover:bg-slate-700">
                      <td className="py-3 px-4 font-medium text-white">{bonus.agentName}</td>
                      <td className="py-3 px-4 text-slate-300">{bonus.period}</td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          bonus.type === 'Weekly' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {bonus.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-100">{bonus.targetSales}</td>
<td className="py-3 px-4 text-right font-semibold text-green-400">{bonus.actualSales}</td>
                      <td className="py-3 px-4 text-right font-semibold text-green-400">{bonus.amount.toLocaleString()} PKR</td>
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
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-200">Agent</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-200">Base Salary</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-200">Sales</th>
<th className="text-right py-3 px-4 text-sm font-medium text-slate-200">Bonus</th>
<th className="text-right py-3 px-4 text-sm font-medium text-slate-200">Fines</th>
<th className="text-right py-3 px-4 text-sm font-medium text-slate-200 bg-slate-900">Net Salary</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyStats.map(agent => (
                    <tr key={agent.id} className="border-b border-slate-700 hover:bg-slate-700">
                      <td className="py-3 px-4 font-medium text-white">{agent.name}</td>
                      <td className="py-3 px-4 text-right text-slate-100">{agent.baseSalary.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-semibold text-green-600">{agent.totalSales}</td>
                      <td className="py-3 px-4 text-right text-green-600">+{agent.totalBonuses.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-red-600">-{agent.totalFines.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-bold text-blue-400 bg-slate-900">{agent.netSalary.toLocaleString()} PKR</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-900 font-semibold border-t-2 border-slate-600">
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
                      <th className="p-3 text-left bg-slate-900 border-b border-r border-slate-700 sticky left-0 z-10 min-w-[150px]">Agent Name</th>
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
                    {agents.filter(a => a.status === 'Active').map(agent => {
                      const agentSales = sales.filter(s => 
  s.agentName === agent.name && 
  (s.status === 'Sale' || s.disposition === 'HW- Xfer' || s.disposition === 'HW-IBXfer')
);
                      let rowTotal = 0;
                      
                      return (
                        <tr key={agent.id} className="hover:bg-slate-700">
                          <td className="p-3 font-medium text-white border-r border-slate-700 bg-slate-800 sticky left-0">{agent.name}</td>
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
      {showAddAgent && <AgentModal onClose={() => setShowAddAgent(false)} onSubmit={handleAddAgent} />}
      {showEditAgent && <AgentModal onClose={() => { setShowEditAgent(false); setEditingAgent(null); }} onSubmit={handleEditAgent} agent={editingAgent} isEdit={true} />}
      {showAddSale && <SaleModal agents={agents} currentUser={currentUser} userRole={userRole} onClose={() => setShowAddSale(false)} onSubmit={handleAddSale} />}
      {editSale && <SaleModal agents={agents} currentUser={currentUser} userRole={userRole} onClose={() => setEditSale(null)} onSubmit={handleEditSale} sale={editSale} isEdit={true} />}
      {showAddFine && <FineModal agents={agents} onClose={() => setShowAddFine(false)} onSubmit={handleAddFine} />}
      {showAddBonus && <BonusModal agents={agents} onClose={() => setShowAddBonus(false)} onSubmit={handleAddBonus} />}
      {showImportModal && <ImportModal importType={importType} onClose={() => setShowImportModal(false)} onImport={handleImport} setLateTime={setLateTime} />}
      {showAddEmployee && <HREmployeeModal agents={agents} onClose={() => setShowAddEmployee(false)} onSubmit={handleAddEmployee} />}
    </div>
  );
};

// Import Modal
const ImportModal = ({ importType, onClose, onImport, setLateTime }) => {
  const [lateTimeInput, setLateTimeInput] = useState('09:30');
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

// Stat Card Component
const StatCard = ({ icon, label, value, color }) => {
  const colors = { blue: 'bg-blue-500', green: 'bg-green-500', purple: 'bg-purple-500', orange: 'bg-orange-500' };
  return (
    <div className="bg-slate-800/50 rounded-xl shadow-sm border border-slate-600 p-4">
      <div className="flex items-center gap-4">
        <div className={`${colors[color]} text-white p-3 rounded-lg`}>{icon}</div>
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
      </div>
    </div>
  );
};

// Agent Modal
const AgentModal = ({ onClose, onSubmit, agent = null, isEdit = false }) => {
  const [formData, setFormData] = useState({
    name: agent?.name || '', 
    password: agent?.password || '123', 
    team: agent?.team || 'Team A',
    shift: agent?.shift || 'Morning', 
    baseSalary: agent?.baseSalary || 40000,
    cnic: agent?.cnic || '', // [ADDED] CNIC Field
    activeDate: agent?.activeDate || new Date().toISOString().split('T')[0], 
    leftDate: agent?.leftDate || null,
    status: agent?.status || 'Active'
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold text-slate-800 mb-4">{isEdit ? 'Edit Agent' : 'Add New Agent'}</h3>
        <div className="space-y-4">
          <input type="text" placeholder="Agent Name" className="w-full px-4 py-2 border border-slate-300 rounded-lg" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          <input type="text" placeholder="Password (default: 123)" className="w-full px-4 py-2 border border-slate-300 rounded-lg" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
          
          {/* [ADDED] CNIC Input */}
          <input type="text" placeholder="CNIC (Required)" className="w-full px-4 py-2 border border-slate-300 rounded-lg" value={formData.cnic} onChange={(e) => setFormData({ ...formData, cnic: e.target.value })} />

          <select className="w-full px-4 py-2 border border-slate-300 rounded-lg" value={formData.team} onChange={(e) => setFormData({ ...formData, team: e.target.value })}>
            <option>Team A</option><option>Team B</option><option>Team C</option>
          </select>
          <select className="w-full px-4 py-2 border border-slate-300 rounded-lg" value={formData.shift} onChange={(e) => setFormData({ ...formData, shift: e.target.value })}>
            <option>Morning</option><option>Evening</option><option>Night</option>
          </select>
          <input type="number" placeholder="Base Salary" className="w-full px-4 py-2 border border-slate-300 rounded-lg" value={formData.baseSalary} onChange={(e) => setFormData({ ...formData, baseSalary: parseInt(e.target.value) })} />
          {isEdit && (
            <>
              <div><label className="block text-sm font-medium text-slate-700 mb-2">Active Date</label><input type="date" className="w-full px-4 py-2 border border-slate-300 rounded-lg" value={formData.activeDate} onChange={(e) => setFormData({ ...formData, activeDate: e.target.value })} /></div>
              {formData.status === 'Left' && (
                <div><label className="block text-sm font-medium text-slate-700 mb-2">Left Date</label><input type="date" className="w-full px-4 py-2 border border-slate-300 rounded-lg" value={formData.leftDate || ''} onChange={(e) => setFormData({ ...formData, leftDate: e.target.value })} /></div>
              )}
            </>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => onSubmit(formData)} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{isEdit ? 'Update Agent' : 'Add Agent'}</button>
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700 font-medium">Cancel</button>
        </div>
      </div>
    </div>
  );
};

// Sale Modal
const SaleModal = ({ agents, currentUser, userRole, onClose, onSubmit, sale = null, isEdit = false }) => {
  const [formData, setFormData] = useState({
    agentName: sale?.agentName || (userRole === 'Agent' ? currentUser?.name : agents[0]?.name || ''),
    customerName: sale?.customerName || '', phoneNumber: sale?.phoneNumber || '', state: sale?.state || '', zip: sale?.zip || '', address: sale?.address || '',
    campaignType: sale?.campaignType || 'Campaign A', center: sale?.center || '', teamLead: sale?.teamLead || '', comments: sale?.comments || '',
    listId: sale?.listId || '', amount: sale?.amount || 0, disposition: sale?.disposition || 'HW- Xfer', duration: sale?.duration || '',
    xferTime: sale?.xferTime || '', xferAttempts: sale?.xferAttempts || '', feedbackBeforeXfer: sale?.feedbackBeforeXfer || '',
    feedbackAfterXfer: sale?.feedbackAfterXfer || '', grading: sale?.grading || '', dockDetails: sale?.dockDetails || '', evaluator: sale?.evaluator || ''
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md max-h-[90vh] flex flex-col">
        <h3 className="text-xl font-semibold text-slate-800 mb-4">{isEdit ? 'Edit Sale' : 'Submit New Sale'}</h3>
        <div className="space-y-4 overflow-y-auto flex-1">
          <select className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400" value={formData.agentName} onChange={(e) => setFormData({ ...formData, agentName: e.target.value })} disabled={userRole === 'Agent'}>
            {userRole === 'Agent' ? <option>{currentUser?.name}</option> : agents.map(a => <option key={a.id}>{a.name}</option>)}
          </select>
          <input type="text" placeholder="Customer Name" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.customerName} onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} />
          <input type="text" placeholder="Phone Number" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} />
          <input type="text" placeholder="State" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
          <input type="text" placeholder="Zip" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.zip} onChange={(e) => setFormData({ ...formData, zip: e.target.value })} />
          <input type="text" placeholder="Address" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
          <select className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.campaignType} onChange={(e) => setFormData({ ...formData, campaignType: e.target.value })}>
            <option>Campaign A</option><option>Campaign B</option><option>Campaign C</option>
          </select>
          <input type="text" placeholder="Center" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.center} onChange={(e) => setFormData({ ...formData, center: e.target.value })} />
          <input type="text" placeholder="Team Lead" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.teamLead} onChange={(e) => setFormData({ ...formData, teamLead: e.target.value })} />
          <textarea placeholder="Comments" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.comments} onChange={(e) => setFormData({ ...formData, comments: e.target.value })} rows={3} />
          <input type="text" placeholder="List ID" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.listId} onChange={(e) => setFormData({ ...formData, listId: e.target.value })} />
          {isEdit && (
            <>
              <input type="text" placeholder="Disposition" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.disposition} onChange={(e) => setFormData({ ...formData, disposition: e.target.value })} />
              <input type="text" placeholder="Duration" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} />
              <input type="text" placeholder="Xfer Time" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.xferTime} onChange={(e) => setFormData({ ...formData, xferTime: e.target.value })} />
              <input type="text" placeholder="Xfer Attempts" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.xferAttempts} onChange={(e) => setFormData({ ...formData, xferAttempts: e.target.value })} />
              <textarea placeholder="Feedback (Before Xfer)" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.feedbackBeforeXfer} onChange={(e) => setFormData({ ...formData, feedbackBeforeXfer: e.target.value })} rows={2} />
              <textarea placeholder="Feedback (After Xfer)" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.feedbackAfterXfer} onChange={(e) => setFormData({ ...formData, feedbackAfterXfer: e.target.value })} rows={2} />
              <input type="text" placeholder="Grading" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.grading} onChange={(e) => setFormData({ ...formData, grading: e.target.value })} />
              <input type="text" placeholder="Dock Details" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.dockDetails} onChange={(e) => setFormData({ ...formData, dockDetails: e.target.value })} />
              <input type="text" placeholder="Evaluator" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.evaluator} onChange={(e) => setFormData({ ...formData, evaluator: e.target.value })} />
              <input type="number" placeholder="Amount" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) })} />
            </>
          )}
          <select className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.disposition} onChange={(e) => setFormData({ ...formData, disposition: e.target.value })}>
            <option>HW- Xfer</option><option>HW-IBXfer</option><option>Unsuccessful</option><option>HUWT</option><option>DNC</option><option>DNQ</option><option>DNQ-Dup</option><option>HW-Xfer-CDR</option><option>DNQ-Webform</option><option>Review Pending</option>
          </select>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => onSubmit(formData)} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{isEdit ? 'Update Sale' : 'Submit Sale'}</button>
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700 font-medium">Cancel</button>
        </div>
      </div>
    </div>
  );
};

// Fine Modal
const FineModal = ({ agents, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({ agentName: agents[0]?.name || '', reason: '', amount: 500 });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h3 className="text-xl font-semibold text-slate-800 mb-4">Add Fine</h3>
        <div className="space-y-4">
          <select className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.agentName} onChange={(e) => setFormData({ ...formData, agentName: e.target.value })}>
            {agents.map(a => <option key={a.id}>{a.name}</option>)}
          </select>
          <input type="text" placeholder="Reason" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} />
          <input type="number" placeholder="Amount" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) })} />
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => onSubmit(formData)} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Add Fine</button>
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700 font-medium">Cancel</button>
        </div>
      </div>
    </div>
  );
};

// Bonus Modal
const BonusModal = ({ agents, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({ agentName: agents[0]?.name || '', period: 'Week 1', type: 'Weekly', amount: 2000, targetSales: 5, actualSales: 6 });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h3 className="text-xl font-semibold text-slate-800 mb-4">Add Bonus</h3>
        <div className="space-y-4">
          <select className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.agentName} onChange={(e) => setFormData({ ...formData, agentName: e.target.value })}>
            {agents.map(a => <option key={a.id}>{a.name}</option>)}
          </select>
          <select className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
            <option>Weekly</option><option>Monthly</option>
          </select>
          <input type="text" placeholder="Period" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.period} onChange={(e) => setFormData({ ...formData, period: e.target.value })} />
          <input type="number" placeholder="Target Sales" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.targetSales} onChange={(e) => setFormData({ ...formData, targetSales: parseInt(e.target.value) })} />
          <input type="number" placeholder="Actual Sales" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.actualSales} onChange={(e) => setFormData({ ...formData, actualSales: parseInt(e.target.value) })} />
          <input type="number" placeholder="Bonus Amount" className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) })} />
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => onSubmit(formData)} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Add Bonus</button>
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700 font-medium">Cancel</button>
        </div>
      </div>
    </div>
  );
};

// [NEW] HR Employee Modal
const HREmployeeModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    agent_name: '', designation: 'Agent', email: '', phone: '', cnic: '', address: '',
    joining_date: new Date().toISOString().split('T')[0], bank_name: '', account_number: '', emergency_contact: ''
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-[500px] max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2"><Briefcase className="w-5 h-5"/> New Employment Record</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="text-xs font-bold text-gray-600">Name</label><input className="w-full border p-2 rounded" value={formData.agent_name} onChange={e=>setFormData({...formData, agent_name:e.target.value})} /></div>
          <div><label className="text-xs font-bold text-gray-600">Designation</label><input className="w-full border p-2 rounded" value={formData.designation} onChange={e=>setFormData({...formData, designation:e.target.value})} /></div>
          <div><label className="text-xs font-bold text-gray-600">Joining Date</label><input type="date" className="w-full border p-2 rounded" value={formData.joining_date} onChange={e=>setFormData({...formData, joining_date:e.target.value})} /></div>
          <div><label className="text-xs font-bold text-gray-600">Phone</label><input className="w-full border p-2 rounded" value={formData.phone} onChange={e=>setFormData({...formData, phone:e.target.value})} /></div>
          <div><label className="text-xs font-bold text-gray-600">CNIC</label><input className="w-full border p-2 rounded" value={formData.cnic} onChange={e=>setFormData({...formData, cnic:e.target.value})} /></div>
          <div className="col-span-2"><label className="text-xs font-bold text-gray-600">Address</label><input className="w-full border p-2 rounded" value={formData.address} onChange={e=>setFormData({...formData, address:e.target.value})} /></div>
          <div><label className="text-xs font-bold text-gray-600">Bank Name</label><input className="w-full border p-2 rounded" value={formData.bank_name} onChange={e=>setFormData({...formData, bank_name:e.target.value})} /></div>
          <div><label className="text-xs font-bold text-gray-600">Account No</label><input className="w-full border p-2 rounded" value={formData.account_number} onChange={e=>setFormData({...formData, account_number:e.target.value})} /></div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => onSubmit(formData)} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Record</button>
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700 font-medium">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default AgentPayrollSystem;