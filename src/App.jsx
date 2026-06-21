import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Outlet } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from './config';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import Register from './components/Register';
import NotificationPanel from './components/NotificationPanel';
import SystemStatusBar from './components/ui/SystemStatusBar';

// Import Layout Adaptivity
import AdaptiveLayout from './layouts/AdaptiveLayout';

// Import Role-based Dashboards
import ConstableDashboard from './components/ConstableDashboard';
import InspectorDashboard from './components/InspectorDashboard';
import SeniorOfficialDashboard from './components/SeniorOfficialDashboard';
import CommandCenterDashboard from './components/CommandCenterDashboard';
import EmergencyResponseDashboard from './components/EmergencyResponseDashboard';
import EventDetailsModal from './components/EventDetailsModal';

// Import Split Sub-pages
import SeniorOfficialPersonnel from './components/RoleDashboards/SeniorOfficialPersonnel';

// Import Navigation Rail Views
import UnifiedEventsList from './components/UnifiedEventsList';
import ReportsViewer from './components/ReportsViewer';

import { 
  LayoutDashboard, 
  List, 
  Users, 
  FileText, 
  ShieldAlert
} from 'lucide-react';

function DashboardLayout() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;
  
  const [systemStatus, setSystemStatus] = useState({
    api: 'checking',
    database: 'checking',
    aiEngine: 'checking',
    notifications: 'online'
  });

  const [modalEvent, setModalEvent] = useState(null);
  const [autoFocusWorkflow, setAutoFocusWorkflow] = useState(false);
  const [currentAlert, setCurrentAlert] = useState(null);

  // App-wide open event details listener
  useEffect(() => {
    const handleOpenDetails = (e) => {
      setModalEvent(e.detail.event);
      setAutoFocusWorkflow(e.detail.autoFocusWorkflow || false);
    };
    window.addEventListener('open-event-details', handleOpenDetails);
    return () => window.removeEventListener('open-event-details', handleOpenDetails);
  }, []);

  // Role Gate & Redirect Security
  useEffect(() => {
    if (path.startsWith('/commissioner') && role !== 'SENIOR_OFFICIAL') {
      navigate('/', { replace: true });
    }
    if (path.startsWith('/command') && role !== 'COMMAND_CENTER') {
      navigate('/', { replace: true });
    }
    if (path.startsWith('/officer') && role !== 'CONSTABLE' && role !== 'INSPECTOR') {
      navigate('/', { replace: true });
    }
    if (path.startsWith('/inspector') && role !== 'INSPECTOR') {
      navigate('/', { replace: true });
    }
    if (path.startsWith('/emergency') && role !== 'EMERGENCY_RESPONSE') {
      navigate('/', { replace: true });
    }
  }, [path, role, navigate]);

  // Fetch health stats
  useEffect(() => {
    axios.get(`${API_BASE_URL}/health`)
      .then((res) => {
        if (res.data.status === 'healthy') {
          setSystemStatus({
            api: 'online',
            database: 'online',
            aiEngine: res.data.models_loaded ? 'online' : 'offline',
            notifications: 'online'
          });
        } else {
          setSystemStatus({
            api: 'online',
            database: 'offline',
            aiEngine: 'offline',
            notifications: 'online'
          });
        }
      })
      .catch(() => {
        setSystemStatus({
          api: 'offline',
          database: 'offline',
          aiEngine: 'offline',
          notifications: 'offline'
        });
      });
  }, []);

  const getRoleBadgeColor = (userRole) => {
    switch (userRole) {
      case 'CONSTABLE': return 'bg-cyber-green/10 text-cyber-green border-cyber-green/20';
      case 'INSPECTOR': return 'bg-cyber-green/10 text-cyber-green border-cyber-green/20';
      case 'SENIOR_OFFICIAL': return 'bg-cyber-red/10 text-cyber-red border-cyber-red/20';
      case 'COMMAND_CENTER': return 'bg-cyber-accent/10 text-cyber-accent border-cyber-accent/20';
      case 'EMERGENCY_RESPONSE': return 'bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/30';
      default: return 'bg-slate-550/10 text-slate-400 border-slate-800';
    }
  };

  const getRoleDisplayName = (userRole) => {
    switch (userRole) {
      case 'SENIOR_OFFICIAL': return 'Commissioner';
      case 'COMMAND_CENTER': return 'Traffic Control Command Center Officer';
      case 'INSPECTOR': return 'Onsite Traffic Inspector';
      case 'CONSTABLE': return 'Onsite Traffic Inspector';
      case 'EMERGENCY_RESPONSE': return 'Emergency Response Team';
      default: return userRole || 'Unknown';
    }
  };

  // Calculate active view based on path
  let activeView = 'dashboard';
  if (path.startsWith('/commissioner/personnel')) {
    activeView = 'personnel';
  } else if (path.startsWith('/events')) {
    activeView = 'events';
  } else if (path.startsWith('/reports')) {
    activeView = 'reports';
  }

  const handleNavItemClick = (itemId) => {
    if (itemId === 'dashboard') {
      if (role === 'SENIOR_OFFICIAL') navigate('/commissioner/dashboard');
      else if (role === 'COMMAND_CENTER') navigate('/command/dashboard');
      else if (role === 'INSPECTOR') navigate('/inspector/dashboard');
      else if (role === 'CONSTABLE') navigate('/inspector/dashboard');
      else if (role === 'EMERGENCY_RESPONSE') navigate('/emergency/dashboard');
      else navigate('/');
    } else if (itemId === 'personnel') {
      if (role === 'SENIOR_OFFICIAL') navigate('/commissioner/personnel');
      else navigate('/events');
    } else {
      navigate(`/${itemId}`);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'events', label: 'Events', icon: List },
    ...(role === 'SENIOR_OFFICIAL' ? [{ id: 'personnel', label: 'Personnel', icon: Users }] : []),
    { id: 'reports', label: 'Reports', icon: FileText },
  ];

  return (
    <div className="scaled-dashboard relative min-h-screen bg-[#050b18] text-slate-100 flex flex-col font-sans overflow-hidden">
      
      {/* 3-layer Background System */}
      <div className="absolute inset-0 bg-[#050b18] z-0"></div>
      <div className="absolute inset-0 cyber-grid-exact pointer-events-none z-0"></div>
      <div className="absolute inset-0 radial-glow-exact pointer-events-none z-0"></div>

      {/* Pulsing Emergency Alert Strip */}
      {currentAlert && (
        <div className="bg-[#ff0055] text-white px-4 py-2.5 flex justify-between items-center z-[99999] animate-pulse font-mono border-b border-white/20 shadow-[0_4px_20px_rgba(255,0,85,0.4)] relative">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 animate-bounce shrink-0" />
            <span className="font-orbitron font-black text-xs md:text-sm uppercase tracking-wider">
              CRITICAL EMERGENCY SYSTEM-WIDE ALARM: {currentAlert.severity}
            </span>
            <span className="text-[10px] md:text-xs bg-black/40 px-2 py-0.5 rounded border border-white/10 ml-2 max-w-xl truncate">
              {currentAlert.message} (Dispatch: {currentAlert.user})
            </span>
          </div>
          <button 
            onClick={() => setCurrentAlert(null)}
            className="text-white hover:bg-white/10 px-3 py-1 rounded border border-white/30 text-[10px] uppercase font-bold cursor-pointer font-sans transition-all ml-4"
          >
            Acknowledge
          </button>
        </div>
      )}

      {/* Reusable System Telemetry Status Ribbon */}
      <div className="z-10 relative">
        <SystemStatusBar />
      </div>

      {/* Main Header */}
      <header className="bg-[#050817]/60 backdrop-blur-md border-b border-cyber-border z-10 relative">
        <div className="max-w-[1600px] mx-auto w-full px-4 md:px-5 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h1 className="text-lg md:text-xl font-black font-orbitron tracking-tight text-white flex items-center gap-2">
              TRAFIK - <span className="text-[#00d2ff]">4X</span>
            </h1>
            <p className="text-slate-550 text-[9px] font-mono tracking-widest select-none">
              Predict, Cooperate, Respond, Learn
            </p>
          </div>
          
          {/* System Health Indicators & Profiles */}
          <div className="flex flex-wrap items-center gap-3 select-none">
            
            {/* Health Diagnostics Panel */}
            <div className="bg-[#030611]/60 backdrop-blur-md border border-[#00d2ff]/15 px-3 py-1 rounded-lg flex items-center gap-2.5 text-[9px] font-mono text-slate-500">
              
              {/* API */}
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  systemStatus.api === 'online' ? 'bg-[#00ff66]' :
                  systemStatus.api === 'offline' ? 'bg-[#ff0055]' : 'bg-[#ffcc00]'
                }`}></span>
                API
              </span>

              {/* Database */}
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  systemStatus.database === 'online' ? 'bg-[#00ff66]' :
                  systemStatus.database === 'offline' ? 'bg-[#ff0055]' : 'bg-[#ffcc00]'
                }`}></span>
                Database
              </span>

              {/* AI Engine */}
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  systemStatus.aiEngine === 'online' ? 'bg-[#00ff66]' :
                  systemStatus.aiEngine === 'offline' ? 'bg-[#ff0055]' : 'bg-[#ffcc00]'
                }`}></span>
                AI Engine
              </span>

              {/* Notifications */}
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  systemStatus.notifications === 'online' ? 'bg-[#00ff66]' : 'bg-[#ff0055]'
                }`}></span>
                Notifications
              </span>

            </div>

            {/* Alarm bell notification panel */}
            {user && <NotificationPanel />}

            {/* Session Profile card */}
            {user && (
              <div className="bg-[#080c1e]/40 backdrop-blur-md border border-[#00d2ff]/15 px-2.5 py-1 rounded-lg flex items-center gap-2.5 text-[10px] font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-550 uppercase">SYS_OP:</span>
                  <span className="text-white font-bold">{user.name}</span>
                </div>
                <span className={`px-1.5 py-0.5 rounded border text-[9px] uppercase font-bold tracking-wider ${getRoleBadgeColor(role)}`}>
                  {getRoleDisplayName(role)}
                </span>
                <button 
                  onClick={logout}
                  className="text-[#ff0055] hover:text-red-400 font-bold border-l border-[#00d2ff]/15 pl-2.5 transition-colors uppercase cursor-pointer"
                >
                  Logout
                </button>
              </div>
            )}

          </div>
        </div>
      </header>

      {/* Body Shell: left nav rail + main view */}
      <div className="flex-1 w-full max-w-[1600px] mx-auto flex flex-col md:flex-row z-10 relative">
        
        {/* Left Navigation Rail */}
        {role !== 'SENIOR_OFFICIAL' && (
          <nav className="w-full md:w-48 bg-[#050817]/40 backdrop-blur-md border-b md:border-b-0 md:border-r border-[#00d2ff]/15 flex flex-row md:flex-col p-2 gap-1 overflow-x-auto md:overflow-x-visible z-10 select-none">
            
            <div className="hidden md:block px-3 py-1.5 text-[9px] font-mono text-slate-500 uppercase tracking-widest border-b border-[#00d2ff]/10 mb-2 select-none">
              Mainframe Channels
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavItemClick(item.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono tracking-wider transition-all uppercase cursor-pointer w-full text-left shrink-0 md:shrink text-sm ${
                    isActive 
                      ? 'bg-[#00d2ff]/10 border border-[#00d2ff]/30 text-white font-bold shadow-[0_0_8px_rgba(0,210,255,0.05)]' 
                      : 'bg-transparent border border-transparent text-slate-400 hover:text-white hover:bg-slate-900/30'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#00d2ff]' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        )}

        {/* Dynamic Adaptive Layout Main View Window */}
        <main className="flex-1 p-4 md:p-5 overflow-y-auto">
          <AdaptiveLayout>
            <Outlet />
          </AdaptiveLayout>
        </main>

      </div>

      {/* Global Details Modal Mount */}
      {modalEvent && (
        <EventDetailsModal 
          event={modalEvent} 
          onClose={() => setModalEvent(null)} 
          autoFocusWorkflow={autoFocusWorkflow}
        />
      )}

      {/* Platform Footer */}
      <footer className="border-t border-cyber-border bg-[#030611] py-3 text-center text-slate-600 text-[9px] font-mono tracking-widest uppercase select-none z-10">
        TRAFIK - 4X v3.0 | Command Center Operations Roster
      </footer>
    </div>
  );
}

function HomeRedirect() {
  const { role } = useAuth();
  if (role === 'SENIOR_OFFICIAL') {
    return <Navigate to="/commissioner/dashboard" replace />;
  } else if (role === 'COMMAND_CENTER') {
    return <Navigate to="/command/dashboard" replace />;
  } else if (role === 'INSPECTOR') {
    return <Navigate to="/inspector/dashboard" replace />;
  } else if (role === 'CONSTABLE') {
    return <Navigate to="/officer/dashboard" replace />;
  } else if (role === 'EMERGENCY_RESPONSE') {
    return <Navigate to="/emergency/dashboard" replace />;
  }
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/commissioner/dashboard" element={<SeniorOfficialDashboard />} />
              <Route path="/commissioner/personnel" element={<SeniorOfficialPersonnel />} />
              <Route path="/command/dashboard" element={<CommandCenterDashboard />} />
              <Route path="/events" element={<UnifiedEventsList />} />
              <Route path="/reports" element={<ReportsViewer />} />
              <Route path="/officer/dashboard" element={<ConstableDashboard />} />
              <Route path="/inspector/dashboard" element={<InspectorDashboard />} />
              <Route path="/emergency/dashboard" element={<EmergencyResponseDashboard />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
