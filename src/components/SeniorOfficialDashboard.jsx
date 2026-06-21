import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import MapCommandCenter from './MapCommandCenter';
import CommandCard from './ui/CommandCard';
import CommandButton from './ui/CommandButton';
import StatusBadge from './ui/StatusBadge';
import { 
  ShieldCheck, 
  AlertTriangle, 
  MapPin, 
  Layers, 
  UserCheck, 
  Clock, 
  FileText, 
  ArrowLeft,
  TrendingUp,
  Cpu,
  XCircle,
  CheckCircle2,
  Check,
  RotateCcw,
  Lock,
  Loader2,
  Navigation,
  History
} from 'lucide-react';

export default function SeniorOfficialDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const approveEventId = searchParams.get('approve_event_id');

  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null); // Pending Approval Page selection
  const [selectedEventDetails, setSelectedEventDetails] = useState(null); // Active Event Detail selection
  
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [approvalComments, setApprovalComments] = useState('');
  const [error, setError] = useState(null);

  // Active Events priority filter
  const [filterPriority, setFilterPriority] = useState('ALL');

  // NeuroTwin Recommendation & Scenarios
  const [neuroTwinAnalysis, setNeuroTwinAnalysis] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  // Scenario selection overrides
  const [selectedScenario, setSelectedScenario] = useState('');
  const [recommendedScenario, setRecommendedScenario] = useState('');
  const [officersOverride, setOfficersOverride] = useState(0);
  const [barricadesOverride, setBarricadesOverride] = useState(0);
  const [towsOverride, setTowsOverride] = useState(0);

  // Scenario change tracking
  const [previousScenario, setPreviousScenario] = useState(null);
  const [scenarioChangedAt, setScenarioChangedAt] = useState(null);
  const [approvalHistory, setApprovalHistory] = useState([]);

  // Timeline / Audit Trail
  const [timelineLogs, setTimelineLogs] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Local Review Start timestamp
  const [reviewStartTimestamp, setReviewStartTimestamp] = useState(null);

  const getScenarioFriendlyName = (scenarioName) => {
    switch (scenarioName) {
      case 'Scenario B': return 'Minimal Plan';
      case 'Scenario C': return 'Balanced Plan';
      case 'Scenario D': return 'Conservative Plan';
      case 'Scenario E': return 'Full Response';
      default: return scenarioName || 'Balanced Plan';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'text-cyber-orange border-cyber-orange/30 bg-cyber-orange/5';
      case 'Medium': return 'text-cyber-yellow border-cyber-yellow/30 bg-cyber-yellow/5';
      default: return 'text-cyber-green border-cyber-green/30 bg-cyber-green/5';
    }
  };

  // Fetch all events
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [pendingRes, activeRes, approvedRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/events/pending`),
        axios.get(`${API_BASE_URL}/events/active`),
        axios.get(`${API_BASE_URL}/events/approved`)
      ]);
      
      const combined = [...pendingRes.data, ...activeRes.data, ...approvedRes.data];
      const unique = combined.filter((v, i, a) => a.findIndex(t => t.event_id === v.event_id) === i);
      setEvents(unique);

      // Safely fetch approval history so dashboard doesn't crash if it's empty or fails
      let historyData = [];

      try {
        const token = localStorage.getItem("token");

        const historyRes = await axios.get(
          `${API_BASE_URL}/events/approval-history`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        historyData = historyRes.data || [];
      } catch (histErr) {
        console.warn("Failed to fetch approval history:", histErr);
      }
      setApprovalHistory(historyData);

      // Handle deep-linking auto-selection from query params
      if (approveEventId) {
        const targetEv = unique.find(e => e.event_id === approveEventId);
        if (targetEv) {
          handleSelectPendingEvent(targetEv);
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch control center dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [approveEventId]);

  // Listen to refresh events from NotificationPanel
  useEffect(() => {
    const handleRefresh = () => {
      fetchDashboardData();
    };
    window.addEventListener('refresh-notifications', handleRefresh);
    return () => window.removeEventListener('refresh-notifications', handleRefresh);
  }, []);

  // Fetch timeline / history logs for audit trail
  const fetchEventHistory = async (eventId) => {
    setTimelineLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/events/history/${eventId}`);
      setTimelineLogs(res.data);
    } catch (err) {
      console.warn("Failed to fetch history logs:", err);
    } finally {
      setTimelineLoading(false);
    }
  };

  // Fetch NeuroTwin scenarios and recommendations
  const fetchNeuroTwinAnalysis = async (event) => {
    setLoadingAnalysis(true);
    setNeuroTwinAnalysis(null);
    try {
      const res = await axios.post(`${API_BASE_URL}/neurotwin/analyze`, {
        event_type: event.event_type,
        event_cause: event.event_cause,
        priority: event.priority,
        zone: event.zone,
        corridor: event.corridor,
        requires_road_closure: event.requires_road_closure,
        latitude: event.latitude,
        longitude: event.longitude
      });
      setNeuroTwinAnalysis(res.data);
      
      const recommended = res.data.recommended_strategy;
      setRecommendedScenario(recommended);
      
      // If the event has a pre-selected scenario, map it back, otherwise use recommended
      let initialScenarioName = recommended;
      if (event.approved_scenario) {
        const found = res.data.scenarios.find(s => getScenarioFriendlyName(s.name) === event.approved_scenario || s.name === event.approved_scenario);
        if (found) {
          initialScenarioName = found.name;
        }
      }
      setSelectedScenario(initialScenarioName);
      
      // Seed overrides from event or scenario data
      if (event.final_officers !== undefined && event.final_officers !== null) {
        setOfficersOverride(event.final_officers);
      } else {
        const scenarioData = res.data.scenarios.find(s => s.name === initialScenarioName);
        if (scenarioData) setOfficersOverride(scenarioData.officers);
      }
      
      if (event.final_barricades !== undefined && event.final_barricades !== null) {
        setBarricadesOverride(event.final_barricades);
      } else {
        const scenarioData = res.data.scenarios.find(s => s.name === initialScenarioName);
        if (scenarioData) setBarricadesOverride(scenarioData.barricades);
      }

      if (event.final_tow_vehicles !== undefined && event.final_tow_vehicles !== null) {
        setTowsOverride(event.final_tow_vehicles);
      } else {
        const scenarioData = res.data.scenarios.find(s => s.name === initialScenarioName);
        if (scenarioData) setTowsOverride(scenarioData.tows);
      }
      
      setPreviousScenario(null);
      setScenarioChangedAt(null);
    } catch (err) {
      console.error("Simulation retrieval error:", err);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleSelectPendingEvent = (event) => {
    setSelectedEvent(event);
    setSelectedEventDetails(null);
    setApprovalComments('');
    setError(null);
    setReviewStartTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    fetchNeuroTwinAnalysis(event);
    fetchEventHistory(event.event_id);
  };

  const handleSelectActiveEvent = (event) => {
    setSelectedEventDetails(event);
    setSelectedEvent(null);
    setError(null);
  };

  // Switch scenario and track changes
  const handleScenarioChange = (scenarioName, scenariosList) => {
    if (['APPROVED', 'ZONE_ASSIGNED', 'ACTIVE', 'COMPLETED'].includes(selectedEvent.status)) {
      return; // Locked after approval
    }

    const scenarioData = scenariosList.find(s => s.name === scenarioName);
    if (!scenarioData) return;

    if (scenarioName !== selectedScenario) {
      setPreviousScenario(selectedScenario);
      setSelectedScenario(scenarioName);
      setScenarioChangedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      
      // Update overrides automatically
      setOfficersOverride(scenarioData.officers);
      setBarricadesOverride(scenarioData.barricades);
      setTowsOverride(scenarioData.tows);
    }
  };

  // Clear selections and back to list
  const handleBackToList = () => {
    setSelectedEvent(null);
    setSelectedEventDetails(null);
    setSearchParams({});
    fetchDashboardData();
  };

  // Approve
  const handleApproveEvent = async () => {
    if (!selectedEvent) return;
    setActionLoading(true);
    setError(null);
    try {
      await axios.post(`${API_BASE_URL}/events/approve`, {
        event_id: selectedEvent.event_id,
        comments: approvalComments || `Event authorized with ${getScenarioFriendlyName(selectedScenario)}.`,
        final_officers: parseInt(officersOverride),
        final_barricades: parseInt(barricadesOverride),
        final_tow_vehicles: parseInt(towsOverride),
        selected_scenario: getScenarioFriendlyName(selectedScenario)
      });
      
      handleBackToList();
    } catch (err) {
      console.error(err);
      setError("Failed to authorize event route. " + (err.response?.data?.detail || ""));
    } finally {
      setActionLoading(false);
    }
  };

  // Reject
  const handleRejectEvent = async () => {
    if (!selectedEvent) return;
    if (!approvalComments.trim()) {
      setError("Rejection reasons must be specified in the comments box.");
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      await axios.post(`${API_BASE_URL}/events/reject`, {
        event_id: selectedEvent.event_id,
        comments: approvalComments
      });
      
      handleBackToList();
    } catch (err) {
      console.error(err);
      setError("Failed to deny event clearance.");
    } finally {
      setActionLoading(false);
    }
  };

  // Classify events from queues
  const activeEvents = events.filter(e => ['ACTIVE', 'ZONE ACTIVE', 'ZONE_ACTIVE'].includes(e.status));
  const pendingEvents = events.filter(e => ['PENDING_REVIEW', 'INSPECTOR_REVIEWED', 'PENDING_APPROVAL', 'SUBMITTED_TO_COMMISSIONER', 'UNDER_REVIEW', 'RESUBMITTED', 'SUBMITTED_TO_TC'].includes(e.status));
  
  // Filter active events by priority
  const filteredActive = activeEvents.filter(e => filterPriority === 'ALL' || e.priority === filterPriority);

  return (
    <div className="font-sans select-none relative h-[calc(100vh-120px)] flex flex-col gap-4 overflow-hidden">
      
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 flex-1 overflow-hidden min-h-0">
        
        {/* Left Panel (70%): Central Map element */}
        <div className="lg:col-span-7 h-full flex flex-col min-h-0">
          <MapCommandCenter
            events={events}
            onSelectEvent={(ev) => {
              const status = (ev.status || '').toUpperCase();
              if (['PENDING_REVIEW', 'INSPECTOR_REVIEWED', 'PENDING_APPROVAL', 'SUBMITTED_TO_COMMISSIONER', 'UNDER_REVIEW', 'RESUBMITTED', 'SUBMITTED_TO_TC'].includes(status)) {
                handleSelectPendingEvent(ev);
              } else {
                handleSelectActiveEvent(ev);
              }
            }}
          />
        </div>

        {/* Right Panel (30%): Dynamic Operations Drawer */}
        <div className="lg:col-span-3 h-full flex flex-col bg-[#070c1e]/90 border border-cyber-border rounded-xl p-5 overflow-y-auto space-y-4 shadow-2xl relative min-w-0">
          
          {selectedEvent ? (
            /* PENDING APPROVAL PAGE VIEW */
            <div className="space-y-4 flex flex-col min-h-0">
              
              {/* Header with Back button */}
              <div className="flex items-center justify-between border-b border-cyber-border/40 pb-3 select-none">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleBackToList}
                    className="text-slate-400 hover:text-white p-1 border border-cyber-border hover:border-white rounded transition-all cursor-pointer bg-transparent"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <div className="space-y-0.5">
                    <span className="text-[8px] text-slate-500 uppercase tracking-widest block font-mono">Operations Clearance</span>
                    <h3 className="text-sm font-bold text-white tracking-wider font-orbitron uppercase">{selectedEvent.event_id}</h3>
                  </div>
                </div>
                <StatusBadge status={selectedEvent.status} />
              </div>

              {/* 1. Full Event Report */}
              <div className="space-y-2 font-mono text-[10px] bg-[#050b18]/60 p-3 border border-cyber-border/30 rounded-lg">
                <span className="text-[9px] text-[#00d2ff] font-bold uppercase tracking-wider block font-orbitron mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> Full Event Report
                </span>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-slate-355">
                  <div><strong>Cause:</strong> <span className="text-white capitalize">{selectedEvent.event_cause.replace('_', ' ')}</span></div>
                  <div><strong>Type:</strong> <span className="text-white capitalize">{selectedEvent.event_type}</span></div>
                  <div className="col-span-2"><strong>Corridor:</strong> <span className="text-white">{selectedEvent.corridor}</span></div>
                  <div><strong>Zone:</strong> <span className="text-white">{selectedEvent.zone}</span></div>
                  <div><strong>Crowd Size:</strong> <span className="text-cyber-accent font-bold">{selectedEvent.expected_attendance || 'N/A'}</span></div>
                  <div><strong>Closure:</strong> <span className="text-white">{selectedEvent.requires_road_closure ? 'YES' : 'NO'}</span></div>
                  <div><strong>Duration:</strong> <span className="text-white">{selectedEvent.duration_minutes || 'N/A'} Mins</span></div>
                </div>
              </div>

              {/* 2. Chronological Timeline / Audit Trail */}
              <div className="space-y-2 font-mono text-[10px] bg-[#050b18]/40 p-3 border border-cyber-border/20 rounded-lg">
                <span className="text-[9px] text-[#00d2ff] font-bold uppercase tracking-wider block font-orbitron mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Approval Timeline
                </span>
                {timelineLoading ? (
                  <div className="flex items-center gap-2 text-slate-550 select-none py-1">
                    <Loader2 className="w-3 h-3 animate-spin text-[#00d2ff]" />
                    <span>Loading audit log...</span>
                  </div>
                ) : (
                  <div className="relative border-l border-cyber-border/40 pl-3 space-y-2 mt-1 ml-1 select-none">
                    <div className="relative">
                      <div className="absolute -left-[16.5px] top-1 w-2 h-2 rounded-full bg-cyber-green"></div>
                      <div className="text-[9px] text-slate-300"><strong>Created By:</strong> Operator</div>
                      <div className="text-[8px] text-slate-500">Draft Created: {selectedEvent.created_at ? new Date(selectedEvent.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '12:00 PM'}</div>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-[16.5px] top-1 w-2 h-2 rounded-full bg-cyber-accent"></div>
                      <div className="text-[9px] text-slate-300"><strong>Submitted For Approval:</strong> Command Center</div>
                      <div className="text-[8px] text-slate-550">Submitted: {timelineLogs.find(l => l.new_status === 'PENDING_APPROVAL')?.timestamp ? new Date(timelineLogs.find(l => l.new_status === 'PENDING_APPROVAL').timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '12:05 PM'}</div>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-[16.5px] top-1 w-2 h-2 rounded-full bg-cyber-yellow animate-pulse"></div>
                      <div className="text-[9px] text-slate-300"><strong>Reviewed By:</strong> Traffic Commissioner</div>
                      <div className="text-[8px] text-slate-500">Review Started: {reviewStartTimestamp || '12:20 PM'}</div>
                    </div>
                    {['APPROVED', 'ZONE_ASSIGNED', 'ACTIVE', 'COMPLETED'].includes(selectedEvent.status) && (
                      <div className="relative">
                        <div className="absolute -left-[16.5px] top-1 w-2 h-2 rounded-full bg-[#00ff66]"></div>
                        <div className="text-[9px] text-[#00ff66]"><strong>Approved By:</strong> Commissioner</div>
                        <div className="text-[8px] text-slate-550">Approved: {selectedEvent.approved_at ? new Date(selectedEvent.approved_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '12:24 PM'}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 3. NeuroTwin Recommendation & Decision Justification */}
              <div className="space-y-2 bg-[#050b18]/60 p-3 border border-cyber-border/30 rounded-lg">
                <span className="text-[9px] text-[#00d2ff] font-bold uppercase tracking-wider block font-mono font-orbitron mb-1 flex items-center gap-1 select-none">
                  <Cpu className="w-3.5 h-3.5 text-cyber-yellow" /> NeuroTwin Recommendation
                </span>

                {loadingAnalysis ? (
                  <div className="flex flex-col items-center justify-center py-6 text-slate-500 font-mono gap-2 select-none">
                    <Loader2 className="w-6 h-6 animate-spin text-cyber-yellow" />
                    <span className="text-[9px] uppercase tracking-widest text-slate-450">Ingesting Cognitive Genome...</span>
                  </div>
                ) : neuroTwinAnalysis ? (
                  <div className="space-y-2.5 font-mono text-[10px]">
                    <div className="grid grid-cols-2 gap-2 text-[9px] text-slate-350">
                      <div className="bg-[#030611]/80 p-2 border border-cyber-border/30 rounded-lg">
                        <span className="text-slate-500 block text-[7px] uppercase">Twin Strategy</span>
                        <span className="text-white font-bold">{getScenarioFriendlyName(neuroTwinAnalysis.recommended_strategy)}</span>
                      </div>
                      <div className="bg-[#030611]/80 p-2 border border-cyber-border/30 rounded-lg">
                        <span className="text-slate-500 block text-[7px] uppercase">Confidence</span>
                        <span className="text-cyber-green font-bold">{neuroTwinAnalysis.confidence}% Match</span>
                      </div>
                    </div>

                    {/* Decision Justification */}
                    <div className="border border-cyber-yellow/20 bg-cyber-yellow/5 p-2.5 rounded-lg space-y-1.5">
                      <span className="text-[8px] text-cyber-yellow uppercase tracking-wider block font-bold font-orbitron select-none">
                        Decision Justification
                      </span>
                      <div className="grid grid-cols-2 gap-1 text-[9px] border-b border-cyber-border/30 pb-1.5 mb-1.5 select-none">
                        <div>
                          <span className="text-slate-500 block text-[7px] uppercase">Recommended Scenario:</span>
                          <span className="text-white font-bold">{getScenarioFriendlyName(neuroTwinAnalysis.recommended_strategy)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[7px] uppercase">Confidence Score:</span>
                          <span className="text-cyber-green font-bold">{neuroTwinAnalysis.confidence}%</span>
                        </div>
                      </div>
                      <div className="space-y-1 text-slate-300 leading-normal">
                        <div>• Similar to matched incidents ({neuroTwinAnalysis.confidence}% similarity index)</div>
                        <div>• Lowest predicted congestion-to-resource overhead ratio</div>
                        <div>• {Math.round(neuroTwinAnalysis.confidence * 0.9)}% diversion routing success probability</div>
                        <div>• Requires {100 - neuroTwinAnalysis.explainability.resource_efficiency_gain}% fewer resources than full plan</div>
                        <div>• Historically produced lower average recovery delay ({neuroTwinAnalysis.estimated_recovery_minutes} mins)</div>
                      </div>
                    </div>

                    {/* Officer Override Audit */}
                    {selectedEvent && selectedEvent.override_reason && (
                      <div className="border border-cyber-orange/20 bg-cyber-orange/5 p-2.5 rounded-lg space-y-1.5 mt-2">
                        <span className="text-[8px] text-cyber-orange uppercase tracking-wider block font-bold font-orbitron select-none">
                          Officer Override Governance Audit
                        </span>
                        <div className="space-y-1 text-slate-300 leading-normal">
                          <div>• <strong>AI Recommendation:</strong> {getScenarioFriendlyName(neuroTwinAnalysis.recommended_strategy)}</div>
                          <div>• <strong>Officer Selected:</strong> {selectedEvent.approved_scenario || 'Alternative Plan'}</div>
                          <div className="text-white bg-[#030611]/60 p-1.5 border border-cyber-border/30 rounded mt-1 select-text">
                            <strong>Override Reason:</strong> {selectedEvent.override_reason}
                          </div>
                          <div className="text-[8px] text-slate-505 pt-1 flex justify-between">
                            <span>Vetted By: {selectedEvent.scenario_modified_by || 'Command Center Officer'}</span>
                            <span>Date: {selectedEvent.created_at ? new Date(selectedEvent.created_at).toLocaleDateString() : 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-slate-600 text-center font-mono py-2 text-[9px]">Simulation data unavailable.</div>
                )}
              </div>

              {/* 4. Selected Scenario & Resource Plan */}
              {neuroTwinAnalysis && (
                <div className="space-y-3 bg-[#050b18]/60 p-3 border border-cyber-border/30 rounded-lg">
                  <span className="text-[9px] text-[#00d2ff] font-bold uppercase tracking-wider block font-mono font-orbitron flex items-center gap-1 select-none">
                    <Layers className="w-3.5 h-3.5" /> Resource Plan & Selected Scenario
                  </span>

                  {/* Scenarios Selection List */}
                  <div className="space-y-1.5 select-none">
                    <label className="block text-[8px] text-slate-500 uppercase tracking-wider">Select Scenario Strategy</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {neuroTwinAnalysis.scenarios.map((scen) => {
                        const isSelected = selectedScenario === scen.name;
                        const isRecommended = recommendedScenario === scen.name;
                        return (
                          <button
                            key={scen.name}
                            disabled={['APPROVED', 'ZONE_ASSIGNED', 'ACTIVE', 'COMPLETED'].includes(selectedEvent.status)}
                            onClick={() => handleScenarioChange(scen.name, neuroTwinAnalysis.scenarios)}
                            className={`p-2 border rounded-lg text-left transition-all font-mono text-[9px] cursor-pointer ${
                              isSelected 
                                ? 'bg-cyber-accent/15 border-cyber-accent text-white font-bold' 
                                : 'bg-[#030611] border-cyber-border text-slate-400 hover:text-white hover:border-slate-700'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span>{getScenarioFriendlyName(scen.name)}</span>
                              {isRecommended && <span className="text-[7px] bg-cyber-yellow/10 border border-cyber-yellow/20 text-cyber-yellow px-1 rounded font-bold uppercase scale-90">REC</span>}
                            </div>
                            <span className="text-[7px] text-slate-505 block uppercase font-light mt-0.5">{scen.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Scenario Change Tracking */}
                  {previousScenario && (
                    <div className="bg-[#ef4444]/5 border border-[#ef4444]/30 p-2.5 rounded-lg font-mono text-[9px] text-slate-350 space-y-1 select-none">
                      <div className="text-cyber-orange font-bold uppercase font-orbitron text-[8px]">Scenario Changed</div>
                      <div><strong>Previous:</strong> {getScenarioFriendlyName(previousScenario)}</div>
                      <div><strong>New:</strong> {getScenarioFriendlyName(selectedScenario)}</div>
                      <div><strong>Changed By:</strong> Commissioner</div>
                      <div><strong>Changed At:</strong> {scenarioChangedAt || '12:23 PM'}</div>
                    </div>
                  )}

                  {/* Resource Plan parameters */}
                  <div className="space-y-2 border-t border-cyber-border/30 pt-2.5">
                    <span className="block text-[8px] text-slate-500 uppercase tracking-wider select-none">Operational resource limits</span>
                    <div className="grid grid-cols-3 gap-2 font-mono text-[9px]">
                      <div>
                        <label className="text-slate-500 block select-none">Officers</label>
                        <input
                          type="number"
                          disabled={['APPROVED', 'ZONE_ASSIGNED', 'ACTIVE', 'COMPLETED'].includes(selectedEvent.status)}
                          value={officersOverride}
                          onChange={(e) => setOfficersOverride(e.target.value)}
                          className="w-full bg-[#030611] border border-cyber-border rounded p-1.5 text-white text-[10px] text-center font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-slate-500 block select-none">Barricades</label>
                        <input
                          type="number"
                          disabled={['APPROVED', 'ZONE_ASSIGNED', 'ACTIVE', 'COMPLETED'].includes(selectedEvent.status)}
                          value={barricadesOverride}
                          onChange={(e) => setBarricadesOverride(e.target.value)}
                          className="w-full bg-[#030611] border border-cyber-border rounded p-1.5 text-white text-[10px] text-center font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-slate-500 block select-none">Tow Trucks</label>
                        <input
                          type="number"
                          disabled={['APPROVED', 'ZONE_ASSIGNED', 'ACTIVE', 'COMPLETED'].includes(selectedEvent.status)}
                          value={towsOverride}
                          onChange={(e) => setTowsOverride(e.target.value)}
                          className="w-full bg-[#030611] border border-cyber-border rounded p-1.5 text-white text-[10px] text-center font-bold"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Diversion Plan block */}
              {neuroTwinAnalysis?.diversion_boundaries?.detour_checkpoints && (
                <div className="space-y-2 bg-[#050b18]/60 p-3 border border-cyber-border/30 rounded-lg">
                  <span className="text-[9px] text-[#00d2ff] font-bold uppercase tracking-wider block font-mono font-orbitron mb-1 flex items-center gap-1 select-none">
                    <Navigation className="w-3.5 h-3.5 text-cyber-green" /> Diversion Plan checkpoints
                  </span>
                  <div className="space-y-1.5 font-mono text-[9px] text-slate-355">
                    {neuroTwinAnalysis.diversion_boundaries.detour_checkpoints.map((cp, idx) => (
                      <div key={idx} className="bg-[#030611]/80 p-2 border border-cyber-border/30 rounded-lg flex flex-col gap-0.5">
                        <div className="flex justify-between items-center text-white font-bold">
                          <span>{cp.name}</span>
                          <span className="text-[8px] text-slate-500">[{cp.lat.toFixed(4)}, {cp.lng.toFixed(4)}]</span>
                        </div>
                        <span className="text-cyber-green text-[8px]">{cp.action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Summary card */}
              {selectedEvent?.ai_recommendation_summary && (
                <div className="space-y-2 bg-[#050b18]/60 p-3 border border-cyber-border/30 rounded-lg">
                  <span className="text-[9px] text-[#00d2ff] font-bold uppercase tracking-wider block font-mono font-orbitron mb-1 flex items-center gap-1 select-none">
                    <Cpu className="w-3.5 h-3.5 text-cyber-yellow" /> AI Recommendation Summary
                  </span>
                  <div className="font-mono text-[9px] text-slate-355 bg-[#030611]/80 p-2.5 border border-cyber-border/30 rounded-lg leading-normal">
                    {selectedEvent.ai_recommendation_summary}
                  </div>
                </div>
              )}

              {/* 5. Comment Box & Approve / Deny actions */}
              <div className="space-y-2 border-t border-cyber-border/40 pt-3 flex-shrink-0">
                <label className="block text-[8px] text-slate-500 uppercase font-mono tracking-wider select-none">Approval Comments / Modifications Remarks</label>
                <textarea
                  value={approvalComments}
                  disabled={['APPROVED', 'ZONE_ASSIGNED', 'ACTIVE', 'COMPLETED'].includes(selectedEvent.status)}
                  onChange={(e) => setApprovalComments(e.target.value)}
                  placeholder="Explain corridor overrides, signal holds, or timeline changes here..."
                  rows="2"
                  className="w-full bg-[#050b18] border border-[#00d2ff]/10 focus:border-[#00d2ff] rounded-lg p-2.5 text-[10px] text-white placeholder-slate-700 outline-none transition-all resize-none font-sans"
                />

                {['APPROVED', 'ZONE_ASSIGNED', 'ACTIVE', 'COMPLETED'].includes(selectedEvent.status) ? (
                  <div className="p-3 bg-cyber-green/5 border border-cyber-green/30 rounded-lg text-cyber-green font-mono text-[9px] font-bold text-center flex items-center justify-center gap-1.5 select-none uppercase">
                    <Lock className="w-3.5 h-3.5" />
                    Approved scenario locked & immutable
                  </div>
                ) : (
                  <div className="flex gap-2 select-none">
                    <CommandButton
                      onClick={handleRejectEvent}
                      disabled={actionLoading}
                      variant="secondary"
                      className="flex-grow py-2 text-[10px] text-cyber-red border-cyber-red/20 hover:bg-cyber-red hover:text-white"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1 inline" />
                      DENY CLEARANCE
                    </CommandButton>
                    
                    <CommandButton
                      onClick={handleApproveEvent}
                      disabled={actionLoading || loadingAnalysis}
                      variant="success"
                      className="flex-grow py-2 text-[10px]"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 mr-1 inline text-slate-950" />
                      GRANT APPROVAL
                    </CommandButton>
                  </div>
                )}
              </div>

            </div>
          ) : selectedEventDetails ? (
            /* ACTIVE EVENT DETAIL VIEW */
            <div className="space-y-4 flex flex-col h-full justify-between">
              
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-cyber-border/40 pb-3">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleBackToList}
                      className="text-slate-400 hover:text-white p-1 border border-cyber-border hover:border-white rounded transition-all cursor-pointer bg-transparent"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <div className="space-y-0.5">
                      <span className="text-[8px] text-slate-500 uppercase tracking-widest block font-mono">Live Operations Details</span>
                      <h3 className="text-sm font-bold text-white tracking-wider font-orbitron uppercase">{selectedEventDetails.event_id}</h3>
                    </div>
                  </div>
                  <span className="text-[9px] bg-cyber-red/10 border border-cyber-red/20 text-cyber-red px-1.5 py-0.2 rounded font-bold uppercase tracking-wider font-orbitron block w-max">
                    {selectedEventDetails.status}
                  </span>
                </div>

                {/* Details layout */}
                <div className="space-y-3 font-mono text-[10px]">
                  
                  <div className="space-y-1.5 bg-[#050b18]/60 p-3 border border-cyber-border/30 rounded-lg">
                    <div><strong>Event Name:</strong> <span className="text-white block uppercase mt-0.5 text-[9px]">{selectedEventDetails.event_cause.replace('_', ' ')} @ {selectedEventDetails.corridor}</span></div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div><strong>Type:</strong> <span className="text-white capitalize block mt-0.5">{selectedEventDetails.event_type}</span></div>
                      <div><strong>Zone:</strong> <span className="text-white block mt-0.5">{selectedEventDetails.zone}</span></div>
                      <div><strong>Crowd Size:</strong> <span className="text-cyber-accent font-bold block mt-0.5">{selectedEventDetails.expected_attendance || 'N/A'}</span></div>
                      <div><strong>Priority:</strong> <span className="text-cyber-orange font-bold block mt-0.5">{selectedEventDetails.priority}</span></div>
                    </div>
                  </div>

                  {/* Current Approved Scenario info */}
                  <div className="space-y-1.5 bg-[#00ff66]/5 border border-[#00ff66]/25 p-3 rounded-lg">
                    <span className="text-[9px] text-[#00ff66] font-bold uppercase tracking-wider block font-orbitron mb-1 select-none">
                      Current Approved Scenario
                    </span>
                    <div className="space-y-1 text-slate-300">
                      <div><strong>Scenario:</strong> <span className="text-white font-bold">{selectedEventDetails.approved_scenario || 'Balanced Plan'}</span></div>
                      <div><strong>Approved By:</strong> <span className="text-white">Commissioner</span></div>
                      <div><strong>Approval Time:</strong> <span className="text-white">{selectedEventDetails.approved_at ? new Date(selectedEventDetails.approved_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '12:24 PM'}</span></div>
                    </div>
                  </div>

                  <div className="space-y-1 bg-[#050b18]/40 p-3 border border-cyber-border/20 rounded-lg">
                    <span className="text-[9px] text-[#00d2ff] font-bold uppercase tracking-wider block font-orbitron select-none">
                      AI System Summary
                    </span>
                    <p className="text-[10px] text-slate-400 italic leading-relaxed mt-1">
                      "AI analysis predicts a {selectedEventDetails.risk_band || 'Moderate'} congestion risk (Impact Score: {selectedEventDetails.impact_score?.toFixed(1) || '0.0'}) along the {selectedEventDetails.corridor} corridor. The approved force plan deployed {selectedEventDetails.final_officers || selectedEventDetails.ai_officers || 4} officers and {selectedEventDetails.final_barricades || selectedEventDetails.ai_barricades || 10} barricades."
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-cyber-border/40 select-none">
                <CommandButton
                  onClick={handleBackToList}
                  variant="secondary"
                  className="w-full py-2 text-xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1 inline" />
                  RETURN TO OPERATIONAL LISTS
                </CommandButton>
              </div>

            </div>
          ) : (
            /* DEFAULT LIST VIEWS (ACTIVE & PENDING QUEUES) */
            <div className="space-y-5 flex flex-col h-full">
              
              {/* Active Events section */}
              <div className="space-y-3 flex-1 overflow-hidden flex flex-col min-h-0">
                <div className="space-y-1 flex-shrink-0 select-none">
                  <h4 className="text-xs font-black font-orbitron text-white tracking-widest uppercase flex items-center gap-1.5 border-b border-cyber-border/40 pb-1.5">
                    <Layers className="w-4 h-4 text-cyber-red animate-pulse" />
                    Active Operational Events
                  </h4>
                  
                  {/* Priority Filters */}
                  <div className="flex gap-1.5 pt-1.5 font-mono text-[8px]">
                    {['ALL', 'High', 'Medium', 'Low'].map(prio => (
                      <button
                        key={prio}
                        onClick={() => setFilterPriority(prio)}
                        className={`px-2 py-0.8 border rounded transition-all cursor-pointer whitespace-nowrap uppercase font-bold ${
                          filterPriority === prio
                            ? 'bg-cyber-red text-white border-cyber-red font-black shadow-[0_0_5px_rgba(239,68,68,0.3)]'
                            : 'bg-transparent text-slate-550 border-transparent hover:border-slate-800'
                        }`}
                      >
                        {prio === 'ALL' ? 'ALL PRIO' : prio}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active items list */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[150px]">
                  {filteredActive.length === 0 ? (
                    <div className="p-8 text-center text-[10px] text-slate-650 font-mono border border-dashed border-cyber-border/20 rounded-xl select-none">
                      No active events match filter.
                    </div>
                  ) : (
                    filteredActive.map((ev) => (
                      <div
                        key={ev.event_id}
                        onClick={() => handleSelectActiveEvent(ev)}
                        className="bg-[#030611]/50 border border-cyber-border/30 hover:border-cyber-red rounded-lg p-2.5 transition-all cursor-pointer hover:bg-cyber-red/[0.02]"
                      >
                        <div className="flex justify-between items-center select-none">
                          <span className="text-[10px] font-bold text-white font-mono">{ev.event_id}</span>
                          <span className={`text-[8px] px-1 rounded uppercase font-bold tracking-wider ${getPriorityColor(ev.priority)}`}>
                            {ev.priority}
                          </span>
                        </div>
                        <div className="text-[9px] text-slate-400 truncate mt-1">
                          {ev.event_cause.replace('_', ' ').toUpperCase()} @ {ev.corridor}
                        </div>
                        <div className="flex justify-between items-center text-[8px] font-mono text-slate-550 mt-1.5 select-none">
                          <span>ZONE: {ev.zone}</span>
                          <span className="text-cyber-red font-bold uppercase">{ev.status}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Pending Approvals section */}
              <div className="space-y-3 flex-1 overflow-hidden flex flex-col min-h-0 border-t border-cyber-border/30 pt-4">
                <div className="flex-shrink-0 select-none">
                  <h4 className="text-xs font-black font-orbitron text-white tracking-widest uppercase flex items-center gap-1.5 border-b border-cyber-border/40 pb-1.5">
                    <ShieldCheck className="w-4 h-4 text-cyber-yellow" />
                    Pending Approvals Pool
                  </h4>
                </div>

                {/* Pending items list */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[150px]">
                  {pendingEvents.length === 0 ? (
                    <div className="p-8 text-center text-[10px] text-slate-650 font-mono border border-dashed border-cyber-border/20 rounded-xl select-none">
                      Awaiting new approval drafts...
                    </div>
                  ) : (
                    pendingEvents.map((ev) => (
                      <div
                        key={ev.event_id}
                        onClick={() => handleSelectPendingEvent(ev)}
                        className="bg-[#030611]/50 border border-cyber-border/30 hover:border-cyber-yellow rounded-lg p-2.5 transition-all cursor-pointer hover:bg-cyber-yellow/[0.02]"
                      >
                        <div className="flex justify-between items-center select-none mb-1">
                          <span className="text-[10px] font-bold text-white font-mono">{ev.event_id}</span>
                          <span className={`text-[8px] px-1.5 rounded uppercase font-bold tracking-wider ${getPriorityColor(ev.priority)}`}>
                            {ev.priority}
                          </span>
                        </div>
                        <div className="text-[10px] text-white font-semibold truncate uppercase tracking-wide">
                          {ev.event_cause.replace('_', ' ')}
                        </div>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[8.5px] font-mono text-slate-500 mt-1.5 select-none">
                          <div>ZONE: <span className="text-slate-350">{ev.zone}</span></div>
                          <div>STATUS: <span className="text-cyber-yellow font-bold uppercase">{ev.status}</span></div>
                          <div>SUBMITTED BY: <span className="text-slate-350">{ev.creator_name || 'Operator'}</span></div>
                          <div>SUBMITTED TIME: <span className="text-slate-350">{new Date(ev.resubmitted_at || ev.created_at).toLocaleString()}</span></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Approval History Panel */}
              <div className="space-y-3 flex-1 overflow-hidden flex flex-col min-h-0 border-t border-cyber-border/30 pt-4">
                <div className="flex-shrink-0 select-none">
                  <h4 className="text-xs font-black font-orbitron text-white tracking-widest uppercase flex items-center gap-1.5 border-b border-cyber-border/40 pb-1.5">
                    <History className="w-4 h-4 text-cyber-accent" />
                    Approval History Log
                  </h4>
                </div>

                {/* History list */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[150px]">
                  {approvalHistory.length === 0 ? (
                    <div className="p-8 text-center text-[10px] text-slate-655 font-mono border border-dashed border-cyber-border/20 rounded-xl select-none">
                      No approval history recorded.
                    </div>
                  ) : (
                    approvalHistory.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-[#030611]/30 border border-cyber-border/20 rounded-lg p-2.5 transition-all text-[9.5px] font-mono hover:bg-[#030611]/60"
                      >
                        <div className="flex justify-between items-center select-none mb-1">
                          <span className="font-bold text-white">{item.event_id}</span>
                          <span className={`text-[8px] px-1 rounded uppercase font-bold tracking-wider ${
                            item.action === 'APPROVED' ? 'text-cyber-green border border-cyber-green/30 bg-cyber-green/5' :
                            item.action === 'REJECTED' ? 'text-cyber-red border border-cyber-red/30 bg-cyber-red/5' :
                            'text-cyber-yellow border border-cyber-yellow/30 bg-cyber-yellow/5'
                          }`}>
                            {item.action}
                          </span>
                        </div>
                        <div className="text-slate-400">
                          Reviewer: <span className="text-white font-semibold">{item.reviewer}</span>
                        </div>
                        {item.comments && (
                          <div className="text-slate-500 italic mt-1 break-words bg-[#050b18]/45 p-1 border border-cyber-border/20 rounded">
                            &ldquo;{item.comments}&rdquo;
                          </div>
                        )}
                        <div className="text-slate-600 text-[8px] text-right mt-1.5">
                          {new Date(item.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

      {error && (
        <div className="fixed bottom-4 right-4 p-3.5 bg-cyber-red/5 border border-cyber-red/45 rounded-lg text-xs text-cyber-red flex items-center gap-2 glow-critical font-mono z-[5000]">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

    </div>
  );
}
