import React from 'react';

export default function ImpactCard({ score }) {
  // Determine color theme based on score severity
  const getTheme = (val) => {
    if (val <= 25) return { text: 'text-green-400', border: 'border-green-800/30', bg: 'bg-green-500/10', bar: 'bg-green-500' };
    if (val <= 50) return { text: 'text-blue-400', border: 'border-blue-800/30', bg: 'bg-blue-500/10', bar: 'bg-blue-500' };
    if (val <= 75) return { text: 'text-amber-500', border: 'border-amber-800/30', bg: 'bg-amber-500/10', bar: 'bg-amber-500' };
    return { text: 'text-rose-500', border: 'border-rose-800/30', bg: 'bg-rose-500/10', bar: 'bg-rose-500' };
  };

  const theme = getTheme(score || 0);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-lg flex flex-col justify-between h-36 relative overflow-hidden">
      {/* Background neon glow */}
      <div className={`absolute -right-10 -top-10 w-24 h-24 rounded-full filter blur-xl opacity-20 ${theme.bar}`}></div>

      <div>
        <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">Predicted Impact Score</span>
        <span className="text-slate-500 text-[10px] uppercase tracking-widest font-mono">XGBoost Regression Model</span>
      </div>

      <div className="flex items-baseline gap-2 mt-2">
        <span className={`text-4xl font-extrabold font-mono tracking-tighter ${theme.text}`}>
          {score !== null && score !== undefined ? score.toFixed(1) : '--'}
        </span>
        <span className="text-slate-500 text-xs font-mono">/ 100</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-950 rounded-full h-1.5 mt-2 border border-slate-800">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ${theme.bar}`}
          style={{ width: `${Math.min(100, score || 0)}%` }}
        ></div>
      </div>
    </div>
  );
}
