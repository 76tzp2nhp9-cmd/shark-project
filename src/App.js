import React, { useState, useMemo } from 'react';
import { Users, DollarSign, Calendar, AlertCircle, TrendingUp, Download, Plus, Check, X, Upload, LogOut, Lock } from 'lucide-react';
import * as XLSX from 'xlsx';
import { SpeedInsights } from '@vercel/speed-insights/react';

// Sample Data
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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [agents, setAgents] = useState(initialAgents);
  const [sales, setSales] = useState(initialSales);
  const [attendance, setAttendance] = useState(initialAttendance);
  const [fines, setFines] = useState(initialFines);
  const [bonuses, setBonuses] = useState(initialBonuses);
  const [selectedMonth, setSelectedMonth] = useState('December 2024');
  const [lateTime, setLateTime] = useState('09:30');
  
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

    // Check Admin
    if (loginData.name === "Admin" && loginData.password === "admin123") {
      setUserRole('Admin');
      setCurrentUser({ name: 'Admin' });
      setIsLoggedIn(true);
      return;
    }

    // Check QA
    if (loginData.name === "QA" && loginData.password === "qa123") {
      setUserRole('QA');
      setCurrentUser({ name: 'QA' });
      setIsLoggedIn(true);
      return;
    }

    // Check Agents
    const agent = agents.find(a => 
      a.name.toLowerCase() === loginData.name.toLowerCase() && 
      a.password === loginData.password
    );

    if (agent) {
      setUserRole('Agent');
      setCurrentUser(agent);
      setIsLoggedIn(true);
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
  };

  // Calculate monthly stats
  const monthlyStats = useMemo(() => {
    const filteredAgentsList = userRole === 'Agent' 
      ? agents.filter(a => a.name === currentUser?.name)
      : agents;

    const agentStats = filteredAgentsList.map(agent => {
      const approvedSales = sales.filter(s => 
        s.agentName === agent.name && 
        s.status === 'Sale' && 
        s.month === selectedMonth
      );
      
      const totalSales = approvedSales.length;
      const totalRevenue = approvedSales.reduce((sum, s) => sum + s.amount, 0);
      
      const agentFines = fines.filter(f => 
        f.agentName === agent.name && 
        f.month === selectedMonth
      ).reduce((sum, f) => sum + f.amount, 0);
      
      const agentBonuses = bonuses.filter(b => 
        b.agentName === agent.name && 
        b.month === selectedMonth
      ).reduce((sum, b) => sum + b.amount, 0);
      
      const netSalary = agent.baseSalary + agentBonuses - agentFines;
      
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
  }, [agents, sales, fines, bonuses, selectedMonth, userRole, currentUser]);

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

  const filteredSales = useMemo(() => {
    let result = userRole === 'Agent'
      ? sales.filter(s => s.agentName === currentUser?.name)
      : sales;

    return result.filter(sale => {
      const matchesSearch = sale.agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           sale.campaign.toLowerCase().includes(searchQuery.toLowerCase());
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

  // Dashboard Stats
  const dashboardStats = useMemo(() => {
    const relevantAgents = userRole === 'Agent' ? 1 : agents.filter(a => a.status === 'Active').length;
    const relevantSales = userRole === 'Agent' 
      ? sales.filter(s => s.agentName === currentUser?.name && s.status === 'Sale' && s.month === selectedMonth)
      : sales.filter(s => s.status === 'Sale' && s.month === selectedMonth);

    const totalSalesCount = relevantSales.length;
    const totalRevenue = relevantSales.reduce((sum, s) => sum + s.amount, 0);
    const totalPayroll = monthlyStats.filter(a => a.status === 'Active').reduce((sum, a) => sum + a.netSalary, 0);
    
    return { totalAgents: relevantAgents, totalSalesCount, totalRevenue, totalPayroll };
  }, [agents, sales, monthlyStats, selectedMonth, userRole, currentUser]);

  // Add Agent
const handleAddAgent = (formData) => {
  const newAgent = {
    id: agents.length + 1,
    ...formData,
    status: 'Active',
    activeDate: new Date().toISOString().split('T')[0],
    leftDate: null
  };
  setAgents([...agents, newAgent]);
  setShowAddAgent(false);
};

// Edit Agent
// Edit Agent
const handleEditAgent = (formData) => {
  setAgents(agents.map(a => 
    a.id === editingAgent.id ? { ...a, ...formData } : a
  ));
  setShowEditAgent(false);
  setEditingAgent(null);
};

// Mark Agent as Left
const handleMarkAsLeft = (agentId) => {
  if (window.confirm('Are you sure you want to mark this agent as Left?')) {
    setAgents(agents.map(a => 
      a.id === agentId ? { ...a, status: 'Left', leftDate: new Date().toISOString().split('T')[0] } : a
    ));
  }
};

// Reactivate Agent
const handleReactivateAgent = (agentId) => {
  if (window.confirm('Are you sure you want to reactivate this agent?')) {
    setAgents(agents.map(a => 
      a.id === agentId ? { ...a, status: 'Active', leftDate: null } : a
    ));
  }
};

// Delete Agent
const handleDeleteAgent = (agentId) => {
  if (window.confirm('Are you sure you want to delete this agent? This action cannot be undone.')) {
    setAgents(agents.filter(a => a.id !== agentId));
  }
};

  // Add Sale
  const handleAddSale = (formData) => {
    const newSale = {
      id: sales.length + 1,
      timestamp: new Date().toISOString(),
      ...formData,
      status: (formData.disposition === 'HW- Xfer' || formData.disposition === 'HW-IBXfer') ? 'Sale' : 'Unsuccessful',
      date: new Date().toISOString().split('T')[0],
      month: selectedMonth
    };
    setSales([...sales, newSale]);
    setShowAddSale(false);
  };

  // Edit Sale
  const handleEditSale = (formData) => {
    setSales(sales.map(s => s.id === editSale.id ? { ...s, ...formData, status: (formData.disposition === 'HW- Xfer' || formData.disposition === 'HW-IBXfer') ? 'Sale' : 'Unsuccessful' } : s));
    setEditSale(null);
  };

  // Update Sale Status (QA Approval)
  const updateSaleStatus = (saleId, newStatus) => {
    setSales(sales.map(s => s.id === saleId ? { ...s, status: newStatus } : s));
  };

  // Update Sale Disposition
  const updateSaleDisposition = (saleId, newDisposition) => {
    setSales(sales.map(s => s.id === saleId ? { ...s, disposition: newDisposition, status: (newDisposition === 'HW- Xfer' || newDisposition === 'HW-IBXfer') ? 'Sale' : 'Unsuccessful' } : s));
  };

  // Update Sale Field
  const updateSaleField = (saleId, field, value) => {
    if (field === 'dockDetails' && value && value.trim()) {
      const sale = sales.find(s => s.id === saleId);
      if (!sale.dockDetails || sale.dockDetails !== value) {
        // add fine
        const newFine = {
          id: fines.length + 1,
          agentName: sale.agentName,
          reason: `Dock Details: ${value}`,
          amount: 1000,
          date: new Date().toISOString().split('T')[0],
          month: selectedMonth
        };
        setFines(prev => [...prev, newFine]);
      }
    }
    setSales(prev => prev.map(s => s.id === saleId ? { ...s, [field]: value } : s));
  };

  // Add Fine
  const handleAddFine = (formData) => {
    const newFine = {
      id: fines.length + 1,
      ...formData,
      date: new Date().toISOString().split('T')[0],
      month: selectedMonth
    };
    setFines([...fines, newFine]);
    setShowAddFine(false);
  };

  // Add Bonus
  const handleAddBonus = (formData) => {
    const newBonus = {
      id: bonuses.length + 1,
      ...formData,
      month: selectedMonth
    };
    setBonuses([...bonuses, newBonus]);
    setShowAddBonus(false);
  };

  // Import Data from CSV/XLS
  const handleImport = (file, lateTime) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
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
          lines = rows.map(row => row.map(cell => cell || '').join(',')).filter(line => line.trim());
        } catch (error) {
          // If XLS parsing fails, try as CSV
          const text = new TextDecoder().decode(e.target.result);
          lines = text.split('\n').filter(line => line.trim());
        }
      }
      
      if (importType === 'agents') {
        const newAgents = lines.slice(1).map((line, idx) => {
          const values = line.split(',').map(v => v.trim());
          return {
            id: agents.length + idx + 1,
            name: values[0],
            password: '123',
            team: values[1],
            shift: values[2],
            baseSalary: parseInt(values[3]),
            status: 'Active',
            activeDate: new Date().toISOString().split('T')[0],
            leftDate: null
          };
        });
        setAgents([...agents, ...newAgents]);
      } else if (importType === 'sales') {
        const newSales = lines.slice(1).map((line, idx) => {
          const values = line.split(',').map(v => v.trim());
          return {
            id: sales.length + idx + 1,
            timestamp: new Date().toISOString(),
            agentName: values[0],
            customerName: values[1] || '',
            phoneNumber: values[2] || '',
            state: values[3] || '',
            zip: values[4] || '',
            address: values[5] || '',
            campaignType: values[6] || '',
            center: values[7] || '',
            teamLead: values[8] || '',
            comments: values[9] || '',
            listId: values[10] || '',
            disposition: values[11] || '',
            duration: values[12] || '',
            xferTime: values[13] || '',
            xferAttempts: values[14] || '',
            feedbackBeforeXfer: values[15] || '',
            feedbackAfterXfer: values[16] || '',
            grading: values[17] || '',
            dockDetails: values[18] || '',
            evaluator: values[19] || '',
            amount: parseInt(values[20]) || 0,
            status: values[21] || ((values[11] === 'HW- Xfer' || values[11] === 'HW-IBXfer') ? 'Sale' : 'Unsuccessful'),
            date: new Date().toISOString().split('T')[0],
            month: selectedMonth
          };
        });
        setSales([...sales, ...newSales]);
      } else if (importType === 'attendance') {
        // Parse XLS rows
        const rows = lines.map(line => line.split(',').map(v => v.trim()));
        const dataRows = rows.slice(1); // skip header
        
        // Collect all unique dates and agents present per date
        const dateMap = {};
        dataRows.forEach(row => {
          const name = row[2] ? row[2].trim().toLowerCase() : '';
          const timeStr = row[3] ? row[3].trim() : '';
          if (name && timeStr) {
            // Parse time format: "12/26/2025 6:21 PM" or similar
            const dateTimeRegex = /(\d{1,2}\/\d{1,2}\/\d{4}) (\d{1,2}:\d{2}(:\d{2})?) ?(AM|PM)/i;
            const match = timeStr.match(dateTimeRegex);
            if (match) {
              const datePart = match[1];
              const timePart = match[2] + ' ' + match[3];
              
              // Convert date to YYYY-MM-DD
              const dateParts = datePart.split('/');
              let month = dateParts[0];
              let day = dateParts[1];
              if (parseInt(month) > 12) {
                // Assume DD/MM/YYYY, swap
                [month, day] = [day, month];
              }
              month = month.padStart(2, '0');
              day = day.padStart(2, '0');
              const year = dateParts[2];
              const date = `${year}-${month}-${day}`;
              
              // Convert time to 24-hour format
              const timeParts = timePart.split(' ');
              const hm = timeParts[0].split(':');
              let hour = parseInt(hm[0]);
              const min = hm[1];
              const ampm = timeParts[1];
              if (ampm.toUpperCase() === 'PM' && hour !== 12) hour += 12;
              if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;
              const time = `${hour.toString().padStart(2, '0')}:${min}`;
              
              if (!dateMap[date]) dateMap[date] = {};
              if (!dateMap[date][name]) dateMap[date][name] = new Set();
              dateMap[date][name].add(time);
            }
          }
        });
        
        // Get active agents
        const activeAgents = agents.filter(a => a.status === 'Active');
        
        // Create attendance records
        const newAttendance = [];
        Object.keys(dateMap).forEach(date => {
          activeAgents.forEach(agent => {
            const agentKey = agent.name.toLowerCase();
            const times = dateMap[date][agentKey] ? Array.from(dateMap[date][agentKey]).sort() : [];
            const status = times.length > 0 ? 'Present' : 'Absent';
            const loginTime = times.length > 0 ? times[0] : ''; // earliest time
            const logoutTime = times.length > 1 ? times[times.length - 1] : ''; // latest time
            
            // Check if late
            const isLate = loginTime && lateTime && loginTime > lateTime;
            
            newAttendance.push({
              id: attendance.length + newAttendance.length + 1,
              date: date,
              agentName: agent.name,
              loginTime: loginTime,
              logoutTime: logoutTime,
              status: status,
              late: isLate
            });
          });
        });
        
        setAttendance([...attendance, ...newAttendance]);
      }
      
      setShowImportModal(false);
    };
    
    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
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
          <p className="text-center text-slate-500 mb-8">Login to Agent Management System</p>
          
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
                <h1 className="text-xl font-bold text-white">Agent Management System</h1>
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
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option>December 2024</option>
                <option>November 2024</option>
                <option>October 2024</option>
              </select>
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
            {userRole === 'Admin' && (
              <>
                <button
                  onClick={() => {
                    setActiveTab('agents');
                    setSearchQuery('');
                    setTeamFilter('All');
                    setStatusFilter('All');
                    setShiftFilter('All');
                  }}
                  className={`px-6 py-3 text-sm font-medium capitalize transition-colors ${
  activeTab === 'agents'
    ? 'border-b-2 border-blue-400 text-blue-400'
    : 'text-slate-400 hover:text-white'
}`}
                >
                  Agents
                </button>
                <button
                  onClick={() => {
                    setActiveTab('fines');
                    setSearchQuery('');
                  }}
                  className={`px-6 py-3 text-sm font-medium capitalize transition-colors ${
  activeTab === 'fines'
    ? 'border-b-2 border-blue-400 text-blue-400'
    : 'text-slate-400 hover:text-white'
}`}
                >
                  Fines
                </button>
                <button
                  onClick={() => {
                    setActiveTab('bonuses');
                    setSearchQuery('');
                  }}
                  className={`px-6 py-3 text-sm font-medium capitalize transition-colors ${
  activeTab === 'bonuses'
    ? 'border-b-2 border-blue-400 text-blue-400'
    : 'text-slate-400 hover:text-white'
}`}
                >
                  Bonuses
                </button>
              </>
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
                <tbody>
  {filteredAgents.map((agent, idx) => (
    <tr key={agent.id} className="border-b border-slate-700 hover:bg-slate-700">
      <td className="py-3 px-4 text-slate-300">{idx + 1}</td>
      <td className="py-3 px-4 font-medium text-white">{agent.name}</td>
      <td className="py-3 px-4 text-slate-300">{agent.team}</td>
      <td className="py-3 px-4 text-slate-300">{agent.shift}</td>
      <td className="py-3 px-4 text-right text-slate-100">{agent.baseSalary.toLocaleString()} PKR</td>
      <td className="py-3 px-4 text-center">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          agent.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {agent.status}
        </span>
      </td>
      <td className="py-3 px-4 text-center text-slate-100">
        {agent.activeDate || '-'}
      </td>
      <td className="py-3 px-4 text-center text-slate-100">
        {agent.leftDate || '-'}
      </td>
      {userRole === 'Admin' && (
        <td className="py-3 px-4">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setEditingAgent(agent);
                setShowEditAgent(true);
              }}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-xs font-medium transition-colors"
              title="Edit Agent"
            >
              Edit
            </button>
            {agent.status === 'Active' ? (
              <button
                onClick={() => handleMarkAsLeft(agent.id)}
                className="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 text-xs font-medium transition-colors"
                title="Mark as Left"
              >
                Mark Left
              </button>
            ) : (
              <button
                onClick={() => handleReactivateAgent(agent.id)}
                className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-xs font-medium transition-colors"
                title="Reactivate Agent"
              >
                Reactivate
              </button>
            )}
            <button
  onClick={() => handleDeleteAgent(agent.id)}
  className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-xs font-medium transition-colors"
  title="Delete Agent"
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
                      <td className="py-3 px-4 text-slate-300">{record.loginTime}</td>
                      <td className="py-3 px-4 text-slate-300">{record.logoutTime}</td>
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
      </div>

      {/* Modals */}
      {showAddAgent && <AgentModal onClose={() => setShowAddAgent(false)} onSubmit={handleAddAgent} />}
{showEditAgent && <AgentModal onClose={() => { setShowEditAgent(false); setEditingAgent(null); }} onSubmit={handleEditAgent} agent={editingAgent} isEdit={true} />}
      {showAddSale && <SaleModal agents={agents} currentUser={currentUser} userRole={userRole} onClose={() => setShowAddSale(false)} onSubmit={handleAddSale} />}
      {editSale && <SaleModal agents={agents} currentUser={currentUser} userRole={userRole} onClose={() => setEditSale(null)} onSubmit={handleEditSale} sale={editSale} isEdit={true} />}
      {showAddFine && <FineModal agents={agents} onClose={() => setShowAddFine(false)} onSubmit={handleAddFine} />}
      {showAddBonus && <BonusModal agents={agents} onClose={() => setShowAddBonus(false)} onSubmit={handleAddBonus} />}
      {showImportModal && <ImportModal importType={importType} onClose={() => setShowImportModal(false)} onImport={handleImport} setLateTime={setLateTime} />}
      <SpeedInsights />
    </div>
  );
};

// Import Modal
const ImportModal = ({ importType, onClose, onImport, setLateTime }) => {
  const [lateTimeInput, setLateTimeInput] = useState('09:30');
  const getFormatInfo = () => {
    switch(importType) {
      case 'agents':
        return {
          title: 'Import Agents',
          format: 'Name,Team,Shift,Base Salary',
          example: 'John Doe,Team A,Morning,40000'
        };
      case 'sales':
        return {
          title: 'Import Sales',
          format: 'Agent Name,Customer Name,Phone Number,State,Zip,Address,Campaign Type,Center,Team Lead,Comments,List ID,Disposition,Duration,Xfer Time,Xfer Attempts,Feedback Before Xfer,Feedback After Xfer,Grading,Dock Details,Evaluator,Amount,Status',
          example: 'Ahmed Khan,John Doe,1234567890,CA,90210,123 Main St,Campaign A,Center A,Lead A,Good call,123,Sale,10:00,5,Good,Excellent,A,B,C,D,5000,Sale'
        };
      case 'attendance':
        return {
          title: 'Import Attendance from Machine',
          format: 'Columns: AC-No., No., Name, Time, State, New State, Exception, Operation',
          example: 'Sheet with headers in first row'
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
              <input
                type="time"
                value={lateTimeInput}
                onChange={(e) => setLateTimeInput(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          )}
          <input
            type="file"
            accept=".xls,.xlsx"
            onChange={handleFileChange}
            className="w-full px-4 py-2 border border-slate-600 rounded-lg text-sm bg-slate-700 text-white placeholder-slate-400"
          />
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700 font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ icon, label, value, color }) => {
  const colors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500'
  };

  return (
    <div className="bg-slate-800/50 rounded-xl shadow-sm border border-slate-600 p-4">
      <div className="flex items-center gap-4">
        <div className={`${colors[color]} text-white p-3 rounded-lg`}>
          {icon}
        </div>
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
    activeDate: agent?.activeDate || new Date().toISOString().split('T')[0],
    leftDate: agent?.leftDate || null,
    status: agent?.status || 'Active'
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold text-slate-800 mb-4">
          {isEdit ? 'Edit Agent' : 'Add New Agent'}
        </h3>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Agent Name"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <input
            type="text"
            placeholder="Password (default: 123)"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
          <select
            className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.team}
            onChange={(e) => setFormData({ ...formData, team: e.target.value })}
          >
            <option>Team A</option>
            <option>Team B</option>
            <option>Team C</option>
          </select>
          <select
            className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.shift}
            onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
          >
            <option>Morning</option>
            <option>Evening</option>
            <option>Night</option>
          </select>
          <input
            type="number"
            placeholder="Base Salary"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.baseSalary}
            onChange={(e) => setFormData({ ...formData, baseSalary: parseInt(e.target.value) })}
          />
          
          {isEdit && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Active Date</label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.activeDate}
                  onChange={(e) => setFormData({ ...formData, activeDate: e.target.value })}
                />
              </div>
              
              {formData.status === 'Left' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Left Date</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.leftDate || ''}
                    onChange={(e) => setFormData({ ...formData, leftDate: e.target.value })}
                  />
                </div>
              )}
            </>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => onSubmit(formData)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {isEdit ? 'Update Agent' : 'Add Agent'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700 font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// Sale Modal
const SaleModal = ({ agents, currentUser, userRole, onClose, onSubmit, sale = null, isEdit = false }) => {
  const [formData, setFormData] = useState({
    agentName: sale?.agentName || (userRole === 'Agent' ? currentUser?.name : agents[0]?.name || ''),
    customerName: sale?.customerName || '',
    phoneNumber: sale?.phoneNumber || '',
    state: sale?.state || '',
    zip: sale?.zip || '',
    address: sale?.address || '',
    campaignType: sale?.campaignType || 'Campaign A',
    center: sale?.center || '',
    teamLead: sale?.teamLead || '',
    comments: sale?.comments || '',
    listId: sale?.listId || '',
    amount: sale?.amount || 0,
    disposition: sale?.disposition || 'HW- Xfer',
    duration: sale?.duration || '',
    xferTime: sale?.xferTime || '',
    xferAttempts: sale?.xferAttempts || '',
    feedbackBeforeXfer: sale?.feedbackBeforeXfer || '',
    feedbackAfterXfer: sale?.feedbackAfterXfer || '',
    grading: sale?.grading || '',
    dockDetails: sale?.dockDetails || '',
    evaluator: sale?.evaluator || ''
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md max-h-[90vh] flex flex-col">
        <h3 className="text-xl font-semibold text-slate-800 mb-4">
          {isEdit ? 'Edit Sale' : 'Submit New Sale'}
        </h3>
        <div className="space-y-4 overflow-y-auto flex-1">
          <select
            className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.agentName}
            onChange={(e) => setFormData({ ...formData, agentName: e.target.value })}
            disabled={userRole === 'Agent'}
          >
            {userRole === 'Agent' ? (
              <option>{currentUser?.name}</option>
            ) : (
              agents.map(a => <option key={a.id}>{a.name}</option>)
            )}
          </select>
          <input
            type="text"
            placeholder="Customer Name"
            className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.customerName}
            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
          />
          <input
            type="text"
            placeholder="Phone Number"
            className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.phoneNumber}
            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
          />
          <input
            type="text"
            placeholder="State"
            className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
          />
          <input
            type="text"
            placeholder="Zip"
            className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.zip}
            onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
          />
          <input
            type="text"
            placeholder="Address"
            className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
          <select
            className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.campaignType}
            onChange={(e) => setFormData({ ...formData, campaignType: e.target.value })}
          >
            <option>Campaign A</option>
            <option>Campaign B</option>
            <option>Campaign C</option>
          </select>
          <input
            type="text"
            placeholder="Center"
            className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.center}
            onChange={(e) => setFormData({ ...formData, center: e.target.value })}
          />
          <input
            type="text"
            placeholder="Team Lead"
            className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.teamLead}
            onChange={(e) => setFormData({ ...formData, teamLead: e.target.value })}
          />
          <textarea
            placeholder="Comments"
            className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.comments}
            onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
            rows={3}
          />
          <input
            type="text"
            placeholder="List ID"
            className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.listId}
            onChange={(e) => setFormData({ ...formData, listId: e.target.value })}
          />
          {isEdit && (
            <>
              <input
                type="text"
                placeholder="Disposition"
                className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.disposition}
                onChange={(e) => setFormData({ ...formData, disposition: e.target.value })}
              />
              <input
                type="text"
                placeholder="Duration"
                className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              />
              <input
                type="text"
                placeholder="Xfer Time"
                className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.xferTime}
                onChange={(e) => setFormData({ ...formData, xferTime: e.target.value })}
              />
              <input
                type="text"
                placeholder="Xfer Attempts"
                className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.xferAttempts}
                onChange={(e) => setFormData({ ...formData, xferAttempts: e.target.value })}
              />
              <textarea
                placeholder="Feedback (Before Xfer)"
                className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.feedbackBeforeXfer}
                onChange={(e) => setFormData({ ...formData, feedbackBeforeXfer: e.target.value })}
                rows={2}
              />
              <textarea
                placeholder="Feedback (After Xfer)"
                className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.feedbackAfterXfer}
                onChange={(e) => setFormData({ ...formData, feedbackAfterXfer: e.target.value })}
                rows={2}
              />
              <input
                type="text"
                placeholder="Grading"
                className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.grading}
                onChange={(e) => setFormData({ ...formData, grading: e.target.value })}
              />
              <input
                type="text"
                placeholder="Dock Details"
                className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.dockDetails}
                onChange={(e) => setFormData({ ...formData, dockDetails: e.target.value })}
              />
              <input
                type="text"
                placeholder="Evaluator"
                className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.evaluator}
                onChange={(e) => setFormData({ ...formData, evaluator: e.target.value })}
              />
            </>
          )}
          {isEdit && (
            <input
              type="number"
              placeholder="Amount"
              className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) })}
            />
          )}
          <select
            className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.disposition}
            onChange={(e) => setFormData({ ...formData, disposition: e.target.value })}
          >
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
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => onSubmit(formData)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {isEdit ? 'Update Sale' : 'Submit Sale'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700 font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// Fine Modal
const FineModal = ({ agents, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    agentName: agents[0]?.name || '',
    reason: '',
    amount: 500
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h3 className="text-xl font-semibold text-slate-800 mb-4">Add Fine</h3>
        <div className="space-y-4">
          <select
            className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.agentName}
            onChange={(e) => setFormData({ ...formData, agentName: e.target.value })}
          >
            {agents.map(a => <option key={a.id}>{a.name}</option>)}
          </select>
          <input
            type="text"
            placeholder="Reason"
            className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          />
          <input
            type="number"
            placeholder="Amount"
            className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) })}
          />
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => onSubmit(formData)}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Add Fine
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700 font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// Bonus Modal
const BonusModal = ({ agents, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    agentName: agents[0]?.name || '',
    period: 'Week 1',
    type: 'Weekly',
    amount: 2000,
    targetSales: 5,
    actualSales: 6
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h3 className="text-xl font-semibold text-slate-800 mb-4">Add Bonus</h3>
        <div className="space-y-4">
          <select
            className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.agentName}
            onChange={(e) => setFormData({ ...formData, agentName: e.target.value })}
          >
            {agents.map(a => <option key={a.id}>{a.name}</option>)}
          </select>
          <select
            className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          >
            <option>Weekly</option>
            <option>Monthly</option>
          </select>
          <input
            type="text"
            placeholder="Period"
            className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.period}
            onChange={(e) => setFormData({ ...formData, period: e.target.value })}
          />
          <input
            type="number"
            placeholder="Target Sales"
            className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.targetSales}
            onChange={(e) => setFormData({ ...formData, targetSales: parseInt(e.target.value) })}
          />
          <input
            type="number"
            placeholder="Actual Sales"
            className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.actualSales}
            onChange={(e) => setFormData({ ...formData, actualSales: parseInt(e.target.value) })}
          />
          <input
            type="number"
            placeholder="Bonus Amount"
            className="w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) })}
          />
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => onSubmit(formData)}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Add Bonus
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700 font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentPayrollSystem;