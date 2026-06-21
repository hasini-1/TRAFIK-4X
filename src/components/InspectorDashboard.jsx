import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import CommandCard from './ui/CommandCard';
import StatusBadge from './ui/StatusBadge';
import { downloadEventReportPDF } from '../utils/pdfGenerator';
import { 
  AlertTriangle, AlertCircle, Send, CheckCircle, 
  ShieldAlert, Activity, HelpCircle, Play, Check, 
  Sliders, Download, X, Loader2
} from 'lucide-react';

const ZONE_BOUNDARIES = {
  'North Zone': {
    coords: [[12.99, 77.56], [13.04, 77.56], [13.04, 77.63], [12.99, 77.63]],
    status: 'ACTIVE',
    color: '#ff0055',
    fillColor: '#ff0055',
    label: 'Primary Zone'
  },
  'West Zone': {
    coords: [[12.94, 77.50], [12.99, 77.50], [12.99, 77.56], [12.94, 77.56]],
    status: 'STANDBY',
    color: '#ffcc00',
    fillColor: '#ffcc00',
    label: 'Secondary Zone'
  },
  'Central Zone': {
    coords: [[12.95, 77.56], [12.99, 77.56], [12.99, 77.63], [12.95, 77.63]],
    status: 'WATCHLIST',
    color: '#ff7700',
    fillColor: '#ff7700',
    label: 'Tertiary Zone'
  },
  'South Zone': {
    coords: [[12.90, 77.56], [12.95, 77.56], [12.95, 77.63], [12.90, 77.63]],
    status: 'INACTIVE',
    color: '#64748b',
    fillColor: '#64748b',
    label: 'Inactive Zone'
  },
  'East Zone': {
    coords: [[12.95, 77.63], [13.01, 77.63], [13.01, 77.70], [12.95, 77.70]],
    status: 'INACTIVE',
    color: '#64748b',
    fillColor: '#64748b',
    label: 'Inactive Zone'
  }
};

const DIVERSION_ROUTES = {
  'Route A': { name: 'Route A (Bypass Corridor)', probability: 87, confidence: 91, time: '+5 min', color: 'green' },
  'Route B': { name: 'Route B (Loop Alpha)', probability: 42, confidence: 65, time: '+12 min', color: 'red' },
  'Route C': { name: 'Route C (Connector Link)', probability: 79, confidence: 81, time: '+7 min', color: 'yellow' }
};

const INCIDENT_TYPES = [
  'Accident',
  'Medical Emergency',
  'Fire',
  'Road Blockage',
  'Crowd Surge',
  'Vehicle Breakdown',
  'Infrastructure Failure',
  'Other'
];

export default function InspectorDashboard() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  
  const getAuthConfig = () => {
    const token = localStorage.getItem("token") ||
                  localStorage.getItem("access_token") ||
                  localStorage.getItem("jwt") ||
                  localStorage.getItem("authToken");
    if (token) {
      console.log("[AUTH TOKEN FOUND]");
      return { headers: { Authorization: `Bearer ${token}` } };
    }
    return {};
  };
  
  // Active operational target zone
  const rawZone = user?.zone && user.zone !== 'Missing' ? user.zone : 'North Zone';
  const [selectedZone, setSelectedZone] = useState(rawZone);
  
  // Dashboard workflow stages: 
  // 0: Incoming Alert & Early Warning
  // 1: Operational Planning & Sandbox
  // 2: Live Operations Control
  // 3: Outcome Calibration & Learning
  const [activeStep, setActiveStep] = useState(0);
  const stepNames = ["Early Warning", "Planning & Sandbox", "Live Operations", "Outcome Calibration"];
  
  // Sub-panel triggers for phase 2
  const [isReplanning, setIsReplanning] = useState(false);
  const [selectedIncidentType, setSelectedIncidentType] = useState('accident');

  // UI responsive states
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [mobileTab, setMobileTab] = useState('map'); // 'map', 'hud'
  const [legendExpanded, setLegendExpanded] = useState(true);
  
  // Smart parking Recommendations
  const [showParkingOverlay, setShowParkingOverlay] = useState(true);
  const [showGenomeOverlay, setShowGenomeOverlay] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Emergency Incident states
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertSeverity, setAlertSeverity] = useState('CRITICAL');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertLocation, setAlertLocation] = useState('');
  const [alertIncidentType, setAlertIncidentType] = useState('Accident');
  const [alertLatitude, setAlertLatitude] = useState('12.9716');
  const [alertLongitude, setAlertLongitude] = useState('77.5946');
  const [alertSubmitting, setAlertSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);



  // Map layers toggle state
  const [layers, setLayers] = useState({
    traffic: true,
    resources: true,
    diversions: true,
    emergency: true,
    ripple: true,
    parking: true,
    genome: true
  });

  // Global zone parameters
  const [zoneStats, setZoneStats] = useState({
    status: 'Optimal',
    health_score: 92,
    active_events_count: 0,
    active_incidents_count: 0,
    predicted_alerts_count: 1,
    available_officers: 35,
    available_barricades: 80,
    response_efficiency: 93.4,
    predicted_delay: 0.0,
    congestion_risk: 'Low',
    affected_roads: 0,
    active_diversions: 0,
    estimated_citizens_affected: 0,
    resource_utilization: 10
  });

  const [forecastReadiness, setForecastReadiness] = useState({
    current_readiness: 92,
    forecast_readiness: 87,
    forecast_window: '1 Hour',
    risk_level: 'Normal'
  });

  const [events, setEvents] = useState([]);
  const [reports, setReports] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Selected road segment details for diversion predictor
  const [selectedSegment, setSelectedSegment] = useState(null);
  
  // Selected junction details for traffic genome layer
  const [selectedJunction, setSelectedJunction] = useState(null);

  // Early Warning Explainability
  const [earlyWarningExplain, setEarlyWarningExplain] = useState({
    risk_score: 91,
    risk_level: 'HIGH RISK',
    breakdown: {
      'Attendance': 35,
      'Historical Similar Events': 18,
      'Weather': 15,
      'Road Capacity': 12,
      'Parking Deficit': 10,
      'Public Transport': 10
    },
    text: "AI Warning: High-density event coinciding with weekend evening commute hours, limited metro shuttle throughput, and 15mm heavy rainfall forecast. High gridlock hazard detected at MG Road corridors."
  });

  // Sandbox simulation variables
  const [sandboxParams, setSandboxParams] = useState({
    attendance: 50000,
    weather: 'Rain',
    closures: 'Partial',
    vipMovement: false,
    accidents: false,
    construction: false,
    emergency: false
  });

  // Sandbox simulation output
  const [simOutput, setSimOutput] = useState({
    delay: 24,
    congestion: 45,
    officers: 85,
    barricades: 30,
    diversionEfficiency: 82,
    parkingReadiness: 85,
    emergencyReadiness: 92,
    confidence: 89
  });

  // Interactive road control state
  const [roads, setRoads] = useState({
    'MG Road Main Segment': { status: 'Normal', color: 'green', flow: 'flow-fast', congestion: 18 },
    'Richmond Flyover Route': { status: 'Normal', color: 'green', flow: 'flow-fast', congestion: 12 },
    'Trinity Circle Junction': { status: 'Normal', color: 'green', flow: 'flow-fast', congestion: 24 },
    'Brigade Road Channel': { status: 'Congested', color: 'yellow', flow: 'flow-slow', congestion: 58 },
    'Old Airport Road Connector': { status: 'Normal', color: 'green', flow: 'flow-fast', congestion: 10 },
    'Queens Road Link': { status: 'Normal', color: 'green', flow: 'flow-fast', congestion: 15 }
  });

  const [rippleEffects, setRippleEffects] = useState([
    { zone: 'West Zone', impact: '+22%', status: 'STANDBY' },
    { zone: 'East Zone', impact: '+11%', status: 'STANDBY' }
  ]);

  const [emergencyETA, setEmergencyETA] = useState({
    ambulance: { eta: '4 min', dist: '1.8 km' },
    towTruck: { eta: '7 min', dist: '3.4 km' },
    trafficTeam: { eta: '3 min', dist: '1.2 km' },
    rescueUnit: { eta: '5 min', dist: '2.3 km' }
  });

  // Active operations compliance tracker
  const [complianceData, setComplianceData] = useState({
    barricades: { planned: 37, deployed: 35, pct: 94 },
    officers: { planned: 94, deployed: 91, pct: 97 },
    towTrucks: { planned: 4, deployed: 4, pct: 100 },
    trafficMarshals: { planned: 28, deployed: 26, pct: 93 },
    overall: 96
  });

  // Timeline & Dispatch Messages
  const [timeline, setTimeline] = useState([
    { time: '12:00 PM', text: 'Barricades Deployed', completed: true },
    { time: '1:00 PM', text: 'Diversion Activated', completed: true },
    { time: '2:00 PM', text: 'Event Started', completed: true },
    { time: '3:00 PM', text: 'Crowd Peak Expected', completed: false, isLive: false },
    { time: '4:00 PM', text: 'Peak Crowd', completed: false, isLive: true },
    { time: '6:00 PM', text: 'Event Exit Phase', completed: false },
    { time: '7:00 PM', text: 'Recovery Operations', completed: false }
  ]);

  const [chatMessages, setChatMessages] = useState([
    { sender: 'ACP Anirudh', time: '12:05', text: 'Zone Officer, please monitor the inbound traffic speed limits.', channel: 'Command' },
    { sender: 'System AI', time: '12:10', text: 'NeuroTwin prediction sets calibrated with historical traffic vault.', channel: 'System' }
  ]);
  const [chatInput, setChatInput] = useState('');

  // Post Event Completion variables
  const [completionData, setCompletionData] = useState({
    actualDelay: 39,
    actualCongestion: 42,
    resourcesUsed: '91 Officers, 35 Barricades, 4 Tow Trucks, 26 Marshals',
    incidents: '1 Minor breakdown resolved at Richmond Road in 8 mins',
    notes: 'Diversion Route A performed optimally. Heavy rain increased peak delay slightly.'
  });

  // Stored comparison errors (from learning engine calculation)
  const [learningFeedback, setLearningFeedback] = useState(null);
  const [calibrationRecord, setCalibrationRecord] = useState(null);

  const fetchCalibrationStatus = async (eventId) => {
    try {
      console.log("[AUTH TOKEN FOUND]");
      const res = await axios.get(`${API_BASE_URL}/events/calibrate/status/${eventId}`, getAuthConfig());
      setCalibrationRecord(res.data);
      if (res.data.status === 'Completed') {
        setLearningFeedback({
          predictionAccuracy: res.data.congestion_accuracy || 90.0,
          resourceAccuracy: res.data.resource_accuracy || 90.0,
          diversionAccuracy: 88,
          successScore: res.data.metrics?.success_score || 90.0,
          report: res.data.report
        });
      } else {
        setLearningFeedback(null);
      }
    } catch (err) {
      console.error("Failed to fetch calibration status:", err);
    }
  };

  useEffect(() => {
    if (selectedEvent) {
      fetchCalibrationStatus(selectedEvent.event_id);
    }
  }, [selectedEvent]);

  // Map Refs
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersGroup = useRef(null);
  const pathGroup = useRef(null);
  const rippleRingsRef = useRef([]);

  const addTimelineMessage = (sender, text, channel = 'System') => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages(prev => [...prev, { sender, time: timeStr, text, channel }]);
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch Zone data & Events
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      console.log("[AUTH TOKEN FOUND]");
      const zoneSummaryRes = await axios.get(`${API_BASE_URL}/inspector/zone-summary?zone=${selectedZone}`, getAuthConfig());
      setZoneStats(zoneSummaryRes.data);
      const forecastRes = await axios.get(`${API_BASE_URL}/zone-readiness-forecast?zone=${selectedZone}`, getAuthConfig());
      setForecastReadiness(forecastRes.data);
      const activeRes = await axios.get(`${API_BASE_URL}/events/active`, getAuthConfig());
      const approvedRes = await axios.get(`${API_BASE_URL}/events/approved`, getAuthConfig());
      const pendingRes = await axios.get(`${API_BASE_URL}/events/pending`, getAuthConfig());
      const reportsRes = await axios.get(`${API_BASE_URL}/reports/all`, getAuthConfig());
      
      const combinedEvents = [...activeRes.data, ...approvedRes.data, ...pendingRes.data];
      const filtered = combinedEvents.filter(e => e.zone.toLowerCase() === selectedZone.toLowerCase());
      setEvents(filtered);
      setReports(reportsRes.data);

      // Parse parameter event_id if present
      const queryEventId = searchParams.get('event_id');
      if (queryEventId) {
        const found = combinedEvents.find(e => e.event_id === queryEventId);
        if (found) {
          setSelectedEvent(found);
          // Set zone to match the query event
          setSelectedZone(found.zone);
          // Check event status
          if (found.status === 'ZONE ACTIVE' || found.status === 'ACTIVE') {
            setActiveStep(2); // Jump directly to Live Ops
          } else {
            setActiveStep(0); // Alert & Activation
          }
          setLoading(false);
          return;
        }
      }

      if (filtered.length > 0) {
        setSelectedEvent(filtered[0]);
        if (filtered[0].status === 'ZONE ACTIVE' || filtered[0].status === 'ACTIVE') {
          setActiveStep(2);
        } else {
          setActiveStep(0);
        }
      } else {
        setSelectedEvent(null);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching dashboard credentials:", error);
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchDashboardData();
  }, [selectedZone, searchParams]);

  useEffect(() => {
    const handleRefresh = () => {
      fetchDashboardData();
    };
    window.addEventListener('refresh-notifications', handleRefresh);
    return () => {
      window.removeEventListener('refresh-notifications', handleRefresh);
    };
  }, [selectedZone, searchParams]);

  const handleTriggerAlert = () => {
    setShowAlertModal(true);
  };

  const handleSubmitEmergencyAlert = async (e) => {
    if (e) e.preventDefault();
    console.log("[EMERGENCY SUBMIT START]");

    if (!alertMessage.trim() || !alertLocation.trim() || !alertLatitude.trim() || !alertLongitude.trim()) {
      alert("Please fill in all fields.");
      console.log("[EMERGENCY API FAILED] Validation failed: missing fields");
      return;
    }

    setAlertSubmitting(true);
    try {
      console.log("[AUTH TOKEN FOUND]");
      const response = await axios.post(`${API_BASE_URL}/emergency/create`, {
        incident_type: alertIncidentType,
        severity: alertSeverity,
        location: alertLocation,
        latitude: parseFloat(alertLatitude) || 12.9716,
        longitude: parseFloat(alertLongitude) || 77.5946,
        description: alertMessage
      }, getAuthConfig());
      console.log("[EMERGENCY API SUCCESS]", response.data);
      setShowAlertModal(false);

      // Reset form
      setAlertMessage('');
      setAlertLocation('');
      setAlertIncidentType('Accident');
      setAlertSeverity('CRITICAL');
      setAlertLatitude('12.9716');
      setAlertLongitude('77.5946');

      setToastMessage("Emergency Alert Sent Successfully");
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.detail || err.message;
      console.log("[EMERGENCY API FAILED]", errMsg);
      alert("Failed to trigger emergency alert: " + errMsg);
    } finally {
      setAlertSubmitting(false);
    }
  };

  // Handle Event Activation
  const handleActivateEvent = async () => {
    if (!selectedEvent) return;
    try {
      setLoading(true);
      console.log("[AUTH TOKEN FOUND]");
      await axios.post(`${API_BASE_URL}/events/update-status`, {
        event_id: selectedEvent.event_id,
        status: 'ZONE ACTIVE',
        comments: `Event activated inside tactical workspace for ${selectedZone}.`
      }, getAuthConfig());
      addTimelineMessage('System AI', `EVENT ACTIVE: ${selectedEvent.event_cause.replace('_', ' ').toUpperCase()} initiated in ${selectedZone}.`);
      
      // Update locally
      setSelectedEvent(prev => ({ ...prev, status: 'ZONE ACTIVE' }));
      setActiveStep(1); // Proceed to planning & sandbox
      setLoading(false);
    } catch (err) {
      console.error("Failed to activate event:", err);
      setLoading(false);
    }
  };

  // Apply revised AI Replanning plan parameters
  const handleApplyUpdatedPlan = () => {
    setComplianceData({
      barricades: { planned: 75, deployed: 75, pct: 100 },
      officers: { planned: 112, deployed: 112, pct: 100 },
      towTrucks: { planned: 6, deployed: 6, pct: 100 },
      trafficMarshals: { planned: 40, deployed: 40, pct: 100 },
      overall: 100
    });
    
    // Add timeline log
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setTimeline(prev => [
      ...prev,
      { time: timeNow, text: 'AI Replanning Plan Applied Successfully', completed: true }
    ]);
    
    // Trigger notification
    addTimelineMessage('System AI', 'Replanning recommendation applied: resources optimized. Compliance at 100%.');
  };

  // Apply Preset Scenario to the What-If Sandbox
  const applyScenarioPreset = (presetName) => {
    let baseAttendance = selectedEvent ? selectedEvent.expected_attendance || 50000 : 50000;
    let newParams = { ...sandboxParams };
    
    switch(presetName) {
      case 'crowd_20':
        newParams.attendance = Math.round(baseAttendance * 1.2);
        newParams.weather = 'Sunny';
        newParams.closures = 'Partial';
        newParams.vipMovement = false;
        newParams.accidents = false;
        newParams.construction = false;
        newParams.emergency = false;
        break;
      case 'crowd_50':
        newParams.attendance = Math.round(baseAttendance * 1.5);
        newParams.weather = 'Rain';
        newParams.closures = 'Partial';
        newParams.vipMovement = false;
        newParams.accidents = false;
        newParams.construction = false;
        newParams.emergency = false;
        break;
      case 'crowd_100':
        newParams.attendance = Math.round(baseAttendance * 2.0);
        newParams.weather = 'Rain';
        newParams.closures = 'Full';
        newParams.vipMovement = false;
        newParams.accidents = true;
        newParams.construction = false;
        newParams.emergency = false;
        break;
      case 'parking_overflow':
        newParams.attendance = Math.round(baseAttendance * 1.3);
        newParams.weather = 'Sunny';
        newParams.closures = 'Partial';
        newParams.vipMovement = false;
        newParams.accidents = false;
        newParams.construction = true;
        newParams.emergency = false;
        break;
      case 'vehicle_surge':
        newParams.attendance = Math.round(baseAttendance * 1.4);
        newParams.weather = 'Rain';
        newParams.closures = 'Partial';
        newParams.vipMovement = true;
        newParams.accidents = false;
        newParams.construction = false;
        newParams.emergency = false;
        break;
      case 'parking_closures':
        newParams.attendance = baseAttendance;
        newParams.weather = 'Storm';
        newParams.closures = 'Multiple Roads';
        newParams.vipMovement = false;
        newParams.accidents = false;
        newParams.construction = true;
        newParams.emergency = true;
        break;
      default:
        break;
    }
    
    setSandboxParams(newParams);
    
    let baseDelay = 20;
    let baseCongestion = 35;
    let confidence = 92;
    
    if (newParams.attendance > 50000) {
      baseDelay += 15;
      baseCongestion += 20;
    } else if (newParams.attendance > 30000) {
      baseDelay += 5;
      baseCongestion += 10;
    }
    
    if (newParams.weather === 'Rain') {
      baseDelay += 8;
      baseCongestion += 10;
      confidence = 84;
    } else if (newParams.weather === 'Storm') {
      baseDelay += 18;
      baseCongestion += 25;
      confidence = 70;
    }
    
    if (newParams.closures === 'Full') {
      baseDelay += 12;
      baseCongestion += 18;
    } else if (newParams.closures === 'Multiple Roads') {
      baseDelay += 20;
      baseCongestion += 30;
    }
    
    if (newParams.vipMovement) baseDelay += 10;
    if (newParams.accidents) baseDelay += 15;
    if (newParams.construction) baseDelay += 5;
    if (newParams.emergency) {
      baseDelay += 25;
      confidence = 65;
    }
    
    let parkingReadiness = Math.max(98 - baseCongestion, 50);
    if (presetName === 'parking_overflow') {
      parkingReadiness = 28;
      baseDelay += 12;
      baseCongestion += 15;
    } else if (presetName === 'parking_closures') {
      parkingReadiness = 15;
      baseDelay += 22;
      baseCongestion += 25;
    }
    
    setSimOutput({
      delay: baseDelay,
      congestion: Math.min(baseCongestion, 100),
      officers: Math.round(baseDelay * 3.5),
      barricades: Math.round(baseCongestion * 0.9),
      diversionEfficiency: Math.max(95 - baseDelay, 35),
      parkingReadiness: parkingReadiness,
      emergencyReadiness: Math.max(90 - baseDelay * 0.5, 30),
      confidence
    });
  };

  // Handle Smart Simulation Sandbox Recalculations
  const handleSandboxChange = (key, val) => {
    const updated = { ...sandboxParams, [key]: val };
    setSandboxParams(updated);
    
    // Simulate complex AI logic based on inputs
    let baseDelay = 20;
    let baseCongestion = 35;
    let confidence = 92;
    
    if (updated.attendance > 50000) {
      baseDelay += 10;
      baseCongestion += 15;
    } else if (updated.attendance < 50000) {
      baseDelay -= 5;
      baseCongestion -= 8;
    }

    if (updated.weather === 'Rain') {
      baseDelay += 8;
      baseCongestion += 10;
      confidence = 84;
    } else if (updated.weather === 'Storm') {
      baseDelay += 15;
      baseCongestion += 20;
      confidence = 72;
    }

    if (updated.closures === 'Full') {
      baseDelay += 12;
      baseCongestion += 18;
    }

    if (updated.vipMovement) baseDelay += 10;
    if (updated.accidents) baseDelay += 15;
    if (updated.construction) baseDelay += 5;
    if (updated.emergency) {
      baseDelay += 20;
      confidence = 68;
    }

    setSimOutput({
      delay: baseDelay,
      congestion: Math.min(baseCongestion, 100),
      officers: Math.round(baseDelay * 3),
      barricades: Math.round(baseCongestion * 0.8),
      diversionEfficiency: Math.max(95 - baseDelay, 40),
      parkingReadiness: Math.max(98 - baseCongestion, 50),
      emergencyReadiness: Math.max(90 - baseDelay * 0.5, 30),
      confidence
    });
  };

  // Mid-event incident replanning logic
  const handleMidEventIncident = (incidentType) => {
    setSelectedIncidentType(incidentType);
    setIsReplanning(true);
    
    // Trigger dispatch log update
    const incidentLabel = incidentType.toUpperCase().replace('_', ' ');
    addTimelineMessage('Emergency Dispatch', `ALERT: Mid-Event ${incidentLabel} reported along corridor. Triggering Incident Recall Engine.`);
    
    // Temporarily inject incident marker on the map (handled in useEffect)
    const center = selectedEvent ? [selectedEvent.latitude, selectedEvent.longitude] : [12.9984, 77.5926];
    const incidentMarker = {
      id: 'live-incident-marker',
      type: incidentType === 'accident' ? 'tow' : 'ambulance',
      lat: center[0] - 0.002,
      lng: center[1] + 0.003
    };
    
    // Simulate updated compliance and ETA metrics
    setComplianceData(prev => ({
      ...prev,
      overall: 88 // dropped because of incident intervention requirement
    }));
  };

  // Outcome Learning Engine submission
  const handleOutcomeCalibration = async (e) => {
    e.preventDefault();
    if (!selectedEvent) return;
    try {
      setLoading(true);
      setCalibrationRecord(prev => ({ ...prev, status: 'Calibrating' }));
      
      console.log("[AUTH TOKEN FOUND]");
      const res = await axios.post(`${API_BASE_URL}/events/calibrate/${selectedEvent.event_id}`, {
        actual_delay: parseFloat(completionData.actualDelay),
        actual_congestion: parseFloat(completionData.actualCongestion),
        resources_deployed: completionData.resourcesUsed,
        spontaneous_incidents: completionData.incidents,
        notes: completionData.notes
      }, getAuthConfig());
      
      const { metrics, report } = res.data;
      
      setCalibrationRecord({
        event_id: selectedEvent.event_id,
        status: 'Completed',
        prediction_error: metrics.prediction_error,
        congestion_accuracy: metrics.congestion_accuracy,
        resource_accuracy: metrics.resource_accuracy,
        metrics: metrics,
        report: report
      });

      setLearningFeedback({
        predictionAccuracy: metrics.congestion_accuracy,
        resourceAccuracy: metrics.resource_accuracy,
        diversionAccuracy: 88,
        successScore: metrics.success_score,
        report: report
      });
      
      addTimelineMessage('AI Calibration Engine', `CITY TRANSPORTATION GENOME CALIBRATED. Match Index: ${metrics.success_score}%`, 'System');
      
      if (Notification.permission === 'granted') {
        new Notification("Calibration Successful", {
          body: `Genome calibrated successfully. Match Index: ${metrics.success_score}%`
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification("Calibration Successful", {
              body: `Genome calibrated successfully. Match Index: ${metrics.success_score}%`
            });
          }
        });
      }
      
      alert(`Calibration Successful! Match Index: ${metrics.success_score}%`);
      await fetchDashboardData();
      setLoading(false);
    } catch (err) {
      console.error("Outcome calibration error:", err);
      alert("Calibration failed. Please verify completion parameters.");
      setCalibrationRecord(prev => ({ ...prev, status: 'Pending' }));
      setLoading(false);
    }
  };

  // Handle chat/log dispatch messaging
  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput) return;
    addTimelineMessage('Inspector Sharma', chatInput, 'Inspector');
    setChatInput('');
  };

  // Leaflet map drawing logic
  useEffect(() => {
    const L = window.L;
    if (!L || !mapRef.current) return;

    const center = selectedEvent 
      ? [selectedEvent.latitude, selectedEvent.longitude] 
      : [12.9984, 77.5926];

    if (!mapInstance.current) {
      const map = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView(center, 13);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapInstance.current = map;
      markersGroup.current = L.featureGroup().addTo(map);
      pathGroup.current = L.featureGroup().addTo(map);
    } else {
      mapInstance.current.setView(center, 13);
    }

    markersGroup.current.clearLayers();
    pathGroup.current.clearLayers();

    // 1. Draw Bangalore Zone Boundaries Polygons
    Object.entries(ZONE_BOUNDARIES).forEach(([zoneName, zoneData]) => {
      const isSelected = selectedZone.toLowerCase() === zoneName.toLowerCase();
      const isActive = isSelected && activeStep > 0;
      
      const poly = L.polygon(zoneData.coords, {
        color: isActive ? '#ff0055' : isSelected ? '#00d2ff' : '#64748b',
        weight: isActive ? 4 : isSelected ? 2.5 : 1,
        opacity: isSelected ? 0.9 : 0.3,
        fillColor: zoneData.fillColor,
        fillOpacity: isActive ? 0.15 : isSelected ? 0.08 : 0.01
      }).addTo(markersGroup.current);
      
      poly.bindTooltip(`${zoneName} [${isActive ? 'ACTIVE' : zoneData.status}]`, {
        sticky: true,
        className: 'bg-[#080c1e]/95 text-slate-100 border border-slate-700 font-mono text-[9px] px-2 py-0.5 rounded shadow-xl'
      });
    });

    // 2. Animated Ripple Rings (Concentric Pulsing influence rings for Cross-Zone alerts)
    if (layers.ripple && activeStep > 0) {
      const circleOptions = {
        color: '#ff7700',
        fillColor: 'transparent',
        weight: 1.5,
        opacity: 0.6,
        dashArray: '4, 4'
      };

      // Draw expanding rings
      const ring1 = L.circle(center, { ...circleOptions, radius: 800 }).addTo(pathGroup.current);
      const ring2 = L.circle(center, { ...circleOptions, radius: 1500 }).addTo(pathGroup.current);
      const ring3 = L.circle(center, { ...circleOptions, radius: 2200 }).addTo(pathGroup.current);
      
      ring1.bindTooltip("Ripple Ring: 1km Radius (+22% West Zone impact)", { className: 'bg-[#080c1e] text-orange-400 font-mono text-[8px]' });
      ring2.bindTooltip("Ripple Ring: 2km Radius (+11% East Zone impact)", { className: 'bg-[#080c1e] text-orange-450 font-mono text-[8px]' });
    }

    // 3. Interactive Road Network segments (Diversion Predictor)
    if (layers.traffic) {
      const eventLat = center[0];
      const eventLng = center[1];
      
      const roadGeometries = {
        'MG Road Main Segment': [[eventLat, eventLng], [eventLat + 0.005, eventLng + 0.006]],
        'Richmond Flyover Route': [[eventLat, eventLng], [eventLat - 0.006, eventLng + 0.005]],
        'Trinity Circle Junction': [[eventLat - 0.006, eventLng + 0.005], [eventLat - 0.01, eventLng + 0.01]],
        'Brigade Road Channel': [[eventLat, eventLng], [eventLat + 0.007, eventLng - 0.008]],
        'Old Airport Road Connector': [[eventLat + 0.007, eventLng - 0.008], [eventLat + 0.012, eventLng - 0.01]],
        'Queens Road Link': [[eventLat, eventLng], [eventLat - 0.008, eventLng - 0.008]]
      };

      Object.entries(roadGeometries).forEach(([roadName, coords]) => {
        const roadData = roads[roadName] || { color: 'green', status: 'Normal', flow: 'flow-fast' };
        const colorMap = { green: '#00ff66', yellow: '#ffcc00', blue: '#00d2ff', red: '#ff0055' };
        
        const isSegmentSelected = selectedSegment === roadName;
        
        const poly = L.polyline(coords, {
          color: isSegmentSelected ? '#00f0ff' : (colorMap[roadData.color] || '#00ff66'),
          weight: isSegmentSelected ? 8 : 5,
          opacity: 0.85,
          className: `leaflet-animated-polyline ${roadData.flow}`
        }).addTo(pathGroup.current);

        poly.bindTooltip(`${roadName} - Click to run diversion predictions`, { direction: 'top', className: 'bg-[#080c1e] text-slate-355 border border-slate-700 font-mono text-[9px]' });

        poly.on('click', () => {
          setSelectedSegment(roadName);
          // Auto switch tab to HUD if on mobile
          if (isMobile) setMobileTab('hud');
        });
      });
    }

    // 4. Traffic Genome Network Layers (Connected DNA Network showing relationship)
    if (layers.genome && showGenomeOverlay) {
      const eventLat = center[0];
      const eventLng = center[1];
      
      const DNA_NODES = [
        { name: 'MG Road Junction', lat: eventLat + 0.003, lng: eventLng - 0.003, recurring: 'Political Rally', delay: 42, failure: 'Signal Deficit' },
        { name: 'Richmond Circle Node', lat: eventLat - 0.004, lng: eventLng + 0.004, recurring: 'VIP Movement', delay: 35, failure: 'Heavy Merging' },
        { name: 'Trinity Crossover Node', lat: eventLat + 0.005, lng: eventLng + 0.006, recurring: 'Commercial Peak', delay: 48, failure: 'Bottleneck Corridor' },
        { name: 'Brigade Cordon Node', lat: eventLat - 0.005, lng: eventLng - 0.004, recurring: 'Weekend Influx', delay: 30, failure: 'Overflow Parking' }
      ];

      // Draw glowing lines connecting nodes (representing DNA relationships)
      for (let i = 0; i < DNA_NODES.length; i++) {
        for (let j = i + 1; j < DNA_NODES.length; j++) {
          L.polyline([
            [DNA_NODES[i].lat, DNA_NODES[i].lng],
            [DNA_NODES[j].lat, DNA_NODES[j].lng]
          ], {
            color: '#00d2ff',
            weight: 1,
            opacity: 0.25,
            dashArray: '3, 6'
          }).addTo(pathGroup.current);
        }
      }

      // Draw nodes
      DNA_NODES.forEach((node) => {
        const marker = L.circleMarker([node.lat, node.lng], {
          radius: 8,
          fillColor: '#00d2ff',
          fillOpacity: 0.8,
          color: '#ffffff',
          weight: 1.5,
          className: 'animate-pulse'
        }).addTo(markersGroup.current);

        marker.bindTooltip(`🧬 JUNCTION DNA: ${node.name}<br/>Delay: ${node.delay}m | Pattern: ${node.failure}`, {
          className: 'bg-[#080c1e] text-white border border-[#00d2ff]/40 font-mono text-[9px] p-2 rounded shadow-2xl'
        });

        marker.on('click', () => {
          setSelectedJunction(node);
          if (isMobile) setMobileTab('hud');
        });
      });
    }

    // 5. Smart Parking Strategies Overlay
    if (layers.parking && showParkingOverlay && activeStep > 0) {
      const eventLat = center[0];
      const eventLng = center[1];
      
      const parkingSites = [
        { type: 'temporary', coords: [eventLat + 0.006, eventLng - 0.002], label: 'Temp Parking (Ground Alpha)', cap: '300 Cars' },
        { type: 'overflow', coords: [eventLat - 0.008, eventLng + 0.008], label: 'Overflow Parking (Bypass Ground)', cap: '600 Cars' },
        { type: 'dropgo', coords: [eventLat + 0.002, eventLng + 0.003], label: 'Drop-and-Go Corridor (Main Gate)', cap: 'Strictly 2 Mins' },
        { type: 'metro', coords: [eventLat - 0.003, eventLng - 0.004], label: 'Metro Park & Ride Link (Metro Hub)', cap: 'Transit Shuttle' }
      ];

      parkingSites.forEach((site) => {
        const colorMap = {
          temporary: '#22c55e',
          overflow: '#eab308',
          dropgo: '#3b82f6',
          metro: '#a855f7'
        };

        const emojiMap = {
          temporary: '🅿️',
          overflow: '📂',
          dropgo: '🚖',
          metro: '🚇'
        };

        const col = colorMap[site.type];
        const em = emojiMap[site.type];

        const customIcon = L.divIcon({
          html: `<div class="w-6 h-6 rounded bg-[#030611] border border-[${col}] flex items-center justify-center text-[10px] shadow-[0_0_8px_${col}] cursor-pointer">${em}</div>`,
          className: 'custom-div-icon',
          iconSize: [24, 24]
        });

        L.marker(site.coords, { icon: customIcon })
          .addTo(markersGroup.current)
          .bindTooltip(`<b>${site.label}</b><br/>Capacity: ${site.cap}`, {
            className: 'bg-[#080c1e] text-slate-100 border border-slate-700 font-mono text-[9px] p-1.5 rounded'
          });
      });
    }

    // 6. Live Active Incident Marker (Tows, ambulances) during Replanning
    if (activeStep === 2 && isReplanning) {
      const eventLat = center[0];
      const eventLng = center[1];
      
      const emergencyIcons = [
        { type: 'ambulance', lat: eventLat - 0.002, lng: eventLng + 0.003, label: 'Nearest Ambulance (Active)', emoji: '🚑', col: '#ff0055' },
        { type: 'tow', lat: eventLat + 0.004, lng: eventLng - 0.003, label: 'Heavy Tow Truck staged', emoji: '🚜', col: '#ffcc00' }
      ];

      emergencyIcons.forEach((emerg) => {
        const customIcon = L.divIcon({
          html: `<div class="w-7 h-7 rounded-full bg-[#030611] border-2 border-[${emerg.col}] flex items-center justify-center text-xs shadow-[0_0_12px_${emerg.col}] cursor-pointer animate-pulse">${emerg.emoji}</div>`,
          className: 'custom-div-icon',
          iconSize: [28, 28]
        });

        L.marker([emerg.lat, emerg.lng], { icon: customIcon })
          .addTo(markersGroup.current)
          .bindTooltip(`🚨 ${emerg.label}`, {
            direction: 'top',
            className: 'bg-[#0a0f26] text-white border border-[#ff0055]/30 font-mono text-[9px] p-1.5'
          });
      });
    }
  }, [roads, selectedEvent, layers, selectedZone, showGenomeOverlay, showParkingOverlay, activeStep, isReplanning, selectedSegment]);

  // Clean up map on unmount
  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Top Navigation Title Header */}
      <div className="flex justify-between items-center border-b border-cyber-border/40 pb-2 select-none font-mono text-xs">
        <div className="flex gap-2">
          <span className="px-4 py-2 border border-[#00d2ff] bg-[#00d2ff]/10 text-white rounded-lg font-bold font-orbitron tracking-wider shadow-[0_0_10px_rgba(0,210,255,0.25)]">
            MAP HUD OPERATIONS
          </span>
        </div>
        
        {/* Trigger Emergency Alert Button */}
        <button
          onClick={handleTriggerAlert}
          className="py-1.5 px-4 bg-cyber-red/10 border border-cyber-red/30 text-cyber-red hover:bg-cyber-red hover:text-white font-bold font-orbitron rounded transition-all cursor-pointer flex items-center justify-center gap-1.5 text-[10px] shadow-lg hover:scale-105 active:scale-95"
        >
          <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
          TRIGGER EMERGENCY ALERT
        </button>
      </div>
        <div className="relative w-full h-[calc(100vh-180px)] flex overflow-hidden bg-[#02050e] text-slate-100 font-sans select-none rounded-xl border border-cyber-border/40">
      
      {/* LEFT COLUMN: Map Viewport (60%) */}
      <div className={`relative flex flex-col h-full bg-black border-r border-cyber-border/40 ${isMobile ? 'w-full' : 'w-[60%]'}`}>
        <div 
          ref={mapRef} 
          className="w-full h-full z-0" 
        />

        {/* Floating Controls HUD inside Map */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-auto">
          <div className="bg-[#030611]/85 backdrop-blur-md border border-[#00d2ff]/30 p-3 rounded-lg flex flex-col gap-1.5 text-[10px] font-mono shadow-2xl">
            <div className="text-white font-bold tracking-wider text-xs border-b border-[#00d2ff]/20 pb-1.5 uppercase mb-1 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00d2ff] animate-pulse"></span>
              Operations Map Layers
            </div>
            
            <label className="flex items-center gap-2 cursor-pointer text-slate-350 hover:text-white">
              <input 
                type="checkbox" 
                checked={layers.traffic} 
                onChange={() => setLayers(prev => ({ ...prev, traffic: !prev.traffic }))} 
                className="rounded bg-[#02050e] border-[#00d2ff]/30 text-[#00d2ff] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
              />
              Live Corridor Speeds
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-355 hover:text-white">
              <input 
                type="checkbox" 
                checked={layers.ripple} 
                onChange={() => setLayers(prev => ({ ...prev, ripple: !prev.ripple }))} 
                className="rounded bg-[#02050e] border-[#00d2ff]/30 text-[#00d2ff] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
              />
              Cross-Zone Ripple Rings
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-350 hover:text-white">
              <input 
                type="checkbox" 
                checked={showParkingOverlay} 
                onChange={() => setShowParkingOverlay(!showParkingOverlay)} 
                className="rounded bg-[#02050e] border-[#00d2ff]/30 text-[#00d2ff] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
              />
              Smart Parking Hubs
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-350 hover:text-white">
              <input 
                type="checkbox" 
                checked={showGenomeOverlay} 
                onChange={() => setShowGenomeOverlay(!showGenomeOverlay)} 
                className="rounded bg-[#02050e] border-[#00d2ff]/30 text-[#00d2ff] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
              />
              Traffic DNA Network
            </label>
          </div>
        </div>

        {/* Collapsible Futuristic Map Operations Legend */}
        <div 
          className="absolute bottom-4 left-4 z-20 bg-[#080c1e]/95 backdrop-blur border border-cyber-border/80 p-3.5 rounded-xl flex flex-col gap-2 font-mono text-[9px] text-slate-350 shadow-[0_0_20px_rgba(0,210,255,0.15)] min-w-[200px] select-none pointer-events-auto transition-all duration-300"
        >
          <div className="flex justify-between items-center border-b border-cyber-border/30 pb-1.5 mb-1 cursor-pointer" onClick={() => setLegendExpanded(!legendExpanded)}>
            <span className="font-bold text-white uppercase tracking-wider font-orbitron">Map Operations Legend</span>
            <span className="text-[10px] text-cyber-accent font-bold font-orbitron">{legendExpanded ? '[-]' : '[+]'}</span>
          </div>
          
          {legendExpanded && (
            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
              {/* Markers */}
              <div className="space-y-1">
                <span className="text-[8px] text-slate-500 font-bold uppercase block tracking-widest font-orbitron">Incident Markers</span>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] animate-pulse shadow-[0_0_8px_#ef4444]"></span>
                  <span>Active Incident (Cordon)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#eab308] shadow-[0_0_5px_#eab308]"></span>
                  <span>Pending Inspector Review</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] shadow-[0_0_5px_#22c55e]"></span>
                  <span>Approved Standby</span>
                </div>
              </div>

              {/* Layers & Resources */}
              <div className="space-y-1 border-t border-cyber-border/25 pt-2">
                <span className="text-[8px] text-slate-500 font-bold uppercase block tracking-widest font-orbitron">Resources & Layers</span>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-1 bg-[#ff0055] rounded inline-block"></span>
                  <span>Active Cordon Line</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-1 bg-[#ffcc00] rounded inline-block"></span>
                  <span>Standby Area Corridor</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-1 bg-[#00ff66] rounded inline-block"></span>
                  <span>Normal Traffic Corridor</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-1 bg-[#00d2ff] rounded inline-block"></span>
                  <span>Suggested Diversion Loop</span>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-1 border-t border-cyber-border/25 pt-2">
                <span className="text-[8px] text-slate-500 font-bold uppercase block tracking-widest font-orbitron">Special Features</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px]">🧬</span>
                  <span>Traffic DNA Network Junction</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px]">🅿️</span>
                  <span>Smart Parking Hub Overlay</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Active operations floating trigger widgets */}
        {activeStep === 2 && (
          <div className="absolute top-4 right-4 z-10 flex gap-2 pointer-events-auto">

            <button 
              onClick={() => handleMidEventIncident('accident')}
              className={`px-3 py-1.5 bg-[#ff0055] hover:bg-[#ff1e6d] text-white font-orbitron font-bold text-[9px] tracking-wider rounded border border-[#ff0055]/30 flex items-center gap-1.5 shadow-lg transition-all cursor-pointer`}
            >
              <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
              MID-EVENT REPLANNING
            </button>
            <button 
              onClick={() => setActiveStep(3)}
              className="px-3 py-1.5 bg-[#00ff66] hover:bg-[#12ff7b] text-slate-950 font-orbitron font-black text-[9px] tracking-wider rounded border border-[#00ff66]/30 flex items-center gap-1 shadow-lg transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              MARK COMPLETED
            </button>
          </div>
        )}

        {/* Mobile Tab Stepper Switch */}
        {isMobile && (
          <button 
            onClick={() => setMobileTab(mobileTab === 'map' ? 'hud' : 'map')}
            className="absolute bottom-4 right-4 z-20 px-4 py-2 bg-[#00d2ff] text-black font-orbitron font-black text-[10px] rounded-lg shadow-2xl tracking-wider"
          >
            {mobileTab === 'map' ? '📊 OPEN HUD' : '🗺️ VIEW MAP'}
          </button>
        )}
      </div>

      {/* RIGHT COLUMN: Operational HUD Control Sidebar (40%) */}
      <div className={`flex flex-col h-full bg-[#030611]/90 backdrop-blur-md overflow-y-auto select-none pointer-events-auto border-l border-cyber-border/40 scrollbar-thin ${isMobile && mobileTab === 'map' ? 'hidden' : isMobile ? 'w-full' : 'w-[40%]'}`}>
        
        {/* Unified Journey Timeline Stepper */}
        <div className="border-b border-cyber-border/80 px-4 py-3 bg-[#0a0f26]/60 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[7.5px] font-mono text-slate-500 uppercase tracking-widest">TACTICAL DECISION STEPPER</span>
            <span className="text-[9.5px] font-mono text-[#00d2ff] font-bold">Phase {activeStep + 1} of 4</span>
          </div>
          <div className="flex gap-1.5">
            {stepNames.map((name, i) => (
              <div 
                key={name}
                onClick={() => {
                  if (selectedEvent || i === 0) {
                    setActiveStep(i);
                    setIsReplanning(false);
                  }
                }}
                className={`h-1.5 flex-1 rounded-full cursor-pointer transition-all ${
                  i === activeStep 
                    ? 'bg-[#00d2ff] shadow-[0_0_8px_rgba(0,210,255,0.8)]' 
                    : i < activeStep 
                    ? 'bg-[#00ff66]/70' 
                    : 'bg-slate-800'
                }`}
                title={name}
              />
            ))}
          </div>
          <div className="text-[10px] font-bold font-orbitron text-slate-200 mt-2 uppercase tracking-wide flex justify-between items-center">
            <span>{stepNames[activeStep]} Phase</span>
            {selectedEvent && (
              <span className="text-[#00ff66] text-[8px] font-mono px-1.5 py-0.5 rounded border border-[#00ff66]/20 bg-[#00ff66]/5">
                Target: {selectedEvent.event_id}
              </span>
            )}
          </div>
        </div>

        {/* HUD Subpanels based on activeStep */}
        <div className="p-4 flex-1 space-y-4">
          
          {/* PHASE 0: ALERT & ACTIVATION */}
          {activeStep === 0 && (
            <div className="space-y-4">
              
              {/* Early Warning Explainer */}
              <div className="p-3.5 bg-[#050b18]/80 border border-[#ff0055]/30 rounded-lg text-slate-100 relative overflow-hidden flex flex-col gap-3 shadow-xl">
                <div className="flex justify-between items-center border-b border-[#ff0055]/20 pb-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-[#ff0055] animate-pulse" />
                    <div>
                      <div className="font-bold text-white text-[11px] font-orbitron uppercase">CONGESTION EARLY WARNING</div>
                      <div className="text-[7.5px] font-mono text-slate-500">GENERATED 48 HOURS PRIOR</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[14px] font-bold font-orbitron text-[#ff0055] glow-text-critical">{earlyWarningExplain.risk_score}/100</div>
                    <span className="text-[7.5px] px-1 rounded bg-[#ff0055]/10 border border-[#ff0055]/30 text-[#ff0055] font-bold font-mono">HIGH RISK</span>
                  </div>
                </div>
                
                {/* Explainability factors breakdown */}
                <div className="space-y-2 font-mono text-[9px]">
                  <span className="text-[8px] text-slate-500 uppercase tracking-widest font-bold block">Explainability Breakdown:</span>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {Object.entries(earlyWarningExplain.breakdown).map(([factor, pct]) => (
                      <div key={factor} className="space-y-0.5">
                        <div className="flex justify-between text-[8px] text-slate-400">
                          <span>{factor}</span>
                          <span className="font-bold text-white">{pct}%</span>
                        </div>
                        <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden border border-slate-800">
                          <div className="bg-[#ff0055] h-full" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-2.5 p-2 bg-[#ff0055]/5 border border-[#ff0055]/15 rounded text-[8.5px] leading-relaxed text-slate-350 italic">
                    "{earlyWarningExplain.text}"
                  </div>
                </div>
              </div>

              {/* Incoming Event Info Feed */}
              <CommandCard title="Jurisdiction Operations Hub">
                <div className="space-y-3 font-mono text-[9.5px]">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Target Operational Zone:</span>
                    <strong className="text-white text-xs">{selectedZone}</strong>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[9px] font-mono text-slate-450 mt-1">
                    {Object.keys(ZONE_BOUNDARIES).map((zName) => {
                      const isSelected = selectedZone === zName;
                      return (
                        <button 
                          key={zName}
                          onClick={() => setSelectedZone(zName)}
                          className={`p-2 rounded border text-left cursor-pointer transition-all ${
                            isSelected 
                              ? 'bg-[#00d2ff]/10 border-[#00d2ff] text-white shadow-md' 
                              : 'bg-[#050b18] border-slate-900 hover:border-slate-800 text-slate-455'
                          }`}
                        >
                          <div className="font-bold">{zName}</div>
                          <span className="text-[7.5px] text-slate-500">Status: {ZONE_BOUNDARIES[zName].status}</span>
                        </button>
                      );
                    })}
                  </div>

                  {selectedEvent ? (
                    selectedEvent.status === 'SUBMITTED_TO_TC' ? (
                      <div className="border-t border-slate-900 pt-3 mt-3 space-y-3">
                        <div className="font-bold text-[#00d2ff] uppercase text-[10px] tracking-wider">Submitted Event waiting for TC Review:</div>
                        
                        <div className="bg-[#050b18]/80 border border-cyber-border/80 p-3 rounded-lg space-y-3 font-mono text-[9px] text-slate-355 select-text text-left">
                          <div className="flex justify-between items-start border-b border-cyber-border/40 pb-2 select-none">
                            <div>
                              <span className="text-slate-500 block text-[7px] uppercase font-bold">EVENT ID</span>
                              <strong className="text-white text-[11px] font-orbitron">{selectedEvent.event_id}</strong>
                            </div>
                            <StatusBadge status={selectedEvent.status} />
                          </div>

                          <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-b border-cyber-border/40 pb-2">
                            <div>
                              <span className="text-slate-555 block text-[7px] uppercase font-bold">EVENT CAUSE</span>
                              <span className="text-white font-bold capitalize">{selectedEvent.event_cause.replace('_', ' ')}</span>
                            </div>
                            <div>
                              <span className="text-slate-555 block text-[7px] uppercase font-bold">PRIORITY</span>
                              <span className="text-cyber-yellow font-bold uppercase">{selectedEvent.priority}</span>
                            </div>
                            <div>
                              <span className="text-slate-555 block text-[7px] uppercase font-bold">ZONE</span>
                              <span className="text-white capitalize">{selectedEvent.zone}</span>
                            </div>
                            <div>
                              <span className="text-slate-555 block text-[7px] uppercase font-bold">CORRIDOR / ROUTE</span>
                              <span className="text-white">{selectedEvent.corridor}</span>
                            </div>
                            <div>
                              <span className="text-slate-555 block text-[7px] uppercase font-bold">EXPECTED ATTENDANCE</span>
                              <span className="text-cyber-accent font-bold">{selectedEvent.expected_attendance?.toLocaleString() || "5,000"} Pax</span>
                            </div>
                            <div>
                              <span className="text-slate-555 block text-[7px] uppercase font-bold">DURATION</span>
                              <span className="text-white">{selectedEvent.duration_minutes || "240"} Mins</span>
                            </div>
                          </div>

                          {/* NeuroTwin Recommendations */}
                          <div className="space-y-1.5 border-b border-cyber-border/40 pb-2">
                            <span className="text-slate-555 block text-[7.5px] uppercase font-bold font-orbitron text-[#00d2ff] select-none">NEUROTWIN RECOMMENDATIONS</span>
                            <div className="grid grid-cols-2 gap-1.5 text-white">
                              <div className="bg-[#030611]/80 p-1.5 border border-cyber-border/30 rounded">
                                <span className="text-slate-505 block text-[6.5px] uppercase">Strategy Scenario</span>
                                <span className="font-bold">{selectedEvent.approved_scenario || "Balanced Plan"}</span>
                              </div>
                              <div className="bg-[#030611]/80 p-1.5 border border-cyber-border/30 rounded">
                                <span className="text-slate-505 block text-[6.5px] uppercase">Response Level</span>
                                <span className="text-cyber-green font-bold">{selectedEvent.final_response_level || "ELEVATED"}</span>
                              </div>
                              <div className="bg-[#030611]/80 p-1.5 border border-cyber-border/30 rounded col-span-2">
                                <span className="text-slate-550 block text-[6.5px] uppercase font-bold">Recommended Resources:</span>
                                <div className="grid grid-cols-3 gap-1 text-[8.5px] font-bold text-cyber-accent mt-0.5">
                                  <span>👮 {selectedEvent.final_officers || selectedEvent.ai_officers || 50} Officers</span>
                                  <span>🚧 {selectedEvent.final_barricades || selectedEvent.ai_barricades || 25} Barricades</span>
                                  <span>🚜 {selectedEvent.final_tow_vehicles || selectedEvent.ai_tow_vehicles || 4} Tows</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Generated PDF Download */}
                          <div className="flex flex-col gap-2 pt-1 select-none">
                            <span className="text-slate-555 block text-[7.5px] uppercase font-bold font-orbitron text-[#00d2ff]">ATTACHED ARTIFACTS</span>
                            <button
                              onClick={async () => {
                                try {
                                  console.log("[AUTH TOKEN FOUND]");
                                  const res = await axios.get(`${API_BASE_URL}/events/${selectedEvent.event_id}`, getAuthConfig());
                                  await downloadEventReportPDF(res.data);
                                } catch (err) {
                                  console.error("PDF generation error:", err);
                                  alert("Failed to generate and download report PDF.");
                                }
                              }}
                              className="w-full py-2 bg-cyber-accent hover:bg-[#00f0ff] text-slate-950 font-orbitron font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer text-[9px] border-none"
                            >
                              <Download className="w-3.5 h-3.5" /> DOWNLOAD GENERATED PDF REPORT
                            </button>
                          </div>

                          {/* Reports Section inside HUD */}
                          <div className="space-y-1.5 border-t border-cyber-border/40 pt-2.5 mt-2.5">
                            <span className="text-slate-555 block text-[7.5px] uppercase font-bold font-orbitron text-[#00d2ff] select-none">REPORTS REGISTRY</span>
                            <div className="space-y-1 max-h-[120px] overflow-y-auto">
                              {reports.filter(r => r.event_id === selectedEvent.event_id).map((r) => (
                                <div key={r.id} className="flex justify-between items-center bg-[#030611]/85 p-1.5 border border-cyber-border/30 rounded text-[7.5px]">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-white font-bold">{r.id}</span>
                                    <span className="text-slate-500">{new Date(r.timestamp || r.submitted_at).toLocaleString()}</span>
                                  </div>
                                  <span className="px-1 py-0.5 rounded bg-cyber-yellow/10 border border-cyber-yellow/20 text-cyber-yellow font-bold uppercase scale-90">{r.status || r.report_status}</span>
                                </div>
                              ))}
                              {reports.filter(r => r.event_id === selectedEvent.event_id).length === 0 && (
                                <div className="text-center text-slate-655 italic py-1 text-[7.5px]">No reports generated yet.</div>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Since it is PENDING TC REVIEW, we can let TC inspect it or start vetting HUD */}
                        <button
                          onClick={() => window.dispatchEvent(new CustomEvent('open-event-details', { detail: { event: selectedEvent } }))}
                          className="w-full py-2.5 bg-[#00ff66]/10 border border-[#00ff66]/30 hover:bg-[#00ff66] hover:text-slate-950 text-[#00ff66] font-orbitron font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                        >
                          <Sliders className="w-4 h-4" /> LAUNCH TC VETTING MODAL
                        </button>
                      </div>
                    ) : (
                      <div className="border-t border-slate-900 pt-3 mt-3 space-y-4 text-left">
                        <div className="font-bold text-[#00d2ff] uppercase text-[10px] tracking-wider mb-1 font-orbitron">
                          Approved Event Activation Workspace:
                        </div>
                        
                        {/* Commissioner Approval Status */}
                        <div className="p-3 bg-cyber-green/5 border border-cyber-green/30 rounded-lg flex items-center justify-between shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-cyber-green/10 border border-cyber-green flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 text-cyber-green" />
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-white font-orbitron uppercase">COMMISSIONER APPROVAL STATUS</div>
                              <div className="text-[7.5px] text-slate-500 font-mono">
                                APPROVED {selectedEvent.approved_at ? `AT ${new Date(selectedEvent.approved_at).toLocaleString()}` : ''}
                              </div>
                            </div>
                          </div>
                          <span className="text-[8px] bg-cyber-green/15 border border-cyber-green/45 text-cyber-green px-1.5 py-0.5 rounded font-bold font-mono">
                            STATUS: APPROVED
                          </span>
                        </div>

                        {/* Full Approved Event Report */}
                        <div className="bg-[#050b18]/90 border border-cyber-border/80 p-3.5 rounded-lg space-y-3 font-mono text-[9px] text-slate-350 select-text max-h-[300px] overflow-y-auto scrollbar-thin">
                          <div className="flex justify-between items-start border-b border-cyber-border/40 pb-2">
                            <div>
                              <span className="text-slate-550 block text-[7px] uppercase font-bold">EVENT REPORT</span>
                              <strong className="text-white text-[11px] font-orbitron capitalize">{selectedEvent.event_cause.replace('_', ' ')}</strong>
                            </div>
                            <span className="text-[7.5px] px-1.5 py-0.5 bg-red-950/30 border border-red-500/30 text-cyber-red font-bold rounded uppercase">
                              {selectedEvent.priority} PRIORITY
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-b border-cyber-border/40 pb-2">
                            <div>
                              <span className="text-slate-550 block text-[7px] uppercase font-bold">EVENT ID</span>
                              <span className="text-white font-bold">{selectedEvent.event_id}</span>
                            </div>
                            <div>
                              <span className="text-slate-550 block text-[7px] uppercase font-bold">EVENT TYPE</span>
                              <span className="text-white font-bold capitalize">{selectedEvent.event_type}</span>
                            </div>
                            <div>
                              <span className="text-slate-550 block text-[7px] uppercase font-bold">ZONE</span>
                              <span className="text-white font-bold capitalize">{selectedEvent.zone}</span>
                            </div>
                            <div>
                              <span className="text-slate-550 block text-[7px] uppercase font-bold">CORRIDOR / ROUTE</span>
                              <span className="text-white font-bold">{selectedEvent.corridor}</span>
                            </div>
                            <div>
                              <span className="text-slate-555 block text-[7px] uppercase font-bold">EXPECTED ATTENDANCE</span>
                              <span className="text-cyber-accent font-bold">
                                {selectedEvent.expected_attendance?.toLocaleString() || "50,000"} Pax
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-555 block text-[7px] uppercase font-bold">DATE & TIME</span>
                              <span className="text-white font-bold">
                                {selectedEvent.event_date || 'N/A'} ({selectedEvent.start_time || ''} - {selectedEvent.end_time || ''})
                              </span>
                            </div>
                          </div>

                          {/* NeuroTwin Analysis */}
                          <div className="space-y-1.5 border-b border-cyber-border/40 pb-2">
                            <span className="text-[#00d2ff] block text-[7.5px] uppercase font-bold font-orbitron">NEUROTWIN DIGITAL ANALYSIS</span>
                            <div className="grid grid-cols-2 gap-2 text-slate-300">
                              <div className="bg-[#030611]/80 p-2 border border-cyber-border/30 rounded">
                                <span className="text-slate-500 block text-[6.5px] uppercase font-bold">CONGESTION IMPACT</span>
                                <span className="font-bold text-cyber-yellow">{selectedEvent.impact_score || 0}/100</span>
                              </div>
                              <div className="bg-[#030611]/80 p-2 border border-cyber-border/30 rounded">
                                <span className="text-slate-500 block text-[6.5px] uppercase font-bold">CONFIDENCE RATE</span>
                                <span className="font-bold text-cyber-green">{selectedEvent.confidence_score ? Math.round(selectedEvent.confidence_score * 100) : 89}%</span>
                              </div>
                              <div className="bg-[#030611]/80 p-2 border border-cyber-border/30 rounded">
                                <span className="text-slate-500 block text-[6.5px] uppercase font-bold">AI RECOMMENDED SCENARIO</span>
                                <span className="font-bold text-white capitalize">{selectedEvent.ai_response_level || "Balanced Strategy"}</span>
                              </div>
                              <div className="bg-[#030611]/80 p-2 border border-cyber-border/30 rounded">
                                <span className="text-slate-500 block text-[6.5px] uppercase font-bold">SELECTED SCENARIO</span>
                                <span className="font-bold text-cyber-accent capitalize">{selectedEvent.approved_scenario || "Balanced Plan"}</span>
                              </div>
                            </div>
                            {selectedEvent.ai_recommendation_summary && (
                              <div className="mt-1 p-2 bg-cyber-accent/5 border border-cyber-accent/15 rounded text-[8px] leading-relaxed text-slate-350 italic">
                                "AI Summary: {selectedEvent.ai_recommendation_summary}"
                              </div>
                            )}
                          </div>

                          {/* Resource Plan */}
                          <div className="space-y-1.5 border-b border-cyber-border/40 pb-2">
                            <span className="text-[#00d2ff] block text-[7.5px] uppercase font-bold font-orbitron">APPROVED RESOURCE PLAN</span>
                            <div className="grid grid-cols-4 gap-1.5 text-center text-white text-[9px] font-bold">
                              <div className="bg-[#030611]/80 p-1 border border-cyber-border/30 rounded">
                                <span className="text-slate-500 block text-[6px]">OFFICERS</span>
                                <span className="text-white">👮 {selectedEvent.final_officers || selectedEvent.ai_officers || 94}</span>
                              </div>
                              <div className="bg-[#030611]/80 p-1 border border-cyber-border/30 rounded">
                                <span className="text-slate-500 block text-[6px]">BARRICADES</span>
                                <span className="text-white">🚧 {selectedEvent.final_barricades || selectedEvent.ai_barricades || 37}</span>
                              </div>
                              <div className="bg-[#030611]/80 p-1 border border-cyber-border/30 rounded">
                                <span className="text-slate-500 block text-[6px]">MARSHALS</span>
                                <span className="text-white">🦺 {selectedEvent.final_traffic_personnel || 28}</span>
                              </div>
                              <div className="bg-[#030611]/80 p-1 border border-cyber-border/30 rounded">
                                <span className="text-slate-500 block text-[6px]">TOWS</span>
                                <span className="text-white">🚜 {selectedEvent.final_tow_vehicles || selectedEvent.ai_tow_vehicles || 4}</span>
                              </div>
                            </div>
                          </div>

                          {/* Diversion Plan */}
                          <div className="space-y-1 border-b border-cyber-border/40 pb-2">
                            <span className="text-[#00d2ff] block text-[7.5px] uppercase font-bold font-orbitron">DIVERSION PLAN</span>
                            <div className="text-[8.5px] leading-relaxed text-slate-300">
                              <div><span className="text-slate-500">Road Closures:</span> <span className="text-cyber-yellow font-bold">{selectedEvent.requires_road_closure ? 'YES' : 'NO'}</span></div>
                              <div><span className="text-slate-500">Diversion Strategy:</span> {selectedEvent.traffic_diversions_used || 'Standard rerouting active: Detours established along outer corridor lanes.'}</div>
                            </div>
                          </div>

                          {/* Parking Plan */}
                          <div className="space-y-1 border-b border-cyber-border/40 pb-2">
                            <span className="text-[#00d2ff] block text-[7.5px] uppercase font-bold font-orbitron">PARKING PLAN</span>
                            <p className="text-[8.5px] leading-relaxed text-slate-300">
                              {selectedEvent.special_conditions || 'Default parking restriction: Main corridor shoulders closed for emergency response standby; designated event public parking active.'}
                            </p>
                          </div>

                          {/* Emergency Readiness Plan */}
                          <div className="space-y-1 border-b border-cyber-border/40 pb-2">
                            <span className="text-[#ef4444] block text-[7.5px] uppercase font-bold font-orbitron">EMERGENCY READINESS PLAN (PLAN B)</span>
                            <p className="text-[8.5px] leading-relaxed text-slate-300 italic">
                              {selectedEvent.neurotwin_plan_b || 'Plan B: Deploy emergency vehicles at designated corridor entry points; stand by on MG road access ramps.'}
                            </p>
                          </div>

                          {/* Assigned Officers */}
                          <div className="space-y-1 border-b border-cyber-border/40 pb-2">
                            <span className="text-[#00d2ff] block text-[7.5px] uppercase font-bold font-orbitron">ASSIGNED OFFICERS & PERSONNEL</span>
                            <div className="text-[8.5px] leading-relaxed text-slate-300">
                              <div><span className="text-slate-500">Tactical Commander:</span> Onsite Traffic Inspector <strong className="text-white">{user?.name || 'Inspector'}</strong></div>
                              <div><span className="text-slate-550">Constable Team:</span> Dispatched {selectedEvent.final_officers || selectedEvent.ai_officers || 94} officers under deployment schedule</div>
                              <div className="text-[7.5px] text-slate-500 mt-1 select-none">
                                Tactical Personnel Registry Sync: [Constable Team A, B & C Active]
                              </div>
                            </div>
                          </div>

                          {/* Zone Information */}
                          {(() => {
                            const zBound = Object.keys(ZONE_BOUNDARIES).find(k => k.toLowerCase() === selectedEvent.zone.toLowerCase());
                            const zoneStatus = zBound ? ZONE_BOUNDARIES[zBound].status : 'ACTIVE MONITORING';
                            return (
                              <div className="space-y-1">
                                <span className="text-[#00d2ff] block text-[7.5px] uppercase font-bold font-orbitron">ZONE INFORMATION</span>
                                <div className="grid grid-cols-2 gap-2 text-[8px] text-slate-300">
                                  <div>
                                    <span className="text-slate-550 block uppercase">Zone Name</span>
                                    <span className="font-bold text-white capitalize">{selectedEvent.zone}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-550 block uppercase">Target Corridor</span>
                                    <span className="font-bold text-white">{selectedEvent.corridor}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-555 block uppercase">Zone Status</span>
                                    <span className="font-bold text-cyber-accent uppercase">{zoneStatus}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-555 block uppercase">Operational Level</span>
                                    <span className="font-bold text-white">LEVEL 2 TACTICAL</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                        </div>

                        {/* Artifact PDF Download */}
                        <button
                          onClick={async () => {
                            try {
                              console.log("[AUTH TOKEN FOUND]");
                              const res = await axios.get(`${API_BASE_URL}/events/${selectedEvent.event_id}`, getAuthConfig());
                              await downloadEventReportPDF(res.data);
                            } catch (err) {
                              console.error("PDF generation error:", err);
                              alert("Failed to generate and download report PDF.");
                            }
                          }}
                          className="w-full py-2 bg-[#00d2ff]/10 hover:bg-[#00d2ff] hover:text-slate-950 text-[#00d2ff] font-orbitron font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer text-[9px] border border-[#00d2ff]/30"
                        >
                          <Download className="w-3.5 h-3.5" /> DOWNLOAD GENERATED PDF REPORT
                        </button>

                        {/* ACTIVATE EVENT button */}
                        <button
                          onClick={handleActivateEvent}
                          className="w-full mt-3 py-3 bg-[#00ff66] hover:bg-[#15ff7b] text-slate-950 font-orbitron font-black uppercase tracking-wider rounded-lg transition-all shadow-[0_0_20px_rgba(0,255,102,0.35)] text-xs flex items-center justify-center gap-1.5 cursor-pointer border-none"
                        >
                          <Play className="w-4 h-4 fill-slate-950" /> ACTIVATE EVENT (ZONE ACTIVE)
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-6 text-slate-650 italic text-[10px]">No approved events in queue for {selectedZone}.</div>
                  )}

                </div>
              </CommandCard>
            </div>
          )}

          {/* PHASE 1: PLANNING & SANDBOX */}
          {activeStep === 1 && selectedEvent && (
            <div className="space-y-4">
              
              {/* Cross Zone Ripple alerts */}
              <div className="bg-[#0b0f24]/50 border border-orange-500/35 p-3 rounded-lg font-mono text-[9px] relative overflow-hidden flex flex-col gap-2 shadow-lg">
                <div className="flex justify-between items-center border-b border-orange-500/20 pb-1">
                  <span className="font-bold text-orange-400 uppercase tracking-widest flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 animate-pulse" />
                    CROSS-ZONE RIPPLE ALERTS
                  </span>
                  <span className="text-[7.5px] px-1 bg-orange-500/10 border border-orange-500/30 text-orange-400 font-bold rounded">AI FORECAST</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {rippleEffects.map((rip) => (
                    <div key={rip.zone} className="bg-[#050b18] p-2 border border-slate-900 rounded-lg flex flex-col">
                      <span className="text-[7.5px] text-slate-500 font-bold uppercase">{rip.zone}</span>
                      <strong className="text-orange-400 text-[11px] font-orbitron mt-0.5">{rip.impact} Impact</strong>
                      <span className="text-[7px] text-slate-500 uppercase mt-0.5">Status: {rip.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* What-If Sandbox (Simulation Panel) */}
              <CommandCard title="What-If Simulation Sandbox">
                <div className="space-y-3 font-mono text-[9.5px]">
                  
                  {/* Digital Twin Scenario Presets */}
                  <div className="space-y-1 border-b border-slate-900 pb-2.5 mb-2.5">
                    <span className="text-slate-400 text-[8.5px] block font-bold">Digital Twin Scenario Presets:</span>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { id: 'crowd_20', label: 'Crowd +20%' },
                        { id: 'crowd_50', label: 'Crowd +50%' },
                        { id: 'crowd_100', label: 'Crowd +100%' },
                        { id: 'parking_overflow', label: 'Parking Overflow' },
                        { id: 'vehicle_surge', label: 'Vehicle Surge' },
                        { id: 'parking_closures', label: 'Parking Closures' }
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => applyScenarioPreset(preset.id)}
                          className="py-1 px-1 bg-slate-900 hover:bg-[#00d2ff]/10 hover:text-[#00d2ff] hover:border-[#00d2ff]/40 border border-slate-800 rounded font-mono text-[7.5px] font-bold cursor-pointer transition-all"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Attendance Controls */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400 text-[8.5px]">
                      <span>Attendance Load:</span>
                      <strong className="text-white">{(sandboxParams.attendance / 1000).toFixed(0)}K Pax</strong>
                    </div>
                    <input 
                      type="range" 
                      min="20000" 
                      max="100000" 
                      step="20000"
                      value={sandboxParams.attendance}
                      onChange={(e) => handleSandboxChange('attendance', parseInt(e.target.value))}
                      className="w-full accent-[#00d2ff] bg-slate-900 h-1 cursor-pointer rounded-lg border-none"
                    />
                    <div className="flex justify-between text-[7px] text-slate-650 px-1 font-bold">
                      <span>20K</span>
                      <span>50K</span>
                      <span>80K</span>
                      <span>100K</span>
                    </div>
                  </div>

                  {/* Weather controls */}
                  <div className="space-y-1">
                    <span className="text-slate-400 text-[8.5px] block font-bold">Weather Profile:</span>
                    <div className="grid grid-cols-4 gap-1">
                      {['Sunny', 'Rain', 'Storm', 'Heatwave'].map((w) => (
                        <button
                          key={w}
                          onClick={() => handleSandboxChange('weather', w)}
                          className={`py-1 rounded border text-[8.5px] cursor-pointer transition-all font-bold ${
                            sandboxParams.weather === w 
                              ? 'bg-[#00d2ff]/10 border-[#00d2ff] text-[#00d2ff]' 
                              : 'bg-[#050b18] border-slate-900 hover:border-slate-800 text-slate-400'
                          }`}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Road closures */}
                  <div className="space-y-1">
                    <span className="text-slate-400 text-[8.5px] block font-bold">Road Closures:</span>
                    <div className="grid grid-cols-3 gap-1">
                      {['Partial', 'Full', 'Multiple Roads'].map((c) => (
                        <button
                          key={c}
                          onClick={() => handleSandboxChange('closures', c)}
                          className={`py-1 rounded border text-[8px] cursor-pointer transition-all font-bold ${
                            sandboxParams.closures === c 
                              ? 'bg-[#00d2ff]/10 border-[#00d2ff] text-[#00d2ff]' 
                              : 'bg-[#050b18] border-slate-900 hover:border-slate-800 text-slate-400'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Crisis Toggles */}
                  <div className="space-y-1.5 border-t border-slate-900 pt-2.5 mt-2">
                    <span className="text-slate-400 text-[8.5px] block font-bold">Spontaneous Incidents Toggles:</span>
                    <div className="grid grid-cols-2 gap-2 text-[8px] text-slate-350">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={sandboxParams.vipMovement} 
                          onChange={(e) => handleSandboxChange('vipMovement', e.target.checked)}
                          className="rounded bg-[#02050e] border-[#00d2ff]/30 text-[#00d2ff] w-3 h-3 cursor-pointer focus:ring-0"
                        />
                        VIP Convoy Transit
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={sandboxParams.accidents} 
                          onChange={(e) => handleSandboxChange('accidents', e.target.checked)}
                          className="rounded bg-[#02050e] border-[#00d2ff]/30 text-[#00d2ff] w-3 h-3 cursor-pointer focus:ring-0"
                        />
                        Vehicle Collisions
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={sandboxParams.construction} 
                          onChange={(e) => handleSandboxChange('construction', e.target.checked)}
                          className="rounded bg-[#02050e] border-[#00d2ff]/30 text-[#00d2ff] w-3 h-3 cursor-pointer focus:ring-0"
                        />
                        Road Constructions
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={sandboxParams.emergency} 
                          onChange={(e) => handleSandboxChange('emergency', e.target.checked)}
                          className="rounded bg-[#02050e] border-[#00d2ff]/30 text-[#00d2ff] w-3 h-3 cursor-pointer focus:ring-0"
                        />
                        Emergency Block
                      </label>
                    </div>
                  </div>

                  {/* sandbox simulated outcomes */}
                  <div className="bg-[#050b18] border border-slate-900 p-2.5 rounded-lg space-y-2 mt-2">
                    <div className="font-bold text-white text-[8.5px] uppercase tracking-wider border-b border-slate-900 pb-1 flex justify-between">
                      <span>Simulated Performance Impact</span>
                      <span className={`text-[7.5px] font-bold ${
                        simOutput.confidence >= 90 ? 'text-[#00ff66]' :
                        simOutput.confidence >= 70 ? 'text-yellow-400' : 'text-[#ff0055]'
                      }`}>AI CONFIDENCE: {simOutput.confidence}%</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[9px]">
                      <div>
                        <span className="text-slate-550 block text-[7.5px]">TRAVEL DELAY</span>
                        <strong className="text-[#ff0055] font-orbitron">+{simOutput.delay} Mins</strong>
                      </div>
                      <div>
                        <span className="text-slate-555 block text-[7.5px]">CONGESTION SPREAD</span>
                        <strong className="text-yellow-400 font-orbitron">{simOutput.congestion}%</strong>
                      </div>
                      <div>
                        <span className="text-slate-550 block text-[7.5px]">OFFICER DEMAND</span>
                        <strong className="text-white font-orbitron">{simOutput.officers} Units</strong>
                      </div>
                      <div>
                        <span className="text-slate-550 block text-[7.5px]">BARRICADES</span>
                        <strong className="text-white font-orbitron">{simOutput.barricades} Cordons</strong>
                      </div>
                    </div>

                    {/* Diversion / Parking Efficiency */}
                    <div className="space-y-1 pt-1.5 border-t border-slate-900/60">
                      <div className="flex justify-between items-center text-[8.5px]">
                        <span className="text-slate-450">Diversion Efficiency</span>
                        <strong className="text-[#00ff66]">{simOutput.diversionEfficiency}%</strong>
                      </div>
                      <div className="flex justify-between items-center text-[8.5px]">
                        <span className="text-slate-455">Parking readiness</span>
                        <strong className="text-[#00ff66]">{simOutput.parkingReadiness}%</strong>
                      </div>
                      <div className="flex justify-between items-center text-[8.5px]">
                        <span className="text-slate-455">Emergency readiness</span>
                        <strong className="text-[#00ff66]">{simOutput.emergencyReadiness}%</strong>
                      </div>
                    </div>
                  </div>

                </div>
              </CommandCard>

              {/* Diversion Success Predictor */}
              <CommandCard title="Diversion Success Predictor">
                <div className="space-y-2 font-mono text-[9px]">
                  {selectedSegment ? (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center bg-[#050b18] p-2 border border-[#00d2ff]/20 rounded-lg">
                        <div>
                          <span className="text-slate-550 text-[7px] uppercase font-bold">Selected Corridor Segment:</span>
                          <strong className="text-[#00d2ff] block uppercase text-[10px]">{selectedSegment}</strong>
                        </div>
                        <button 
                          onClick={() => setSelectedSegment(null)}
                          className="text-[8px] bg-slate-900 hover:bg-slate-800 text-slate-400 px-2 py-1 rounded"
                        >
                          Clear
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {Object.entries(DIVERSION_ROUTES).map(([routeKey, routeData]) => {
                          const confCol = routeData.confidence >= 90 ? 'text-[#00ff66]' : routeData.confidence >= 70 ? 'text-yellow-400' : 'text-[#ff0055]';
                          return (
                            <div key={routeKey} className="p-2 bg-[#050b18]/60 border border-slate-900 rounded-lg flex flex-col gap-1">
                              <div className="flex justify-between items-center font-bold">
                                <span className="text-white">{routeData.name}</span>
                                <span className={`${confCol} text-[7.5px] uppercase font-mono`}>Conf: {routeData.confidence}%</span>
                              </div>
                              <div className="flex justify-between text-[8px] text-slate-400">
                                <span>Success Prob: <strong className="text-[#00ff66]">{routeData.probability}%</strong></span>
                                <span>Time Delta: <strong className="text-[#00d2ff]">{routeData.time}</strong></span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-5 text-slate-500 italic bg-[#050b18]/40 border border-slate-955 rounded-lg flex items-center justify-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-slate-650" />
                      Click any highlighted road segment on the map to trigger predictions.
                    </div>
                  )}
                </div>
              </CommandCard>

              {/* Smart Parking Strategy recommendations list */}
              <CommandCard title="Smart Parking Recommendations">
                <div className="font-mono text-[9px] space-y-2">
                  <div className="grid grid-cols-2 gap-1.5 text-[8.5px]">
                    <div className="p-2 bg-[#050b18] border border-slate-950 rounded">
                      <span className="text-[#22c55e] font-bold block mb-0.5">🅿️ TEMP PARKING AREA</span>
                      <span className="text-slate-350">Ground Alpha (300 spaces)</span>
                      <span className="text-[7.5px] text-slate-500 block mt-1">Accuracy: 92% | Confidence: 84%</span>
                    </div>
                    <div className="p-2 bg-[#050b18] border border-slate-950 rounded">
                      <span className="text-[#eab308] font-bold block mb-0.5">📂 OVERFLOW PARKING</span>
                      <span className="text-slate-355">Bypass Ground (600 spaces)</span>
                      <span className="text-[7.5px] text-slate-500 block mt-1">Accuracy: 90% | Confidence: 82%</span>
                    </div>
                    <div className="p-2 bg-[#050b18] border border-slate-950 rounded">
                      <span className="text-[#3b82f6] font-bold block mb-0.5">🚖 DROP-AND-GO ZONE</span>
                      <span className="text-slate-350">Corridor Bypass Gate 1 & 2</span>
                      <span className="text-[7.5px] text-slate-500 block mt-1">Strictly 2 Mins Limit</span>
                    </div>
                    <div className="p-2 bg-[#050b18] border border-slate-950 rounded">
                      <span className="text-[#a855f7] font-bold block mb-0.5">🚇 METRO / TRANSIT</span>
                      <span className="text-slate-355">MG Road Station Hub</span>
                      <span className="text-[7.5px] text-slate-500 block mt-1">Free Park & Ride Shuttle</span>
                    </div>
                  </div>
                </div>
              </CommandCard>

              {/* DNA Genome Node detailed display when clicked */}
              {selectedJunction && (
                <div className="p-3 bg-[#030611] border border-[#00d2ff]/40 rounded-lg font-mono text-[9px] space-y-2">
                  <div className="flex justify-between items-center border-b border-[#00d2ff]/20 pb-1">
                    <span className="font-bold text-[#00d2ff] uppercase flex items-center gap-1">🧬 JUNCTION TRAFFIC DNA</span>
                    <button 
                      onClick={() => setSelectedJunction(null)}
                      className="text-[7.5px] text-slate-550 hover:text-white"
                    >
                      Close
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <div>Junction: <strong className="text-white">{selectedJunction.name}</strong></div>
                    <div>Avg Delay: <strong className="text-[#ff0055]">{selectedJunction.delay} Mins</strong></div>
                    <div>Recurring Event: <strong className="text-white">{selectedJunction.recurring}</strong></div>
                    <div>Failure Pattern: <strong className="text-yellow-400">{selectedJunction.failure}</strong></div>
                  </div>
                </div>
              )}

              {/* Generate Plan Button */}
              <button
                onClick={() => {
                  setActiveStep(2);
                  addTimelineMessage('System AI', 'Operational plan generated. live dispatcher compliance tracking initiated.');
                }}
                className="w-full py-3.5 bg-[#00d2ff] hover:bg-[#00f0ff] text-black font-orbitron font-black uppercase tracking-wider rounded-lg transition-all shadow-[0_0_15px_rgba(0,210,255,0.3)] text-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <Sliders className="w-4 h-4 text-black fill-transparent" /> GENERATE OPERATIONAL PLAN
              </button>

            </div>
          )}

          {/* PHASE 2: LIVE OPERATIONS CONTROL */}
          {activeStep === 2 && selectedEvent && (
            <div className="space-y-4">
              
              {/* MID-EVENT REPLANNING sub-panel (expanded sidebar inline view, NO modals) */}
              {isReplanning ? (
                <div className="space-y-3 p-3 bg-red-950/10 border border-[#ff0055]/30 rounded-lg animate-fadeIn">
                  <div className="flex justify-between items-center border-b border-[#ff0055]/20 pb-2">
                    <h3 className="text-xs font-orbitron font-black text-[#ff0055] flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 animate-pulse" />
                      CRISIS OPERATION - MID-EVENT REPLAN
                    </h3>
                    <button 
                      onClick={() => setIsReplanning(false)}
                      className="text-[8px] bg-slate-900 hover:bg-slate-800 text-slate-400 px-2 py-0.5 rounded cursor-pointer"
                    >
                      ✕ Cancel
                    </button>
                  </div>

                  {/* Incident selector */}
                  <div className="space-y-2 font-mono text-[9px]">
                    <div>
                      <label className="text-slate-500 block text-[7.5px] font-bold uppercase">Select Incident Type:</label>
                      <div className="grid grid-cols-3 gap-1 mt-1">
                        {[
                          { id: 'accident', label: 'Collision' },
                          { id: 'flood', label: 'Flooding' },
                          { id: 'vip', label: 'VIP Convoy' }
                        ].map((inc) => (
                          <button
                            key={inc.id}
                            onClick={() => setSelectedIncidentType(inc.id)}
                            className={`py-1 rounded border text-[8.5px] font-bold cursor-pointer transition-all ${
                              selectedIncidentType === inc.id 
                                ? 'bg-[#ff0055]/10 border-[#ff0055] text-[#ff0055]' 
                                : 'bg-[#050b18] border-slate-900 text-slate-455'
                            }`}
                          >
                            {inc.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Incident Memory Recall Engine */}
                    <div className="p-2.5 bg-[#050b18] border border-slate-900 rounded-lg space-y-2">
                      <div className="text-[#ff0055] font-black uppercase text-[8.5px] border-b border-slate-900 pb-1 flex justify-between">
                        <span>Incident Memory Recall</span>
                        <span className="text-[7.5px] text-[#00ff66]">Matched (94% Accuracy)</span>
                      </div>
                      
                      <div className="space-y-1 text-slate-300 text-[8.5px]">
                        <div className="flex justify-between">
                          <span className="text-slate-550">Most Similar Incident:</span>
                          <strong className="text-white">Bus Collision</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-550">Location / Year:</span>
                          <strong className="text-white">MG Road / 2025</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-550">Resolution Time:</span>
                          <strong className="text-white">18 Minutes</strong>
                        </div>
                        <div className="flex justify-between text-yellow-400 font-bold">
                          <span>Best Recovery Plan:</span>
                          <span>Plan B (Route A Diversion)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-550">Resources Used:</span>
                          <strong className="text-white font-mono text-[8px]">Tow Truck + Emergency Team</strong>
                        </div>
                      </div>
                    </div>

                    {/* Emergency Response ETA Engine */}
                    <div className="p-2.5 bg-[#050b18] border border-slate-900 rounded-lg space-y-2">
                      <div className="text-[#00d2ff] font-black uppercase text-[8.5px] border-b border-slate-900 pb-1 flex justify-between">
                        <span>Emergency Response Readiness</span>
                        <span className="text-[7.5px] text-[#00ff66] font-mono">Confidence: 89%</span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-[8px] text-slate-355">
                        <div className="p-1.5 bg-[#030611] rounded border border-slate-950">
                          <span className="text-slate-550 block">🚑 NEAREST AMBULANCE</span>
                          <strong className="text-white">ETA: 4 Mins</strong> (1.8 km)
                        </div>
                        <div className="p-1.5 bg-[#030611] rounded border border-slate-950">
                          <span className="text-slate-555 block">🚜 NEAREST TOW TRUCK</span>
                          <strong className="text-white">ETA: 7 Mins</strong> (3.4 km)
                        </div>
                        <div className="p-1.5 bg-[#030611] rounded border border-slate-950">
                          <span className="text-slate-555 block">👮 TRAFFIC TEAM</span>
                          <strong className="text-white">ETA: 3 Mins</strong> (1.2 km)
                        </div>
                        <div className="p-1.5 bg-[#030611] rounded border border-slate-950">
                          <span className="text-slate-555 block">🚒 RESCUE UNIT</span>
                          <strong className="text-white">ETA: 5 Mins</strong> (2.3 km)
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setIsReplanning(false);
                        addTimelineMessage('Command Center', 'Revised Contingency routing activated. EMS dispatch alert broadcasted.', 'System');
                        
                        // Dynamically update timeline with incident log
                        const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        setTimeline(prev => [
                          ...prev,
                          { time: timeNow, text: `Emergency Contingency Cordon set: ${selectedIncidentType.toUpperCase()}`, completed: true }
                        ]);
                      }}
                      className="w-full py-2 bg-[#ff0055] hover:bg-[#ff1e6d] text-white font-orbitron font-black text-[9px] uppercase tracking-wider rounded cursor-pointer transition-all"
                    >
                      APPLY CONTINGENCY RECOVERY PLAN
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  
                  {/* LIVE OPERATIONS HUD MONITOR */}
                  <CommandCard title="LIVE OPS INTELLIGENCE MONITOR">
                    <div className="space-y-3.5 font-mono text-[9px]">
                      
                      {/* ESI and Crowd Surge layout */}
                      <div className="grid grid-cols-2 gap-3 bg-[#050b18] p-3 border border-slate-900 rounded-lg items-center">
                        <div className="flex flex-col items-center justify-center border-r border-slate-900/60 pr-2">
                          <span className="text-slate-500 text-[7px] uppercase font-bold text-center block mb-1">Event Stress Index</span>
                          {(() => {
                            const esi = Math.round(68 + Math.sin(Date.now() / 20000) * 10);
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
                          <span className="text-slate-500 block text-[7.5px] font-bold uppercase">Crowd Surge Status:</span>
                          <div className="bg-[#ff0055]/10 border border-[#ff0055]/30 text-[#ff0055] text-[7.5px] px-1.5 py-0.5 rounded font-bold uppercase text-center animate-pulse">
                            ⚠️ CROWD SURGE DETECTED (+34%)
                          </div>
                          <div className="space-y-0.5 text-slate-300 text-[8px]">
                            <div>Expected: <strong className="text-white">{(selectedEvent.expected_attendance || 50000).toLocaleString()} Pax</strong></div>
                            <div>Actual Live: <strong className="text-[#ff0055]">{(Math.round((selectedEvent.expected_attendance || 50000) * 1.34)).toLocaleString()} Pax</strong></div>
                            <div>Growth Rate: <strong className="text-white">+420 visitors/min</strong></div>
                          </div>
                        </div>
                      </div>

                      {/* Smart Parking Capacity & Redirection Controls */}
                      <div className="p-2.5 bg-[#050b18] border border-slate-900 rounded-lg space-y-2">
                        <div className="text-white font-bold uppercase text-[8px] border-b border-slate-900 pb-1 flex justify-between">
                          <span>Smart Parking & Redirections</span>
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

                        <button
                          onClick={() => {
                            // Add timeline log
                            const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            setTimeline(prev => [
                              ...prev,
                              { time: timeNow, text: 'Smart Parking Redirections Detour Triggered: A -> C', completed: true }
                            ]);
                            addTimelineMessage('System AI', 'Redirecting vehicle arrivals from Parking A (Full) to Parking C (Available). Citizen alerts updated.');
                          }}
                          className="w-full py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-orbitron font-bold text-[8.5px] uppercase tracking-wider rounded cursor-pointer transition-all border-none"
                        >
                          Trigger Parking redirection Detour
                        </button>
                      </div>

                      {/* AI Replanning comparison panel */}
                      {complianceData.overall < 100 && (
                        <div className="p-2.5 bg-slate-950 border border-[#eab308]/30 rounded-lg space-y-2.5">
                          <span className="text-[#eab308] font-bold block text-[8px] uppercase tracking-wider">
                            💡 AI Replanning Recommendation Available
                          </span>
                          
                          <div className="grid grid-cols-2 gap-2 border border-slate-900 rounded p-1.5 bg-slate-900/40 text-[8px]">
                            <div className="space-y-0.5">
                              <span className="text-slate-500 block uppercase font-bold">Current Active Plan</span>
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
                            onClick={handleApplyUpdatedPlan}
                            className="w-full py-1.5 bg-[#eab308] hover:bg-[#d97706] text-black font-orbitron font-black text-[8.5px] uppercase tracking-wider rounded cursor-pointer transition-all border-none"
                          >
                            Apply AI recommended Replanning
                          </button>
                        </div>
                      )}

                    </div>
                  </CommandCard>

                  {/* Operational Compliance Tracker */}
                  <CommandCard title="Operational Compliance Tracker">
                    <div className="space-y-2.5 font-mono text-[9px]">
                      
                      <div className="flex justify-between items-center bg-[#050b18] p-2 border border-slate-900 rounded-lg">
                        <span className="text-slate-400">OVERALL PLAN COMPLIANCE</span>
                        <div className="flex items-center gap-1.5">
                          <strong className="text-[#00ff66] text-[13px] font-orbitron">{complianceData.overall}%</strong>
                          <span className="text-[7.5px] px-1 bg-[#00ff66]/10 text-[#00ff66] font-bold rounded uppercase">OPTIMAL</span>
                        </div>
                      </div>

                      {/* Resources breakdown compliance */}
                      <div className="space-y-1.5">
                        {Object.entries({
                          'Barricades': complianceData.barricades,
                          'Police Officers': complianceData.officers,
                          'Tow Trucks': complianceData.towTrucks,
                          'Traffic Marshals': complianceData.trafficMarshals
                        }).map(([resource, item]) => {
                          const isGreen = item.pct >= 95;
                          const isYellow = item.pct >= 80 && item.pct < 95;
                          const textCol = isGreen ? 'text-[#00ff66]' : isYellow ? 'text-yellow-400' : 'text-[#ff0055]';
                          const bgCol = isGreen ? 'bg-[#00ff66]' : isYellow ? 'bg-yellow-400' : 'bg-[#ff0055]';
                          return (
                            <div key={resource} className="bg-[#050b18]/60 p-2 border border-slate-955 rounded space-y-1">
                              <div className="flex justify-between text-[8px] font-bold text-slate-355">
                                <span>{resource}</span>
                                <span className={textCol}>{item.pct}% Compliance</span>
                              </div>
                              <div className="flex justify-between text-[7px] text-slate-500">
                                <span>Planned: {item.planned}</span>
                                <span>Deployed: {item.deployed}</span>
                              </div>
                              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                                <div className={`${bgCol} h-full`} style={{ width: `${item.pct}%` }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  </CommandCard>

                  {/* Active Event Timeline */}
                  <CommandCard title="Active Event Timeline">
                    <div className="font-mono text-[9px] space-y-2.5 select-text">
                      <div className="relative pl-5 border-l border-slate-800 space-y-2.5 ml-2.5 py-1">
                        {timeline.map((t, idx) => (
                          <div key={idx} className="relative">
                            <div className={`absolute -left-[24px] top-1 w-2.5 h-2.5 rounded-full border-2 border-[#02050e] flex items-center justify-center z-10 ${
                              t.completed 
                                ? 'bg-[#00ff66] shadow-[0_0_6px_#00ff66]' 
                                : t.isLive 
                                ? 'bg-[#ff0055] animate-ping shadow-[0_0_10px_#ff0055]'
                                : 'bg-slate-800'
                            }`}></div>
                            <div className="flex justify-between items-center">
                              <div>
                                <span className={`text-[10px] ${t.isLive ? 'text-[#ff0055] font-black' : 'text-white'}`}>{t.text}</span>
                                <span className="text-[7.5px] text-slate-500 block">{t.time}</span>
                              </div>
                              <span className={`text-[7px] uppercase font-bold px-1 rounded ${
                                t.completed ? 'bg-[#00ff66]/10 text-[#00ff66]' : t.isLive ? 'bg-[#ff0055]/10 text-[#ff0055]' : 'text-slate-600'
                              }`}>{t.completed ? 'Completed' : t.isLive ? 'LIVE' : 'Upcoming'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CommandCard>

                  {/* Operational Timeline output & exports */}
                  <CommandCard title="Chronological Operational Plan Output">
                    <div className="font-mono text-[9px] space-y-2">
                      <div className="p-2 bg-[#050b18] border border-slate-950 rounded space-y-1">
                        <div className="text-white font-bold uppercase text-[8.5px]">Timeline Execution Schedule:</div>
                        <ul className="list-disc pl-3 text-slate-400 space-y-1 text-[8px]">
                          <li><b>Before Event (T-2h):</b> Deploy 35 barricades, calibrate signages.</li>
                          <li><b>Event Start (T-0h):</b> Activate diversion detour Route A.</li>
                          <li><b>Peak Hours (T+2h):</b> Trigger manual signal overrides.</li>
                          <li><b>Crowd Exit (T+4h):</b> Reverse flow direction at MG bypass.</li>
                        </ul>
                      </div>
                      <div className="flex gap-2">
                        <button className="flex-1 py-1 px-2 border border-slate-800 hover:border-slate-600 bg-slate-900 rounded text-slate-355 hover:text-white transition-all flex items-center justify-center gap-1 text-[8px] font-bold cursor-pointer">
                          <Download className="w-3 h-3" /> PDF Export
                        </button>
                        <button className="flex-1 py-1 px-2 border border-slate-800 hover:border-slate-600 bg-slate-900 rounded text-slate-355 hover:text-white transition-all flex items-center justify-center gap-1 text-[8px] font-bold cursor-pointer">
                          <Download className="w-3 h-3" /> operational Report
                        </button>
                        <button className="flex-1 py-1 px-2 border border-slate-800 hover:border-slate-600 bg-slate-900 rounded text-slate-355 hover:text-white transition-all flex items-center justify-center gap-1 text-[8px] font-bold cursor-pointer">
                          <Download className="w-3 h-3" /> Deployment Sheet
                        </button>
                      </div>
                    </div>
                  </CommandCard>

                </div>
              )}

              {/* Comms & Radio Feed */}
              <CommandCard title="Dispatcher Communications Log">
                <div className="flex flex-col h-40 justify-between font-mono text-[8.5px]">
                  <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 mb-2 select-text scrollbar-thin">
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className="text-slate-300">
                        <span className="text-slate-550 font-bold">[{msg.time}]</span>{' '}
                        <span className={msg.channel === 'System' ? 'text-orange-400' : 'text-[#00d2ff]'}>{msg.sender}:</span>{' '}
                        <span className="text-slate-200">{msg.text}</span>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleSendChat} className="flex gap-1.5 shrink-0 border-t border-slate-900 pt-2">
                    <input
                      type="text"
                      placeholder="Transmit radio dispatch..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      className="flex-1 bg-[#050b18] border border-slate-855 rounded px-2.5 py-1 text-slate-100 text-[9px] focus:border-[#00d2ff] focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-3 bg-[#00d2ff] text-slate-950 font-bold rounded cursor-pointer font-orbitron tracking-wider text-[9px]"
                    >
                      SEND
                    </button>
                  </form>
                </div>
              </CommandCard>

            </div>
          )}

          {/* PHASE 3: OUTCOME CALIBRATION & LEARNING */}
          {activeStep === 3 && selectedEvent && (
            <div className="space-y-4 animate-fadeIn">
              
              {/* Calibration Status Badge */}
              <div className="flex justify-between items-center bg-[#050b18]/65 p-3 border border-cyber-border/30 rounded-lg">
                <span className="text-slate-400 font-bold uppercase text-[8px] font-orbitron">Calibration Status:</span>
                <span className={`px-2.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                  calibrationRecord?.status === 'Completed'
                    ? 'bg-[#00ff66]/10 text-[#00ff66] border border-[#00ff66]/30'
                    : calibrationRecord?.status === 'Calibrating'
                      ? 'bg-cyber-accent/10 text-cyber-accent border border-cyber-accent/30 animate-pulse'
                      : 'bg-cyber-yellow/10 text-cyber-yellow border border-cyber-yellow/30'
                }`}>
                  {calibrationRecord?.status || 'Pending'}
                </span>
              </div>

              {/* Glowing Calibration Result */}
              {learningFeedback ? (
                <div className="space-y-4">
                  <div className="flex flex-col justify-center items-center font-mono text-[9px] text-center space-y-3 p-4 border border-[#00ff66]/30 bg-[#00ff66]/5 rounded-lg relative overflow-hidden shadow-[0_0_20px_rgba(0,255,102,0.15)] animate-pulse">
                    <div className="absolute top-2 right-2 text-[#00ff66] text-[8px] font-bold uppercase tracking-widest animate-bounce">● CALIBRATED</div>
                    <CheckCircle className="w-8 h-8 text-[#00ff66] animate-bounce" />
                    
                    <div className="font-bold text-[#00ff66] uppercase tracking-widest text-[11px] font-orbitron">CITY KNOWLEDGE UPDATED</div>
                    <p className="text-slate-355 italic text-[8px] max-w-[280px]">
                      "Telemetry Ingested. MG Road Junction genetic nodes recalibrated in Traffic Impact Genome memory vault."
                    </p>

                    <div className="w-full grid grid-cols-2 gap-2 text-slate-300 text-[8.5px] mt-2">
                      <div className="bg-[#050b18] p-2 rounded border border-slate-900">
                        <span className="block text-slate-550 uppercase text-[6.5px]">Congestion Accuracy</span>
                        <strong className="text-white text-xs">{learningFeedback.predictionAccuracy}%</strong>
                      </div>
                      <div className="bg-[#050b18] p-2 rounded border border-slate-900">
                        <span className="block text-slate-550 uppercase text-[6.5px]">Resource Accuracy</span>
                        <strong className="text-white text-xs">{learningFeedback.resourceAccuracy}%</strong>
                      </div>
                      <div className="bg-[#050b18] p-2 rounded border border-slate-900">
                        <span className="block text-slate-550 uppercase text-[6.5px]">Diversion Accuracy</span>
                        <strong className="text-white text-xs">{learningFeedback.diversionAccuracy}%</strong>
                      </div>
                      <div className="bg-[#050b18] p-2 rounded border border-[#00ff66]/30 bg-[#00ff66]/5 font-bold">
                        <span className="block text-[#00ff66] uppercase text-[6.5px]">Calibration Success</span>
                        <strong className="text-[#00ff66] text-xs">{learningFeedback.successScore}%</strong>
                      </div>
                    </div>
                  </div>

                  {/* Executive Calibration Report */}
                  {learningFeedback.report && (
                    <CommandCard title="Executive Calibration Report">
                      <pre className="font-mono text-[9px] text-slate-300 bg-[#050b18] p-3 border border-cyber-border/30 rounded-lg whitespace-pre-wrap select-text leading-normal max-h-[250px] overflow-y-auto">
                        {learningFeedback.report}
                      </pre>
                    </CommandCard>
                  )}

                  {/* Traffic Genome Evolution Dashboard Widget */}
                  <CommandCard title="Traffic Genome Evolution">
                    <div className="font-mono text-[9px] space-y-2">
                      <div className="flex justify-between items-center bg-[#050b18] p-2 border border-[#00d2ff]/20 rounded-lg">
                        <div>
                          <span className="text-slate-555 text-[7px] uppercase font-bold">MUTATED JUNCTION GENE:</span>
                          <strong className="text-white block uppercase text-[10px]">MG Road Junction</strong>
                        </div>
                        <span className="text-[7.5px] px-1 bg-[#00ff66]/10 text-[#00ff66] font-bold rounded uppercase">DNA MUTATED</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[8.5px] text-slate-300">
                        <div className="p-2 bg-[#050b18] rounded border border-slate-955">
                          <span className="text-slate-555 block uppercase text-[7px]">Before Average Delay</span>
                          <strong className="text-[#ff0055] text-xs font-orbitron">42 Minutes</strong>
                        </div>
                        <div className="p-2 bg-[#050b18] rounded border border-slate-955">
                          <span className="text-slate-555 block uppercase text-[7px]">After Average Delay</span>
                          <strong className="text-[#00ff66] text-xs font-orbitron">39 Minutes</strong>
                        </div>
                      </div>

                      <div className="border-t border-slate-900 pt-2.5 space-y-1.5">
                        <span className="text-slate-555 block text-[7.5px] uppercase font-bold">GENETIC LEARNINGS ACQUIRED:</span>
                        <div className="space-y-1">
                          <div className="flex justify-between bg-[#050b18]/60 px-2 py-1 rounded">
                            <span>Diversion Route A Effectiveness:</span>
                            <strong className="text-[#00ff66]">+7% Efficiency</strong>
                          </div>
                          <div className="flex justify-between bg-[#050b18]/60 px-2 py-1 rounded">
                            <span>Smart Parking Allocation:</span>
                            <strong className="text-[#00ff66]">+5% Capacity</strong>
                          </div>
                          <div className="flex justify-between bg-[#050b18]/60 px-2 py-1 rounded">
                            <span>Emergency EMS Response Time:</span>
                            <strong className="text-[#00ff66]">+3% Faster</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CommandCard>

                  <button 
                    onClick={() => {
                      setLearningFeedback(null);
                      if (selectedEvent) {
                        fetchCalibrationStatus(selectedEvent.event_id);
                      }
                    }} 
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded text-slate-350 hover:text-white cursor-pointer font-bold font-orbitron text-[9px] uppercase tracking-wider transition-all"
                  >
                    Reset Ingestion Panel
                  </button>
                </div>
              ) : (
                <CommandCard title="Submit Operational Actual Outcomes">
                  <form onSubmit={handleOutcomeCalibration} className="space-y-3 font-mono text-[9px]">
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-550 block text-[7.5px] font-bold">Actual Peak Delay (min)</label>
                        <input
                          type="number"
                          value={completionData.actualDelay}
                          onChange={(e) => setCompletionData({ ...completionData, actualDelay: parseInt(e.target.value) || 0 })}
                          className="w-full bg-[#050b18] border border-slate-855 rounded px-2.5 py-1.5 text-white focus:border-[#00d2ff] focus:outline-none text-[9.5px]"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-slate-555 block text-[7.5px] font-bold">Actual Congestion (%)</label>
                        <input
                          type="number"
                          value={completionData.actualCongestion}
                          onChange={(e) => setCompletionData({ ...completionData, actualCongestion: parseInt(e.target.value) || 0 })}
                          className="w-full bg-[#050b18] border border-slate-855 rounded px-2.5 py-1.5 text-white focus:border-[#00d2ff] focus:outline-none text-[9.5px]"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-slate-555 block text-[7.5px] font-bold">Actual Resources Deployed Description</label>
                      <input
                        type="text"
                        value={completionData.resourcesUsed}
                        onChange={(e) => setCompletionData({ ...completionData, resourcesUsed: e.target.value })}
                        className="w-full bg-[#050b18] border border-slate-855 rounded px-2.5 py-1.5 text-white focus:border-[#00d2ff] focus:outline-none text-[9.5px]"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-slate-555 block text-[7.5px] font-bold">Spontaneous Incidents Occurred</label>
                      <input
                        type="text"
                        value={completionData.incidents}
                        onChange={(e) => setCompletionData({ ...completionData, incidents: e.target.value })}
                        className="w-full bg-[#050b18] border border-slate-855 rounded px-2.5 py-1.5 text-white focus:border-[#00d2ff] focus:outline-none text-[9.5px]"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-slate-555 block text-[7.5px] font-bold">Post-Event Notes & Lessons</label>
                      <input
                        type="text"
                        value={completionData.notes}
                        onChange={(e) => setCompletionData({ ...completionData, notes: e.target.value })}
                        className="w-full bg-[#050b18] border border-slate-855 rounded px-2.5 py-1.5 text-white focus:border-[#00d2ff] focus:outline-none text-[9.5px]"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-[#00ff66]/10 border border-[#00ff66]/40 text-[#00ff66] hover:bg-[#00ff66] hover:text-[#030611] font-bold font-orbitron rounded-lg cursor-pointer text-center transition-all shadow-[0_0_10px_rgba(0,255,102,0.15)] text-[9.5px] uppercase tracking-wider"
                    >
                      CALIBRATE CITY TRANSPORT GENOME
                    </button>
                  </form>
                </CommandCard>
              )}

            </div>
          )}

        </div>

      </div>

      </div>

      {/* Emergency Incident declaration Modal */}
      {showAlertModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 font-mono select-none">
          <div className="bg-[#080c1e] border border-[#ff0055] rounded-2xl w-full max-w-md p-5 shadow-[0_0_30px_rgba(255,0,85,0.35)] space-y-4 max-h-[95vh] overflow-y-auto relative">
            <div className="flex justify-between items-center border-b border-cyber-border/40 pb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#ff0055] animate-pulse" />
                <h3 className="font-orbitron font-bold text-sm tracking-wider uppercase text-[#ff0055]">🚨 TRIGGER SYSTEM EMERGENCY ALERT</h3>
              </div>
              <button 
                onClick={() => {
                  setShowAlertModal(false);
                  setAlertMessage('');
                  setAlertLocation('');
                  setAlertIncidentType('Accident');
                  setAlertSeverity('CRITICAL');
                  setAlertLatitude('12.9716');
                  setAlertLongitude('77.5946');
                }}
                className="p-1 hover:bg-[#ff0055]/10 text-slate-400 hover:text-[#ff0055] rounded cursor-pointer bg-transparent border border-transparent"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-left text-xs">
              {/* Incident Type Select */}
              <div className="space-y-1">
                <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Incident Type</label>
                <select
                  value={alertIncidentType}
                  onChange={(e) => setAlertIncidentType(e.target.value)}
                  className="w-full bg-[#050915] border border-cyber-border/60 hover:border-[#ff0055]/60 focus:border-[#ff0055] rounded p-2 text-white text-[11px] outline-none transition-all font-mono cursor-pointer"
                >
                  {INCIDENT_TYPES.map((type) => (
                    <option key={type} value={type} className="bg-[#070b19] text-white">
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Severity Selector */}
              <div className="space-y-1">
                <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Severity Level</label>
                <div className="grid grid-cols-4 gap-2">
                  {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => {
                    let btnStyle = "";
                    if (alertSeverity === sev) {
                      if (sev === 'CRITICAL') btnStyle = "bg-[#ff0055] border-[#ff0055] text-white shadow-[0_0_8px_#ff0055]";
                      else if (sev === 'HIGH') btnStyle = "bg-cyber-orange border-cyber-orange text-white shadow-[0_0_8px_rgba(255,119,0,0.3)]";
                      else if (sev === 'MEDIUM') btnStyle = "bg-cyber-yellow border-cyber-yellow text-black shadow-[0_0_8px_rgba(255,204,0,0.3)]";
                      else btnStyle = "bg-cyber-green border-cyber-green text-white shadow-[0_0_8px_rgba(0,255,102,0.3)]";
                    } else {
                      btnStyle = "bg-[#050915] border-cyber-border text-slate-400 hover:border-slate-600";
                    }
                    return (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setAlertSeverity(sev)}
                        className={`py-1.5 px-1 border rounded text-[9px] font-orbitron font-bold tracking-wider uppercase transition-all cursor-pointer ${btnStyle}`}
                      >
                        {sev}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Location Input */}
              <div className="space-y-1">
                <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Location</label>
                <input
                  type="text"
                  value={alertLocation}
                  onChange={(e) => setAlertLocation(e.target.value)}
                  placeholder="e.g. MG Road, Near Central Mall"
                  className="w-full bg-[#050915] border border-cyber-border/60 hover:border-[#ff0055]/60 focus:border-[#ff0055] rounded p-2 text-white text-[11px] outline-none transition-all font-mono"
                  required
                />
              </div>

              {/* Latitude and Longitude Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={alertLatitude}
                    onChange={(e) => setAlertLatitude(e.target.value)}
                    className="w-full bg-[#050915] border border-cyber-border/60 hover:border-[#ff0055]/60 focus:border-[#ff0055] rounded p-2 text-white text-[11px] outline-none transition-all font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={alertLongitude}
                    onChange={(e) => setAlertLongitude(e.target.value)}
                    className="w-full bg-[#050915] border border-cyber-border/60 hover:border-[#ff0055]/60 focus:border-[#ff0055] rounded p-2 text-white text-[11px] outline-none transition-all font-mono"
                    required
                  />
                </div>
              </div>

              {/* Description Input */}
              <div className="space-y-1">
                <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Description</label>
                <textarea
                  value={alertMessage}
                  onChange={(e) => setAlertMessage(e.target.value)}
                  placeholder="Provide brief details on the situation..."
                  rows="3"
                  className="w-full bg-[#050915] border border-[#ff0055]/60 focus:border-[#ff0055] rounded p-2 text-white text-[11px] outline-none transition-all resize-none font-sans"
                  required
                />
              </div>

              {/* Submit / Cancel Actions */}
              <div className="flex gap-3 justify-end pt-3 border-t border-cyber-border/40 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAlertModal(false);
                    setAlertMessage('');
                    setAlertLocation('');
                    setAlertIncidentType('Accident');
                    setAlertSeverity('CRITICAL');
                    setAlertLatitude('12.9716');
                    setAlertLongitude('77.5946');
                  }}
                  className="px-4 py-2 border border-cyber-border bg-transparent hover:bg-slate-900 text-slate-400 hover:text-white text-[10px] font-orbitron font-bold uppercase tracking-wider rounded cursor-pointer transition-all"
                  disabled={alertSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitEmergencyAlert}
                  className="px-4 py-2 bg-[#ff0055] hover:bg-[#ff1e6d] text-white text-[10px] font-orbitron font-bold uppercase tracking-wider rounded cursor-pointer transition-all border border-[#ff0055]/30 flex items-center gap-1.5 disabled:opacity-50"
                  disabled={alertSubmitting || !alertMessage.trim() || !alertLocation.trim() || !alertLatitude.trim() || !alertLongitude.trim()}
                >
                  {alertSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Triggering...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Trigger Alert
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div 
          className="fixed bottom-6 right-6 z-[999999] bg-[#080c1e]/90 border border-cyber-accent rounded-xl px-4 py-3 text-xs text-white font-mono flex items-center gap-2 shadow-2xl glow-cyan animate-fade-in-up"
          style={{ backdropFilter: 'blur(10px)' }}
        >
          <div className="w-2 h-2 rounded-full bg-cyber-accent animate-ping"></div>
          {toastMessage}
        </div>
      )}

    </div>
  );
}
