import React from 'react';

export default function ThreatPanel({ title, value, level, max = 100, className = '' }) {
  const getSeverityColors = (lvl) => {
    const norm = lvl ? lvl.toUpperCase() : 'NORMAL';
    if (norm === 'EMERGENCY' || norm === 'CRITICAL' || norm === 'RED') {
      return {
        bar: 'bg-cyber-red shadow-[0_0_6px_#ff0055]',
        text: 'text-cyber-red',
        bg: 'bg-cyber-red/5 border-cyber-red/15'
      };
    }
    if (norm === 'HIGH' || norm === 'ORANGE') {
      return {
        bar: 'bg-cyber-orange',
        text: 'text-cyber-orange',
        bg: 'bg-cyber-orange/5 border-cyber-orange/15'
      };
    }
    if (norm === 'ELEVATED' || norm === 'MODERATE' || norm === 'YELLOW') {
      return {
        bar: 'bg-cyber-yellow',
        text: 'text-cyber-yellow',
        bg: 'bg-cyber-yellow/5 border-cyber-yellow/15'
      };
    }
    return {
      bar: 'bg-cyber-green',
      text: 'text-cyber-green',
      bg: 'bg-cyber-green/5 border-cyber-green/15'
    };
  };

  const colors = getSeverityColors(level);
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={`glass-card-exact rounded-xl p-4 font-mono select-none ${colors.bg} ${className}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="space-y-0.5">
          <span className="text-[9px] text-slate-500 uppercase tracking-widest block">{title}</span>
          <span className={`text-[11px] font-bold ${colors.text} uppercase tracking-wider`}>
            {level || 'Normal'}
          </span>
        </div>
        <div className="text-right">
          <span className="text-lg font-black text-white">{typeof value === 'number' ? value.toFixed(1) : value}</span>
          <span className="text-[9px] text-slate-500">/{max}</span>
        </div>
      </div>
      
      {/* Cyber bar tracker */}
      <div className="h-2 w-full bg-[#050b18] rounded-full overflow-hidden p-[1px] border border-[#00d2ff]/10">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${colors.bar}`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
