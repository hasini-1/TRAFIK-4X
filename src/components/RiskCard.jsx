import React from 'react';

export default function RiskCard({ level }) {
  const getTheme = (val) => {
    const cleanVal = (val || '').toUpperCase();
    if (cleanVal === 'LOW') return { text: 'text-green-400', border: 'border-green-800/30', bg: 'bg-green-500/10', label: 'LOW RISK' };
    if (cleanVal === 'MODERATE') return { text: 'text-blue-400', border: 'border-blue-800/30', bg: 'bg-blue-500/10', label: 'MODERATE RISK' };
    if (cleanVal === 'HIGH') return { text: 'text-amber-500', border: 'border-amber-800/30', bg: 'bg-amber-500/10', label: 'HIGH RISK' };
    if (cleanVal === 'CRITICAL') return { text: 'text-rose-500', border: 'border-rose-800/30', bg: 'bg-rose-500/10', label: 'CRITICAL RISK' };
    return { text: 'text-slate-400', border: 'border-slate-800/30', bg: 'bg-slate-500/10', label: 'UNDETERMINED' };
  };

  const theme = getTheme(level);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-lg flex flex-col justify-between h-36 relative overflow-hidden">
      {/* Background neon glow */}
      <div className={`absolute -right-10 -top-10 w-24 h-24 rounded-full filter blur-xl opacity-20 ${theme.text}`}></div>

      <div>
        <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">Risk Assessment</span>
        <span className="text-slate-500 text-[10px] uppercase tracking-widest font-mono">Similarity-Derived Level</span>
      </div>

      <div className="flex items-center gap-3 mt-2">
        <span className={`text-3xl font-black font-mono tracking-tight ${theme.text}`}>
          {theme.label}
        </span>
      </div>

      {/* Visual Indicator */}
      <div className="flex gap-1.5 mt-2">
        {['LOW', 'MODERATE', 'HIGH', 'CRITICAL'].map((lvl) => {
          const isActive = (level || '').toUpperCase() === lvl;
          const colorClass = isActive 
            ? theme.text.replace('text', 'bg') 
            : 'bg-slate-800/40 border border-slate-800/20';
          return (
            <div 
              key={lvl} 
              className={`h-2 flex-1 rounded-sm transition-all duration-500 ${colorClass}`}
              title={lvl}
            ></div>
          );
        })}
      </div>
    </div>
  );
}
