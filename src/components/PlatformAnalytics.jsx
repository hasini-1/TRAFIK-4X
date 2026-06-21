import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import CommandCard from './ui/CommandCard';
import ThreatPanel from './ui/ThreatPanel';
import { BarChart3, Clock, Map, AlertCircle, Award } from 'lucide-react';

export default function PlatformAnalytics() {
  const [events, setEvents] = useState([]);
  const [timelines, setTimelines] = useState([]);
  const [loading, setLoading] = useState(false);

  // Computed Stats
  const [avgImpact, setAvgImpact] = useState(0);
  const [priorityCounts, setPriorityCounts] = useState({ High: 0, Medium: 0, Low: 0 });
  const [zoneCounts, setZoneCounts] = useState({});
  const [avgReviewTime, setAvgReviewTime] = useState(0);
  const [avgApprovalTime, setAvgApprovalTime] = useState(0);
  const [avgResolutionTime, setAvgResolutionTime] = useState(0);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [pendingRes, approvedRes, activeRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/events/pending`),
        axios.get(`${API_BASE_URL}/events/approved`),
        axios.get(`${API_BASE_URL}/events/active`)
      ]);
      const merged = [...pendingRes.data, ...approvedRes.data, ...activeRes.data];
      const unique = merged.filter((v, i, a) => a.findIndex(t => t.event_id === v.event_id) === i);
      setEvents(unique);

      // Compute statistics
      if (unique.length > 0) {
        const totalImpact = unique.reduce((sum, e) => sum + e.impact_score, 0);
        setAvgImpact(totalImpact / unique.length);

        const priorities = { High: 0, Medium: 0, Low: 0 };
        const zones = {};

        unique.forEach(e => {
          if (priorities[e.priority] !== undefined) {
            priorities[e.priority] += 1;
          }
          zones[e.zone] = (zones[e.zone] || 0) + 1;
        });

        setPriorityCounts(priorities);
        setZoneCounts(zones);
      }

      // Fetch timelines for up to 10 events to compute average SLA metrics
      const timelinePromises = unique.slice(0, 10).map(e => 
        axios.get(`${API_BASE_URL}/events/timeline/${e.event_id}`).catch(() => null)
      );
      const timelineRes = await Promise.all(timelinePromises);
      const validTimelines = timelineRes.filter(r => r !== null).map(r => r.data);
      setTimelines(validTimelines);

      if (validTimelines.length > 0) {
        const reviewTimes = validTimelines.filter(t => t.review_time_minutes !== null).map(t => t.review_time_minutes);
        const approvalTimes = validTimelines.filter(t => t.approval_time_minutes !== null).map(t => t.approval_time_minutes);
        const resolutionTimes = validTimelines.filter(t => t.resolution_time_minutes !== null).map(t => t.resolution_time_minutes);

        if (reviewTimes.length > 0) {
          setAvgReviewTime(reviewTimes.reduce((s, v) => s + v, 0) / reviewTimes.length);
        }
        if (approvalTimes.length > 0) {
          setAvgApprovalTime(approvalTimes.reduce((s, v) => s + v, 0) / approvalTimes.length);
        }
        if (resolutionTimes.length > 0) {
          setAvgResolutionTime(resolutionTimes.reduce((s, v) => s + v, 0) / resolutionTimes.length);
        }
      }

    } catch (err) {
      console.error("Failed to load analytics statistics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Compute maximum zone count for scaling
  const maxZoneCount = Object.keys(zoneCounts).length > 0 ? Math.max(...Object.values(zoneCounts)) : 1;
  const maxPriorityCount = Math.max(...Object.values(priorityCounts), 1);

  return (
    <div className="space-y-6 font-sans">
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Total Events */}
        <CommandCard title="TOTAL INCIDENTS REGISTRY">
          <div className="flex justify-between items-center py-2">
            <div className="space-y-1">
              <span className="text-2xl font-black text-white font-mono">{events.length}</span>
              <span className="text-[9px] text-slate-500 block uppercase font-mono">Mapped Incidents</span>
            </div>
            <BarChart3 className="w-8 h-8 text-cyber-accent opacity-80" />
          </div>
        </CommandCard>

        {/* Avg Impact Score */}
        <div className="md:col-span-2">
          <ThreatPanel 
            title="AVERAGE INCIDENT IMPACT RATING" 
            value={avgImpact} 
            level={avgImpact >= 75 ? 'Critical' : avgImpact >= 50 ? 'High' : avgImpact >= 25 ? 'Moderate' : 'Normal'}
            max={100}
          />
        </div>

        {/* Active Timelines Vetted */}
        <CommandCard title="SLA SAMPLING INDEX">
          <div className="flex justify-between items-center py-2">
            <div className="space-y-1">
              <span className="text-2xl font-black text-cyber-green font-mono">{timelines.length}</span>
              <span className="text-[9px] text-slate-500 block uppercase font-mono">Trace Audited Cases</span>
            </div>
            <Clock className="w-8 h-8 text-cyber-green opacity-80" />
          </div>
        </CommandCard>

      </div>

      {/* SLA Timing Performance & Priorities Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* SLA Timings */}
        <div className="lg:col-span-6">
          <CommandCard title="SLA LIFECYCLE METRICS (MINUTES)">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500 font-mono">
                Querying SLA telemetry...
              </div>
            ) : (
              <div className="space-y-4 py-2">
                
                {/* Review Time */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">AVG REVIEW SPEED (INSPECTOR)</span>
                    <span className="text-cyber-yellow font-bold">{avgReviewTime.toFixed(2)} Min</span>
                  </div>
                  <div className="h-2 w-full bg-slate-900 border border-cyber-border rounded overflow-hidden">
                    <div 
                      className="h-full bg-cyber-yellow shadow-[0_0_6px_#ffcc00] transition-all duration-500"
                      style={{ width: `${Math.min(100, (avgReviewTime / 5) * 100)}%` }} // scale based on 5min SLA limit
                    />
                  </div>
                </div>

                {/* Approval Time */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">AVG APPROVAL SPEED (TRAFFIC COMMISSIONER)</span>
                    <span className="text-cyber-green font-bold">{avgApprovalTime.toFixed(2)} Min</span>
                  </div>
                  <div className="h-2 w-full bg-slate-900 border border-cyber-border rounded overflow-hidden">
                    <div 
                      className="h-full bg-cyber-green shadow-[0_0_6px_#00ff66] transition-all duration-500"
                      style={{ width: `${Math.min(100, (avgApprovalTime / 5) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Resolution Time */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">AVG RESOLUTION TIME (TRAFFIC COMMAND CONTROL OPERATOR)</span>
                    <span className="text-cyber-accent font-bold">{avgResolutionTime.toFixed(2)} Min</span>
                  </div>
                  <div className="h-2 w-full bg-slate-900 border border-cyber-border rounded overflow-hidden">
                    <div 
                      className="h-full bg-cyber-accent shadow-[0_0_6px_#00f0ff] transition-all duration-500"
                      style={{ width: `${Math.min(100, (avgResolutionTime / 10) * 100)}%` }}
                    />
                  </div>
                </div>

              </div>
            )}
          </CommandCard>
        </div>

        {/* Priority Counts */}
        <div className="lg:col-span-6">
          <CommandCard title="INCIDENT CLASSIFICATION SPLIT">
            <div className="space-y-4 py-2">
              
              {/* High */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-cyber-red font-bold">HIGH SEVERITY</span>
                  <span className="text-white font-bold">{priorityCounts.High} Cases</span>
                </div>
                <div className="h-2 w-full bg-slate-900 border border-cyber-border rounded overflow-hidden">
                  <div 
                    className="h-full bg-cyber-red shadow-[0_0_6px_#ff0055] transition-all duration-500"
                    style={{ width: `${(priorityCounts.High / maxPriorityCount) * 100}%` }}
                  />
                </div>
              </div>

              {/* Medium */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-cyber-yellow font-bold">MEDIUM SEVERITY</span>
                  <span className="text-white font-bold">{priorityCounts.Medium} Cases</span>
                </div>
                <div className="h-2 w-full bg-slate-900 border border-cyber-border rounded overflow-hidden">
                  <div 
                    className="h-full bg-cyber-yellow shadow-[0_0_6px_#ffcc00] transition-all duration-500"
                    style={{ width: `${(priorityCounts.Medium / maxPriorityCount) * 100}%` }}
                  />
                </div>
              </div>

              {/* Low */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-cyber-green font-bold">LOW SEVERITY</span>
                  <span className="text-white font-bold">{priorityCounts.Low} Cases</span>
                </div>
                <div className="h-2 w-full bg-slate-900 border border-cyber-border rounded overflow-hidden">
                  <div 
                    className="h-full bg-cyber-green shadow-[0_0_6px_#00ff66] transition-all duration-500"
                    style={{ width: `${(priorityCounts.Low / maxPriorityCount) * 100}%` }}
                  />
                </div>
              </div>

            </div>
          </CommandCard>
        </div>

      </div>

      {/* Zone split */}
      <CommandCard title="OPERATIONAL DENSITY BY ZONE">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 font-mono">
            Querying zone statistics...
          </div>
        ) : Object.keys(zoneCounts).length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 font-mono">
            No active zone registrations.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            {Object.entries(zoneCounts).map(([zoneName, count]) => (
              <div key={zoneName} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">{zoneName.toUpperCase()}</span>
                  <span className="text-white font-bold">{count} Mapped</span>
                </div>
                <div className="h-2 w-full bg-slate-900 border border-cyber-border rounded overflow-hidden">
                  <div 
                    className="h-full bg-cyber-accent shadow-[0_0_6px_#00f0ff] transition-all duration-500"
                    style={{ width: `${(count / maxZoneCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CommandCard>

    </div>
  );
}
