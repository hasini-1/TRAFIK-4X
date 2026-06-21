import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import CommandCard from '../ui/CommandCard';
import CommandButton from '../ui/CommandButton';
import StatusBadge from '../ui/StatusBadge';
import { 
  Users, 
  Search, 
  UserCheck, 
  UserX, 
  ShieldAlert, 
  MapPin, 
  UserMinus,
  CheckCircle,
  XCircle,
  HelpCircle
} from 'lucide-react';

export default function SeniorOfficialPersonnel() {
  const roleMappings = {
    'SENIOR_OFFICIAL': 'Traffic Commissioner',
    'COMMAND_CENTER': 'Traffic Command Control Operator',
    'CONSTABLE': 'On-Site Traffic Officer',
    'INSPECTOR': 'On-Site Traffic Officer',
    'EMERGENCY_RESPONSE': 'Emergency Rescue Team'
  };

  const [allUsers, setAllUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState('ALL');
  
  // Comments and Action loadings
  const [vettingComments, setVettingComments] = useState({});
  const [actionLoading, setActionLoading] = useState({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [allRes, pendingRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/users/all`),
        axios.get(`${API_BASE_URL}/users/pending`)
      ]);
      setAllUsers(allRes.data);
      setPendingUsers(pendingRes.data);
    } catch (err) {
      console.error("Failed to load personnel data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApproveOnboarding = async (userId) => {
    setActionLoading(prev => ({ ...prev, [userId]: 'approve' }));
    try {
      await axios.post(`${API_BASE_URL}/users/approve/${userId}`, {
        comments: vettingComments[userId] || 'Approved for operational entry.'
      });
      await fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to approve onboarding.");
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: null }));
    }
  };

  const handleRejectOnboarding = async (userId) => {
    if (!vettingComments[userId]) {
      alert("Please provide comments/reasons before rejecting onboarding.");
      return;
    }
    setActionLoading(prev => ({ ...prev, [userId]: 'reject' }));
    try {
      await axios.post(`${API_BASE_URL}/users/reject/${userId}`, {
        comments: vettingComments[userId]
      });
      await fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to reject onboarding.");
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: null }));
    }
  };

  const handleToggleSuspend = async (userId, currentStatus) => {
    const targetStatus = currentStatus === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    setActionLoading(prev => ({ ...prev, [userId]: 'suspend' }));
    try {
      await axios.post(`${API_BASE_URL}/users/update-status/${userId}`, {
        status: targetStatus,
        comments: `Status updated to ${targetStatus} via Traffic Commissioner personnel desk.`
      });
      await fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to update personnel status.");
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: null }));
    }
  };

  // Filtered lists
  const filteredUsers = allUsers.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (u.employee_id && u.employee_id.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesZone = selectedZone === 'ALL' || u.zone === selectedZone;
    return matchesSearch && matchesZone;
  });

  const activePersonnel = filteredUsers.filter(u => u.status === 'ACTIVE');
  const suspendedPersonnel = filteredUsers.filter(u => u.status === 'SUSPENDED');
  
  // Extract unique zones for filters
  const zones = ['ALL', ...new Set(allUsers.map(u => u.zone).filter(Boolean))];

  return (
    <div className="space-y-6 font-sans">
      
      {/* Top Search and Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 select-none items-center">
        
        {/* Search */}
        <div className="md:col-span-8 relative">
          <Search className="w-5 h-5 text-slate-500 absolute left-4.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search officers by name or Employee ID..."
            className="w-full h-16 bg-[#0a0f26]/40 border border-cyber-border rounded-xl pl-13 pr-4 text-base text-slate-200 outline-none focus:border-cyber-accent font-mono transition-all placeholder-slate-700"
          />
        </div>

        {/* Zone filter */}
        <div className="md:col-span-4 bg-[#0a0f26]/40 border border-cyber-border rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-sm font-mono font-bold text-slate-500 uppercase">Zone:</span>
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="bg-transparent text-sm font-mono font-bold text-white border-none outline-none cursor-pointer flex-1"
          >
            {zones.map(z => (
              <option key={z} value={z} className="bg-[#050b18]">{z}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Main Grid: Onboarding Vetting Panel vs Active/Suspended Directory */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Onboarding Vetting Desk (lg:col-span-5) */}
        <div className="lg:col-span-5">
          <CommandCard title="Pending Onboarding Registry">
            <div className="space-y-4">
              {pendingUsers.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 font-mono border border-dashed border-cyber-border/40 rounded-lg select-none">
                  No pending onboarding requests require review.
                </div>
              ) : (
                pendingUsers.map((u) => (
                  <div key={u.id} className="p-4 bg-[#0a0f26]/40 border border-cyber-border rounded-lg space-y-4 font-mono">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm font-bold text-white select-all">{u.name}</div>
                        <div className="text-[10px] text-slate-500 mt-1 uppercase">
                          Employee ID: {u.employee_id || 'N/A'}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Assigned Zone: <span className="text-white font-bold">{u.zone}</span>
                        </div>
                      </div>
                      <span className="text-[8px] bg-cyber-yellow/10 border border-cyber-yellow/20 text-cyber-yellow px-1.5 py-0.2 rounded font-bold uppercase tracking-wider">
                        {roleMappings[u.role] || u.role}
                      </span>
                    </div>

                    {/* Vetting comments input */}
                    <div className="space-y-1.5 select-none">
                      <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Security Vetting Note:</span>
                      <textarea
                        value={vettingComments[u.id] || ''}
                        onChange={(e) => setVettingComments({ ...vettingComments, [u.id]: e.target.value })}
                        placeholder="Write onboarding clearance remarks..."
                        className="w-full bg-[#050b18] border border-[#00d2ff]/10 focus:border-[#00d2ff] rounded-lg p-2.5 text-xs text-white placeholder-slate-800 outline-none transition-all resize-none h-18"
                      />
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2.5 pt-1 select-none">
                      <CommandButton
                        onClick={() => handleRejectOnboarding(u.id)}
                        disabled={actionLoading[u.id] === 'reject'}
                        variant="secondary"
                        className="flex-1 py-1 text-[10px]"
                      >
                        <UserX className="w-3.5 h-3.5 mr-1" />
                        REJECT ENTRY
                      </CommandButton>

                      <CommandButton
                        onClick={() => handleApproveOnboarding(u.id)}
                        disabled={actionLoading[u.id] === 'approve'}
                        variant="success"
                        className="flex-1 py-1 text-[10px]"
                      >
                        <UserCheck className="w-3.5 h-3.5 mr-1 text-slate-950" />
                        GRANT ACCESS
                      </CommandButton>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CommandCard>
        </div>

        {/* Directory Listings (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Active Directory */}
          <CommandCard title="Active Personnel Directory">
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {activePersonnel.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 font-mono border border-dashed border-cyber-border/40 rounded-lg select-none">
                  No active officers match current filter criteria.
                </div>
              ) : (
                activePersonnel.map((u) => (
                  <div key={u.id} className="p-4 bg-[#0a0f26]/40 border border-cyber-border rounded-lg flex items-center justify-between font-mono">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white select-all">{u.name}</span>
                        <span className="text-[8px] bg-cyber-green/10 border border-cyber-green/20 text-cyber-green px-1.5 py-0.2 rounded uppercase font-bold tracking-wider">
                          {roleMappings[u.role] || u.role}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Employee ID: <span className="text-white font-bold select-all">{u.employee_id || 'N/A'}</span> &bull; Zone: {u.zone}
                      </div>
                      <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">
                        Tel: {u.phone_number || 'N/A'}
                      </div>
                    </div>

                    <CommandButton
                      onClick={() => handleToggleSuspend(u.id, u.status)}
                      disabled={actionLoading[u.id] === 'suspend'}
                      variant="secondary"
                      className="py-1 px-3 text-[10px] select-none text-cyber-red border-cyber-red/20 hover:border-cyber-red/50 hover:bg-cyber-red/5"
                    >
                      <UserMinus className="w-3.5 h-3.5 mr-1" />
                      SUSPEND
                    </CommandButton>
                  </div>
                ))
              )}
            </div>
          </CommandCard>

          {/* Suspended Directory */}
          <CommandCard title="Suspended Personnel Registry">
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {suspendedPersonnel.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 font-mono border border-dashed border-cyber-border/40 rounded-lg select-none">
                  No suspended officers on record.
                </div>
              ) : (
                suspendedPersonnel.map((u) => (
                  <div key={u.id} className="p-4 bg-[#0a0f26]/40 border border-cyber-border/30 rounded-lg flex items-center justify-between font-mono opacity-80">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-400 select-all">{u.name}</span>
                        <span className="text-[8px] bg-cyber-red/10 border border-cyber-red/20 text-cyber-red px-1.5 py-0.2 rounded uppercase font-bold tracking-wider">
                          SUSPENDED
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-550">
                        Employee ID: <span className="text-slate-400 select-all">{u.employee_id || 'N/A'}</span> &bull; Zone: {u.zone}
                      </div>
                    </div>

                    <CommandButton
                      onClick={() => handleToggleSuspend(u.id, u.status)}
                      disabled={actionLoading[u.id] === 'suspend'}
                      variant="success"
                      className="py-1 px-3 text-[10px] select-none text-cyber-green border-cyber-green/20 hover:border-cyber-green/50 hover:bg-cyber-green/5"
                    >
                      <UserCheck className="w-3.5 h-3.5 mr-1 text-cyber-green" />
                      ACTIVATE
                    </CommandButton>
                  </div>
                ))
              )}
            </div>
          </CommandCard>

        </div>

      </div>

    </div>
  );
}
