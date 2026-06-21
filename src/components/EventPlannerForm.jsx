import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { downloadEventReportPDF } from '../utils/pdfGenerator';
import CommandCard from './ui/CommandCard';
import CommandButton from './ui/CommandButton';
import { 
  Save, 
  Cpu, 
  Send, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Activity,
  Layers,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  FileText,
  User,
  Plus,
  Minus
} from 'lucide-react';

function SmallGauge({ score, label }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  let color = 'stroke-cyber-green';
  if (score > 75) color = 'stroke-cyber-red';
  else if (score > 50) color = 'stroke-cyber-orange';
  else if (score > 25) color = 'stroke-cyber-yellow';

  return (
    <div className="flex items-center gap-2 bg-[#050b18]/60 p-2.5 border border-cyber-border/30 rounded-lg">
      <div className="relative flex items-center justify-center w-12 h-12 font-mono">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="24" cy="24" r={radius} className="stroke-[#0c142c] fill-none" strokeWidth="3" />
          <circle cx="24" cy="24" r={radius} className={`fill-none ${color}`} strokeWidth="3" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
        </svg>
        <span className="absolute text-[9px] font-bold text-white font-orbitron">{Math.round(score)}</span>
      </div>
      <div>
        <span className="text-[8px] text-slate-500 uppercase tracking-wider block font-mono">{label}</span>
        <span className="text-xs font-bold text-slate-200">{score > 75 ? 'Critical' : score > 50 ? 'High' : 'Moderate'}</span>
      </div>
    </div>
  );
}

export default function EventPlannerForm({ onDraftSaved, editingEvent, onSimulationChange }) {
  const { user } = useAuth();
  
  // Form values
  const [eventCause, setEventCause] = useState('festival');
  const [priority, setPriority] = useState('Medium');
  const [zone, setZone] = useState('Central Zone');
  const [corridor, setCorridor] = useState('MG Road Corridor');
  const [requiresClosure, setRequiresClosure] = useState(false);
  const [lat, setLat] = useState(12.9716);
  const [lng, setLng] = useState(77.5946);
  const [attendance, setAttendance] = useState(5000);
  const [duration, setDuration] = useState(240);
  const [eventDate, setEventDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('13:00');
  const [specialConditions, setSpecialConditions] = useState('');
  
  // Versioning & Registry states
  const [draftEventId, setDraftEventId] = useState(null);
  const [draftVersion, setDraftVersion] = useState(1);
  const [parentEventId, setParentEventId] = useState(null);
  
  // Vetting Wizard workflow states
  const [aiReport, setAiReport] = useState(null);
  const [wizardStep, setWizardStep] = useState(1); // Steps 1 to 4
  const [selectedScenario, setSelectedScenario] = useState('Scenario B'); // Default AI Recommended
  const [overrideReason, setOverrideReason] = useState('');
  const [digitalTwinPreset, setDigitalTwinPreset] = useState('baseline');

  // Event Stress Index (ESI) calculator
  const calculateESI = () => {
    let base = 30; // Healthy starting
    
    if (digitalTwinPreset === 'crowd_20') {
      base += 12;
    } else if (digitalTwinPreset === 'crowd_50') {
      base += 32;
    } else if (digitalTwinPreset === 'crowd_100') {
      base += 58;
    } else if (digitalTwinPreset === 'parking_overflow') {
      base += 40;
    }
    
    if (priority === 'Critical') base += 15;
    else if (priority === 'High') base += 8;
    
    if (selectedScenario === 'Scenario A') base += 15;
    else if (selectedScenario === 'Scenario C') base -= 8;
    else if (selectedScenario === 'Scenario D') base -= 15;
    
    const deltas = getResourceDeltas();
    base -= Math.round((deltas.officers || 0) * 0.4);
    base -= Math.round((deltas.barricades || 0) * 0.2);
    
    return Math.max(10, Math.min(99, base));
  };
  
  // Dynamic resource counts in Step 3
  const [policeCount, setPoliceCount] = useState(80);
  const [marshalsCount, setMarshalsCount] = useState(40);
  const [barricadesCount, setBarricadesCount] = useState(50);
  const [towTrucksCount, setTowTrucksCount] = useState(4);
  const [ambulancesCount, setAmbulancesCount] = useState(2);
  const [emergencyUnitsCount, setEmergencyUnitsCount] = useState(1);
  
  // Post Submission Roster Status
  const [submittedEventId, setSubmittedEventId] = useState(null);
  const [submissionTime, setSubmissionTime] = useState(null);
  
  const [operatorComments, setOperatorComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [error, setError] = useState(null);

  // Load editing drafts
  useEffect(() => {
    if (editingEvent) {
      setDraftEventId(editingEvent.event_id);
      setDraftVersion(editingEvent.draft_version || 1);
      setParentEventId(editingEvent.parent_event_id || null);
      
      setEventCause(editingEvent.event_cause || 'festival');
      setPriority(editingEvent.priority || 'Medium');
      setZone(editingEvent.zone || 'Central Zone');
      setCorridor(editingEvent.corridor || 'MG Road Corridor');
      setRequiresClosure(editingEvent.requires_road_closure || false);
      setLat(editingEvent.latitude || 12.9716);
      setLng(editingEvent.longitude || 77.5946);
      setAttendance(editingEvent.expected_attendance || 5000);
      setDuration(editingEvent.duration_minutes || 240);
      setEventDate(editingEvent.event_date || new Date(Date.now() + 86400000).toISOString().split('T')[0]);
      setStartTime(editingEvent.start_time || '09:00');
      setEndTime(editingEvent.end_time || '13:00');
      setSpecialConditions(editingEvent.special_conditions || '');
      setOverrideReason(editingEvent.override_reason || '');
      
      // Load saved resources
      setPoliceCount(editingEvent.final_officers?.toString() || editingEvent.ai_officers?.toString() || "10");
      setBarricadesCount(editingEvent.final_barricades?.toString() || editingEvent.ai_barricades?.toString() || "20");
      setTowTrucksCount(editingEvent.final_tow_vehicles?.toString() || editingEvent.ai_tow_vehicles?.toString() || "2");
      
      if (editingEvent.approved_scenario) {
        // Map approved_scenario label to scenario name
        const scenMap = {
          'Minimal Plan': 'Scenario A',
          'Balanced Plan': 'Scenario B',
          'Conservative Plan': 'Scenario C',
          'Full Response': 'Scenario D'
        };
        setSelectedScenario(scenMap[editingEvent.approved_scenario] || editingEvent.approved_scenario);
      } else {
        setSelectedScenario('Scenario B');
      }

      if (editingEvent.impact_score > 0) {
        setAiReport({
          event_id: editingEvent.event_id,
          risk_score: editingEvent.impact_score,
          congestion_prediction: editingEvent.congestion_prediction || 45.0,
          police_units_required: editingEvent.ai_officers || 80,
          barricades_required: editingEvent.ai_barricades || 50,
          traffic_personnel_required: editingEvent.ai_traffic_personnel || 48,
          deployment_timeline: editingEvent.deployment_timeline || `T-3h: Deploy ${editingEvent.ai_barricades || 50} barricades; T-2h: Post ${editingEvent.ai_officers || 80} police officers; T-0h: Event start.`,
          confidence_score: editingEvent.confidence_score || 90.0,
          ai_recommendation_summary: editingEvent.ai_recommendation_summary || `Mitigation level: ${editingEvent.ai_response_level || 'Moderate'}. Deploy resources according to plan.`,
          // Backwards compatibility fields:
          impact_score: editingEvent.impact_score,
          citizen_impact_score: editingEvent.final_response_level || editingEvent.ai_response_level || "Moderate",
          expected_travel_delay: Math.round((editingEvent.impact_score * 0.7 + ((editingEvent.expected_attendance || 5000) / 1000.0) * 2.5) * 10) / 10,
          resources: {
            officers: editingEvent.ai_officers || 80,
            barricades: editingEvent.ai_barricades || 50,
            tow_vehicles: editingEvent.ai_tow_vehicles || 4,
            emergency_units: 1,
            response_level: editingEvent.ai_response_level || "Moderate"
          },
          recovery_time_minutes: editingEvent.duration_minutes || 240,
          plan_b: editingEvent.neurotwin_plan_b || "Standard Contingency Plan."
        });
        setWizardStep(editingEvent.current_step || 1);
      } else {
        setAiReport(null);
      }
      setActionSuccess(null);
      setSubmittedEventId(null);
      
      // Clear simulation in dashboard map
      if (onSimulationChange) {
        onSimulationChange(null, null, null, false);
      }
    }
  }, [editingEvent]);

  // Reset form / New Plan
  const handleNewPlan = () => {
    setDraftEventId(null);
    setDraftVersion(1);
    setParentEventId(null);
    setAiReport(null);
    setSubmittedEventId(null);
    setSpecialConditions('');
    setOverrideReason('');
    setOperatorComments('');
    setRequiresClosure(false);
    setAttendance(5000);
    setDuration(240);
    setActionSuccess(null);
    setError(null);
    
    if (onSimulationChange) {
      onSimulationChange(null, null, null, false);
    }
  };

  // Step 2 & 3 triggers update to Parent simulation map
  useEffect(() => {
    if (aiReport && onSimulationChange && (wizardStep === 2 || wizardStep === 3)) {
      const deltas = getResourceDeltas();
      onSimulationChange(selectedScenario, deltas, [parseFloat(lat), parseFloat(lng)], true);
    }
  }, [selectedScenario, wizardStep, policeCount, barricadesCount, towTrucksCount, digitalTwinPreset]);

  // Save Draft (Creates new version, links parent)
  const handleSaveDraft = async () => {
    setLoading(true);
    setError(null);
    setActionSuccess(null);
    try {
      const payload = {
        event_id: draftEventId,
        event_cause: eventCause,
        priority: priority,
        zone: zone,
        corridor: corridor,
        requires_road_closure: requiresClosure,
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        expected_attendance: parseInt(attendance),
        duration_minutes: parseInt(duration),
        event_date: eventDate,
        start_time: startTime,
        end_time: endTime,
        special_conditions: specialConditions,
        selected_scenario: getScenarioFriendlyName(selectedScenario),
        override_reason: overrideReason,
        final_officers: parseInt(policeCount),
        final_barricades: parseInt(barricadesCount),
        final_tow_vehicles: parseInt(towTrucksCount)
      };

      const res = await axios.post(`${API_BASE_URL}/events/planner/save-draft`, payload);
      
      // Update form version state to link correctly for the next saves
      setDraftEventId(res.data.event_id);
      setDraftVersion(res.data.draft_version);
      setParentEventId(res.data.parent_event_id);
      
      setActionSuccess(res.data.message);
      if (onDraftSaved) onDraftSaved();
    } catch (err) {
      console.error(err);
      setError("Failed to save draft version.");
    } finally {
      setLoading(false);
    }
  };

  // Run NeuroTwin Analysis (Triggers wizard step 1)
  const handleRunAnalysis = async () => {
    setLoading(true);
    setError(null);
    setAiReport(null);
    setSubmittedEventId(null);
    try {
      const res = await axios.post(`${API_BASE_URL}/events/planner/analyze`, {
        event_id: draftEventId || undefined,
        event_cause: eventCause,
        priority: priority,
        zone: zone,
        corridor: corridor,
        requires_road_closure: requiresClosure,
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        expected_attendance: parseInt(attendance),
        duration_minutes: parseInt(duration),
        event_date: eventDate,
        start_time: startTime,
        end_time: endTime,
        special_conditions: specialConditions
      });
      
      setAiReport(res.data);
      setWizardStep(1);
      
      // Seed resource count states from AI recommendations initially
      setPoliceCount(res.data.resources.officers);
      setBarricadesCount(res.data.resources.barricades);
      setTowTrucksCount(res.data.resources.tow_vehicles);
      setMarshalsCount(res.data.traffic_personnel_required || 40);
      setAmbulancesCount(2);
      setEmergencyUnitsCount(res.data.resources.emergency_units);
      
      // Update draft event ID from returned database ID to keep sessions consistent
      if (res.data.event_id) {
        setDraftEventId(res.data.event_id);
      }
      
      // notify parent simulation is active
      if (onSimulationChange) {
        onSimulationChange(selectedScenario, { officers: 0, barricades: 0, tows: 0 }, [parseFloat(lat), parseFloat(lng)], true);
      }

      // Automatically generate and download the PDF report
      try {
        const pdfEvent = {
          event_id: res.data.event_id,
          event_type: 'planned',
          event_cause: eventCause,
          priority: priority,
          zone: zone,
          corridor: corridor,
          requires_road_closure: requiresClosure,
          latitude: parseFloat(lat),
          longitude: parseFloat(lng),
          impact_score: res.data.risk_score,
          confidence_score: res.data.confidence_score,
          congestion_prediction: res.data.congestion_prediction,
          police_units_required: res.data.police_units_required,
          barricades_required: res.data.barricades_required,
          traffic_personnel_required: res.data.traffic_personnel_required,
          deployment_timeline: res.data.deployment_timeline,
          ai_recommendation_summary: res.data.ai_recommendation_summary,
          
          final_officers: res.data.resources.officers,
          final_barricades: res.data.resources.barricades,
          final_tow_vehicles: res.data.resources.tow_vehicles,
          final_traffic_personnel: res.data.traffic_personnel_required,
          ai_officers: res.data.resources.officers,
          ai_barricades: res.data.resources.barricades,
          ai_tow_vehicles: res.data.resources.tow_vehicles,
          ai_response_level: res.data.resources.response_level,
          approved_scenario: getScenarioFriendlyName(selectedScenario),
          special_conditions: specialConditions || res.data.ai_recommendation_summary,
          event_date: eventDate,
          start_time: startTime,
          end_time: endTime
        };
        downloadEventReportPDF(pdfEvent);
      } catch (pdfErr) {
        console.error("Auto PDF generation failed:", pdfErr);
      }

      // Call onDraftSaved so the dashboard registry refreshes and shows the simulated card immediately
      if (onDraftSaved) onDraftSaved();
      
    } catch (err) {
      console.error(err);
      setError("NeuroTwin simulation analysis failed. Please check form parameters.");
    } finally {
      setLoading(false);
    }
  };

  // Submit report to Commissioner in Step 4
  const handleSubmitToCommissioner = async () => {
    if (!draftEventId) {
      setError("Please save the draft event before submitting.");
      return;
    }
    setLoading(true);
    setError(null);
    setActionSuccess(null);
    try {
      // First save the current customized values into the active draft row
      const saveRes = await axios.post(`${API_BASE_URL}/events/planner/save-draft`, {
        event_id: draftEventId,
        event_cause: eventCause,
        priority: priority,
        zone: zone,
        corridor: corridor,
        requires_road_closure: requiresClosure,
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        expected_attendance: parseInt(attendance),
        duration_minutes: parseInt(duration),
        event_date: eventDate,
        start_time: startTime,
        end_time: endTime,
        special_conditions: specialConditions,
        selected_scenario: getScenarioFriendlyName(selectedScenario),
        override_reason: overrideReason,
        final_officers: parseInt(policeCount),
        final_barricades: parseInt(barricadesCount),
        final_tow_vehicles: parseInt(towTrucksCount)
      });

      const newEventId = saveRes.data.event_id;
      
      setDraftEventId(newEventId);
      setDraftVersion(saveRes.data.draft_version);
      setParentEventId(saveRes.data.parent_event_id);

      // Submit to Commissioner review queue (which submits to Traffic Controller under SUBMITTED_TO_TC)
      await axios.post(`${API_BASE_URL}/events/planner/submit-to-commissioner`, {
        event_id: newEventId,
        comments: operatorComments || `Vetted scenario: ${getScenarioFriendlyName(selectedScenario)}. ${overrideReason ? `Override: ${overrideReason}` : ''}`
      });
      
      setSubmittedEventId(newEventId);
      setSubmissionTime(new Date().toLocaleTimeString());
      setActionSuccess("Report submitted successfully to Traffic Controller.");
      
      // Disable simulation in parent
      if (onSimulationChange) {
        onSimulationChange(null, null, null, false);
      }
      
      if (onDraftSaved) onDraftSaved();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to submit report to Traffic Controller.");
    } finally {
      setLoading(false);
    }
  };

  // Helper mappings
  const getScenarioFriendlyName = (name) => {
    switch (name) {
      case 'Scenario A': return 'Minimal Plan';
      case 'Scenario B': return 'Balanced Plan';
      case 'Scenario C': return 'Conservative Plan';
      case 'Scenario D': return 'Full Response';
      default: return name || 'Balanced Plan';
    }
  };

  const handleStepTransition = async (nextStep) => {
    setWizardStep(nextStep);
    setError(null);
    if (draftEventId) {
      try {
        const payload = {
          event_id: draftEventId,
          event_cause: eventCause,
          priority: priority,
          zone: zone,
          corridor: corridor,
          requires_road_closure: requiresClosure,
          latitude: parseFloat(lat),
          longitude: parseFloat(lng),
          expected_attendance: parseInt(attendance),
          duration_minutes: parseInt(duration),
          event_date: eventDate,
          start_time: startTime,
          end_time: endTime,
          special_conditions: specialConditions,
          selected_scenario: getScenarioFriendlyName(selectedScenario),
          override_reason: overrideReason,
          final_officers: parseInt(policeCount),
          final_barricades: parseInt(barricadesCount),
          final_tow_vehicles: parseInt(towTrucksCount)
        };
        
        await axios.post(`${API_BASE_URL}/events/planner/save-draft`, payload);
        await axios.post(`${API_BASE_URL}/events/draft/${draftEventId}/step`, {
          current_step: nextStep
        });
        if (onDraftSaved) onDraftSaved();
      } catch (err) {
        console.error(`Step transition to ${nextStep} failed:`, err);
      }
    }
  };

  const getConfidenceBadgeColor = (conf) => {
    if (conf >= 90) return 'text-[#00ff66] border-[#00ff66]/30 bg-[#00ff66]/10';
    if (conf >= 70) return 'text-[#ffcc00] border-[#ffcc00]/30 bg-[#ffcc00]/10';
    return 'text-[#ff0055] border-[#ff0055]/30 bg-[#ff0055]/10';
  };

  // Scenario specific definitions
  // Scenario specific definitions
  const getScenarioMetrics = (name) => {
    const delay = aiReport ? aiReport.expected_travel_delay : 42;
    const recovery = aiReport ? aiReport.recovery_time_minutes : 48;
    const score = aiReport ? aiReport.citizen_impact_score : 55;

    // Multipliers based on digitalTwinPreset
    let crowdMult = 1.0;
    let delayMult = 1.0;
    let parkingReadiness = 85;
    
    if (digitalTwinPreset === 'crowd_20') {
      crowdMult = 1.2;
      delayMult = 1.15;
      parkingReadiness = 72;
    } else if (digitalTwinPreset === 'crowd_50') {
      crowdMult = 1.5;
      delayMult = 1.45;
      parkingReadiness = 54;
    } else if (digitalTwinPreset === 'crowd_100') {
      crowdMult = 2.0;
      delayMult = 1.9;
      parkingReadiness = 22;
    } else if (digitalTwinPreset === 'parking_overflow') {
      crowdMult = 1.3;
      delayMult = 1.35;
      parkingReadiness = 12;
    }

    switch (name) {
      case 'Scenario A': // Minimal Plan
        return {
          name: 'Tactical Diversion Plan',
          confidence: 78,
          delay: Math.round(delay * 1.2 * delayMult),
          congestion: delayMult > 1.4 ? 'Critical' : (delayMult > 1.15 ? 'Heavy' : 'Medium'),
          cost: 45000,
          resources: `Police: ${Math.round(60 * crowdMult)}, Marshals: ${Math.round(20 * crowdMult)}, Barricades: ${Math.round(30 * crowdMult)}`,
          recoveryTime: Math.round(recovery * 1.15 * delayMult),
          explain: 'Utilizes minimal road closures with light traffic marshaling.',
          parkingReadiness: Math.max(10, parkingReadiness - 15)
        };
      case 'Scenario C': // Conservative Plan
        return {
          name: 'Conservative Cordon Plan',
          confidence: 85,
          delay: Math.round(delay * 0.95 * delayMult),
          congestion: delayMult > 1.45 ? 'Heavy' : 'Low-Medium',
          cost: 95000,
          resources: `Police: ${Math.round(100 * crowdMult)}, Marshals: ${Math.round(50 * crowdMult)}, Barricades: ${Math.round(70 * crowdMult)}`,
          recoveryTime: Math.round(recovery * 0.85 * delayMult),
          explain: 'Heavier deployment to protect residential streets and lock cross junctions.',
          parkingReadiness: parkingReadiness
        };
      case 'Scenario D': // Full Response
        return {
          name: 'Maximum Force Deployment',
          confidence: 67,
          delay: Math.round(delay * 0.8 * delayMult),
          congestion: delayMult > 1.45 ? 'Medium' : 'Low',
          cost: 120000,
          resources: `Police: ${Math.round(120 * crowdMult)}, Marshals: ${Math.round(60 * crowdMult)}, Barricades: ${Math.round(80 * crowdMult)}`,
          recoveryTime: Math.round(recovery * 0.7 * delayMult),
          explain: 'Total cordon barricading with dynamic VIP-style green waves.',
          parkingReadiness: Math.min(95, parkingReadiness + 10)
        };
      case 'Scenario B': // Balanced Plan (AI Recommended)
      default:
        return {
          name: 'Balanced Route Optimization',
          confidence: 92,
          delay: Math.round(delay * delayMult),
          congestion: delayMult > 1.4 ? 'Heavy' : 'Low-Medium',
          cost: 75000,
          resources: `Police: ${Math.round(80 * crowdMult)}, Marshals: ${Math.round(40 * crowdMult)}, Barricades: ${Math.round(50 * crowdMult)}`,
          recoveryTime: Math.round(recovery * delayMult),
          explain: 'Combines dynamic signal holds with key intersection marshals.',
          parkingReadiness: parkingReadiness
        };
    }
  };

  const getRecommendedResourceCount = (resourceName, forcedScenario, forcedPreset) => {
    const activeScen = forcedScenario || selectedScenario;
    const activePreset = forcedPreset !== undefined ? forcedPreset : digitalTwinPreset;
    let baseVal = 0;
    if (resourceName === 'police') {
      if (activeScen === 'Scenario A') baseVal = 60;
      else if (activeScen === 'Scenario C') baseVal = 100;
      else if (activeScen === 'Scenario D') baseVal = 120;
      else baseVal = 80;
    } else if (resourceName === 'marshals') {
      if (activeScen === 'Scenario A') baseVal = 20;
      else if (activeScen === 'Scenario C') baseVal = 50;
      else if (activeScen === 'Scenario D') baseVal = 60;
      else baseVal = 40;
    } else if (resourceName === 'barricades') {
      if (activeScen === 'Scenario A') baseVal = 30;
      else if (activeScen === 'Scenario C') baseVal = 70;
      else if (activeScen === 'Scenario D') baseVal = 80;
      else baseVal = 50;
    } else if (resourceName === 'tows') {
      baseVal = activeScen === 'Scenario D' ? 6 : (activeScen === 'Scenario A' ? 2 : 4);
    } else if (resourceName === 'ambulances') {
      baseVal = activeScen === 'Scenario D' ? 3 : 2;
    } else if (resourceName === 'emergency') {
      baseVal = activeScen === 'Scenario A' ? 0 : (activeScen === 'Scenario B' ? 1 : 2);
    }

    // Scale recommended counts based on presets
    if (activePreset === 'crowd_20') {
      return Math.round(baseVal * 1.2);
    } else if (activePreset === 'crowd_50') {
      return Math.round(baseVal * 1.5);
    } else if (activePreset === 'crowd_100') {
      return Math.round(baseVal * 2.0);
    } else if (activePreset === 'parking_overflow') {
      if (resourceName === 'marshals') return Math.round(baseVal * 1.5);
      if (resourceName === 'tows') return Math.round(baseVal * 1.5);
    }
    return baseVal;
  };

  const getResourceDeltas = () => {
    return {
      officers: policeCount - getRecommendedResourceCount('police'),
      marshals: marshalsCount - getRecommendedResourceCount('marshals'),
      barricades: barricadesCount - getRecommendedResourceCount('barricades'),
      tows: towTrucksCount - getRecommendedResourceCount('tows'),
      ambulances: ambulancesCount - getRecommendedResourceCount('ambulances'),
      emergency: emergencyUnitsCount - getRecommendedResourceCount('emergency')
    };
  };

  // Dynamic values calculation in Step 3
  const calculateDynamicMetrics = () => {
    const rec = getScenarioMetrics(selectedScenario);
    const deltas = getResourceDeltas();

    let delayMult = 1.0;
    if (digitalTwinPreset === 'crowd_20') delayMult = 1.15;
    else if (digitalTwinPreset === 'crowd_50') delayMult = 1.45;
    else if (digitalTwinPreset === 'crowd_100') delayMult = 1.9;
    else if (digitalTwinPreset === 'parking_overflow') delayMult = 1.35;

    const delay = Math.max(10, rec.delay - Math.round(deltas.officers * 0.4) - Math.round(deltas.tows * 1.5));
    const congestionPercent = Math.max(10, Math.min(99, (selectedScenario === 'Scenario A' ? 65 : (selectedScenario === 'Scenario B' ? 45 : 30)) * delayMult - deltas.officers * 0.3 - deltas.barricades * 0.5));
    const congestion = congestionPercent > 70 ? 'Critical' : (congestionPercent > 45 ? 'Heavy' : 'Medium-Low');
    const recovery = Math.max(15, rec.recoveryTime - Math.round(deltas.tows * 4) - Math.round(deltas.officers * 0.2));
    const cost = Math.max(10000, rec.cost + deltas.officers * 800 + deltas.marshals * 400 + deltas.barricades * 150 + deltas.tows * 1200 + deltas.emergency * 2500);

    return { delay, congestion, recovery, cost, congestionPercent };
  };

  // Enriched memory recall events matching the specification
  const getRecallEvents = () => {
    const label = eventCause.replace(/_/g, ' ').toUpperCase();
    return [
      {
        name: `${label} 2025`,
        similarity: 96,
        delay: 38,
        police: 115,
        barricades: 40,
        success: 84,
        outcome: 'SUCCESSFUL',
        reason: null
      },
      {
        name: `${label} 2024`,
        similarity: 91,
        delay: 44,
        police: 130,
        barricades: 50,
        success: 81,
        outcome: 'TRAFFIC FAILURE',
        reason: 'Unexpected Crowd Overflow'
      }
    ];
  };

  // Renders the progressive checklist success state
  if (submittedEventId) {
    return (
      <CommandCard title="Vetting Workflow Status">
        <div className="space-y-5 font-mono text-xs text-slate-355 select-none py-2">
          
          <div className="p-3 border border-cyber-green bg-cyber-green/5 text-cyber-green rounded-lg text-xs leading-normal select-text">
            <strong>Clearance Package Forwarded:</strong> Plan ID {submittedEventId} submitted successfully for senior official vetting.
          </div>

          <div className="space-y-3.5 pl-2 select-none">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-orbitron font-bold">Workflow Progression</div>
            
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5 text-cyber-green">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>NeuroTwin Analysis Completed</span>
              </div>
              <div className="flex items-center gap-2.5 text-cyber-green">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Scenario Strategy Vetted ({getScenarioFriendlyName(selectedScenario)})</span>
              </div>
              <div className="flex items-center gap-2.5 text-cyber-green">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Resource Allocation Vetted & Saved</span>
              </div>
              <div className="flex items-center gap-2.5 text-cyber-green">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Operations Vetting Report Generated</span>
              </div>
              <div className="flex items-center gap-2.5 text-cyber-green animate-pulse">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Submitted to Commissioner Queue</span>
              </div>
              <div className="flex items-center gap-2.5 text-cyber-yellow font-bold">
                <Clock className="w-4 h-4 shrink-0 animate-spin" />
                <span>Awaiting Commissioner Authorization</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 bg-[#050b18]/60 p-3 border border-cyber-border/30 rounded-lg text-[10px]">
            <div><strong>Event ID:</strong> <span className="text-white select-all">{submittedEventId}</span></div>
            <div><strong>Roster Status:</strong> <span className="text-cyber-yellow font-bold uppercase">PENDING_APPROVAL</span></div>
            <div><strong>Submission Time:</strong> <span className="text-white">{submissionTime}</span></div>
            <div><strong>Commissioner Notified:</strong> <span className="text-cyber-green font-bold">YES</span></div>
          </div>

          <div className="pt-3 border-t border-cyber-border/40 flex justify-end gap-3 select-none">
            <CommandButton
              onClick={handleNewPlan}
              variant="success"
              className="py-2.5 px-5 text-xs font-orbitron font-bold"
            >
              CREATE NEW PLAN
            </CommandButton>
          </div>
        </div>
      </CommandCard>
    );
  }

  return (
    <div className="select-none">
      {editingEvent && editingEvent.status === 'REJECTED' && (
        <div className="mb-4 bg-cyber-red/10 border border-cyber-red rounded-xl p-4 text-cyber-red font-mono text-xs space-y-2 glow-critical animate-pulse">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[13px] font-orbitron">
            <AlertTriangle className="w-5 h-5" />
            COMMISSIONER REJECTED THIS EVENT
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-355">
            <div>
              <span className="text-slate-550 uppercase block font-bold text-[8px]">Rejected By</span>
              <span className="font-bold text-white">{editingEvent.rejected_by_name || 'Senior Official'}</span>
            </div>
            <div>
              <span className="text-slate-550 uppercase block font-bold text-[8px]">Rejected At</span>
              <span className="font-bold text-white">{editingEvent.rejected_at ? new Date(editingEvent.rejected_at).toLocaleString() : 'N/A'}</span>
            </div>
          </div>
          <div>
            <span className="text-slate-555 uppercase block font-bold text-[8px]">Reason</span>
            <p className="text-slate-200 mt-1 font-sans leading-normal italic">&ldquo;{editingEvent.rejection_reason || 'No comments specified.'}&rdquo;</p>
          </div>
        </div>
      )}
      
      {/* If AI analysis report exists, render the Vetting Wizard */}
      {aiReport ? (
        <CommandCard 
          title={`NEUROTWIN PLANNING WIZARD — STEP ${wizardStep} OF 4`}
          headerRight={
            <button
              onClick={() => {
                setAiReport(null);
                if (onSimulationChange) onSimulationChange(null, null, null, false);
              }}
              className="text-[9px] font-mono border border-cyber-border/60 hover:border-white px-2 py-0.5 rounded text-slate-400 hover:text-white bg-transparent cursor-pointer transition-colors"
            >
              ← BACK TO PARAMETERS
            </button>
          }
        >
          <div className="space-y-4 font-mono text-xs text-slate-350">
            
            {/* Step navigation rail indicator */}
            <div className="grid grid-cols-4 gap-1 text-center font-bold text-[8px] text-slate-500 uppercase tracking-widest border-b border-cyber-border/20 pb-2">
              <div className={`${wizardStep === 1 ? 'text-cyber-accent font-black' : ''}`}>1. Recall</div>
              <div className={`${wizardStep === 2 ? 'text-cyber-accent font-black' : ''}`}>2. Simulation</div>
              <div className={`${wizardStep === 3 ? 'text-cyber-accent font-black' : ''}`}>3. Adjust</div>
              <div className={`${wizardStep === 4 ? 'text-cyber-accent font-black' : ''}`}>4. Report</div>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full bg-[#0c142c] h-1.5 rounded-full overflow-hidden border border-cyber-border/30">
              <div 
                className="bg-gradient-to-r from-cyber-accent to-cyber-green h-full transition-all duration-300"
                style={{ width: `${(wizardStep / 4) * 100}%` }}
              ></div>
            </div>

            {/* STEP 1: EVENT MEMORY RECALL */}
            {wizardStep === 1 && (
              <div className="space-y-3.5">
                <span className="text-[10px] text-cyber-accent font-bold uppercase tracking-wider block font-orbitron">Step 1 — Event Memory Recall</span>
                <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                  The NeuroTwin engine has queried historical process genomes and loaded matching events below. Review memory outcome benchmarks.
                </p>

                <div className="space-y-3">
                  {getRecallEvents().map((e, idx) => {
                    const isFail = e.outcome === 'TRAFFIC FAILURE';
                    return (
                      <div key={idx} className={`p-3 border rounded-lg space-y-2.5 ${isFail ? 'border-cyber-red/30 bg-cyber-red/5' : 'border-cyber-border/30 bg-[#050b18]/40'}`}>
                        <div className="flex justify-between items-center border-b border-cyber-border/25 pb-1">
                          <span className="font-bold text-white font-orbitron">{e.name}</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded border font-bold ${isFail ? 'text-cyber-red border-cyber-red/40 bg-cyber-red/10' : 'text-cyber-green border-cyber-green/40 bg-cyber-green/10'}`}>
                            {e.outcome}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[9px] text-slate-400">
                          <div>Similarity: <span className="text-white font-bold">{e.similarity}%</span></div>
                          <div>Expected Delay: <span className="text-white font-bold">{e.delay} mins</span></div>
                          <div>Police Used: <span className="text-white font-bold">{e.police}</span></div>
                          <div>Barricades: <span className="text-white font-bold">{e.barricades}</span></div>
                          <div className="col-span-2">Diversion Success: <span className="text-white font-bold">{e.success}%</span></div>
                        </div>
                        {e.reason && (
                          <div className="text-[9px] text-cyber-red leading-normal pt-1 border-t border-cyber-red/10">
                            <strong>Failure Reason:</strong> {e.reason}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-cyber-border/30 select-none">
                  <CommandButton variant="secondary" onClick={handleSaveDraft} disabled={loading} className="py-2.5 px-4 text-xs flex items-center gap-1.5">
                    <Save className="w-3.5 h-3.5" /> SAVE DRAFT
                  </CommandButton>
                  <CommandButton variant="success" onClick={() => handleStepTransition(2)} className="py-2.5 px-5 text-xs font-orbitron font-bold flex items-center gap-1">
                    NEXT STEP <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
                  </CommandButton>
                </div>
              </div>
            )}

            {/* STEP 2: SCENARIO COMPARISON */}
            {wizardStep === 2 && (
              <div className="space-y-3.5">
                <span className="text-[10px] text-cyber-accent font-bold uppercase tracking-wider block font-orbitron">Step 2 — Scenario Comparison Simulator</span>
                
                {/* Digital Twin Presets and ESI Control Room Panel */}
                <div className="grid grid-cols-12 gap-3 bg-[#050b18]/65 border border-cyber-border/40 p-3 rounded-lg font-mono text-[9px] select-none items-center">
                  <div className="col-span-8 space-y-2">
                    <span className="text-slate-450 block text-[8px] font-bold uppercase">Digital Twin Scenario Presets:</span>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { id: 'baseline', label: 'Baseline' },
                        { id: 'crowd_20', label: 'Crowd +20%' },
                        { id: 'crowd_50', label: 'Crowd +50%' },
                        { id: 'crowd_100', label: 'Crowd +100%' },
                        { id: 'parking_overflow', label: 'Parking Overflow' }
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => setDigitalTwinPreset(preset.id)}
                          className={`py-1 px-0.5 border rounded text-[7.5px] font-bold cursor-pointer transition-all ${
                            digitalTwinPreset === preset.id
                              ? 'bg-[#00d2ff]/15 border-[#00d2ff]/40 text-white shadow-[0_0_8px_rgba(0,210,255,0.2)]'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="col-span-4 flex flex-col items-center justify-center border-l border-cyber-border/20 pl-2">
                    <span className="text-slate-500 text-[7px] uppercase font-bold text-center block mb-1">Event Stress Index</span>
                    {(() => {
                      const esi = calculateESI();
                      let color = '#22c55e'; // Green
                      let status = 'HEALTHY';
                      if (esi > 80) { color = '#ef4444'; status = 'CRITICAL'; }
                      else if (esi > 60) { color = '#f97316'; status = 'HIGH RISK'; }
                      else if (esi > 30) { color = '#eab308'; status = 'WARNING'; }
                      
                      const radius = 14;
                      const circumference = 2 * Math.PI * radius;
                      const strokeDashoffset = circumference - (esi / 100) * circumference;
                      return (
                        <div className="relative flex items-center justify-center" style={{ width: '42px', height: '42px' }}>
                          <svg width="42" height="42" style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx="21" cy="21" r={radius} fill="none" stroke="#0c142c" strokeWidth="3"></circle>
                            <circle cx="21" cy="21" r={radius} fill="none" stroke={color} strokeWidth="3" 
                                    strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
                                    style={{ transition: 'stroke-dashoffset 0.4s ease' }}></circle>
                          </svg>
                          <div className="absolute flex flex-col items-center justify-center">
                            <span className="font-orbitron font-bold text-[9px] text-white leading-none">{esi}</span>
                            <span className="text-[5.5px] font-bold leading-none mt-0.5" style={{ color }}>{status}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
                
                {/* Horizontal scenarios selection */}
                <div className="grid grid-cols-3 gap-2 select-none">
                  {['Scenario A', 'Scenario B', 'Scenario C'].map((scen) => {
                    const meta = getScenarioMetrics(scen);
                    const isSelected = selectedScenario === scen;
                    return (
                      <button
                        key={scen}
                        onClick={() => {
                          setSelectedScenario(scen);
                          setPoliceCount(getRecommendedResourceCount('police', scen));
                          setBarricadesCount(getRecommendedResourceCount('barricades', scen));
                          setTowTrucksCount(getRecommendedResourceCount('tows', scen));
                          setMarshalsCount(getRecommendedResourceCount('marshals', scen));
                          setAmbulancesCount(getRecommendedResourceCount('ambulances', scen));
                          setEmergencyUnitsCount(getRecommendedResourceCount('emergency', scen));
                        }}
                        className={`p-2.5 border rounded-lg text-left transition-all relative cursor-pointer ${
                          isSelected ? 'bg-cyber-accent/10 border-cyber-accent text-white font-bold' : 'bg-[#030611] border-cyber-border text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="text-[9px] block text-slate-500 uppercase">Strategy</div>
                        <div className="text-[10px] font-bold tracking-tight truncate mt-0.5">{getScenarioFriendlyName(scen)}</div>
                        <div className="mt-1 flex items-center justify-between text-[8px]">
                          <span className={`px-1 rounded border font-bold uppercase ${getConfidenceBadgeColor(meta.confidence)}`}>
                            {meta.confidence}% Match
                          </span>
                          {scen === 'Scenario B' && (
                            <span className="text-cyber-green text-[7px] font-black uppercase tracking-tighter">AI REC</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Scenario Preview */}
                <div className="p-3 border border-cyber-border bg-[#050b18]/60 rounded-lg space-y-2 font-mono">
                  <div className="flex justify-between items-center border-b border-cyber-border/30 pb-1.5">
                    <span className="text-[10px] text-white font-orbitron font-bold uppercase">
                      NEUROTWIN IMPACT PREVIEW — {getScenarioFriendlyName(selectedScenario).toUpperCase()}
                    </span>
                    <span className="text-[9px] text-[#00d2ff] font-bold">
                      Confidence: {getScenarioMetrics(selectedScenario).confidence}%
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                    <div>Expected Delay: <span className="text-white font-bold">{getScenarioMetrics(selectedScenario).delay} mins</span></div>
                    <div>Predicted Congestion: <span className="text-cyber-accent font-bold">{getScenarioMetrics(selectedScenario).congestion}</span></div>
                    <div>Resource Cost: <span className="text-white font-bold">₹{getScenarioMetrics(selectedScenario).cost.toLocaleString()}</span></div>
                    <div>Affected Junctions: <span className="text-white font-bold">12 Junctions</span></div>
                    <div>Expected Vehicles: <span className="text-white font-bold">24,500 Vehicles</span></div>
                    <div>Recovery Time: <span className="text-white font-bold">{getScenarioMetrics(selectedScenario).recoveryTime} mins</span></div>
                  </div>
                  
                  <div className="text-[9px] text-slate-400 leading-normal pt-1.5 border-t border-cyber-border/20">
                    <strong>AI Recommendation Logic:</strong> {getScenarioMetrics(selectedScenario).explain}
                  </div>
                </div>

                {/* Scenario Override governance */}
                {selectedScenario !== 'Scenario B' && (
                  <div className="p-2.5 border border-cyber-orange/20 bg-cyber-orange/5 rounded-lg space-y-2">
                    <span className="text-[9px] text-cyber-orange font-bold uppercase tracking-wider block flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> AI Recommendation Override Warning
                    </span>
                    <p className="text-[8px] text-slate-400 font-sans leading-relaxed">
                      You are overriding the AI recommended Strategy (Balanced Plan). You must enter a technical justification audit reason.
                    </p>
                    <textarea
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="Explain corridor overrides, signal holds, or timeline changes here..."
                      rows="2"
                      className="w-full bg-[#050b18] border border-cyber-border focus:border-cyber-accent rounded-lg p-2 text-white outline-none resize-none font-sans text-xs"
                    />
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-cyber-border/30 select-none">
                  <CommandButton variant="secondary" onClick={() => handleStepTransition(1)} className="py-2.5 px-4 text-xs flex items-center gap-1">
                    <ArrowLeft className="w-3.5 h-3.5 text-white" /> BACK
                  </CommandButton>
                  <CommandButton 
                    variant="success" 
                    onClick={() => {
                      if (selectedScenario !== 'Scenario B' && !overrideReason.trim()) {
                        setError("Override justifications must be specified.");
                        return;
                      }
                      setError(null);
                      handleStepTransition(3);
                    }} 
                    className="py-2.5 px-5 text-xs font-orbitron font-bold flex items-center gap-1"
                  >
                    NEXT STEP <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
                  </CommandButton>
                </div>
              </div>
            )}

            {/* STEP 3: RESOURCE RECOMMENDATION */}
            {wizardStep === 3 && (
              <div className="space-y-3.5">
                <span className="text-[10px] text-cyber-accent font-bold uppercase tracking-wider block font-orbitron">Step 3 — Resource Recommendation Vetting</span>
                
                {/* Digital Twin Presets and ESI Control Room Panel */}
                <div className="grid grid-cols-12 gap-3 bg-[#050b18]/65 border border-cyber-border/40 p-3 rounded-lg font-mono text-[9px] select-none items-center">
                  <div className="col-span-8 space-y-2">
                    <span className="text-slate-455 block text-[8px] font-bold uppercase">Digital Twin Scenario Presets:</span>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { id: 'baseline', label: 'Baseline' },
                        { id: 'crowd_20', label: 'Crowd +20%' },
                        { id: 'crowd_50', label: 'Crowd +50%' },
                        { id: 'crowd_100', label: 'Crowd +100%' },
                        { id: 'parking_overflow', label: 'Parking Overflow' }
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => {
                            setDigitalTwinPreset(preset.id);
                            setPoliceCount(getRecommendedResourceCount('police', selectedScenario, preset.id));
                            setBarricadesCount(getRecommendedResourceCount('barricades', selectedScenario, preset.id));
                            setTowTrucksCount(getRecommendedResourceCount('tows', selectedScenario, preset.id));
                            setMarshalsCount(getRecommendedResourceCount('marshals', selectedScenario, preset.id));
                            setAmbulancesCount(getRecommendedResourceCount('ambulances', selectedScenario, preset.id));
                            setEmergencyUnitsCount(getRecommendedResourceCount('emergency', selectedScenario, preset.id));
                          }}
                          className={`py-1 px-0.5 border rounded text-[7.5px] font-bold cursor-pointer transition-all ${
                            digitalTwinPreset === preset.id
                              ? 'bg-[#00d2ff]/15 border-[#00d2ff]/40 text-white shadow-[0_0_8px_rgba(0,210,255,0.2)]'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="col-span-4 flex flex-col items-center justify-center border-l border-cyber-border/20 pl-2">
                    <span className="text-slate-550 text-[7px] uppercase font-bold text-center block mb-1">Event Stress Index</span>
                    {(() => {
                      const esi = calculateESI();
                      let color = '#22c55e'; // Green
                      let status = 'HEALTHY';
                      if (esi > 80) { color = '#ef4444'; status = 'CRITICAL'; }
                      else if (esi > 60) { color = '#f97316'; status = 'HIGH RISK'; }
                      else if (esi > 30) { color = '#eab308'; status = 'WARNING'; }
                      
                      const radius = 14;
                      const circumference = 2 * Math.PI * radius;
                      const strokeDashoffset = circumference - (esi / 100) * circumference;
                      return (
                        <div className="relative flex items-center justify-center" style={{ width: '42px', height: '42px' }}>
                          <svg width="42" height="42" style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx="21" cy="21" r={radius} fill="none" stroke="#0c142c" strokeWidth="3"></circle>
                            <circle cx="21" cy="21" r={radius} fill="none" stroke={color} strokeWidth="3" 
                                    strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
                                    style={{ transition: 'stroke-dashoffset 0.4s ease' }}></circle>
                          </svg>
                          <div className="absolute flex flex-col items-center justify-center">
                            <span className="font-orbitron font-bold text-[9px] text-white leading-none">{esi}</span>
                            <span className="text-[5.5px] font-bold leading-none mt-0.5" style={{ color }}>{status}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
                
                {/* Visual resources adjustment counters */}
                <div className="grid grid-cols-2 gap-3.5 select-none">
                  
                  {/* Police Officers */}
                  <div className="flex items-center justify-between bg-[#050b18]/60 p-2 border border-cyber-border/30 rounded-lg">
                    <div>
                      <span className="text-[8px] text-slate-500 uppercase block font-bold">Police Officers</span>
                      <span className="text-white font-bold text-[13px] font-orbitron">{policeCount}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => setPoliceCount(Math.max(10, policeCount - 5))} className="w-7 h-7 bg-slate-900 hover:bg-slate-800 border border-cyber-border/50 text-white rounded flex items-center justify-center font-bold cursor-pointer"><Minus className="w-3 h-3" /></button>
                      <button onClick={() => setPoliceCount(policeCount + 5)} className="w-7 h-7 bg-slate-900 hover:bg-slate-800 border border-cyber-border/50 text-white rounded flex items-center justify-center font-bold cursor-pointer"><Plus className="w-3 h-3" /></button>
                    </div>
                  </div>

                  {/* Traffic Marshals */}
                  <div className="flex items-center justify-between bg-[#050b18]/60 p-2 border border-cyber-border/30 rounded-lg">
                    <div>
                      <span className="text-[8px] text-slate-500 uppercase block font-bold">Traffic Marshals</span>
                      <span className="text-white font-bold text-[13px] font-orbitron">{marshalsCount}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => setMarshalsCount(Math.max(5, marshalsCount - 5))} className="w-7 h-7 bg-slate-900 hover:bg-slate-800 border border-cyber-border/50 text-white rounded flex items-center justify-center font-bold cursor-pointer"><Minus className="w-3 h-3" /></button>
                      <button onClick={() => setMarshalsCount(marshalsCount + 5)} className="w-7 h-7 bg-slate-900 hover:bg-slate-800 border border-cyber-border/50 text-white rounded flex items-center justify-center font-bold cursor-pointer"><Plus className="w-3 h-3" /></button>
                    </div>
                  </div>

                  {/* Barricades */}
                  <div className="flex items-center justify-between bg-[#050b18]/60 p-2 border border-cyber-border/30 rounded-lg">
                    <div>
                      <span className="text-[8px] text-slate-500 uppercase block font-bold">Barricades</span>
                      <span className="text-white font-bold text-[13px] font-orbitron">{barricadesCount}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => setBarricadesCount(Math.max(5, barricadesCount - 5))} className="w-7 h-7 bg-slate-900 hover:bg-slate-800 border border-cyber-border/50 text-white rounded flex items-center justify-center font-bold cursor-pointer"><Minus className="w-3 h-3" /></button>
                      <button onClick={() => setBarricadesCount(barricadesCount + 5)} className="w-7 h-7 bg-slate-900 hover:bg-slate-800 border border-cyber-border/50 text-white rounded flex items-center justify-center font-bold cursor-pointer"><Plus className="w-3 h-3" /></button>
                    </div>
                  </div>

                  {/* Tow Trucks */}
                  <div className="flex items-center justify-between bg-[#050b18]/60 p-2 border border-cyber-border/30 rounded-lg">
                    <div>
                      <span className="text-[8px] text-slate-500 uppercase block font-bold">Tow Trucks</span>
                      <span className="text-white font-bold text-[13px] font-orbitron">{towTrucksCount}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => setTowTrucksCount(Math.max(1, towTrucksCount - 1))} className="w-7 h-7 bg-slate-900 hover:bg-slate-800 border border-cyber-border/50 text-white rounded flex items-center justify-center font-bold cursor-pointer"><Minus className="w-3 h-3" /></button>
                      <button onClick={() => setTowTrucksCount(towTrucksCount + 1)} className="w-7 h-7 bg-slate-900 hover:bg-slate-800 border border-cyber-border/50 text-white rounded flex items-center justify-center font-bold cursor-pointer"><Plus className="w-3 h-3" /></button>
                    </div>
                  </div>

                  {/* Ambulances */}
                  <div className="flex items-center justify-between bg-[#050b18]/60 p-2 border border-cyber-border/30 rounded-lg">
                    <div>
                      <span className="text-[8px] text-slate-500 uppercase block font-bold">Ambulances</span>
                      <span className="text-white font-bold text-[13px] font-orbitron">{ambulancesCount}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => setAmbulancesCount(Math.max(1, ambulancesCount - 1))} className="w-7 h-7 bg-slate-900 hover:bg-slate-800 border border-cyber-border/50 text-white rounded flex items-center justify-center font-bold cursor-pointer"><Minus className="w-3 h-3" /></button>
                      <button onClick={() => setAmbulancesCount(ambulancesCount + 1)} className="w-7 h-7 bg-slate-900 hover:bg-slate-800 border border-cyber-border/50 text-white rounded flex items-center justify-center font-bold cursor-pointer"><Plus className="w-3 h-3" /></button>
                    </div>
                  </div>

                  {/* Emergency Units */}
                  <div className="flex items-center justify-between bg-[#050b18]/60 p-2 border border-cyber-border/30 rounded-lg">
                    <div>
                      <span className="text-[8px] text-slate-500 uppercase block font-bold">Emergency Units</span>
                      <span className="text-white font-bold text-[13px] font-orbitron">{emergencyUnitsCount}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => setEmergencyUnitsCount(Math.max(0, emergencyUnitsCount - 1))} className="w-7 h-7 bg-slate-900 hover:bg-slate-800 border border-cyber-border/50 text-white rounded flex items-center justify-center font-bold cursor-pointer"><Minus className="w-3 h-3" /></button>
                      <button onClick={() => setEmergencyUnitsCount(emergencyUnitsCount + 1)} className="w-7 h-7 bg-slate-900 hover:bg-slate-800 border border-cyber-border/50 text-white rounded flex items-center justify-center font-bold cursor-pointer"><Plus className="w-3 h-3" /></button>
                    </div>
                  </div>

                </div>

                {/* Resource impact explainability engine */}
                <div className="p-3 border border-cyber-accent/30 bg-[#050b18]/50 rounded-lg space-y-2">
                  <span className="text-[9px] text-[#00d2ff] font-bold uppercase tracking-wider block font-orbitron">
                    Resource Impact Explanation
                  </span>
                  
                  {/* Dynamic explains bullets */}
                  <div className="space-y-1.5 font-mono text-[9px] text-slate-300 select-text leading-normal">
                    {(() => {
                      const recMetrics = getScenarioMetrics(selectedScenario);
                      const dyn = calculateDynamicMetrics();
                      const deltas = getResourceDeltas();
                      const bullets = [];

                      if (deltas.officers > 0) {
                        bullets.push(`• +${deltas.officers} Officers: Expected Delay decreases from ${recMetrics.delay} mins to ${dyn.delay} mins. Reason: Faster Junction Clearance`);
                      } else if (deltas.officers < 0) {
                        bullets.push(`• ${deltas.officers} Officers: Expected Delay increases from ${recMetrics.delay} mins to ${dyn.delay} mins. Reason: Slower Intersection Control`);
                      }

                      if (deltas.barricades < 0) {
                        bullets.push(`• ${deltas.barricades} Barricades: Risk index increases by +${Math.abs(deltas.barricades * 2)}%. Reason: Reduced Crowd Channelization`);
                      } else if (deltas.barricades > 0) {
                        bullets.push(`• +${deltas.barricades} Barricades: Risk index decreases by -${deltas.barricades}%. Reason: Enhanced Perimeter Safety`);
                      }

                      if (deltas.tows > 0) {
                        bullets.push(`• +${deltas.tows} Tow Trucks: Recovery Time decreases from ${recMetrics.recoveryTime} mins to ${dyn.recovery} mins. Reason: Faster Incident Removal`);
                      } else if (deltas.tows < 0) {
                        bullets.push(`• ${deltas.tows} Tow Trucks: Recovery Time increases from ${recMetrics.recoveryTime} mins to ${dyn.recovery} mins. Reason: Delayed Breakdowns Clearance`);
                      }

                      if (bullets.length === 0) {
                        bullets.push("• Resource plans match baseline recommendations. No delta impact calculated.");
                      }

                      return bullets.map((b, bIdx) => <div key={bIdx}>{b}</div>);
                    })()}
                  </div>
                </div>

                {/* Real-time metrics impact dials */}
                <div className="grid grid-cols-3 gap-2 bg-[#050b18]/60 p-2.5 border border-cyber-border/30 rounded-lg text-center font-mono">
                  <div>
                    <span className="text-[7px] text-slate-500 block uppercase">Travel Delay</span>
                    <span className="text-white font-bold text-[11px] font-orbitron">{calculateDynamicMetrics().delay} mins</span>
                  </div>
                  <div>
                    <span className="text-[7px] text-slate-500 block uppercase">Congestion Load</span>
                    <span className="text-cyber-accent font-bold text-[11px] font-orbitron">{calculateDynamicMetrics().congestion}</span>
                  </div>
                  <div>
                    <span className="text-[7px] text-slate-500 block uppercase">Operational Cost</span>
                    <span className="text-cyber-green font-bold text-[11px] font-orbitron">₹{calculateDynamicMetrics().cost.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-cyber-border/30 select-none">
                  <CommandButton variant="secondary" onClick={() => handleStepTransition(2)} className="py-2.5 px-4 text-xs flex items-center gap-1">
                    <ArrowLeft className="w-3.5 h-3.5 text-white" /> BACK
                  </CommandButton>
                  <CommandButton variant="success" onClick={() => handleStepTransition(4)} className="py-2.5 px-5 text-xs font-orbitron font-bold flex items-center gap-1">
                    NEXT STEP <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
                  </CommandButton>
                </div>
              </div>
            )}

            {/* STEP 4: FINAL REPORT */}
            {wizardStep === 4 && (
              <div className="space-y-3.5">
                <span className="text-[10px] text-cyber-accent font-bold uppercase tracking-wider block font-orbitron">Step 4 — Operations Planning Clearance Report</span>
                
                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                  
                  {/* Summary Block */}
                  <div className="bg-[#050b18]/60 p-3 border border-cyber-border/30 rounded-lg space-y-2">
                    <span className="text-[9px] text-white font-bold font-orbitron uppercase border-b border-cyber-border/20 pb-1 block">
                      Planning Summary
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 text-[9px] text-slate-400">
                      <div>Selected Strategy: <span className="text-white font-bold">{getScenarioFriendlyName(selectedScenario)}</span></div>
                      <div>Expected Delay: <span className="text-white font-bold">{calculateDynamicMetrics().delay} Mins</span></div>
                      <div>Congestion Forecast: <span className="text-cyber-accent font-bold">{calculateDynamicMetrics().congestion}</span></div>
                      <div>Estimated Cost: <span className="text-cyber-green font-bold">₹{calculateDynamicMetrics().cost.toLocaleString()}</span></div>
                      <div className="col-span-2">NeuroTwin Confidence: <span className="text-cyber-green font-bold">{getScenarioMetrics(selectedScenario).confidence}% Match</span></div>
                    </div>
                  </div>

                  {/* Resource Allocation */}
                  <div className="bg-[#050b18]/60 p-3 border border-cyber-border/30 rounded-lg space-y-2">
                    <span className="text-[9px] text-white font-bold font-orbitron uppercase border-b border-cyber-border/20 pb-1 block">
                      Allocated Force deployment
                    </span>
                    <table className="w-full text-left text-[9px] border-collapse text-slate-350">
                      <thead>
                        <tr className="border-b border-cyber-border/30 text-slate-500">
                          <th className="py-1">Resource</th>
                          <th className="py-1">Quantity</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-cyber-border/10"><td className="py-1">Police Officers</td><td className="py-1 text-white font-bold">{policeCount}</td></tr>
                        <tr className="border-b border-cyber-border/10"><td className="py-1">Traffic Marshals</td><td className="py-1 text-white font-bold">{marshalsCount}</td></tr>
                        <tr className="border-b border-cyber-border/10"><td className="py-1">Barricades</td><td className="py-1 text-white font-bold">{barricadesCount}</td></tr>
                        <tr className="border-b border-cyber-border/10"><td className="py-1">Towing Trucks</td><td className="py-1 text-white font-bold">{towTrucksCount}</td></tr>
                        <tr className="border-b border-cyber-border/10"><td className="py-1">Ambulances</td><td className="py-1 text-white font-bold">{ambulancesCount}</td></tr>
                        <tr><td className="py-1">Emergency Support Units</td><td className="py-1 text-white font-bold">{emergencyUnitsCount} Units</td></tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Diversion route plan */}
                  <div className="bg-[#050b18]/60 p-3 border border-cyber-border/30 rounded-lg space-y-2">
                    <span className="text-[9px] text-white font-bold font-orbitron uppercase border-b border-cyber-border/20 pb-1 block">
                      Diversion & Route Optimization Cordon
                    </span>
                    <div className="space-y-2">
                      <div className="p-2 border border-cyber-green/30 bg-cyber-green/5 rounded">
                        <div className="flex justify-between items-center text-[9px] font-bold text-cyber-green mb-0.5">
                          <span>RECOMMENDED ROUTE: Route A</span>
                          <span>87% Success Rate</span>
                        </div>
                        <div className="text-[9px] text-slate-400 font-sans">
                          Expected travel time delay: <strong>+5 Minutes</strong>. Reroutes corridor traffic via outer bypass checkpoints.
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[8px] text-slate-500 uppercase tracking-widest font-bold">
                        <div className="p-1.5 border border-cyber-border/25 rounded bg-[#030611]/50 text-center">
                          Route B Success: <span className="text-white font-black">72%</span>
                        </div>
                        <div className="p-1.5 border border-cyber-border/25 rounded bg-[#030611]/50 text-center">
                          Route C Success: <span className="text-white font-black">43%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Comments Box */}
                  <div className="space-y-1 select-none">
                    <label className="block text-[8px] text-slate-500 uppercase tracking-wider">Remarks / Vetting Report comments</label>
                    <textarea 
                      value={operatorComments} 
                      onChange={(e) => setOperatorComments(e.target.value)}
                      placeholder="Add planning report comments explaining corridor overrides, signal holds, or timeline changes here..."
                      rows="2"
                      className="w-full bg-[#050b18] border border-cyber-border/40 focus:border-cyber-accent rounded-lg p-2 text-white outline-none resize-none font-sans text-xs" 
                    />
                  </div>

                </div>

                <div className="flex flex-col gap-4 pt-4 border-t border-cyber-border/30 select-none w-full">
                  {/* Top Row: Generate Report centered */}
                  <div className="flex justify-center w-full">
                    <CommandButton 
                      variant="secondary"
                      onClick={async () => {
                        try {
                          // Save current state as draft first
                          await axios.post(`${API_BASE_URL}/events/planner/save-draft`, {
                            event_id: draftEventId,
                            event_cause: eventCause,
                            priority: priority,
                            zone: zone,
                            corridor: corridor,
                            requires_road_closure: requiresClosure,
                            latitude: parseFloat(lat),
                            longitude: parseFloat(lng),
                            expected_attendance: parseInt(attendance),
                            duration_minutes: parseInt(duration),
                            event_date: eventDate,
                            start_time: startTime,
                            end_time: endTime,
                            special_conditions: specialConditions,
                            selected_scenario: getScenarioFriendlyName(selectedScenario),
                            override_reason: overrideReason,
                            final_officers: parseInt(policeCount),
                            final_barricades: parseInt(barricadesCount),
                            final_tow_vehicles: parseInt(towTrucksCount)
                          });

                          // Update status to REPORT_GENERATED
                          await axios.post(`${API_BASE_URL}/events/update-status`, {
                            event_id: draftEventId,
                            status: 'REPORT_GENERATED',
                            comments: 'Operator generated planning report.'
                          });

                          if (onDraftSaved) onDraftSaved();

                          const pdfEvent = {
                            event_id: draftEventId,
                            event_type: 'planned',
                            event_cause: eventCause,
                            priority: priority,
                            zone: zone,
                            corridor: corridor,
                            requires_road_closure: requiresClosure,
                            latitude: parseFloat(lat),
                            longitude: parseFloat(lng),
                            impact_score: aiReport.risk_score,
                            confidence_score: aiReport.confidence_score,
                            congestion_prediction: calculateDynamicMetrics().congestionPercent,
                            police_units_required: policeCount,
                            barricades_required: barricadesCount,
                            traffic_personnel_required: marshalsCount,
                            deployment_timeline: aiReport.deployment_timeline,
                            ai_recommendation_summary: operatorComments || aiReport.ai_recommendation_summary,
                            
                            final_officers: policeCount,
                            final_barricades: barricadesCount,
                            final_tow_vehicles: towTrucksCount,
                            final_traffic_personnel: marshalsCount,
                            ai_officers: aiReport.resources.officers,
                            ai_barricades: aiReport.resources.barricades,
                            ai_tow_vehicles: aiReport.resources.tow_vehicles,
                            ai_response_level: aiReport.resources.response_level,
                            approved_scenario: getScenarioFriendlyName(selectedScenario),
                            special_conditions: specialConditions || aiReport.ai_recommendation_summary,
                            event_date: eventDate,
                            start_time: startTime,
                            end_time: endTime
                          };
                          downloadEventReportPDF(pdfEvent);
                        } catch (pdfErr) {
                          console.error("PDF generation or status update failed:", pdfErr);
                        }
                      }}
                      className="w-full md:w-auto py-2.5 px-6 text-xs font-orbitron font-bold flex items-center justify-center gap-1.5"
                    >
                      <FileText className="w-4 h-4 text-white" /> GENERATE REPORT
                    </CommandButton>
                  </div>

                  {/* Bottom Row: Back and Submit to Commissioner */}
                  <div className="flex justify-between items-center w-full gap-4">
                    <CommandButton variant="secondary" onClick={() => handleStepTransition(3)} className="py-2.5 px-5 text-xs flex items-center justify-center gap-1">
                      <ArrowLeft className="w-3.5 h-3.5 text-white" /> BACK
                    </CommandButton>
                    <CommandButton 
                      variant="success" 
                      onClick={handleSubmitToCommissioner} 
                      disabled={loading}
                      className="py-2.5 px-5 text-xs font-orbitron font-bold flex items-center justify-center gap-1.5"
                    >
                      <Send className="w-4 h-4 text-slate-950" /> SUBMIT TO COMMISSIONER
                    </CommandButton>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-cyber-red/5 border border-cyber-red text-cyber-red rounded-lg flex items-center gap-2 font-mono text-[10px]">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

          </div>
        </CommandCard>
      ) : (
        /* If no AI report is loaded, render the Planned Event Creator Form */
        <CommandCard title="Planned Event Creator">
          <div className="space-y-4 font-mono text-xs text-slate-350">
            
            {/* Versioning and registry draft details */}
            {draftEventId && (
              <div className="p-3 bg-cyber-accent/5 border border-cyber-accent rounded-lg text-xs font-mono mb-4 select-text">
                <div className="flex justify-between items-center text-white font-bold mb-1 select-none">
                  <span>ACTIVE DRAFT: {draftEventId} (v{draftVersion || 1})</span>
                  <button 
                    onClick={handleNewPlan}
                    className="text-[9px] text-slate-400 hover:text-white border border-cyber-border px-1.5 py-0.5 rounded bg-transparent transition-colors cursor-pointer"
                  >
                    NEW PLAN
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[9px] text-slate-550 select-none">
                  {parentEventId && <div><strong>Created From:</strong> {parentEventId}</div>}
                  <div><strong>Created By:</strong> {editingEvent?.creator_name || user?.name || 'Officer'}</div>
                  <div><strong>Created At:</strong> {editingEvent?.created_at ? new Date(editingEvent.created_at).toLocaleString() : new Date().toLocaleString()}</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[10px] text-slate-500 uppercase">Event Cause</label>
                <select 
                  value={eventCause} 
                  onChange={(e) => setEventCause(e.target.value)}
                  className="w-full bg-[#050b18] border border-cyber-border focus:border-cyber-accent rounded-lg p-2 text-white outline-none cursor-pointer"
                >
                  <option value="festival">Festival</option>
                  <option value="marathon">Marathon</option>
                  <option value="rally">Political Rally</option>
                  <option value="concert">Concert</option>
                  <option value="sporting_event">Sporting Event</option>
                  <option value="protest">Public Protest</option>
                  <option value="construction">Road Works</option>
                  <option value="vip_movement">VIP Convoy</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] text-slate-500 uppercase">Priority Rating</label>
                <select 
                  value={priority} 
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-[#050b18] border border-cyber-border focus:border-cyber-accent rounded-lg p-2 text-white outline-none cursor-pointer"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[10px] text-slate-500 uppercase">City Zone</label>
                <select 
                  value={zone} 
                  onChange={(e) => setZone(e.target.value)}
                  className="w-full bg-[#050b18] border border-cyber-border focus:border-cyber-accent rounded-lg p-2 text-white outline-none cursor-pointer"
                >
                  <option value="Central Zone">Central Zone</option>
                  <option value="North Zone">North Zone</option>
                  <option value="South Zone">South Zone</option>
                  <option value="East Zone">East Zone</option>
                  <option value="West Zone">West Zone</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] text-slate-500 uppercase">Primary Corridor</label>
                <select 
                  value={corridor} 
                  onChange={(e) => setCorridor(e.target.value)}
                  className="w-full bg-[#050b18] border border-cyber-border focus:border-cyber-accent rounded-lg p-2 text-white outline-none cursor-pointer"
                >
                  <option value="MG Road Corridor">MG Road Corridor</option>
                  <option value="Hosur Road Corridor">Hosur Road Corridor</option>
                  <option value="Bannerghatta Corridor">Bannerghatta Corridor</option>
                  <option value="Outer Ring Road">Outer Ring Road</option>
                  <option value="non-corridor">Non-corridor</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[10px] text-slate-500 uppercase">Latitude</label>
                <input 
                  type="number" step="0.0001" value={lat} onChange={(e) => setLat(e.target.value)}
                  className="w-full bg-[#050b18] border border-cyber-border focus:border-cyber-accent rounded-lg p-2 text-white outline-none" 
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] text-slate-500 uppercase">Longitude</label>
                <input 
                  type="number" step="0.0001" value={lng} onChange={(e) => setLng(e.target.value)}
                  className="w-full bg-[#050b18] border border-cyber-border focus:border-cyber-accent rounded-lg p-2 text-white outline-none" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[10px] text-slate-500 uppercase">Expected Attendance</label>
                <input 
                  type="number" value={attendance} onChange={(e) => setAttendance(e.target.value)}
                  className="w-full bg-[#050b18] border border-cyber-border focus:border-cyber-accent rounded-lg p-2 text-white outline-none" 
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] text-slate-500 uppercase">Duration (Minutes)</label>
                <input 
                  type="number" value={duration} onChange={(e) => setDuration(e.target.value)}
                  className="w-full bg-[#050b18] border border-cyber-border focus:border-cyber-accent rounded-lg p-2 text-white outline-none" 
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="block text-[10px] text-slate-500 uppercase">Event Date</label>
                <input 
                  type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)}
                  className="w-full bg-[#050b18] border border-cyber-border focus:border-cyber-accent rounded-lg p-2 text-white outline-none cursor-pointer" 
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] text-slate-500 uppercase">Start Time</label>
                <input 
                  type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-[#050b18] border border-cyber-border focus:border-cyber-accent rounded-lg p-2 text-white outline-none cursor-pointer" 
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] text-slate-500 uppercase">End Time</label>
                <input 
                  type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-[#050b18] border border-cyber-border focus:border-cyber-accent rounded-lg p-2 text-white outline-none cursor-pointer" 
                />
              </div>
            </div>

            <div className="flex items-center gap-2 py-1 select-none">
              <input 
                type="checkbox" id="closure" checked={requiresClosure} onChange={(e) => setRequiresClosure(e.target.checked)}
                className="w-4 h-4 bg-[#050b18] border-cyber-border rounded cursor-pointer accent-cyber-accent" 
              />
              <label htmlFor="closure" className="text-white font-bold cursor-pointer font-sans">Requires Road Closure & Divergence Cordon</label>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] text-slate-500 uppercase">Special Conditions (Weather, VIP routes...)</label>
              <textarea 
                value={specialConditions} onChange={(e) => setSpecialConditions(e.target.value)}
                placeholder="Specify VIP convoys scheduled, expected rain intensity, road-widening blockage details..."
                rows="2"
                className="w-full bg-[#050b18] border border-cyber-border focus:border-cyber-accent rounded-lg p-2 text-white outline-none resize-none font-sans" 
              />
            </div>

            {/* Form actions */}
            <div className="pt-3 border-t border-cyber-border/40 flex justify-end gap-3 select-none">
              <CommandButton
                onClick={handleSaveDraft}
                disabled={loading}
                variant="secondary"
                className="py-2.5 px-4 flex items-center gap-1 text-xs"
              >
                <Save className="w-3.5 h-3.5" />
                SAVE DRAFT
              </CommandButton>

              <CommandButton
                onClick={handleRunAnalysis}
                disabled={loading}
                variant="success"
                className="py-2.5 px-4 flex items-center gap-1.5 text-xs"
              >
                <Cpu className="w-4 h-4 text-slate-950" />
                RUN NEUROTWIN ANALYSIS
              </CommandButton>
            </div>

            {actionSuccess && (
              <div className="p-3 bg-cyber-green/5 border border-cyber-green text-cyber-green rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{actionSuccess}</span>
              </div>
            )}

            {error && (
              <div className="p-3 bg-cyber-red/5 border border-cyber-red text-cyber-red rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

          </div>
        </CommandCard>
      )}

    </div>
  );
}
