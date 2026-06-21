import React, { useState } from 'react';

const EVENT_CAUSES = [
  'vehicle_breakdown', 'accident', 'pot_holes', 'construction', 
  'water_logging', 'tree_fall', 'road_conditions', 'congestion', 
  'public_event', 'procession', 'vip_movement', 'protest', 'debris', 'others'
];

const ZONES = [
  'Central Zone 1', 'Central Zone 2', 'North Zone 1', 'North Zone 2', 
  'South Zone 1', 'South Zone 2', 'East Zone 1', 'East Zone 2', 
  'West Zone 1', 'West Zone 2', 'Missing'
];

const CORRIDORS = [
  'Non-corridor', 'Mysore Road', 'Bellary Road 1', 'Tumkur Road', 
  'Bellary Road 2', 'Hosur Road', 'ORR North 1', 'Old Madras Road', 
  'Magadi Road', 'ORR East 1', 'ORR North 2', 'Bannerghata Road', 
  'ORR East 2', 'West of Chord Road', 'ORR West 1', 'CBD 2', 
  'Hennur Main Road', 'IRR(Thanisandra road)', 'Varthur Road', 
  'Old Airport Road', 'Airport New South Road', 'CBD 1', 'Missing'
];

export default function EventForm({ onSubmit, loading }) {
  const [formData, setFormData] = useState({
    event_type: 'unplanned',
    event_cause: 'accident',
    priority: 'High',
    zone: 'Central Zone 2',
    corridor: 'Hosur Road',
    requires_road_closure: true
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="glass-card-exact rounded-xl p-4 shadow-lg">
      <h2 className="text-xs font-orbitron font-bold uppercase tracking-widest text-[#00d2ff] mb-3 border-b border-[#00d2ff]/15 pb-1.5 flex items-center gap-2 select-none">
        <span className="w-1.5 h-1.5 rounded-full bg-[#00ff66] inline-block"></span>
        Report New Incident
      </h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Event Type */}
        <div className="space-y-1">
          <label className="block text-xs font-orbitron font-bold uppercase tracking-widest text-slate-400">Event Type</label>
          <select
            name="event_type"
            value={formData.event_type}
            onChange={handleChange}
            className="w-full h-10 bg-[#050b18] border border-[#00d2ff]/15 focus:border-[#00d2ff] focus:ring-1 focus:ring-[#00d2ff] rounded-lg px-2.5 text-xs text-white outline-none transition-all font-mono cursor-pointer"
          >
            <option value="unplanned">Unplanned</option>
            <option value="planned">Planned</option>
          </select>
        </div>

        {/* Event Cause */}
        <div className="space-y-1">
          <label className="block text-xs font-orbitron font-bold uppercase tracking-widest text-slate-400">Event Cause</label>
          <select
            name="event_cause"
            value={formData.event_cause}
            onChange={handleChange}
            className="w-full h-10 bg-[#050b18] border border-[#00d2ff]/15 focus:border-[#00d2ff] focus:ring-1 focus:ring-[#00d2ff] rounded-lg px-2.5 text-xs text-white outline-none transition-all font-mono cursor-pointer capitalize"
          >
            {EVENT_CAUSES.map((cause) => (
              <option key={cause} value={cause}>
                {cause.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div className="space-y-1">
          <label className="block text-xs font-orbitron font-bold uppercase tracking-widest text-slate-400 font-semibold">Priority Level</label>
          <div className="flex gap-4">
            {['High', 'Low'].map((level) => (
              <label key={level} className="flex items-center gap-1.5 text-xs font-mono text-slate-300 cursor-pointer select-none">
                <input
                  type="radio"
                  name="priority"
                  value={level}
                  checked={formData.priority === level}
                  onChange={handleChange}
                  className="accent-[#00d2ff] cursor-pointer"
                />
                {level.toUpperCase()}
              </label>
            ))}
          </div>
        </div>

        {/* Zone */}
        <div className="space-y-1">
          <label className="block text-xs font-orbitron font-bold uppercase tracking-widest text-slate-400">Operational Zone</label>
          <select
            name="zone"
            value={formData.zone}
            onChange={handleChange}
            className="w-full h-10 bg-[#050b18] border border-[#00d2ff]/15 focus:border-[#00d2ff] focus:ring-1 focus:ring-[#00d2ff] rounded-lg px-2.5 text-xs text-white outline-none transition-all font-mono cursor-pointer"
          >
            {ZONES.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </div>

        {/* Corridor */}
        <div className="space-y-1">
          <label className="block text-xs font-orbitron font-bold uppercase tracking-widest text-slate-400">Corridor</label>
          <select
            name="corridor"
            value={formData.corridor}
            onChange={handleChange}
            className="w-full h-10 bg-[#050b18] border border-[#00d2ff]/15 focus:border-[#00d2ff] focus:ring-1 focus:ring-[#00d2ff] rounded-lg px-2.5 text-xs text-white outline-none transition-all font-mono cursor-pointer"
          >
            {CORRIDORS.map((corridor) => (
              <option key={corridor} value={corridor}>
                {corridor}
              </option>
            ))}
          </select>
        </div>

        {/* Requires Road Closure */}
        <div className="flex items-center justify-between border-t border-[#00d2ff]/10 pt-3 select-none">
          <div>
            <span className="block text-xs font-orbitron font-bold uppercase tracking-wider text-slate-200">Requires Road Closure</span>
            <span className="text-[9px] font-mono text-[#94a3b8]">Deploy police diversion route</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="requires_road_closure"
              checked={formData.requires_road_closure}
              onChange={handleChange}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-[#050b18] border border-[#00d2ff]/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-500 after:border-slate-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00d2ff] peer-checked:after:bg-black peer-checked:after:border-transparent"></div>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 bg-[#00d2ff] hover:bg-[#00f0ff] text-black font-orbitron font-extrabold uppercase text-xs tracking-wider rounded-lg transition-all btn-glow-cyan flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer border-none"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5 text-black" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              RUNNING DNA MODEL...
            </>
          ) : (
            'ANALYZE IMPACT SCORE'
          )}
        </button>
      </form>
    </div>
  );
}
