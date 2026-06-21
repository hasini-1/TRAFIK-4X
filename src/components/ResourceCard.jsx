import React from 'react';

export default function ResourceCard({ resources }) {
  const getLevelColor = (val) => {
    const cleanLvl = (val || '').toUpperCase();
    if (cleanLvl === 'NORMAL') return 'text-command-low border-command-low/20 bg-command-low/10';
    if (cleanLvl === 'ELEVATED') return 'text-command-moderate border-command-moderate/20 bg-command-moderate/10';
    if (cleanLvl === 'CRITICAL') return 'text-command-high border-command-high/20 bg-command-high/10';
    if (cleanLvl === 'EMERGENCY') return 'text-command-critical border-command-critical/20 bg-command-critical/10';
    return 'text-slate-400 border-slate-800 bg-slate-800/10';
  };

  const officers = resources?.officers ?? 0;
  const barricades = resources?.barricades ?? 0;
  const towVehicles = resources?.tow_vehicles ?? 0;
  const level = resources?.response_level ?? 'Normal';

  return (
    <div className="bg-command-card border border-slate-800 rounded-lg p-5 shadow-lg flex flex-col justify-between h-full">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3 border-b border-slate-800 pb-2">
          Resource Allocation
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {/* Officers */}
          <div className="bg-slate-950 border border-slate-800/60 rounded p-3 text-center">
            <span className="block text-[10px] uppercase font-mono text-slate-500 tracking-wider font-semibold">Officers</span>
            <span className="text-2xl font-bold font-mono text-slate-200 mt-1 block">{officers}</span>
          </div>

          {/* Barricades */}
          <div className="bg-slate-950 border border-slate-800/60 rounded p-3 text-center">
            <span className="block text-[10px] uppercase font-mono text-slate-500 tracking-wider font-semibold">Barricades</span>
            <span className="text-2xl font-bold font-mono text-slate-200 mt-1 block">{barricades}</span>
          </div>

          {/* Tow Vehicles */}
          <div className="bg-slate-950 border border-slate-800/60 rounded p-3 text-center">
            <span className="block text-[10px] uppercase font-mono text-slate-500 tracking-wider font-semibold">Tows</span>
            <span className="text-2xl font-bold font-mono text-slate-200 mt-1 block">{towVehicles}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-slate-800/60 pt-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase">Response Level:</span>
        <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-widest rounded border ${getLevelColor(level)}`}>
          {level}
        </span>
      </div>
    </div>
  );
}
