import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import { Bell, Check, AlertTriangle, ShieldAlert, Info, X, Trash2, CheckSquare } from 'lucide-react';
import CommandButton from './ui/CommandButton';

export default function NotificationPanel() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL');
  const [activeAlert, setActiveAlert] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const panelRef = useRef(null);

  const handleClearAll = async () => {
    try {
      await axios.delete(`${API_BASE_URL}/notifications/clear-all`);
      setNotifications([]);
      setToastMessage("All notifications cleared.");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setToastMessage("Notification removed.");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/notifications`);
      setNotifications(res.data);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    
    const handleRefresh = () => {
      fetchNotifications();
    };
    window.addEventListener('refresh-notifications', handleRefresh);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('refresh-notifications', handleRefresh);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const wsProtocol = API_BASE_URL.startsWith('https') ? 'wss:' : 'ws:';
    const wsHost = API_BASE_URL.replace(/^https?:\/\//, '');
    const wsUrl = `${wsProtocol}//${wsHost}/ws/${user.id}`;
    
    let ws;
    let reconnectTimeout;
    
    const connectWS = () => {
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log("WebSocket connected for user:", user.id);
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const isEmergency = 
            message.type === 'EMERGENCY_ALERT' ||
            (message.type === 'notification' && message.data && message.data.title && message.data.title.includes('SYSTEM EMERGENCY ALERT'));

          if (isEmergency) {
            console.log("[EMERGENCY WS RECEIVED]", message);
            if (role === 'EMERGENCY_RESPONSE') {
              const alertData = message.data;
              window.dispatchEvent(new CustomEvent('emergency-alert-created', { detail: alertData }));
            }
          }

          if (message.type === 'notification' || message.type === 'EMERGENCY_ALERT') {
            console.log(`[STEP 6] Frontend Receipt\nUser ID: ${user.id}\nNotification ID: ${message.data.id}\nExpected: Notification received by NotificationPanel.\n`);
            setNotifications(prev => {
              if (prev.some(n => n.id === message.data.id)) return prev;
              return [message.data, ...prev].slice(0, 50);
            });
          } else if (message.type === 'EMERGENCY_ALERT_CREATED') {
            if (role === 'EMERGENCY_RESPONSE') {
              window.dispatchEvent(new CustomEvent('emergency-alert-created', { detail: message.data }));
            }
          } else if (message.type === 'refresh_trigger') {
            window.dispatchEvent(new CustomEvent('refresh-notifications', { detail: message.data }));
          }
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
        }
      };
      
      ws.onclose = () => {
        console.log("WebSocket disconnected. Reconnecting in 5 seconds...");
        reconnectTimeout = setTimeout(connectWS, 5000);
      };
      
      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        ws.close();
      };
    };
    
    connectWS();
    
    return () => {
      if (ws) ws.close();
      clearTimeout(reconnectTimeout);
    };
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Play warning chime when new notifications arrive
  const prevCount = useRef(0);
  useEffect(() => {
    console.log(`[STEP 7] Badge Update\nUnread Count Before: ${prevCount.current}\nUnread Count After: ${unreadCount}\n`);
    if (unreadCount > prevCount.current && role !== 'EMERGENCY_RESPONSE') {
      const latestNotif = notifications[0];
      const isEmergency = latestNotif && (
        (latestNotif.title && latestNotif.title.includes('EMERGENCY')) ||
        (latestNotif.message && latestNotif.message.includes('Incident ID')) ||
        latestNotif.type === 'EMERGENCY_ALERT' ||
        latestNotif.category === 'CRITICAL'
      );
      if (isEmergency && (role === 'INSPECTOR' || role === 'CONSTABLE')) {
        console.log("[SILENT] Emergency notification received on Inspector dashboard. Silent by design.");
      }
    }
    prevCount.current = unreadCount;
  }, [unreadCount, role, notifications]);

  // Handle outside clicks
  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target) && !event.target.closest('.bell-btn-trigger')) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const markAllRead = async () => {
    try {
      await axios.post(`${API_BASE_URL}/notifications/read-all`);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const markSingleRead = async (id) => {
    try {
      await axios.post(`${API_BASE_URL}/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  // Category mapping helper based on telemetry tags
  const getCategory = (notif) => {
    const msg = notif.message.toLowerCase();
    if (msg.includes("api") || msg.includes("database") || msg.includes("ai engine") || msg.includes("system")) {
      return "SYSTEM";
    }
    if (msg.includes("personnel") || msg.includes("onboarding") || msg.includes("worker") || msg.includes("registration") || msg.includes("vetting")) {
      return "PERSONNEL";
    }
    if (msg.includes("shortage") || msg.includes("emergency dispatch") || msg.includes("critical incident") || msg.includes("deployment") || msg.includes("activated") || msg.includes("approved")) {
      return "OPERATIONS";
    }
    return "EVENTS";
  };

  const getPriorityStyles = (priority) => {
    switch (priority) {
      case 'CRITICAL':
        return 'border-[#ff0055] text-cyber-red bg-[#ff0055]/5 animate-pulse shadow-[0_0_15px_rgba(255,0,85,0.25)]';
      case 'HIGH':
        return 'border-[#f97316] text-[#f97316] bg-[#f97316]/5';
      case 'MEDIUM':
        return 'border-[#eab308] text-[#eab308] bg-[#eab308]/5';
      default:
        return 'border-[#22c55e] text-cyber-green bg-cyber-green/5';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'CRITICAL':
        return <ShieldAlert className="w-5 h-5 text-cyber-red shrink-0" />;
      case 'HIGH':
      case 'MEDIUM':
        return <AlertTriangle className="w-5 h-5 text-cyber-yellow shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-cyber-green shrink-0" />;
    }
  };

  const getCommissionerAlert = (notif) => {
    const msg = notif.message.toLowerCase();
    const isEvent = msg.includes("forwarded") || msg.includes("submitted for approval") || msg.includes("needs review") || msg.includes("reviewed event") || msg.includes("new planned event");
    const isPersonnel = msg.includes("personnel onboarding") || msg.includes("onboarding request");
    const isCritical = notif.priority === 'CRITICAL';
    
    if (isEvent) {
      const match = notif.message.match(/(\bPL-[A-Z0-9]+\b|\bFKID[A-Z0-9]+\b|\bEV-[A-Z0-9]+\b)/i);
      return { type: 'event', eventId: match ? match[0] : null };
    }
    if (isPersonnel) {
      return { type: 'personnel' };
    }
    if (isCritical) {
      const match = notif.message.match(/(\bPL-[A-Z0-9]+\b|\bFKID[A-Z0-9]+\b|\bEV-[A-Z0-9]+\b)/i);
      return { type: 'critical', eventId: match ? match[0] : null };
    }
    return null;
  };

  const handleNotificationClick = async (notif) => {
    setIsOpen(false); // Close drawer
    
    // Extract event ID using regex (PL-XXXX, FKIDXXXX, EV-XXXX)
    const match = notif.message.match(/(\bPL-[A-Z0-9]+\b|\bFKID[A-Z0-9]+\b|\bEV-[A-Z0-9]+\b|\bALERT-[A-Z0-9]+\b)/i);
    const eventId = match ? match[0] : null;
    
    if (eventId) {
      if (role === 'SENIOR_OFFICIAL') {
        navigate(`/commissioner/dashboard?approve_event_id=${eventId}`);
      } else if (role === 'INSPECTOR') {
        navigate(`/inspector/dashboard?event_id=${eventId}`);
      } else if (role === 'EMERGENCY_RESPONSE') {
        navigate(`/emergency/dashboard?incident_id=${eventId}`);
      } else if (role === 'COMMAND_CENTER' && (notif.title?.toLowerCase().includes('reject') || notif.message?.toLowerCase().includes('reject') || notif.message?.toLowerCase().includes('denied'))) {
        navigate(`/command/dashboard?event_id=${eventId}&edit_mode=true`);
      } else {
        try {
          const res = await axios.get(`${API_BASE_URL}/events/${eventId}`);
          window.dispatchEvent(new CustomEvent('open-event-details', {
            detail: {
              event: res.data,
              autoFocusWorkflow: true
            }
          }));
        } catch (err) {
          console.error("Failed to load event details for notification click:", err);
        }
      }
    } else {
      if (role === 'SENIOR_OFFICIAL') {
        const commAlert = getCommissionerAlert(notif);
        if (!commAlert) return;
        if (commAlert.type === 'personnel') {
          navigate(`/commissioner/personnel`);
        }
      }
    }
  };

  // Filter items
  const classifiedNotifications = notifications.map(n => ({ ...n, category: getCategory(n) }));
  
  let displayedNotifications = classifiedNotifications;
  if (role === 'SENIOR_OFFICIAL') {
    displayedNotifications = classifiedNotifications.filter(n => 
      n.receiver_role === 'COMMISSIONER' || 
      n.receiver_role === 'SENIOR_OFFICIAL' || 
      getCommissionerAlert(n) !== null
    );
  }
  
  const filteredNotifications = displayedNotifications.filter(n => activeTab === 'ALL' || n.category === activeTab);
  
  // Log counts for Audit
  console.log(`Notifications Received: ${notifications.length} | Notifications Rendered: ${displayedNotifications.length}`);

  const renderMessageContent = (message) => {
    if (message.includes('|')) {
      const parts = message.split('|').map(p => p.trim());
      const title = parts[0];
      const attributes = parts.slice(1, parts.length - 1);
      const footer = parts[parts.length - 1];
      
      return (
        <div className="space-y-1.5 font-mono text-[10px] text-slate-300">
          <div className="text-[11px] font-bold text-white tracking-wider uppercase font-orbitron">{title}</div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 bg-[#050b18]/90 p-2 border border-cyber-border/40 rounded-lg">
            {attributes.map((attr, idx) => {
              if (attr.includes(':')) {
                const [k, v] = attr.split(':').map(x => x.trim());
                return (
                  <div key={idx}>
                    <span className="text-[8px] text-slate-500 uppercase block font-bold">{k}</span>
                    <span className="text-white font-bold">{v}</span>
                  </div>
                );
              }
              return <div key={idx} className="col-span-2 text-[9px] text-slate-300 font-bold">{attr}</div>;
            })}
          </div>
          <div className="text-[8px] text-cyber-yellow font-black uppercase tracking-widest animate-pulse">{footer}</div>
        </div>
      );
    }
    return <p className="text-sm text-slate-200 leading-normal font-sans font-medium">{message}</p>;
  };

  // Render Panel side drawer via portal
  const renderDrawer = () => {
    if (!isOpen) return null;

    const sortedNotifications = [...filteredNotifications].sort((a, b) => {
      if (a.priority === 'CRITICAL' && b.priority !== 'CRITICAL') return -1;
      if (a.priority !== 'CRITICAL' && b.priority === 'CRITICAL') return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });

    return ReactDOM.createPortal(
      <div 
        ref={panelRef}
        className="fixed bg-cyber-card border border-cyber-accent rounded-2xl shadow-2xl flex flex-col gap-4 glow-cyan animate-slide-in"
        style={{ 
          position: 'fixed',
          top: '80px',
          right: '24px',
          width: '420px',
          zIndex: 99999,
          height: 'calc(100vh - 120px)',
          background: 'rgba(8, 12, 30, 0.95)', 
          backdropFilter: 'blur(20px)',
          padding: '1.25rem'
        }}
      >
        <style>{`
          @keyframes slideInDrawer {
            from { opacity: 0; transform: translateX(50px); }
            to { opacity: 1; transform: translateX(0); }
          }
          .animate-slide-in {
            animation: slideInDrawer 200ms ease-out forwards;
          }
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in-up {
            animation: fadeInUp 200ms ease-out forwards;
          }
        `}</style>

        {/* Drawer Header */}
        <div className="flex justify-between items-center border-b border-cyber-border pb-3 select-none">
          <div className="space-y-0.5 font-orbitron">
            <h3 className="text-base font-black text-white tracking-wider uppercase">
              Active Alerts ({unreadCount})
            </h3>
            <span className="text-[9px] text-slate-500 font-mono tracking-widest block uppercase">Telemetry warnings</span>
          </div>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button 
                onClick={handleClearAll}
                className="text-[9px] font-mono border border-cyber-red/40 hover:border-cyber-red text-cyber-red hover:bg-cyber-red/10 px-2 py-1 rounded transition-all cursor-pointer bg-transparent uppercase font-bold"
              >
                Clear All
              </button>
            )}
            <button 
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 border border-cyber-border rounded-lg hover:border-white transition-all cursor-pointer bg-transparent"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tab filters */}
        <div className="flex border-b border-cyber-border/40 gap-1 overflow-x-auto pb-1.5 select-none font-mono text-[9px]">
          {['ALL', 'EVENTS', 'PERSONNEL', 'OPERATIONS', 'SYSTEM'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2 py-1 border rounded-lg tracking-wider font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab 
                  ? 'bg-cyber-accent text-slate-950 border-cyber-accent' 
                  : 'bg-transparent text-slate-500 border-transparent hover:border-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {sortedNotifications.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-650 font-mono border border-dashed border-cyber-border/40 rounded-xl select-none">
              No threat alerts match this channel.
            </div>
          ) : (
            sortedNotifications.map((notif) => (
              <div 
                key={notif.id} 
                onClick={() => handleNotificationClick(notif)}
                className={`p-3 border rounded-lg flex gap-3 items-start min-h-[60px] transition-all cursor-pointer ${
                  notif.read
                    ? 'border-slate-800 text-slate-500 bg-slate-900/10 opacity-50 hover:bg-slate-900/20'
                    : `bg-[#030611]/60 hover:border-cyber-accent hover:bg-cyber-accent/5 ${getPriorityStyles(notif.priority)}`
                }`}
              >
                {getPriorityIcon(notif.priority)}
                
                <div className="flex-1 space-y-1">
                  {renderMessageContent(notif.message)}
                  
                  <div className="flex items-center justify-between font-mono text-xs select-none">
                    <span className="text-slate-500 text-[10px]">
                      {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span className="text-[9px] tracking-widest font-bold uppercase">
                      {notif.category} &bull; {notif.priority}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 shrink-0 select-none items-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNotification(notif.id);
                    }}
                    className="p-1 rounded-lg bg-[#050b18] border border-cyber-border/40 hover:border-cyber-red text-slate-500 hover:text-cyber-red transition-all cursor-pointer select-none"
                    title="Delete alert"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  {!notif.read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markSingleRead(notif.id);
                      }}
                      className="p-1 rounded-lg bg-[#050b18] border border-cyber-border/40 hover:border-cyber-green text-slate-500 hover:text-cyber-green transition-all cursor-pointer select-none"
                      title="Mark as read"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Global actions at bottom */}
        {unreadCount > 0 && (
          <div className="pt-3 border-t border-cyber-border flex gap-3 select-none">
            <CommandButton
              onClick={markAllRead}
              variant="secondary"
              className="flex-1 py-2 text-xs flex items-center justify-center gap-1.5"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              MARK ALL ALERTS READ
            </CommandButton>
          </div>
        )}

      </div>,
      document.body
    );
  };

  return (
    <div className="relative font-mono">
      {/* Bell Button trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`bell-btn-trigger relative p-2.5 rounded-xl bg-[#030611] border border-cyber-border hover:border-cyber-accent text-slate-400 hover:text-white transition-colors cursor-pointer select-none ${
          unreadCount > 0 ? 'glow-cyan animate-pulse' : ''
        }`}
      >
        <Bell className="w-5 h-5 text-cyber-accent" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5.5 h-5.5 flex items-center justify-center rounded-full bg-cyber-red text-[9px] font-bold text-white font-orbitron select-none animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Renders side drawer Portal */}
      {renderDrawer()}

      {/* System-wide Critical Emergency Siren overlay modal */}
      {activeAlert && (
        <div 
          className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
          style={{ fontFamily: 'Rajdhani, sans-serif' }}
        >
          <div className="w-full max-w-md bg-[#080c1e] border-2 border-cyber-red rounded-2xl shadow-[0_0_50px_rgba(255,0,85,0.45)] p-6 font-mono relative overflow-hidden text-center space-y-5 animate-pulse-border">
            <style>{`
              @keyframes pulseBorder {
                0%, 100% { border-color: rgba(255, 0, 85, 0.4); }
                50% { border-color: rgba(255, 0, 85, 1); }
              }
              .animate-pulse-border {
                animation: pulseBorder 1.5s infinite;
              }
            `}</style>
            
            {/* Blinking Top Red Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-cyber-red animate-pulse"></div>
            
            {/* Alert Icon & Header */}
            <div className="flex flex-col items-center gap-2 pt-2">
              <div className="w-14 h-14 rounded-full bg-cyber-red/10 border-2 border-cyber-red flex items-center justify-center animate-bounce">
                <ShieldAlert className="w-8 h-8 text-cyber-red" />
              </div>
              <h2 className="text-xl font-black font-orbitron text-cyber-red tracking-wider uppercase animate-pulse">
                CRITICAL EMERGENCY SIREN
              </h2>
              <span className="text-[8px] text-slate-500 tracking-widest uppercase font-bold">
                ASTRAM CITY BRAIN SECURITY BROADCAST
              </span>
            </div>

            {/* Details Table */}
            <div className="bg-[#030611]/90 p-4 border border-cyber-border rounded-xl text-left text-xs space-y-2.5">
              <div className="grid grid-cols-3 gap-2 border-b border-cyber-border/40 pb-2 font-mono text-[9px]">
                <div>
                  <span className="text-[7px] text-slate-500 uppercase block font-bold">Alert ID</span>
                  <span className="text-white font-bold">{activeAlert.id}</span>
                </div>
                <div>
                  <span className="text-[7px] text-slate-500 uppercase block font-bold">Severity</span>
                  <span className="text-cyber-red font-black uppercase tracking-wider">{activeAlert.severity}</span>
                </div>
                <div>
                  <span className="text-[7px] text-slate-500 uppercase block font-bold">Operator</span>
                  <span className="text-white font-bold">{activeAlert.user}</span>
                </div>
              </div>
              <div>
                <span className="text-[7px] text-slate-500 uppercase block font-mono font-bold">Broadcast Message</span>
                <p className="text-slate-200 font-sans mt-1 leading-normal text-[11px] font-semibold select-text">
                  {activeAlert.message}
                </p>
              </div>
              <div className="text-[7px] text-slate-655 text-right font-mono">
                Siren Timestamp: {new Date(activeAlert.timestamp || Date.now()).toLocaleString()}
              </div>
            </div>

            {/* Actions */}
            <button
              onClick={() => setActiveAlert(null)}
              className="w-full py-2.5 bg-cyber-red hover:bg-[#ff1e6d] text-white font-orbitron font-bold uppercase rounded-xl transition-all cursor-pointer shadow-[0_0_15px_rgba(255,0,85,0.25)] border-none text-[10px] tracking-wider"
            >
              ACKNOWLEDGE & CLOSE SIREN
            </button>
          </div>
        </div>
      )}
      {toastMessage && (
        <div 
          className="fixed bottom-6 right-6 z-[999999] bg-[#080c1e]/90 border border-cyber-accent rounded-xl px-4 py-3 text-xs text-white font-mono flex items-center gap-2 shadow-2xl glow-cyan animate-fade-in-up"
          style={{ backdropFilter: 'blur(10px)' }}
        >
          <div className="w-2 h-2 rounded-full bg-cyber-accent animate-ping"></div>
          {toastMessage}
        </div>
      )}
    </div>
  );
}
