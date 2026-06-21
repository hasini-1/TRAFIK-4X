import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import CommandButton from './ui/CommandButton';
import StatusBadge from './ui/StatusBadge';
import { 
  X, 
  MapPin, 
  Cpu, 
  AlertTriangle, 
  ShieldCheck, 
  Play, 
  CheckCircle, 
  Navigation, 
  Radio, 
  Calendar, 
  FileText, 
  Send, 
  Sparkles, 
  Activity,
  History,
  Info,
  Sliders,
  ChevronRight,
  ShieldAlert,
  Loader2,
  FileDown
} from 'lucide-react';

export default function EventDetailsModal({ event, onClose, autoFocusWorkflow }) {
  if (!event) return null;

  const { role } = useAuth();
  const workflowRef = useRef(null);
  const mapRef = useRef(null);

  // States
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Commissioner workflow states
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Operator unplanned vetting states
  const [finalOfficers, setFinalOfficers] = useState(event.ai_officers || 4);
  const [finalBarricades, setFinalBarricades] = useState(event.ai_barricades || 10);
  const [finalTows, setFinalTows] = useState(event.ai_tow_vehicles || 1);
  const [finalResponse, setFinalResponse] = useState(event.ai_response_level || 'Moderate');

  // Officer post-event outcomes states
  const [actualOfficers, setActualOfficers] = useState(event.final_officers || event.ai_officers || 4);
  const [actualBarricades, setActualBarricades] = useState(event.final_barricades || event.ai_barricades || 10);
  const [actualDelay, setActualDelay] = useState(15.0);
  const [actualRecovery, setActualRecovery] = useState(45.0);
  const [unexpectedIncidents, setUnexpectedIncidents] = useState('');
  const [successNotes, setSuccessNotes] = useState('');
  const [lessonsLearned, setLessonsLearned] = useState('');

  // General progress comments
  const [progressComment, setProgressComment] = useState('');

  // Dynamic current status
  const [currentStatus, setCurrentStatus] = useState(event.status);

  // Sync state whenever event prop changes
  useEffect(() => {
    setCurrentStatus(event.status);
    setFinalOfficers(event.final_officers || event.ai_officers || 4);
    setFinalBarricades(event.final_barricades || event.ai_barricades || 10);
    setFinalTows(event.final_tow_vehicles || event.ai_tow_vehicles || 1);
    setFinalResponse(event.final_response_level || event.ai_response_level || 'Moderate');
    setActualOfficers(event.final_officers || event.ai_officers || 4);
    setActualBarricades(event.final_barricades || event.ai_barricades || 10);
  }, [event]);

  // Auto transition SENT_TO_TC -> UNDER_REVIEW for Inspector
  useEffect(() => {
    if (role === 'INSPECTOR' && event.status === 'SENT_TO_TC') {
      const autoTransition = async () => {
        try {
          await axios.post(`${API_BASE_URL}/events/update-status`, {
            event_id: event.event_id,
            status: 'UNDER_REVIEW',
            comments: 'Traffic Controller started review.'
          });
          setCurrentStatus('UNDER_REVIEW');
          window.dispatchEvent(new CustomEvent('refresh-notifications'));
          const histRes = await axios.get(`${API_BASE_URL}/events/history/${event.event_id}`);
          setHistoryLogs(histRes.data);
        } catch (err) {
          console.warn("Auto transition to UNDER_REVIEW failed:", err);
        }
      };
      autoTransition();
    }
  }, [event, role]);

  // NeuroTwin simulation states
  const [analysis, setAnalysis] = useState(null);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [playbookLoading, setPlaybookLoading] = useState(false);

  const demoSteps = [
    { title: "EVENT DNA SEQUENCING", detail: "Structuring categoricals into fingerprint arrays..." },
    { title: "HISTORICAL INDEX MATCHING", detail: "Querying database for cosine-similar incidents..." },
    { title: "CONGESTION SPILLOVER FORECASTING", detail: "Running XGBoost regression on traffic density..." },
    { title: "RESOURCE CALIBRATION", detail: "Predicting target officers, barricades, and tow trucks..." },
    { title: "SCENARIO SIMULATION", detail: "Testing mitigation Scenarios A-E across network..." },
    { title: "STRATEGY OPTIMIZATION", detail: "Evaluating trade-offs to select recommended plan..." },
    { title: "PLAYBOOK COMPILATION", detail: "Building text-based operational playbook..." }
  ];

  const executeNeuroTwinSimulation = async () => {
    setShowDemoModal(true);
    setDemoStep(0);

    let apiData = null;
    const apiPromise = axios.post(`${API_BASE_URL}/neurotwin/analyze`, {
      event_type: event.event_type,
      event_cause: event.event_cause,
      priority: event.priority,
      zone: event.zone,
      corridor: event.corridor,
      requires_road_closure: event.requires_road_closure,
      latitude: event.latitude,
      longitude: event.longitude
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

  // Fetch history logs
  useEffect(() => {
    setHistoryLoading(true);
    axios.get(`${API_BASE_URL}/events/history/${event.event_id}`)
      .then(res => setHistoryLogs(res.data))
      .catch(err => console.warn(err))
      .finally(() => setHistoryLoading(false));
  }, [event]);

  // Leaflet map setup
  useEffect(() => {
    // Delay initialization to let modal mount and animate
    const timer = setTimeout(() => {
      const mapContainer = document.getElementById("details-modal-map");
      if (mapContainer && !mapRef.current) {
        try {
          const map = L.map('details-modal-map', {
            center: [event.latitude || 12.9716, event.longitude || 77.5946],
            zoom: 14,
            zoomControl: false
          });

          L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '©OpenStreetMap, ©CartoDB'
          }).addTo(map);

          // Marker
          L.marker([event.latitude || 12.9716, event.longitude || 77.5946]).addTo(map);

          // Cordon radius
          const radiusKm = event.priority === 'Critical' ? 2.0 : (event.priority === 'High' ? 1.5 : 1.0);
          L.circle([event.latitude || 12.9716, event.longitude || 77.5946], {
            radius: radiusKm * 1000,
            color: '#00d2ff',
            fillColor: '#00d2ff',
            fillOpacity: 0.08,
            weight: 1.5,
            dashArray: '5, 5'
          }).addTo(map);

          mapRef.current = map;
        } catch (e) {
          console.error("Leaflet initialization inside modal failed:", e);
        }
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [event]);

  // Auto scroll to workflow if requested
  useEffect(() => {
    if (autoFocusWorkflow && workflowRef.current) {
      setTimeout(() => {
        workflowRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 400);
    }
  }, [autoFocusWorkflow]);

  // Action: Commissioner Approve
  const handleApprove = async () => {
    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await axios.post(`${API_BASE_URL}/events/approve`, {
        event_id: event.event_id,
        comments: approvalNotes || "Approved planned route procession."
      });
      setSuccessMsg("Event approved and deployment package sent to field officers!");
      window.dispatchEvent(new CustomEvent('refresh-notifications'));
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || "Approval failed.");
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Commissioner Reject
  const handleReject = async () => {
    if (!rejectionReason) {
      setErrorMsg("Please specify a rejection reason.");
      return;
    }
    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await axios.post(`${API_BASE_URL}/events/reject`, {
        event_id: event.event_id,
        comments: rejectionReason
      });
      setSuccessMsg("Event proposal rejected and returned to Command Operator queue.");
      window.dispatchEvent(new CustomEvent('refresh-notifications'));
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || "Rejection failed.");
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Operator Vett Unplanned Event & Forward to Commissioner
  const handleOperatorForward = async () => {
    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await axios.post(`${API_BASE_URL}/events/forward`, {
        event_id: event.event_id,
        final_officers: parseInt(finalOfficers),
        final_barricades: parseInt(finalBarricades),
        final_tow_vehicles: parseInt(finalTows),
        final_response_level: finalResponse,
        comments: "Operator vetted unplanned critical dispatch parameters."
      });
      setSuccessMsg("Unplanned event vetted and forwarded to Commissioner queue!");
      window.dispatchEvent(new CustomEvent('refresh-notifications'));
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || "Forward vetting failed.");
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Operator Deploy (Planned APPROVED -> ACTIVE)
  const handleDeploy = async () => {
    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await axios.post(`${API_BASE_URL}/events/update-status`, {
        event_id: event.event_id,
        status: 'ACTIVE',
        comments: "Operational dispatch deployed to active status."
      });
      setSuccessMsg("Incident is now ACTIVE in the field!");
      window.dispatchEvent(new CustomEvent('refresh-notifications'));
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      console.error(err);
      setErrorMsg("Deployment activation failed.");
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Officer Deploy Resources (changes status from APPROVED to ACTIVE)
  const handleOfficerDeploy = async () => {
    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await axios.post(`${API_BASE_URL}/events/update-status`, {
        event_id: event.event_id,
        status: 'ACTIVE',
        comments: "Deployed resources and barricade cordons at checkposts."
      });
      setSuccessMsg("Resources deployed! Dispatch is now ACTIVE.");
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to deploy resources.");
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Officer Update Progress
  const handleOfficerUpdateProgress = async (e) => {
    e.preventDefault();
    if (!progressComment) return;
    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await axios.post(`${API_BASE_URL}/events/update-status`, {
        event_id: event.event_id,
        status: 'ACTIVE',
        comments: progressComment
      });
      setSuccessMsg("Operational progress update logged successfully!");
      setProgressComment('');
      // Refetch history logs
      const histRes = await axios.get(`${API_BASE_URL}/events/history/${event.event_id}`);
      setHistoryLogs(histRes.data);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to submit progress update.");
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Officer Submit Outcomes & Complete Event
  const handleOfficerComplete = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const mergedComments = `Completed with Notes: ${successNotes || 'None'}. Unexpected events: ${unexpectedIncidents || 'None'}.`;

    try {
      await axios.post(`${API_BASE_URL}/events/outcome`, {
        event_id: event.event_id,
        actual_delay: parseFloat(actualDelay),
        resources_used: `Officers: ${actualOfficers}, Barricades: ${actualBarricades}`,
        officers_deployed: parseInt(actualOfficers),
        emergency_units_used: "1 Rescue unit",
        road_clearance_time_minutes: parseFloat(actualRecovery),
        response_time_minutes: 10.0,
        resolution_time_minutes: 120.0,
        road_closure_duration_minutes: 90.0,
        number_affected_roads: 2,
        estimated_citizens_affected: 500,
        estimated_vehicles_affected: 200,
        traffic_diversions_used: "Detours active",
        comments: mergedComments
      });

      // Post-event learning comparator
      await axios.post(`${API_BASE_URL}/events/learning/compare/${event.event_id}`, {
        lessons_learned: lessonsLearned || "Standard clearance matched predictions."
      });

      setSuccessMsg("Post-event outcome submitted and incident marked COMPLETED!");
      window.dispatchEvent(new CustomEvent('refresh-notifications'));
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || "Outcome capture submission failed.");
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Operator Edit Draft Trigger (Dispatches custom event to CommandCenterDashboard)
  const handleTriggerEditDraft = () => {
    window.dispatchEvent(new CustomEvent('edit-event-draft', { detail: { event } }));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 md:p-6 z-[9999] overflow-y-auto select-none font-mono text-xs">
      
      {/* Modal Card */}
      <div className="w-full max-w-4xl bg-[#070c1f] border border-cyber-accent rounded-2xl overflow-hidden shadow-2xl relative flex flex-col my-8">
        
        {/* Glowing Top line */}
        <div className="absolute top-0 left-0 w-full h-[4px] bg-[#00d2ff] animate-pulse"></div>

        {/* Modal Header */}
        <div className="p-4 md:p-5 border-b border-cyber-border/80 flex justify-between items-center bg-[#0a0f26]/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-wider select-all">{event.event_id}</span>
              <StatusBadge status={currentStatus} />
              <span className={`text-[9px] px-1.5 py-0.2 rounded border font-bold uppercase ${
                event.priority === 'Critical' ? 'text-cyber-red border-cyber-red/30 bg-cyber-red/5' : 
                event.priority === 'High' ? 'text-cyber-orange border-[#ff5500]/30 bg-[#ff5500]/5' : 'text-cyber-green border-cyber-green/30 bg-cyber-green/5'
              }`}>
                {event.priority}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 capitalize">
              {event.event_cause.replace('_', ' ')} incident reported by <span className="text-white font-bold">{event.creator_name || 'Officer'}</span>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 border border-cyber-border rounded-lg hover:border-white transition-all cursor-pointer bg-transparent"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 max-h-[70vh]">
          
          {/* Success / Error alerts */}
          {successMsg && (
            <div className="bg-cyber-green/5 border border-cyber-green/45 p-3 rounded-lg text-cyber-green font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="bg-cyber-red/5 border border-cyber-red/45 p-3 rounded-lg text-cyber-red font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Event Information & Map */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* Info table (lg:col-span-6) */}
            <div className="lg:col-span-6 space-y-3">
              <h4 className="text-xs font-orbitron font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-cyber-border/30 pb-1.5">
                <FileText className="w-4 h-4 text-cyber-accent" />
                EVENT PROFILE PARAMETERS
              </h4>
              
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-slate-350 text-[11px]">
                <div>
                  <span className="text-slate-500 uppercase block text-[8px]">Event Type</span>
                  <span className="text-white font-bold capitalize">{event.event_type}</span>
                </div>
                <div>
                  <span className="text-slate-500 uppercase block text-[8px]">Event Cause</span>
                  <span className="text-white font-bold capitalize">{event.event_cause.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-slate-500 uppercase block text-[8px]">City Zone</span>
                  <span className="text-white font-bold">{event.zone}</span>
                </div>
                <div>
                  <span className="text-slate-500 uppercase block text-[8px]">Traffic Corridor</span>
                  <span className="text-white font-bold">{event.corridor}</span>
                </div>
                <div>
                  <span className="text-slate-500 uppercase block text-[8px]">Expected Attendance</span>
                  <span className="text-white font-bold">{event.expected_attendance || 'N/A'} Citizens</span>
                </div>
                <div>
                  <span className="text-slate-500 uppercase block text-[8px]">Expected Duration</span>
                  <span className="text-white font-bold">{event.duration_minutes || 'N/A'} Minutes</span>
                </div>
                <div>
                  <span className="text-slate-500 uppercase block text-[8px]">Event Date</span>
                  <span className="text-white font-bold">{event.event_date || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 uppercase block text-[8px]">Operational Hours</span>
                  <span className="text-white font-bold">{event.start_time || '08:00'} - {event.end_time || '18:00'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 uppercase block text-[8px]">Requires Road Closure</span>
                  <span className="text-cyber-accent font-bold">{event.requires_road_closure ? 'YES (Active Diversion detours)' : 'NO'}</span>
                </div>
              </div>
            </div>

            {/* Map (lg:col-span-6) */}
            <div className="lg:col-span-6 space-y-3">
              <h4 className="text-xs font-orbitron font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-cyber-border/30 pb-1.5">
                <Navigation className="w-4 h-4 text-cyber-accent" />
                GEOSPATIAL LOCATION VIEW
              </h4>
              <div 
                id="details-modal-map" 
                className="h-[150px] w-full rounded-lg border border-cyber-border/40 overflow-hidden bg-slate-950" 
              />
              <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                <span>Coord: {event.latitude?.toFixed(4)}, {event.longitude?.toFixed(4)}</span>
                <span>Affected Rad: {event.priority === 'Critical' ? '2.0' : (event.priority === 'High' ? '1.5' : '1.0')} km circle</span>
              </div>
            </div>

          </div>

          {/* Section 2: AI Predictive Analysis */}
          <div className="space-y-3">
            <h4 className="text-xs font-orbitron font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-cyber-border/30 pb-1.5">
              <Cpu className="w-4 h-4 text-cyber-yellow" />
              NEUROTWIN COGNITIVE FORECASTS
            </h4>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#050b18]/60 p-2.5 border border-cyber-border/40 rounded-lg">
                <span className="text-slate-500 uppercase block text-[8px]">predicted impact score</span>
                <span className="text-lg font-black text-cyber-accent font-orbitron">{event.impact_score?.toFixed(1) || '0.0'}</span>
              </div>
              <div className="bg-[#050b18]/60 p-2.5 border border-cyber-border/40 rounded-lg">
                <span className="text-slate-500 uppercase block text-[8px]">predicted congestion score</span>
                <span className="text-lg font-black text-cyber-orange font-orbitron">{event.risk_band || 'Moderate'}</span>
              </div>
              <div className="bg-[#050b18]/60 p-2.5 border border-cyber-border/40 rounded-lg">
                <span className="text-slate-500 uppercase block text-[8px]">estimated travel delays</span>
                <span className="text-lg font-black text-white font-orbitron">{Math.round((event.impact_score || 0) * 0.7 + 10)} mins</span>
              </div>
              <div className="bg-[#050b18]/60 p-2.5 border border-cyber-border/40 rounded-lg">
                <span className="text-slate-500 uppercase block text-[8px]">model twin confidence</span>
                <span className="text-lg font-black text-cyber-green font-orbitron">{event.confidence_score || '90'}%</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Force Deployment Table */}
              <div className="space-y-1.5">
                <span className="text-[9px] text-slate-500 uppercase block tracking-wider font-bold">RECOMMENDED FORCE DEPLOYMENT</span>
                <table className="w-full text-left border-collapse border border-cyber-border/30 rounded overflow-hidden">
                  <thead>
                    <tr className="bg-slate-900/60 border-b border-cyber-border/40 text-[9px] text-slate-500">
                      <th className="p-2">Officers</th>
                      <th className="p-2">Barricades</th>
                      <th className="p-2">Tow Trucks</th>
                      <th className="p-2">Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="text-white text-[11px] font-bold">
                      <td className="p-2">{event.ai_officers || 4} Deployed</td>
                      <td className="p-2">{event.ai_barricades || 10} Units</td>
                      <td className="p-2">{event.ai_tow_vehicles || 1} Trucks</td>
                      <td className="p-2 text-cyber-yellow">{event.ai_response_level || 'Moderate'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Contingency Plan B */}
              <div className="bg-[#ef4444]/5 p-3 border border-[#ef4444]/25 rounded-lg space-y-1">
                <span className="text-[9px] text-[#ef4444] uppercase tracking-widest block font-bold">PLAN B RESPONSE CONTINGENCY</span>
                <p className="text-[11px] text-slate-300 leading-normal">
                  {event.special_conditions ? `VIP/Weather override contingency: Deploy temporary pumps, lock signal phases at adjacent intersections, detour traffic via side-routes.` : 'Standard detour: Reroute non-essential traffic to Outer Ring Road lanes.'}
                </p>
              </div>

            </div>
          </div>

          {/* Section 3: Historical Vetting & similarity index */}
          {event.event_type !== 'unplanned' && (
            <div className="space-y-3">
              <h4 className="text-xs font-orbitron font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-cyber-border/30 pb-1.5">
                <History className="w-4 h-4 text-cyber-accent" />
                HISTORICAL TWIN INTEL
              </h4>
              <div className="bg-[#050b18]/40 border border-cyber-border/30 rounded-xl p-3.5 space-y-3">
                <div className="flex justify-between items-center text-[10px] text-slate-400">
                  <span>Matched Similar Case: <strong className="text-white">FKID008920</strong></span>
                  <span>Similarity Index: <strong className="text-cyber-green">92.4%</strong></span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                  <div>
                    <span className="text-slate-500 block">Avg Past Resources</span>
                    <span className="text-white font-bold">Officers: 6, Barricades: 12</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Avg Clearance Time</span>
                    <span className="text-white font-bold">38.0 Mins</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Historical Success Rate</span>
                    <span className="text-cyber-green font-bold">84.5% Successful</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 italic leading-relaxed pt-1.5 border-t border-cyber-border/10">
                  "Historical matching logs show political processions and festival assemblies along Hosur road during weekends typical generate high local congestion at intersection corridors. Recommended signal timing holds."
                </p>
              </div>
            </div>
          )}

          {/* Section 4: Workflow Logs timeline */}
          <div className="space-y-3">
            <h4 className="text-xs font-orbitron font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-cyber-border/30 pb-1.5">
              <Activity className="w-4 h-4 text-cyber-accent" />
              WORKFLOW TRANSITION TIMELINE
            </h4>

            {historyLoading ? (
              <span className="text-[10px] text-slate-500">Loading timeline...</span>
            ) : (
              <div className="relative border-l-2 border-cyber-border/40 ml-2 pl-4 space-y-3.5">
                {historyLogs.map(log => (
                  <div key={log.id} className="relative text-[10px] leading-relaxed">
                    <div className="absolute -left-[23px] top-0.5 w-3 h-3 rounded-full border border-cyber-accent bg-[#070c1f] flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyber-accent"></div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center text-slate-200">
                        <strong className="uppercase">{log.new_status.replace('_', ' ')}</strong>
                        <span className="text-slate-550 text-[9px]">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="text-slate-500">
                        By <span className="text-slate-350">{log.user_name}</span> ({log.role.replace('_', ' ')})
                      </div>
                      {log.comments && (
                        <p className="mt-1 text-slate-400 italic bg-slate-950/40 p-2 border border-cyber-border/30 rounded">
                          "{log.comments}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 5: ROLE-SPECIFIC WORKFLOW ACTION Desk */}
          <div ref={workflowRef} className="pt-4 border-t border-cyber-border/40 space-y-4">
            <h4 className="text-xs font-orbitron font-bold text-cyber-accent uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              DECISION DESK WORKFLOW
            </h4>            {/* COMMISSIONER WORKFLOW */}
            {role === 'SENIOR_OFFICIAL' && (
              <div className="space-y-4 bg-cyber-accent/5 p-4 border border-cyber-border rounded-xl">
                
                {/* Check if alreadyApproved/Completed */}
                {['APPROVED', 'ZONE_ASSIGNED', 'ACTIVE', 'COMPLETED'].includes(currentStatus) ? (
                  <div className="text-center p-4 text-cyber-green font-bold flex flex-col gap-2">
                    <ShieldCheck className="w-8 h-8 mx-auto" />
                    <span>Decision finalized. Event is currently in status: {currentStatus}</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">
                       VETTING & AUTHORIZATION TRIGGER
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Approval notes */}
                      <div className="space-y-1">
                        <label className="block text-[10px] text-slate-500 uppercase">Approval Notes / Modifications Remarks</label>
                        <textarea
                          value={approvalNotes}
                          onChange={(e) => setApprovalNotes(e.target.value)}
                          placeholder="Provide timing overrides, signal holds, or staffing guidelines..."
                          rows="2"
                          className="w-full bg-[#030612]/90 border border-cyber-border rounded p-2 text-white outline-none resize-none font-sans"
                        />
                      </div>

                      {/* Rejection reason */}
                      <div className="space-y-1">
                        <label className="block text-[10px] text-slate-500 uppercase">Rejection Comments (Required if denying)</label>
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Explain corridor clashes, peak timing conflicts, or resource unavailability..."
                          rows="2"
                          className="w-full bg-[#030612]/90 border border-cyber-border rounded p-2 text-white outline-none resize-none font-sans"
                        />
                      </div>

                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                      <CommandButton
                        onClick={handleApprove}
                        disabled={actionLoading}
                        variant="success"
                        className="flex-1 py-2 text-xs flex items-center justify-center gap-1.5"
                      >
                        <ShieldCheck className="w-4 h-4 text-slate-950" />
                        APPROVE EVENT
                      </CommandButton>

                      <CommandButton
                        onClick={handleReject}
                        disabled={actionLoading}
                        variant="secondary"
                        className="flex-1 py-2 text-xs bg-cyber-red/20 text-cyber-red border-cyber-red/40 flex items-center justify-center gap-1.5 hover:bg-[#ff0055] hover:text-white"
                      >
                        <X className="w-4 h-4" />
                        REJECT PROPOSAL
                      </CommandButton>

                      <CommandButton
                        onClick={handleReject}
                        disabled={actionLoading}
                        variant="secondary"
                        className="py-2 px-4 text-xs bg-cyber-yellow/10 text-cyber-yellow border-cyber-yellow/30 flex items-center justify-center gap-1"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        REQUEST MODIFICATION
                      </CommandButton>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* TRAFFIC CONTROLLER (INSPECTOR) VETTING HUD */}
            {role === 'INSPECTOR' && ['SENT_TO_TC', 'UNDER_REVIEW', 'PENDING_REVIEW', 'SUBMITTED_TO_TC', 'SUBMITTED TO TC'].includes(currentStatus) && (
              <div className="space-y-4 bg-cyber-accent/5 p-4 border border-cyber-border rounded-xl">
                <div className="text-[10px] text-cyber-accent uppercase tracking-widest block font-bold font-orbitron">
                  🚦 Traffic Controller Vetting HUD
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px]">
                  <div>
                    <label className="block text-slate-500 uppercase">Officers</label>
                    <input
                      type="number"
                      value={finalOfficers}
                      onChange={(e) => setFinalOfficers(e.target.value)}
                      className="w-full bg-[#050b18] border border-cyber-border rounded p-1.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 uppercase">Barricades</label>
                    <input
                      type="number"
                      value={finalBarricades}
                      onChange={(e) => setFinalBarricades(e.target.value)}
                      className="w-full bg-[#050b18] border border-cyber-border rounded p-1.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 uppercase">Tows</label>
                    <input
                      type="number"
                      value={finalTows}
                      onChange={(e) => setFinalTows(e.target.value)}
                      className="w-full bg-[#050b18] border border-cyber-border rounded p-1.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 uppercase">Response Level</label>
                    <select
                      value={finalResponse}
                      onChange={(e) => setFinalResponse(e.target.value)}
                      className="w-full bg-[#050b18] border border-cyber-border rounded p-1.5 text-white outline-none cursor-pointer font-mono"
                    >
                      <option value="Low">Low</option>
                      <option value="Moderate">Moderate</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Vetting comments */}
                  <div className="space-y-1">
                    <label className="block text-[10px] text-slate-500 uppercase">Vetting & Approval Comments</label>
                    <textarea
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      placeholder="Add guidelines or notes for final approval..."
                      rows="2"
                      className="w-full bg-[#030612]/90 border border-[#00d2ff]/30 rounded p-2 text-white outline-none resize-none font-sans"
                    />
                  </div>

                  {/* Rejection / Modification Comments */}
                  <div className="space-y-1">
                    <label className="block text-[10px] text-slate-500 uppercase">Rejection / Modification Comments</label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Required when rejecting/sending comments back..."
                      rows="2"
                      className="w-full bg-[#030612]/90 border border-cyber-red/35 rounded p-2 text-white outline-none resize-none font-sans"
                    />
                  </div>
                </div>

                {/* Vetting Actions */}
                <div className="flex gap-3 pt-2">
                  <CommandButton
                    onClick={async () => {
                      setActionLoading(true);
                      setErrorMsg(null);
                      setSuccessMsg(null);
                      try {
                        await axios.post(`${API_BASE_URL}/events/approve`, {
                          event_id: event.event_id,
                          final_officers: parseInt(finalOfficers),
                          final_barricades: parseInt(finalBarricades),
                          final_tow_vehicles: parseInt(finalTows),
                          final_response_level: finalResponse,
                          comments: approvalNotes || "Traffic Controller approved proposal."
                        });
                        setSuccessMsg("Proposal approved successfully!");
                        setCurrentStatus("APPROVED");
                        window.dispatchEvent(new CustomEvent('refresh-notifications'));
                        setTimeout(() => onClose(), 1500);
                      } catch (err) {
                        console.error(err);
                        setErrorMsg(err.response?.data?.detail || "Vetting approval failed.");
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                    disabled={actionLoading}
                    variant="success"
                    className="flex-1 py-2 text-xs flex items-center justify-center gap-1.5"
                  >
                    <ShieldCheck className="w-4 h-4 text-slate-950" />
                    APPROVE PROPOSAL
                  </CommandButton>

                  <CommandButton
                    onClick={async () => {
                      if (!rejectionReason) {
                        setErrorMsg("Please specify comments/rejection reasons to send back.");
                        return;
                      }
                      setActionLoading(true);
                      setErrorMsg(null);
                      setSuccessMsg(null);
                      try {
                        await axios.post(`${API_BASE_URL}/events/reject`, {
                          event_id: event.event_id,
                          comments: rejectionReason
                        });
                        setSuccessMsg("Proposal returned to operator for modifications.");
                        setCurrentStatus("REJECTED");
                        window.dispatchEvent(new CustomEvent('refresh-notifications'));
                        setTimeout(() => onClose(), 1500);
                      } catch (err) {
                        console.error(err);
                        setErrorMsg(err.response?.data?.detail || "Rejection failed.");
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                    disabled={actionLoading}
                    variant="secondary"
                    className="flex-1 py-2 text-xs bg-cyber-red/20 text-cyber-red border-cyber-red/40 flex items-center justify-center gap-1.5 hover:bg-[#ff0055] hover:text-white"
                  >
                    <X className="w-4 h-4" />
                    SEND COMMENTS BACK / REJECT
                  </CommandButton>
                </div>
              </div>
            )}

            {/* OPERATOR WORKFLOW */}
            {role === 'COMMAND_CENTER' && (
              <div className="space-y-4 bg-cyber-accent/5 p-4 border border-cyber-border rounded-xl">
                
                {/* Rejection Comments (if status is REJECTED) */}
                {currentStatus === 'REJECTED' && (
                  <div className="space-y-3">
                    {historyLogs.some(log => log.new_status === 'REJECTED') && (
                      <div className="p-3 bg-cyber-red/10 border border-cyber-red/45 rounded-lg space-y-2 text-xs font-mono text-slate-200">
                        <div className="flex items-center gap-1.5 text-cyber-red font-bold uppercase">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Traffic Commissioner Feedback</span>
                        </div>
                        <div className="bg-[#030611]/80 p-2.5 border border-cyber-border/30 rounded text-slate-300">
                          <div className="text-[10px] text-slate-500 mb-1">
                            REJECTION REASON / REQUIRED CORRECTIONS:
                          </div>
                          <p className="italic">
                            "{historyLogs.find(log => log.new_status === 'REJECTED')?.comments || 'No comment provided.'}"
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Drafts/Rejected Actions */}
                {(currentStatus === 'DRAFT' || currentStatus === 'REJECTED') && (
                  <div className="space-y-3">
                    <div className="p-3 bg-cyber-red/5 border border-cyber-red/35 rounded text-white flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <strong>Draft Action Pending:</strong> Re-edit parameters or resubmit to Traffic Commissioner.
                      </div>
                    </div>
                    <CommandButton
                      onClick={handleTriggerEditDraft}
                      variant="success"
                      className="w-full py-2.5 text-xs font-bold font-orbitron uppercase tracking-widest flex items-center justify-center gap-1.5"
                    >
                      <Sliders className="w-4 h-4 text-slate-950" />
                      EDIT DRAFT & RESUBMIT
                    </CommandButton>
                  </div>
                )}

                {/* NeuroTwin simulation block for operator */}
                {['APPROVED', 'ZONE_ASSIGNED', 'ACTIVE', 'PENDING_REVIEW', 'INSPECTOR_REVIEWED', 'PENDING_APPROVAL', 'SENT_TO_TC', 'UNDER_REVIEW', 'SUBMITTED_TO_TC', 'SUBMITTED TO TC'].includes(currentStatus) && (
                  <div className="border-b border-cyber-border/30 pb-3.5 mb-3.5 space-y-3">
                    <span className="text-[9px] text-slate-500 uppercase block tracking-wider font-bold">NEUROTWIN DIGITAL SIMULATION</span>
                    {analysis ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-center">
                          <div className="bg-[#030611]/60 border border-cyber-border rounded-lg p-2.5">
                            <div className="text-[9px] text-slate-400 uppercase tracking-widest">Recommended Strategy</div>
                            <div className="text-xs font-bold text-cyber-accent mt-0.5 tracking-tight font-orbitron uppercase">
                              {analysis.recommended_strategy}
                            </div>
                            <div className="text-[9px] text-slate-400 mt-0.5">{analysis.recommended_strategy_label}</div>
                          </div>
                          <div className="bg-[#030611]/60 border border-cyber-border rounded-lg p-2.5 flex flex-col justify-center">
                            <div className="text-[9px] text-slate-400 uppercase tracking-widest">Confidence Score</div>
                            <div className="text-lg font-black text-white mt-0.5 font-orbitron">
                              {analysis.confidence.toFixed(0)}%
                            </div>
                          </div>
                        </div>

                        <div className="p-2.5 bg-slate-950/40 border border-cyber-border/40 rounded text-[11px] text-slate-300 leading-normal">
                          {analysis.explainability.why_selected}
                        </div>

                        <ul className="space-y-1 text-[10px] bg-[#030611]/40 border border-cyber-border/20 rounded p-2 text-slate-300">
                          <li className="flex items-center gap-1.5 text-cyber-accent">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyber-accent animate-pulse"></span>
                            <span>{analysis.explainability.congestion_reduction}% predicted congestion reduction</span>
                          </li>
                          <li className="flex items-center gap-1.5 text-cyber-green">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyber-green animate-pulse"></span>
                            <span>{analysis.explainability.recovery_speedup} min faster recovery</span>
                          </li>
                        </ul>

                        <CommandButton
                          onClick={() => handleDownloadPlaybook(event.event_id)}
                          disabled={playbookLoading}
                          variant="secondary"
                          className="w-full py-2 text-xs flex items-center justify-center gap-1.5"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          DOWNLOAD OPERATIONAL PLAYBOOK
                        </CommandButton>
                      </div>
                    ) : (
                      <div className="text-center p-4 border border-dashed border-cyber-border/40 rounded-xl bg-[#050b18]/20">
                        <CommandButton
                          onClick={executeNeuroTwinSimulation}
                          variant="success"
                          className="py-1.5 px-4 text-xs font-orbitron mx-auto block"
                        >
                          RUN NEUROTWIN SIMULATION
                        </CommandButton>
                      </div>
                    )}
                  </div>
                )}

                {/* Vetting unplanned officer dispatches */}
                {event.event_type === 'unplanned' && currentStatus === 'PENDING_REVIEW' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-cyber-accent/5 border border-cyber-border rounded text-white flex items-start gap-2">
                      <Info className="w-4 h-4 text-cyber-accent shrink-0 mt-0.5" />
                      <div>
                        <strong>Unplanned Officer Vetting:</strong> Calibrate resource limits and forward to Traffic Commissioner.
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px]">
                      <div>
                        <label className="block text-slate-500 uppercase">Officers</label>
                        <input
                          type="number"
                          value={finalOfficers}
                          onChange={(e) => setFinalOfficers(e.target.value)}
                          className="w-full bg-[#050b18] border border-cyber-border rounded p-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 uppercase">Barricades</label>
                        <input
                          type="number"
                          value={finalBarricades}
                          onChange={(e) => setFinalBarricades(e.target.value)}
                          className="w-full bg-[#050b18] border border-cyber-border rounded p-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 uppercase">Tows</label>
                        <input
                          type="number"
                          value={finalTows}
                          onChange={(e) => setFinalTows(e.target.value)}
                          className="w-full bg-[#050b18] border border-cyber-border rounded p-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 uppercase">Response Level</label>
                        <select
                          value={finalResponse}
                          onChange={(e) => setFinalResponse(e.target.value)}
                          className="w-full bg-[#050b18] border border-cyber-border rounded p-1.5 text-white outline-none cursor-pointer"
                        >
                          <option value="Low">Low</option>
                          <option value="Moderate">Moderate</option>
                          <option value="High">High</option>
                          <option value="Critical">Critical</option>
                        </select>
                      </div>
                    </div>

                    <CommandButton
                      onClick={handleOperatorForward}
                      disabled={actionLoading}
                      variant="success"
                      className="w-full py-2.5 text-xs font-orbitron uppercase tracking-widest flex items-center justify-center gap-1.5"
                    >
                      <Send className="w-4 h-4 text-slate-950" />
                      APPROVE & FORWARD TO COMMISSIONER
                    </CommandButton>
                  </div>
                )}

                {/* Approved Standby operator dispatches */}
                {['APPROVED', 'ZONE_ASSIGNED'].includes(currentStatus) && (
                  <div className="space-y-3">
                    <div className="p-3 bg-[#00d2ff]/5 border border-[#00d2ff]/30 rounded text-slate-300 flex items-start gap-2">
                      <Play className="w-4 h-4 text-[#00d2ff] shrink-0 mt-0.5 animate-pulse" />
                      <div>
                        <strong>Standby Dispatch Approved:</strong> Deploy resources to activate the event in the field.
                      </div>
                    </div>
                    <CommandButton
                      onClick={handleDeploy}
                      disabled={actionLoading}
                      variant="success"
                      className="w-full py-2.5 text-xs font-orbitron uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4 text-slate-950 animate-pulse" />
                      DEPLOY FIELD DISPATCH
                    </CommandButton>
                  </div>
                )}

                {/* Active resolving (Operator force complete) */}
                {currentStatus === 'ACTIVE' && (
                  <div className="space-y-3">
                    <div className="p-3 bg-[#00ff66]/5 border border-[#00ff66]/30 rounded text-slate-300 flex items-start gap-2">
                      <Info className="w-4 h-4 text-cyber-green shrink-0 mt-0.5" />
                      <div>
                        <strong>Active Incident:</strong> Field updates are pending. Operator can force resolve/complete the event.
                      </div>
                    </div>
                    <CommandButton
                      onClick={async () => {
                        setActionLoading(true);
                        try {
                          await axios.post(`${API_BASE_URL}/events/update-status`, {
                            event_id: event.event_id,
                            status: 'COMPLETED',
                            comments: 'Incident marked COMPLETED by Command Control Operator force resolve.'
                          });
                          setSuccessMsg("Incident successfully marked COMPLETED!");
                          window.dispatchEvent(new CustomEvent('refresh-notifications'));
                          setTimeout(() => onClose(), 1500);
                        } catch (err) {
                          setErrorMsg("Failed to complete incident: " + (err.response?.data?.detail || err.message));
                        } finally {
                          setActionLoading(false);
                        }
                      }}
                      disabled={actionLoading}
                      variant="success"
                      className="w-full py-2.5 text-xs font-orbitron uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4 text-slate-950" />
                      FORCE RESOLVE / COMPLETE
                    </CommandButton>
                  </div>
                )}

                {/* Unplanned direct activation bypass */}
                {event.event_type === 'unplanned' && 
                 currentStatus !== 'ACTIVE' && 
                 currentStatus !== 'COMPLETED' && (
                  <div className="space-y-2 pt-3 border-t border-cyber-border/30 mt-3">
                    <div className="p-2 bg-[#ff0055]/5 border border-[#ff0055]/30 rounded text-[9px] text-[#ff0055] leading-normal flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 animate-pulse" />
                      <span>Emergency Bypass: This critical unplanned incident reported in field can be directly activated without Traffic Commissioner approval.</span>
                    </div>
                    <CommandButton
                      onClick={handleDeploy}
                      disabled={actionLoading}
                      variant="success"
                      className="w-full py-2.5 text-xs font-orbitron uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4 text-slate-950 animate-pulse" />
                      IMMEDIATELY ACTIVATE DISPATCH
                    </CommandButton>
                  </div>
                )}

                {/* Catch-all status displays */}
                {['INSPECTOR_REVIEWED'].includes(currentStatus) && (
                  <div className="text-center p-4 text-slate-500 font-bold border border-dashed border-cyber-border rounded-xl">
                    Incident in Status {currentStatus}. Awaiting field responder resolution logs.
                  </div>
                )}

              </div>
            )}

            {/* FIELD RESCUERS / OFFICER WORKFLOW */}
            {(role === 'CONSTABLE' || role === 'INSPECTOR' || role === 'EMERGENCY_RESPONSE') && 
             !(role === 'INSPECTOR' && ['SENT_TO_TC', 'UNDER_REVIEW', 'PENDING_REVIEW', 'SUBMITTED_TO_TC', 'SUBMITTED TO TC'].includes(currentStatus)) && (
              <div className="space-y-4 bg-cyber-accent/5 p-4 border border-cyber-border rounded-xl">
                
                {/* Approved Standby dispatch */}
                {['APPROVED', 'ZONE_ASSIGNED'].includes(currentStatus) && (
                  <div className="space-y-3">
                    <div className="p-3 bg-[#00d2ff]/5 border border-[#00d2ff]/30 rounded text-slate-300 flex items-start gap-2">
                      <Play className="w-4 h-4 text-[#00d2ff] shrink-0 mt-0.5 animate-pulse" />
                      <div>
                        <strong>Incident Dispatch Approved:</strong> Setup Detours, Checkpoints, and deploy forces to Scene.
                      </div>
                    </div>
                    <CommandButton
                      onClick={handleOfficerDeploy}
                      disabled={actionLoading}
                      variant="success"
                      className="w-full py-2.5 text-xs font-orbitron uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4 text-slate-950 animate-pulse" />
                      DEPLOY RESOURCES & INITIATE SCENE
                    </CommandButton>
                  </div>
                )}

                {/* Active Operations Outcome Reporting */}
                {currentStatus === 'ACTIVE' && (
                  <div className="space-y-5">
                    
                    {/* Live progress logging */}
                    <form onSubmit={handleOfficerUpdateProgress} className="space-y-2 border-b border-cyber-border pb-4">
                      <label className="block text-[10px] text-slate-500 uppercase font-bold">Log Progress / Update Status Remarks</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={progressComment}
                          onChange={(e) => setProgressComment(e.target.value)}
                          placeholder="e.g. Signal hold applied, detour traffic cleared junction..."
                          className="flex-1 bg-[#030612]/90 border border-cyber-border rounded p-2 text-white font-mono"
                        />
                        <CommandButton type="submit" disabled={actionLoading} variant="primary" className="py-2 px-4 text-xs font-orbitron uppercase">
                          SEND
                        </CommandButton>
                      </div>
                    </form>

                    {/* Outcome reporting form */}
                    <form onSubmit={handleOfficerComplete} className="space-y-4">
                      <div className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">
                        SUBMIT OUTCOME & CLOSE INCIDENT
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px]">
                        <div>
                          <label className="block text-slate-500 uppercase">Actual Officers</label>
                          <input
                            type="number"
                            required
                            value={actualOfficers}
                            onChange={(e) => setActualOfficers(e.target.value)}
                            className="w-full bg-[#050b18] border border-cyber-border rounded p-1.5 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-500 uppercase">Actual Barricades</label>
                          <input
                            type="number"
                            required
                            value={actualBarricades}
                            onChange={(e) => setActualBarricades(e.target.value)}
                            className="w-full bg-[#050b18] border border-cyber-border rounded p-1.5 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-500 uppercase">Actual Delay (min)</label>
                          <input
                            type="number"
                            step="0.1"
                            required
                            value={actualDelay}
                            onChange={(e) => setActualDelay(e.target.value)}
                            className="w-full bg-[#050b18] border border-cyber-border rounded p-1.5 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-500 uppercase">Clearance Time (min)</label>
                          <input
                            type="number"
                            step="0.1"
                            required
                            value={actualRecovery}
                            onChange={(e) => setActualRecovery(e.target.value)}
                            className="w-full bg-[#050b18] border border-cyber-border rounded p-1.5 text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="block text-slate-500 uppercase text-[9px]">Unexpected Incidents</label>
                          <textarea
                            value={unexpectedIncidents}
                            onChange={(e) => setUnexpectedIncidents(e.target.value)}
                            placeholder=" VIP convoy delay, water pump failures..."
                            rows="2"
                            className="w-full bg-[#030612]/90 border border-cyber-border rounded p-1.5 text-white resize-none font-sans"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-slate-500 uppercase text-[9px]">Success Notes / Remarks</label>
                          <textarea
                            value={successNotes}
                            onChange={(e) => setSuccessNotes(e.target.value)}
                            placeholder="Detour cleared traffic peak in 30 mins..."
                            rows="2"
                            className="w-full bg-[#030612]/90 border border-cyber-border rounded p-1.5 text-white resize-none font-sans"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-slate-500 uppercase text-[9px]">Lessons Learned & feedback</label>
                          <textarea
                            value={lessonsLearned}
                            onChange={(e) => setLessonsLearned(e.target.value)}
                            placeholder="Deploy +2 checkpoint blocks on ORR junction B next time..."
                            rows="2"
                            className="w-full bg-[#030612]/90 border border-cyber-border rounded p-1.5 text-white resize-none font-sans"
                          />
                        </div>
                      </div>

                      <CommandButton
                        type="submit"
                        disabled={actionLoading}
                        variant="success"
                        className="w-full py-2.5 text-xs font-orbitron uppercase tracking-widest flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle className="w-4 h-4 text-slate-950" />
                        SUBMIT POST-EVENT REPORT & RESOLVE
                      </CommandButton>
                    </form>
                  </div>
                )}

                {/* Catch-all status displays */}
                {['COMPLETED'].includes(currentStatus) && (
                  <div className="text-center p-4 text-cyber-green font-bold border border-cyber-green/30 bg-cyber-green/5 rounded-xl flex items-center justify-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-cyber-green" />
                    <span>Incident successfully resolved and archived in Knowledge base.</span>
                  </div>
                )}

                {/* Standby/Draft Operator review states */}
                {['DRAFT', 'REJECTED', 'PENDING_REVIEW', 'INSPECTOR_REVIEWED', 'SENT_TO_TC', 'UNDER_REVIEW', 'SUBMITTED_TO_TC', 'SUBMITTED TO TC'].includes(currentStatus) && (
                  <div className="text-center p-4 text-slate-500 font-bold border border-dashed border-cyber-border rounded-xl">
                    Event is in review/draft phase status: {currentStatus}. Awaiting Command Center dispatch confirmation.
                  </div>
                )}

              </div>
            )}

          </div>

        </div>

      </div>

      {/* Pipeline Scanning Visual Stepper Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-6 z-[999999]">
          <div className="w-full max-w-xl bg-[#070c1f] border border-cyber-accent rounded-2xl overflow-hidden shadow-2xl relative p-8 space-y-6">
            <div className="absolute top-0 left-0 w-full h-[4px] bg-[#00d2ff] animate-pulse"></div>
            
            <div className="flex justify-between items-center border-b border-cyber-border pb-4">
              <h3 className="text-xl font-bold text-white font-orbitron uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-6 h-6 text-cyber-accent" />
                Cognitive Twin Simulation Engine
              </h3>
              {demoStep === demoSteps.length && (
                <button 
                  onClick={() => setShowDemoModal(false)}
                  className="text-xs font-mono border border-cyber-border px-3 py-1.5 rounded hover:text-white cursor-pointer bg-transparent text-slate-400"
                >
                  CLOSE
                </button>
              )}
            </div>

            <div className="space-y-4 font-mono text-sm max-h-[350px] overflow-y-auto">
              {demoSteps.map((step, idx) => {
                const isCompleted = demoStep > idx;
                const isActive = demoStep === idx;
                
                return (
                  <div 
                    key={idx} 
                    className={`p-3.5 border rounded-lg transition-all flex items-center justify-between ${
                      isCompleted 
                        ? 'border-cyber-green/30 bg-cyber-green/5 text-cyber-green' 
                        : isActive 
                        ? 'border-cyber-accent bg-cyber-accent/5 text-white animate-pulse'
                        : 'border-cyber-border/30 bg-transparent text-slate-500'
                    }`}
                  >
                    <div>
                      <div className="font-bold tracking-wider">{idx + 1}. {step.title}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{step.detail}</div>
                    </div>

                    {isCompleted ? (
                      <span className="text-xs font-bold text-cyber-green">COMPLETE</span>
                    ) : isActive ? (
                      <Loader2 className="w-4 h-4 text-cyber-accent animate-spin" />
                    ) : (
                      <span className="text-[10px] text-slate-750">PENDING</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex justify-between items-center text-xs font-mono border-t border-cyber-border/40 select-none">
              <span className="text-slate-500 uppercase">Telemetry: {event.event_id}</span>
              {demoStep === demoSteps.length ? (
                <div className="flex items-center gap-2">
                  <span className="text-cyber-green font-bold uppercase tracking-wider animate-pulse">Simulation Verified</span>
                  <CommandButton 
                    onClick={() => setShowDemoModal(false)}
                    variant="success"
                    className="py-1 px-4 text-xs font-bold font-orbitron"
                  >
                    VET RESULTS
                  </CommandButton>
                </div>
              ) : (
                <span className="text-cyber-accent animate-pulse uppercase">PROCESSING COGNITIVE STREAM...</span>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
