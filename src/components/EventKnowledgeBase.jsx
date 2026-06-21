import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import CommandCard from './ui/CommandCard';
import CommandButton from './ui/CommandButton';
import PostEventAnalysis from './PostEventAnalysis';
import { 
  Search, 
  Filter, 
  BookOpen, 
  TrendingUp, 
  Clock, 
  AlertOctagon, 
  CheckCircle,
  Database,
  ArrowRight,
  ChevronRight,
  TrendingDown,
  Percent
} from 'lucide-react';

export default function EventKnowledgeBase() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [selectedEvent, setSelectedEvent] = useState(null);

  const fetchKnowledgeBase = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/events/knowledge-base`);
      setEvents(res.data);
      // Select the first completed event if none selected
      if (res.data.length > 0 && !selectedEvent) {
        const completed = res.data.find(e => e.status === 'COMPLETED');
        setSelectedEvent(completed || res.data[0]);
      }
    } catch (err) {
      console.error("Failed to fetch knowledge base:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKnowledgeBase();
  }, []);

  const handleRefresh = () => {
    fetchKnowledgeBase();
  };

  // Filters
  const filteredEvents = events.filter(e => {
    const matchesSearch = 
      e.event_id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      e.event_cause.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.corridor && e.corridor.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesStatus = statusFilter === 'ALL' ? true : e.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' ? true : e.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Calculate high-level metrics
  const completedEvents = events.filter(e => e.status === 'COMPLETED');
  const evaluatedEvents = completedEvents.filter(e => e.success_rate !== null && e.success_rate !== undefined);
  const averageSuccess = evaluatedEvents.length > 0 
    ? Math.round(evaluatedEvents.reduce((acc, curr) => acc + curr.success_rate, 0) / evaluatedEvents.length)
    : 0;

  const getPriorityColor = (p) => {
    switch (p?.toUpperCase()) {
      case 'CRITICAL': return 'text-cyber-red border-cyber-red/30 bg-cyber-red/5';
      case 'HIGH': return 'text-cyber-orange border-cyber-orange/30 bg-cyber-orange/5';
      case 'MEDIUM': return 'text-cyber-yellow border-cyber-yellow/30 bg-cyber-yellow/5';
      default: return 'text-cyber-green border-cyber-green/30 bg-cyber-green/5';
    }
  };

  const getStatusColor = (s) => {
    switch (s) {
      case 'ACTIVE': return 'bg-cyber-red/10 border-cyber-red/30 text-cyber-red';
      case 'APPROVED': return 'bg-cyber-green/10 border-cyber-green/30 text-cyber-green';
      case 'COMPLETED': return 'bg-[#00d2ff]/10 border-[#00d2ff]/30 text-[#00d2ff]';
      case 'REJECTED': return 'bg-slate-800 border-slate-700 text-slate-400';
      default: return 'bg-cyber-yellow/10 border-cyber-yellow/30 text-cyber-yellow';
    }
  };

  return (
    <div className="space-y-4 font-sans select-none">
      
      {/* Top Banner KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Total Stored */}
        <div className="bg-[#050b18]/60 border border-cyber-border/40 p-4 rounded-xl flex items-center justify-between font-mono">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest block">Stored Records</span>
            <span className="text-2xl font-black text-white font-orbitron mt-1 block">{events.length}</span>
          </div>
          <Database className="w-8 h-8 text-cyber-accent opacity-50" />
        </div>

        {/* Completed Incidents */}
        <div className="bg-[#050b18]/60 border border-cyber-border/40 p-4 rounded-xl flex items-center justify-between font-mono">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest block">Completed Events</span>
            <span className="text-2xl font-black text-cyber-accent font-orbitron mt-1 block">{completedEvents.length}</span>
          </div>
          <CheckCircle className="w-8 h-8 text-cyber-accent opacity-50" />
        </div>

        {/* Avg Success Rate */}
        <div className="bg-[#050b18]/60 border border-cyber-border/40 p-4 rounded-xl flex items-center justify-between font-mono">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest block">Avg Twin Match Accuracy</span>
            <span className="text-2xl font-black text-cyber-green font-orbitron mt-1 block">{averageSuccess}%</span>
          </div>
          <Percent className="w-8 h-8 text-cyber-green opacity-50" />
        </div>

        {/* Evaluated Counts */}
        <div className="bg-[#050b18]/60 border border-cyber-border/40 p-4 rounded-xl flex items-center justify-between font-mono">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest block">Evaluated Playbooks</span>
            <span className="text-2xl font-black text-cyber-yellow font-orbitron mt-1 block">{evaluatedEvents.length} / {completedEvents.length}</span>
          </div>
          <BookOpen className="w-8 h-8 text-cyber-yellow opacity-50" />
        </div>

      </div>

      {/* Main Grid: Left List (35%) vs Right Comparison View (65%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* Left List (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-4">
          <CommandCard title="HISTORICAL INCIDENTS REGISTRY">
            
            {/* Search and Filters */}
            <div className="space-y-3 mb-4">
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by ID, Cause, or Corridor..."
                  className="w-full bg-[#030612]/90 border border-cyber-border rounded-lg py-2 pl-9 pr-4 text-xs text-slate-100 font-mono focus:border-cyber-accent outline-none transition-all placeholder-slate-600"
                />
              </div>

              {/* Filter Row */}
              <div className="grid grid-cols-2 gap-2">
                
                {/* Status Filter */}
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">Status</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-[#030612]/90 border border-cyber-border rounded-lg p-1.5 text-xs text-slate-300 font-mono focus:border-cyber-accent outline-none"
                  >
                    <option value="ALL">ALL STATUSES</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>

                {/* Priority Filter */}
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">Priority</span>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="bg-[#030612]/90 border border-cyber-border rounded-lg p-1.5 text-xs text-slate-300 font-mono focus:border-cyber-accent outline-none"
                  >
                    <option value="ALL">ALL PRIORITIES</option>
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>

              </div>

            </div>

            {/* List */}
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-500 font-mono animate-pulse uppercase">
                  Reading database registries...
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 font-mono border border-dashed border-cyber-border/40 rounded-lg">
                  No registered events match filters.
                </div>
              ) : (
                filteredEvents.map(e => (
                  <div
                    key={e.event_id}
                    onClick={() => setSelectedEvent(e)}
                    className={`p-3 border rounded-lg cursor-pointer transition-all space-y-1.5 ${
                      selectedEvent?.event_id === e.event_id 
                        ? 'bg-cyber-accent/5 border-cyber-accent shadow-[0_0_10px_rgba(0,210,255,0.05)]' 
                        : 'bg-[#0a0f26]/40 border-cyber-border/60 hover:border-slate-700'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start font-mono">
                      <div>
                        <span className="text-xs font-bold text-white tracking-wider">{e.event_id}</span>
                        <div className="text-[10px] text-slate-400 capitalize mt-0.5">
                          {e.event_cause.replace('_', ' ')}
                        </div>
                      </div>
                      <span className={`text-[8px] px-1.5 py-0.2 rounded border font-bold uppercase tracking-wider ${getPriorityColor(e.priority)}`}>
                        {e.priority}
                      </span>
                    </div>

                    {/* Details Row */}
                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono pt-1 border-t border-cyber-border/10">
                      <span>{e.event_date || 'No Date'}</span>
                      <div className="flex gap-2 items-center">
                        {e.success_rate !== null && e.success_rate !== undefined && (
                          <span className="text-cyber-green font-bold bg-cyber-green/5 border border-cyber-green/20 px-1 rounded">
                            {e.success_rate}% Match
                          </span>
                        )}
                        <span className={`px-1 rounded uppercase font-bold text-[8px] border ${getStatusColor(e.status)}`}>
                          {e.status}
                        </span>
                      </div>
                    </div>

                  </div>
                ))
              )}
            </div>

          </CommandCard>
        </div>

        {/* Right Comparison View (lg:col-span-7) */}
        <div className="lg:col-span-7">
          <CommandCard title="LEARNING ENGINE & OUTCOME VALIDATION">
            {selectedEvent ? (
              <div className="space-y-4">
                
                {/* Selected Event Details Panel */}
                <div className="p-4 bg-[#0a0f26]/60 border border-cyber-border/40 rounded-xl space-y-3 font-mono">
                  <div className="flex justify-between items-start border-b border-cyber-border/20 pb-2">
                    <div>
                      <h4 className="text-sm font-bold text-white">{selectedEvent.event_id}</h4>
                      <span className="text-[10px] text-slate-400">Zone: {selectedEvent.zone} | Corridor: {selectedEvent.corridor}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs border font-bold uppercase ${getStatusColor(selectedEvent.status)}`}>
                      {selectedEvent.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] text-slate-300">
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Impact Score</span>
                      <span className="text-white font-bold">{selectedEvent.impact_score?.toFixed(1) || '0.0'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Attendance</span>
                      <span className="text-white font-bold">{selectedEvent.expected_attendance || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Duration</span>
                      <span className="text-white font-bold">{selectedEvent.duration_minutes || 'N/A'} min</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Closure Required</span>
                      <span className="text-white font-bold">{selectedEvent.requires_road_closure ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>

                {/* Post Event Comparison mount */}
                <PostEventAnalysis 
                  event={selectedEvent} 
                  onComparisonComplete={handleRefresh} 
                />

              </div>
            ) : (
              <div className="p-16 text-center space-y-3">
                <Database className="w-10 h-10 text-slate-700 animate-pulse mx-auto" />
                <div className="text-xs font-mono text-slate-500 uppercase tracking-widest max-w-[280px] mx-auto leading-relaxed">
                  Select an incident from the registry index to analyze predictions vs actual outcomes.
                </div>
              </div>
            )}
          </CommandCard>
        </div>

      </div>

    </div>
  );
}
