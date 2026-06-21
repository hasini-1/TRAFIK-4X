import React from 'react';

export default function StrategyCard({ actions }) {
  return (
    <div className="bg-command-card border border-slate-800 rounded-lg p-5 shadow-lg h-full flex flex-col">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3 border-b border-slate-800 pb-2">
        Operational Strategy
      </h3>
      <div className="flex-1">
        {actions && actions.length > 0 ? (
          <ul className="space-y-3.5 mt-2">
            {actions.map((action, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-slate-200 text-xs font-semibold">
                <span className="text-command-accent font-bold text-sm leading-none mt-0.5">✓</span>
                <span className="leading-relaxed">{action}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500 font-mono text-xs uppercase tracking-wider py-8">
            Awaiting operational query
          </div>
        )}
      </div>
    </div>
  );
}
