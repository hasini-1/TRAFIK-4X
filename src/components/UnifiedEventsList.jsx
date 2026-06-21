import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import CommandCard from './ui/CommandCard';
import StatusBadge from './ui/StatusBadge';
import CommandButton from './ui/CommandButton';
import { 
  Filter, 
  MapPin, 
  Eye, 
  Search,
  Activity,
  AlertOctagon,
  Clock
} from 'lucide-react';

export default function UnifiedEventsList() {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [timelineEvent, setTimelineEvent] = useState(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [zoneFilter, setZoneFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const [pendingRes, approvedRes, activeRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/events/pending`),
        axios.get(`${API_BASE_URL}/events/approved`),
        axios.get(`${API_BASE_URL}/events/active`)
      ]);
      const merged = [...pendingRes.data, ...approvedRes.data, ...activeRes.data];
      // Deduplicate by event_id
      const unique = merged.filter((v, i, a) => a.findIndex(t => t.event_id === v.event_id) === i);
      setEvents(unique);
      setFilteredEvents(unique);
    } catch (err) {
      console.error("Failed to load unified events list:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();

    const handleRefresh = () => {
      fetchEvents();
    };
    window.addEventListener('refresh-notifications', handleRefresh);

    return () => {
      window.removeEventListener('refresh-notifications', handleRefresh);
    };
  }, []);

  useEffect(() => {
    let result = [...events];
    
    if (search) {
      result = result.filter(e => 
        e.event_id.toLowerCase().includes(search.toLowerCase()) ||
        e.event_cause.toLowerCase().includes(search.toLowerCase()) ||
        e.corridor.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (priorityFilter !== 'ALL') {
      result = result.filter(e => e.priority === priorityFilter);
    }
    if (zoneFilter !== 'ALL') {
      result = result.filter(e => e.zone === zoneFilter);
    }
    if (statusFilter !== 'ALL') {
      result = result.filter(e => e.status === statusFilter);
    }
    
    setFilteredEvents(result);
  }, [search, priorityFilter, zoneFilter, statusFilter, events]);

  const viewTimeline = async (eventId) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/events/timeline/${eventId}`);
      setTimelineEvent(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load SLA timeline details.");
    }
  };

  // Get unique values for filter dropdowns
  const zones = ['ALL', ...new Set(events.map(e => e.zone))];
  const statuses = ['ALL', ...new Set(events.map(e => e.status))];

  return (
    <div className="space-y-6 font-sans">
      
      {/* Search and Cyber Filters Panel */}
      <CommandCard title="INCIDENT QUERY & SEARCH MATRIX">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          
          {/* Search */}
          <div className="relative">
            <label className="block text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-1.5">Search Query</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ID, Cause, Corridor..."
                className="w-full bg-[#030611] border border-cyber-border focus:border-cyber-accent rounded-lg py-2 pl-10 pr-3 text-xs text-white outline-none font-mono"
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-1.5">Priority Filter</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full bg-[#030611] border border-cyber-border focus:border-cyber-accent rounded-lg py-2 px-3 text-xs text-white outline-none font-mono"
            >
              <option value="ALL">ALL PRIORITIES</option>
              <option value="High">HIGH</option>
              <option value="Medium">MEDIUM</option>
              <option value="Low">LOW</option>
            </select>
          </div>

          {/* Zone */}
          <div>
            <label className="block text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-1.5">Operational Zone</label>
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="w-full bg-[#030611] border border-cyber-border focus:border-cyber-accent rounded-lg py-2 px-3 text-xs text-white outline-none font-mono"
            >
              {zones.map(z => (
                <option key={z} value={z}>{z.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-1.5">Workflow Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-[#030611] border border-cyber-border focus:border-cyber-accent rounded-lg py-2 px-3 text-xs text-white outline-none font-mono"
            >
              {statuses.map(s => (
                <option key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</option>
              ))}
            </select>
          </div>

        </div>
      </CommandCard>

      {/* Events Listing Table */}
      <CommandCard title={`INCIDENTS MAPPED: ${filteredEvents.length}`}>
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 font-mono">
            Executing matrix query...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 font-mono">
            No incidents matched the parameters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs font-mono text-slate-350">
              <thead>
                <tr className="border-b border-[#00d2ff]/15 text-slate-500 uppercase text-[9px] font-orbitron tracking-widest bg-[#080c1e]/40">
                  <th className="p-3">Event ID</th>
                  <th className="p-3">Cause / Category</th>
                  <th className="p-3">Zone / Corridor</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Final Resources</th>
                  <th className="p-3 text-right">Telemetry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyber-border/40">
                {filteredEvents.map((ev) => (
                  <tr key={ev.event_id} className="hover:bg-[#00d2ff]/5 transition-colors">
                    <td className="p-3 font-bold text-white select-all">{ev.event_id}</td>
                    <td className="p-3 capitalize font-sans">{ev.event_cause.replace('_', ' ')}</td>
                    <td className="p-3">
                      <div>{ev.zone}</div>
                      <div className="text-[10px] text-slate-500">{ev.corridor}</div>
                    </td>
                    <td className="p-3">
                      <span className={`font-bold ${ev.priority === 'High' ? 'text-cyber-orange' : ev.priority === 'Medium' ? 'text-cyber-yellow' : 'text-cyber-green'}`}>
                        {ev.priority.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3">
                      <StatusBadge status={ev.status} />
                    </td>
                    <td className="p-3 text-[10px]">
                      {ev.final_officers !== null ? (
                        <span>O:{ev.final_officers} | B:{ev.final_barricades} | T:{ev.final_tow_vehicles}</span>
                      ) : (
                        <span className="text-slate-500">Unallocated</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <CommandButton
                        onClick={() => viewTimeline(ev.event_id)}
                        variant="secondary"
                        className="py-1 px-2.5 text-[9px]"
                      >
                        TIMELINE
                      </CommandButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CommandCard>

      {/* Timeline Modal overlay */}
      {timelineEvent && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-xl bg-cyber-card border border-cyber-border rounded-xl overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-cyber-accent"></div>
            
            <div className="p-4 border-b border-cyber-border flex justify-between items-center bg-[#070c1e]/60">
              <h3 className="text-sm font-bold text-white font-mono uppercase">
                SLA TIMELINE: {timelineEvent.event_id}
              </h3>
              <button
                onClick={() => setTimelineEvent(null)}
                className="text-slate-400 hover:text-white text-[10px] font-mono border border-cyber-border px-2 py-1 rounded cursor-pointer"
              >
                CLOSE
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[400px] overflow-y-auto">
              
              {/* SLA Statistics Display */}
              <div className="grid grid-cols-3 gap-3 bg-slate-950/50 border border-cyber-border rounded-lg p-3 text-center">
                <div className="space-y-0.5">
                  <div className="text-[9px] font-mono text-slate-500 uppercase">Review Time</div>
                  <div className="text-sm font-bold text-cyber-yellow font-mono">
                    {timelineEvent.review_time_minutes !== null ? `${timelineEvent.review_time_minutes}m` : '--'}
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-[9px] font-mono text-slate-500 uppercase">Approval Time</div>
                  <div className="text-sm font-bold text-cyber-green font-mono">
                    {timelineEvent.approval_time_minutes !== null ? `${timelineEvent.approval_time_minutes}m` : '--'}
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-[9px] font-mono text-slate-500 uppercase">Resolution Time</div>
                  <div className="text-sm font-bold text-cyber-accent font-mono">
                    {timelineEvent.resolution_time_minutes !== null ? `${timelineEvent.resolution_time_minutes}m` : '--'}
                  </div>
                </div>
              </div>

              {/* Timeline Chain */}
              <div className="relative border-l-2 border-cyber-border/40 ml-3.5 pl-6 space-y-5">
                {timelineEvent.history.map((log) => (
                  <div key={log.id} className="relative">
                    <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border border-cyber-accent bg-cyber-card flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyber-accent"></div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                          {log.new_status.replace('_', ' ')}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Officer: <span className="text-slate-350 font-bold">{log.user_name}</span> ({log.role})
                      </div>
                      {log.comments && (
                        <p className="text-xs text-slate-400 italic bg-slate-950/40 p-2 border border-cyber-border/40 rounded-lg">
                          &ldquo;{log.comments}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
