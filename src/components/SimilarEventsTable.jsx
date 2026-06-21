import React from 'react';

export default function SimilarEventsTable({ events }) {
  const getRiskColor = (val) => {
    if (val <= 25) return 'text-[#00ff66]';
    if (val <= 50) return 'text-[#ffcc00]';
    if (val <= 75) return 'text-[#ff7700]';
    return 'text-[#ff0055]';
  };

  return (
    <div className="glass-card-exact rounded-xl p-5 shadow-lg flex-1">
      <h3 className="text-[10px] font-orbitron font-bold uppercase tracking-widest text-[#00d2ff] mb-4 border-b border-[#00d2ff]/15 pb-2">
        Operational Similarity Analysis (Historical Matches)
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#00d2ff]/15 text-[9px] uppercase font-orbitron tracking-widest text-slate-500 bg-[#080c1e]/40">
              <th className="py-2.5 px-3">Event ID</th>
              <th className="py-2.5 px-3 text-right">Similarity</th>
              <th className="py-2.5 px-3 text-right">Impact Score</th>
              <th className="py-2.5 px-3">Event Cause</th>
              <th className="py-2.5 px-3">Zone</th>
            </tr>
          </thead>
        </table>
        <div className="max-h-48 overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <tbody className="divide-y divide-[#00d2ff]/5 text-xs font-medium">
              {events && events.length > 0 ? (
                events.map((event) => (
                  <tr key={event.event_id} className="hover:bg-[#00d2ff]/5 transition-colors">
                    <td className="py-3 px-3 text-slate-300 font-mono select-all">{event.event_id}</td>
                    <td className="py-3 px-3 text-right text-[#00d2ff] font-mono font-bold">
                      {(event.similarity_score * 100).toFixed(0)}%
                    </td>
                    <td className={`py-3 px-3 text-right font-mono font-bold ${getRiskColor(event.historical_impact_score)}`}>
                      {event.historical_impact_score.toFixed(1)}
                    </td>
                    <td className="py-3 px-3 text-slate-400 capitalize font-mono text-[11px]">
                      {event.event_cause.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">{event.zone}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-500 font-mono text-xs uppercase tracking-widest">
                    No matching profile queried
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
