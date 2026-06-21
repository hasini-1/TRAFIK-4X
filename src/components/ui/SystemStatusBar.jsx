import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, Activity, Cpu } from 'lucide-react';

export default function SystemStatusBar() {
  const { user, role } = useAuth();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getSystemRoleBadge = (userRole) => {
    switch (userRole) {
      case 'CONSTABLE': return 'text-cyber-green border-cyber-green/30 bg-cyber-green/5';
      case 'INSPECTOR': return 'text-cyber-yellow border-cyber-yellow/30 bg-cyber-yellow/5';
      case 'SENIOR_OFFICIAL': return 'text-cyber-red border-cyber-red/30 bg-cyber-red/5';
      case 'COMMAND_CENTER': return 'text-cyber-accent border-cyber-accent/30 bg-cyber-accent/5';
      default: return 'text-slate-500 border-slate-800 bg-slate-900/40';
    }
  };

  return (
    <div className="bg-[#030611] border-b border-cyber-border px-4 py-1.5 flex justify-between items-center text-[9px] font-mono tracking-wider select-none text-slate-500 z-50">
      <div className="flex items-center gap-4.5">
        <span className="flex items-center gap-1.5 text-cyber-accent">
          <Activity className="w-3.5 h-3.5 text-cyber-accent" />
          SYS_NODE: TRAFIK_4X_MAIN
        </span>
        <span className="hidden md:inline-flex items-center gap-1">
          <Cpu className="w-3 h-3" />
          CORE_TEMP: 42°C
        </span>
        <span className="hidden sm:inline">
          LINK: SECURE_STABLE
        </span>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-2">
            <span>OPERATOR:</span>
            <span className="text-white font-bold">{user.name}</span>
            <span className={`px-1.5 py-0.5 rounded border text-[8px] uppercase font-bold tracking-widest ${getSystemRoleBadge(role)}`}>
              {role.replace('_', ' ')}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-white font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-cyber-green"></span>
          {time.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
