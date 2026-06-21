import React from 'react';

export default function ConfidenceCard({ score }) {
  // Map confidence values to qualitative terms
  const getQualityLabel = (val) => {
    if (val >= 90) return 'HIGH MATCH FIDELITY';
    if (val >= 70) return 'MODERATE FIDELITY';
    return 'LOW MATCH FIDELITY';
  };

  const formattedScore = score !== null && score !== undefined ? score.toFixed(1) : null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-lg flex flex-col justify-between h-36 relative overflow-hidden">
      {/* Background neon glow */}
      <div className="absolute -right-10 -top-10 w-24 h-24 rounded-full filter blur-xl opacity-20 bg-blue-500"></div>

      <div>
        <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">Engine Confidence</span>
        <span className="text-slate-500 text-[10px] uppercase tracking-widest font-mono">Profile Similarity Mean</span>
      </div>

      <div className="flex items-baseline gap-2 mt-2">
        <span className="text-4xl font-extrabold font-mono tracking-tighter text-blue-400">
          {formattedScore !== null ? `${formattedScore}%` : '--'}
        </span>
      </div>

      <div className="mt-1">
        <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5">
          {formattedScore !== null ? getQualityLabel(score) : 'AWAITING INCIDENT'}
        </span>
      </div>
    </div>
  );
}
