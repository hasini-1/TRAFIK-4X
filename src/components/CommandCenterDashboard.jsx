import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import CommandCard from './ui/CommandCard';
import CommandButton from './ui/CommandButton';
import StatusBadge from './ui/StatusBadge';
import MapCommandCenter from './MapCommandCenter';
import CalendarView from './CalendarView';
import EventPlannerForm from './EventPlannerForm';
import EventKnowledgeBase from './EventKnowledgeBase';
import { 
  Play, 
  CheckCircle, 
  MapPin, 
  Cpu, 
  FileDown, 
  Activity, 
  Compass, 
  Zap, 
  Loader2, 
  FileText, 
  Calendar, 
  PlusCircle, 
  Database, 
  ChevronRight, 
  X, 
  AlertTriangle, 
  Layers, 
  Send,
  Radio,
  Clock,
  Sparkles,
  ShieldAlert
} from 'lucide-react';

export default function CommandCenterDashboard() {
  // Navigation tabs state
  const [activeTab, setActiveTab] = useState('LIVE_OPS'); // LIVE_OPS, PLANNER, CALENDAR, KNOWLEDGE_BASE

  // Emergency Alert states
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertSeverity, setAlertSeverity] = useState('Critical');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSubmitting, setAlertSubmitting] = useState(false);

  // Missing demo simulation states
  const [playbookLoading, setPlaybookLoading] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [analysis, setAnalysis] = useState(null);
  const demoSteps = ['Initializing GeoInt digital twin...', 'Extracting spatial dependencies...', 'Running simulator...'];

  // Shared event queues
  const [approvedEvents, setApprovedEvents] = useState([]);
  const [activeEvents, setActiveEvents] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]); // pending reviews
  const [operatorDrafts, setOperatorDrafts] = useState([]); // DRAFT or REJECTED operator drafts
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  // Editing state for Tab 2 Planner
  const [editingEvent, setEditingEvent] = useState(null);

  // Selected event state for details/twin
  const [selectedEvent, setSelectedEvent] = useState(null);

  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const eventId = params.get('event_id');
    const editMode = params.get('edit_mode');
    if (eventId) {
      const loadEventFromUrl = async () => {
        try {
          const res = await axios.get(`${API_BASE_URL}/events/${eventId}`);
          if (res.data) {
            if (editMode === 'true') {
              setEditingEvent(res.data);
              setActiveTab('PLANNER');
            } else {
              setSelectedEvent(res.data);
            }
          }
        } catch (err) {
          console.error("Failed to load event from query param:", err);
        }
      };
      loadEventFromUrl();
    }
  }, [location.search]);

  // Simulation states for NeuroTwin Wizard inside Event Planner
  const [simulationScenario, setSimulationScenario] = useState(null);
  const [simulationResources, setSimulationResources] = useState(null);
  const [simulationCenter, setSimulationCenter] = useState(null);
  const [isWizardActive, setIsWizardActive] = useState(false);

  const handleSimulationChange = (scenario, resourcesDelta, center, active) => {
    setSimulationScenario(scenario);
    setSimulationResources(resourcesDelta);
    setSimulationCenter(center);
    setIsWizardActive(active);
  };

  const fetchQueues = async () => {
    setLoading(true);
    try {
      const [approvedRes, activeRes, pendingRes, draftsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/events/approved`),
        axios.get(`${API_BASE_URL}/events/active`),
        axios.get(`${API_BASE_URL}/events/pending`),
        axios.get(`${API_BASE_URL}/events/my-events`)
      ]);

      setApprovedEvents(approvedRes.data);
      setActiveEvents(activeRes.data);
      setPendingEvents(pendingRes.data);
      
      // Filter operator drafts to keep DRAFT, SIMULATED, SENT_TO_TC, UNDER_REVIEW, and REJECTED
      const draftsOnly = draftsRes.data.filter(e => ['DRAFT', 'SIMULATED', 'SENT_TO_TC', 'UNDER_REVIEW', 'REJECTED'].includes(e.status));
      setOperatorDrafts(draftsOnly);
    } catch (err) {
      console.error("Failed to load operations queues:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueues();
    const interval = setInterval(fetchQueues, 15000);
    return () => clearInterval(interval);
  }, []);

  // Listen to custom events
  useEffect(() => {
    const handleEditDraft = (e) => {
      const evt = e.detail?.event || e.detail;
      if (evt) {
        setEditingEvent(evt);
        setActiveTab('PLANNER');
      }
    };
    const handleRefresh = () => {
      fetchQueues();
    };
    const handleOpenDetails = (e) => {
      if (e.detail && e.detail.event) {
        setSelectedEvent(e.detail.event);
      }
    };

    window.addEventListener('edit-event-draft', handleEditDraft);
    window.addEventListener('edit-draft-in-planner', handleEditDraft);
    window.addEventListener('refresh-notifications', handleRefresh);
    window.addEventListener('open-event-details', handleOpenDetails);

    return () => {
      window.removeEventListener('edit-event-draft', handleEditDraft);
      window.removeEventListener('edit-draft-in-planner', handleEditDraft);
      window.removeEventListener('refresh-notifications', handleRefresh);
      window.removeEventListener('open-event-details', handleOpenDetails);
    };
  }, []);

  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
    window.dispatchEvent(new CustomEvent('open-event-details', {
      detail: { event, autoFocusWorkflow: true }
    }));
  };

  const handleUpdateStatus = async (eventId, newStatus) => {
    setActionLoading(eventId);
    try {
      await axios.post(`${API_BASE_URL}/events/update-status`, {
        event_id: eventId,
        status: newStatus,
        comments: `Status updated to ${newStatus} by Command Control Operator.`
      });
      await fetchQueues();
      
      // Update selectedEvent state immediately
      if (selectedEvent && selectedEvent.event_id === eventId) {
        setSelectedEvent(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to update event status.");
    } finally {
      setActionLoading(null);
    }
  };

  const executeNeuroTwinSimulation = async () => {
    if (!selectedEvent) return;

    setShowDemoModal(true);
    setDemoStep(0);

    let apiData = null;
    const apiPromise = axios.post(`${API_BASE_URL}/neurotwin/analyze`, {
      event_type: selectedEvent.event_type,
      event_cause: selectedEvent.event_cause,
      priority: selectedEvent.priority,
      zone: selectedEvent.zone,
      corridor: selectedEvent.corridor,
      requires_road_closure: selectedEvent.requires_road_closure,
      latitude: selectedEvent.latitude,
      longitude: selectedEvent.longitude
    }).then(res => {
      apiData = res.data;
    }).catch(err => {
      console.error("Simulation endpoint failed:", err);
    });

    for (let step = 0; step < demoSteps.length; step++) {
      setDemoStep(step);
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    await apiPromise;

    if (apiData) {
      setAnalysis(apiData);
    } else {
      alert("Cognitive twin simulation failed. Falling back to default heuristics.");
    }
    setDemoStep(demoSteps.length);
  };

  const handleDownloadPlaybook = async (eventId) => {
    if (!eventId) return;
    setPlaybookLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/neurotwin/playbook/${eventId}`);
      const element = document.createElement("a");
      const file = new Blob([res.data], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = `Playbook_${eventId}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (err) {
      console.error(err);
      alert("Failed to download playbook.");
    } finally {
      setPlaybookLoading(false);
    }
  };

  const handleTriggerEmergencyAlert = async () => {
    if (!alertMessage.trim()) return;
    setAlertSubmitting(true);
    try {
      await axios.post(`${API_BASE_URL}/events/emergency-alert`, {
        severity: alertSeverity,
        message: alertMessage
      });
      setShowAlertModal(false);
      setAlertMessage('');
      setAlertSeverity('Critical');
      alert("Emergency alert triggered successfully across all terminals!");
      fetchQueues();
    } catch (err) {
      console.error(err);
      alert("Failed to trigger emergency alert: " + (err.response?.data?.detail || err.message));
    } finally {
      setAlertSubmitting(false);
    }
  };

  // Helper: check response priority style class
  const getResponseLevelColor = (level) => {
    switch (level) {
      case 'Emergency': return 'text-cyber-red bg-cyber-red/5 border-cyber-red/30';
      case 'Critical': return 'text-cyber-orange bg-cyber-orange/5 border-cyber-orange/30';
      case 'Elevated': return 'text-cyber-yellow bg-cyber-yellow/5 border-cyber-yellow/30';
      default: return 'text-cyber-green bg-cyber-green/5 border-cyber-green/30';
    }
  };

  // Compile map events (Upcoming Planned, Approved, Active, Pending Reviews)
  const mapEvents = [
    ...approvedEvents,
    ...activeEvents,
    ...pendingEvents
  ].filter((v, i, a) => a.findIndex(t => t.event_id === v.event_id) === i); // De-duplicate

  // Split pending events into unplanned officer dispatches and planned reviews
  const unplannedPending = pendingEvents.filter(e => e.event_type === 'unplanned');

  return (
    <div className="space-y-4 font-sans select-none relative pb-16">
      
      {/* 3-Tab Command Console Headers */}
      <div className="flex justify-between items-center border-b border-cyber-border bg-[#0a0f26]/60 p-1 rounded-lg select-none gap-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('LIVE_OPS')}
            className={`flex items-center gap-2 px-4 py-2 font-mono text-xs font-bold tracking-wider rounded transition-all uppercase cursor-pointer ${
              activeTab === 'LIVE_OPS'
                ? 'bg-[#00d2ff]/15 border border-[#00d2ff]/40 text-white shadow-[0_0_10px_rgba(0,210,255,0.1)]'
                : 'text-slate-400 hover:text-white bg-transparent border border-transparent'
            }`}
          >
            <Radio className="w-4 h-4" />
            Live Operations Room
          </button>

          <button
            onClick={() => setActiveTab('PLANNER')}
            className={`flex items-center gap-2 px-4 py-2 font-mono text-xs font-bold tracking-wider rounded transition-all uppercase cursor-pointer ${
              activeTab === 'PLANNER'
                ? 'bg-[#00d2ff]/15 border border-[#00d2ff]/40 text-white shadow-[0_0_10px_rgba(0,210,255,0.1)]'
                : 'text-slate-400 hover:text-white bg-transparent border border-transparent'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            Event Planner
          </button>

          <button
            onClick={() => setActiveTab('CALENDAR')}
            className={`flex items-center gap-2 px-4 py-2 font-mono text-xs font-bold tracking-wider rounded transition-all uppercase cursor-pointer ${
              activeTab === 'CALENDAR'
                ? 'bg-[#00d2ff]/15 border border-[#00d2ff]/40 text-white shadow-[0_0_10px_rgba(0,210,255,0.1)]'
                : 'text-slate-400 hover:text-white bg-transparent border border-transparent'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Operations Calendar
          </button>
        </div>

      </div>

      {/* Tab Content Rendering */}
      
      {/* TAB 1: LIVE OPERATIONS ROOM */}
      {activeTab === 'LIVE_OPS' && (
        <div className="h-[calc(100vh-190px)] min-h-0">
          {selectedEvent && ['ACTIVE', 'ZONE ACTIVE', 'ZONE_ACTIVE'].includes((selectedEvent.status || '').toUpperCase()) ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
              {/* Left Side: Map (65% / 8 columns) */}
              <div className="lg:col-span-8 h-full flex flex-col min-h-0">
                <CommandCard title={`GEOINT DIGITAL TWIN CONTROL ROOM - ${selectedEvent.event_id}`} className="h-full flex flex-col">
                  <div className="flex-1 min-h-0 relative rounded-lg overflow-hidden border border-cyber-border/40">
                    <MapCommandCenter 
                      events={mapEvents} 
                      onSelectEvent={handleSelectEvent} 
                    />
                  </div>
                </CommandCard>
              </div>

              {/* Right Side: Live Monitoring HUD Sidebar (35% / 4 columns) */}
              <div className="lg:col-span-4 h-full overflow-y-auto space-y-4 pr-1 select-none font-mono text-[9px]">
                
                {/* Event Summary & Dismiss Button */}
                <CommandCard title="ACTIVE EVENT HUD">
                  <div className="space-y-3.5">
                    <div className="flex justify-between items-center border-b border-cyber-border/40 pb-2">
                      <div>
                        <span className="font-bold text-white uppercase text-[10px] tracking-wider font-orbitron">{selectedEvent.event_id}</span>
                        <div className="text-[8px] text-slate-400 capitalize mt-0.5">{selectedEvent.event_cause.replace('_', ' ')} | {selectedEvent.priority} Priority</div>
                      </div>
                      <button 
                        onClick={() => setSelectedEvent(null)}
                        className="p-1 hover:bg-[#ff0055]/10 text-slate-400 hover:text-[#ff0055] border border-transparent rounded cursor-pointer bg-transparent"
                        title="Close Monitor"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Event Stress Index (ESI) circular gauge */}
                    <div className="grid grid-cols-2 gap-3 bg-[#050b18] p-3 border border-slate-900 rounded-lg items-center">
                      <div className="flex flex-col items-center justify-center border-r border-slate-900/60 pr-2">
                        <span className="text-slate-550 text-[7.5px] uppercase font-bold text-center block mb-1">Event Stress Index</span>
                        {(() => {
                          const esi = Math.round(72 + Math.sin(Date.now() / 25000) * 8);
                          let color = '#ff0055'; // Red
                          let status = 'CRITICAL';
                          if (esi < 30) { color = '#22c55e'; status = 'HEALTHY'; }
                          else if (esi < 60) { color = '#eab308'; status = 'WARNING'; }
                          else if (esi < 80) { color = '#f97316'; status = 'HIGH RISK'; }
                          
                          const radius = 18;
                          const circumference = 2 * Math.PI * radius;
                          const strokeDashoffset = circumference - (esi / 100) * circumference;
                          return (
                            <div className="relative flex items-center justify-center" style={{ width: '50px', height: '50px' }}>
                              <svg width="50" height="50" style={{ transform: 'rotate(-90deg)' }}>
                                <circle cx="25" cy="25" r={radius} fill="none" stroke="#0c142c" strokeWidth="3.5"></circle>
                                <circle cx="25" cy="25" r={radius} fill="none" stroke={color} strokeWidth="3.5" 
                                        strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
                                        style={{ transition: 'stroke-dashoffset 0.4s ease' }}></circle>
                              </svg>
                              <div className="absolute flex flex-col items-center justify-center">
                                <span className="font-orbitron font-bold text-[11px] text-white leading-none">{esi}</span>
                                <span className="text-[5px] font-bold leading-none mt-0.5" style={{ color }}>{status}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="space-y-1.5 pl-1.5">
                        <span className="text-slate-550 block text-[7.5px] font-bold uppercase">Crowd Surge Status:</span>
                        <div className="bg-[#ff0055]/10 border border-[#ff0055]/30 text-[#ff0055] text-[7.5px] px-1.5 py-0.5 rounded font-bold uppercase text-center animate-pulse">
                          ⚠️ SURGE WARNING ACTIVE
                        </div>
                        <div className="space-y-0.5 text-slate-300 text-[8px]">
                          <div>Expected: <strong className="text-white">{(selectedEvent.expected_attendance || 50000).toLocaleString()} Pax</strong></div>
                          <div>Actual Live: <strong className="text-[#ff0055]">{(Math.round((selectedEvent.expected_attendance || 50000) * 1.34)).toLocaleString()} Pax</strong></div>
                          <div>Growth Rate: <strong className="text-white">+420 visitors/min</strong></div>
                        </div>
                      </div>
                    </div>

                    {/* Smart Parking capacity & Citizen Advisories */}
                    <div className="p-2.5 bg-[#050b18] border border-slate-900 rounded-lg space-y-2">
                      <div className="text-white font-bold uppercase text-[8px] border-b border-slate-900 pb-1 flex justify-between">
                        <span>Smart Parking Forecast</span>
                        <span className="text-[7.5px] text-[#eab308]">Overflow Risk: 92%</span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-1.5 text-[7.5px]">
                        <div className="p-1 border border-[#ff0055]/35 bg-[#ff0055]/5 rounded text-center">
                          <span className="block text-slate-500 font-bold">PARKING A</span>
                          <strong className="text-[#ff0055] font-orbitron">1,000/1,000</strong>
                          <span className="text-[6.5px] text-slate-400 block mt-0.5 font-bold uppercase">🔴 FULL</span>
                        </div>
                        <div className="p-1 border border-[#eab308]/35 bg-[#eab308]/5 rounded text-center">
                          <span className="block text-slate-500 font-bold">PARKING B</span>
                          <strong className="text-[#eab308] font-orbitron">920/1,000</strong>
                          <span className="text-[6.5px] text-slate-400 block mt-0.5 font-bold uppercase">🟡 NEAR CAP</span>
                        </div>
                        <div className="p-1 border border-[#22c55e]/35 bg-[#22c55e]/5 rounded text-center">
                          <span className="block text-slate-500 font-bold">PARKING C</span>
                          <strong className="text-[#22c55e] font-orbitron">400/1,500</strong>
                          <span className="text-[6.5px] text-slate-400 block mt-0.5 font-bold uppercase">🟢 AVAILABLE</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-slate-550 block text-[7.5px] font-bold uppercase">Live Citizen Advisory:</span>
                        <textarea
                          readOnly
                          value={`TRAFFIC ALERT: St. Joseph Ground (Parking A) is FULL. Redirection Detour active. Proceed to Parking C via Bypass Loop.`}
                          rows="2"
                          className="w-full bg-[#030611] border border-cyber-border/40 rounded p-1.5 text-slate-300 text-[8px] outline-none resize-none"
                        />
                      </div>

                      <button
                        onClick={() => {
                          alert("Citizen Alert broadcasted to all navigation nodes, signages, and TRAFIK - 4X citizen mobile feeds.");
                        }}
                        className="w-full py-1 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-orbitron font-bold text-[8.5px] uppercase tracking-wider rounded cursor-pointer transition-all border-none"
                      >
                        📻 Broadcast Citizen Alert
                      </button>
                    </div>

                    {/* AI Replanning recommendations comparing recommended vs current active plans */}
                    <div className="p-2.5 bg-slate-950 border border-[#eab308]/30 rounded-lg space-y-2">
                      <span className="text-[#eab308] font-bold block text-[8px] uppercase tracking-wider">
                        💡 AI Replanning Recommendation Available
                      </span>
                      
                      <div className="grid grid-cols-2 gap-2 border border-slate-900 rounded p-1.5 bg-slate-900/40 text-[7.5px]">
                        <div className="space-y-0.5">
                          <span className="text-slate-550 block uppercase font-bold">Current Active Plan</span>
                          <div>Officers: <strong className="text-white">80 Units</strong></div>
                          <div>Barricades: <strong className="text-white">50 Cordons</strong></div>
                          <div>Scenario: <strong className="text-white">Scenario B</strong></div>
                        </div>
                        <div className="space-y-0.5 border-l border-slate-900/60 pl-2">
                          <span className="text-[#00ff66] block uppercase font-bold">AI Recommended Plan</span>
                          <div>Officers: <strong className="text-[#00ff66]">112 Units</strong></div>
                          <div>Barricades: <strong className="text-[#00ff66]">75 Cordons</strong></div>
                          <div>Scenario: <strong className="text-[#00ff66]">Scenario C</strong></div>
                        </div>
                      </div>

                      <button
                        onClick={async () => {
                          try {
                            await axios.post(`${API_BASE_URL}/events/update-status`, {
                              event_id: selectedEvent.event_id,
                              status: 'ZONE ACTIVE',
                              comments: 'AI Replanning applied by Command Center. Officers scaled to 112, Barricades scaled to 75.'
                            });
                            alert("Replanning applied successfully. Dispatch vectors adjusted.");
                            fetchQueues();
                          } catch (err) {
                            alert("Failed to apply replanning: " + (err.response?.data?.detail || err.message));
                          }
                        }}
                        className="w-full py-1.5 bg-[#eab308] hover:bg-[#d97706] text-black font-orbitron font-black text-[8.5px] uppercase tracking-wider rounded cursor-pointer transition-all border-none"
                      >
                        Apply AI Recommended Replanning
                      </button>
                    </div>

                  </div>
                </CommandCard>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
              {/* Left Side: Map (8 columns) */}
              <div className="lg:col-span-8 h-full flex flex-col min-h-0">
                <CommandCard title="GEOINT DIGITAL TWIN CONTROL ROOM" className="h-full flex flex-col">
                  <div className="flex-1 min-h-0 relative rounded-lg overflow-hidden border border-cyber-border/40">
                    <MapCommandCenter 
                      events={mapEvents} 
                      onSelectEvent={handleSelectEvent} 
                    />
                  </div>
                </CommandCard>
              </div>

              {/* Right Side: General Operations HUD & Emergency Trigger (4 columns) */}
              <div className="lg:col-span-4 h-full overflow-y-auto space-y-4 pr-1 font-mono text-[9px] select-none">
                {/* City Operations Health Overview */}
                <CommandCard title="CITY OPERATIONS OVERVIEW">
                  <div className="space-y-3.5">
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="bg-[#050b18] p-2.5 border border-slate-900 rounded">
                        <span className="text-slate-500 block font-bold uppercase text-[8px]">Active Events</span>
                        <strong className="text-white font-orbitron text-sm">{activeEvents.length}</strong>
                      </div>
                      <div className="bg-[#050b18] p-2.5 border border-slate-900 rounded">
                        <span className="text-slate-550 block font-bold uppercase text-[8px]">Pending Review</span>
                        <strong className="text-[#00d2ff] font-orbitron text-sm">{pendingEvents.length}</strong>
                      </div>
                    </div>

                    <div className="bg-[#050b18] p-2.5 border border-slate-900 rounded space-y-2">
                      <div className="text-white font-bold uppercase text-[8px] border-b border-slate-900 pb-1 flex justify-between items-center">
                        <span>Operational Status Log</span>
                        <Database className="w-3.5 h-3.5 text-slate-550" />
                      </div>
                      <div className="max-h-[180px] overflow-y-auto pr-1 space-y-1.5 text-[8.5px] text-slate-400">
                        {mapEvents.slice(0, 5).map(evt => (
                          <div key={evt.event_id} className="flex justify-between border-b border-slate-900/40 pb-1">
                            <span className="text-white font-bold">{evt.event_id}</span>
                            <span className="capitalize">{evt.event_cause.replace('_', ' ')}</span>
                            <span className={`uppercase font-bold text-[7.5px] ${
                              evt.status === 'APPROVED' ? 'text-[#00ff66]' : 'text-cyber-yellow'
                            }`}>{evt.status}</span>
                          </div>
                        ))}
                        {mapEvents.length === 0 && (
                          <div className="text-center text-slate-600 py-4">No active system events.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </CommandCard>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EVENT PLANNER */}
      {activeTab === 'PLANNER' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch h-[calc(100vh-190px)] min-h-0">
          
          {/* Planner Form - Stable column layout shifts size without unmounting */}
          <div className={`${isWizardActive ? 'lg:col-span-5' : 'lg:col-span-12'} overflow-y-auto h-full pr-1`}>
            <EventPlannerForm 
              onDraftSaved={fetchQueues} 
              editingEvent={editingEvent} 
              onSimulationChange={handleSimulationChange}
            />
          </div>

          {/* Digital Twin Map Simulation on the Right (lg:col-span-7) */}
          {isWizardActive && (
            <div className="lg:col-span-7 h-full flex flex-col min-h-0">
              <CommandCard title="GEOINT DIGITAL TWIN - NEUROTWIN SIMULATION ROOM" className="h-full flex flex-col">
                <div className="flex-1 min-h-0 relative rounded-lg overflow-hidden border border-cyber-border/40">
                  <MapCommandCenter 
                    events={mapEvents}
                    simulationScenario={simulationScenario}
                    simulationResources={simulationResources}
                    simulationCenter={simulationCenter}
                  />
                </div>
              </CommandCard>
            </div>
          )}

        </div>
      )}

      {/* TAB 3: OPERATIONS CALENDAR */}
      {activeTab === 'CALENDAR' && (
        <CalendarView 
          onSelectEvent={handleSelectEvent} 
          onCreateActiveEvent={(evt) => {
            setEditingEvent(evt);
            setActiveTab('PLANNER');
          }}
        />
      )}

      {/* Emergency Alert Modal */}
      {showAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#070b19] border border-cyber-red/50 rounded-lg shadow-[0_0_30px_rgba(255,0,85,0.2)] p-6 font-mono relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyber-red via-cyber-orange to-cyber-red"></div>
            
            <div className="flex justify-between items-center border-b border-cyber-border/40 pb-3 mb-4">
              <div className="flex items-center gap-2 text-cyber-red">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
                <h3 className="font-orbitron font-bold text-sm tracking-wider uppercase">SYSTEM-WIDE EMERGENCY ALERT</h3>
              </div>
              <button 
                onClick={() => {
                  setShowAlertModal(false);
                  setAlertMessage('');
                  setAlertSeverity('Critical');
                }}
                className="p-1 hover:bg-[#ff0055]/10 text-slate-400 hover:text-[#ff0055] rounded cursor-pointer bg-transparent border border-transparent"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-left">
              {/* Severity Selector */}
              <div className="space-y-2">
                <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Severity Level</label>
                <div className="grid grid-cols-4 gap-2">
                  {['Critical', 'High', 'Medium', 'Low'].map((sev) => {
                    let btnStyle = "";
                    if (alertSeverity === sev) {
                      if (sev === 'Critical') btnStyle = "bg-cyber-red border-cyber-red text-white";
                      else if (sev === 'High') btnStyle = "bg-cyber-orange border-cyber-orange text-white";
                      else if (sev === 'Medium') btnStyle = "bg-cyber-yellow border-cyber-yellow text-black";
                      else btnStyle = "bg-cyber-green border-cyber-green text-white";
                    } else {
                      btnStyle = "bg-slate-950 border-cyber-border text-slate-400 hover:border-slate-650";
                    }
                    return (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setAlertSeverity(sev)}
                        className={`py-1.5 px-1 border rounded text-[10px] font-orbitron font-bold tracking-wider uppercase transition-all cursor-pointer ${btnStyle}`}
                      >
                        {sev}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Message Details */}
              <div className="space-y-2">
                <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Emergency Broadcast Message</label>
                <textarea
                  value={alertMessage}
                  onChange={(e) => setAlertMessage(e.target.value)}
                  placeholder="Describe the critical city event (e.g., Gridlock on Central Corridor, Water pipeline burst at Zone 3, etc.)"
                  rows="4"
                  className="w-full bg-[#050915] border border-cyber-border/60 hover:border-cyber-accent/60 focus:border-cyber-accent rounded p-2 text-white text-[11px] outline-none transition-all resize-none font-sans"
                  required
                />
              </div>

              {/* Warnings */}
              <div className="p-3 bg-cyber-red/5 border border-cyber-red/20 rounded text-[9px] text-cyber-red leading-normal flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>WARNING: This broadcast is live and irreversible. All user sessions across Commissioner, Controller, and Field terminals will play sirens and display alert indicators.</span>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-2 border-t border-cyber-border/40">
                <button
                  type="button"
                  onClick={() => {
                    setShowAlertModal(false);
                    setAlertMessage('');
                    setAlertSeverity('Critical');
                  }}
                  className="px-4 py-2 border border-cyber-border bg-transparent hover:bg-slate-900 text-slate-400 hover:text-white text-[10px] font-orbitron font-bold uppercase tracking-wider rounded cursor-pointer transition-all"
                  disabled={alertSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleTriggerEmergencyAlert}
                  className="px-4 py-2 bg-cyber-red hover:bg-[#d92121] text-white text-[10px] font-orbitron font-bold uppercase tracking-wider rounded cursor-pointer transition-all border border-cyber-red flex items-center gap-1.5 disabled:opacity-50"
                  disabled={alertSubmitting || !alertMessage.trim()}
                >
                  {alertSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Broadcasting...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Broadcast Alert
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Helper priority colors
const getPriorityColor = (p) => {
  switch (p?.toUpperCase()) {
    case 'CRITICAL': return 'text-cyber-red border-cyber-red/30 bg-cyber-red/5';
    case 'HIGH': return 'text-cyber-orange border-[#ff5500]/30 bg-[#ff5500]/5';
    case 'MEDIUM': return 'text-cyber-yellow border-cyber-yellow/30 bg-cyber-yellow/5';
    default: return 'text-cyber-green border-cyber-green/30 bg-cyber-green/5';
  }
};
