import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import CommandCard from './ui/CommandCard';
import { 
  Navigation,
  X,
  Check,
  CheckSquare,
  CheckCircle,
  Layers,
  Share2,
  ShieldAlert,
  Smartphone
} from 'lucide-react';

const parseAlertId = (notification) => {
  if (notification.alert_id) return notification.alert_id;
  if (notification.event_id) return notification.event_id;
  const msg = notification.message || '';
  const match = msg.match(/Incident ID:\s*(ALERT-[A-Z0-9]+)/i) || msg.match(/(ALERT-[A-Z0-9]+)/i);
  return match ? match[1] : null;
};

const getAlertDetails = (notification, incidentsList) => {
  const alertId = parseAlertId(notification);
  const matched = incidentsList.find(ev => ev.event_id === alertId || ev.alert_id === alertId);
  
  if (matched) {
    return {
      alert_id: alertId,
      incident_type: matched.event_cause || matched.incident_type || 'Emergency',
      severity: matched.risk_band || matched.severity || 'CRITICAL',
      location: matched.corridor || matched.location,
      latitude: matched.latitude,
      longitude: matched.longitude,
      description: matched.description || notification.message,
      timestamp: matched.created_at || notification.created_at || notification.timestamp,
      reported_by: matched.reported_by || 'Onsite Traffic Inspector',
      dispatch_source: matched.dispatch_source || notification.dispatch_source || 'Central Traffic Command Center',
      is_emergency_alert: true,
      original_incident: matched
    };
  }
  
  // Regex parsing from message text
  const msg = notification.message || '';
  const locationMatch = msg.match(/Location:\s*\n*([^\n]+)/i);
  const severityMatch = msg.match(/Severity:\s*\n*([^\n]+)/i);
  
  return {
    alert_id: alertId || notification.id || 'N/A',
    incident_type: notification.incident_type || 'Emergency',
    severity: (severityMatch ? severityMatch[1].trim() : null) || notification.severity || notification.priority || 'CRITICAL',
    location: (locationMatch ? locationMatch[1].trim() : null) || notification.location || 'Unknown Location',
    latitude: notification.latitude || 12.9716,
    longitude: notification.longitude || 77.5946,
    description: notification.description || msg,
    timestamp: notification.timestamp || notification.created_at,
    reported_by: notification.reported_by || notification.user || 'Onsite Traffic Inspector',
    dispatch_source: notification.dispatch_source || 'Central Traffic Command Center',
    is_emergency_alert: true
  };
};

const getIncidentAIFields = (incident) => {
  if (!incident) return {};
  const incidentType = incident.incident_type || incident.event_cause || 'Accident';
  const location = incident.location || incident.corridor || 'MG Road';
  const severity = incident.severity || incident.risk_band || 'CRITICAL';
  
  return {
    eventName: `Emergency Response for ${incidentType} along ${location}`,
    priority: severity === 'CRITICAL' ? 'Priority 1 (Critical)' : 'Priority 2 (High)',
    assignedZone: 'Central Zone',
    relatedEvent: `EV-PL-${(incident.alert_id || incident.event_id || '99').slice(-4)}`,
    aiDispatchRecommendation: `Deploy emergency EMS squad, heavy tow truck, and 2 traffic clearance teams from Nearest Station.`,
    requiredUnits: incidentType.toLowerCase().includes('medical') || incidentType.toLowerCase().includes('accident') 
      ? '1 Ambulance, 1 Heavy Tow, 2 Traffic Patrols' 
      : '2 Police Patrols, 1 Road Debris Sweeper',
    expectedResolutionTime: '18 Minutes',
    confidenceScore: '94%',
    incidentMemoryRecall: 'Recall Match: Similar Accident at Richmond Flyover resolved in 15 mins with 1 tow dispatch.',
    mostSimilarIncident: 'INC-2026-0342 (Richmond Flyover Accident)',
    recoveryPlan: 'Plan B: Immediate cordon setup, activate signal priority along primary evacuation routes.',
    recommendedDiversion: 'Diverting traffic at Residency Road junction via Kasturba Road.',
    aiTacticalRoute: 'MG Road -> Trinity Circle -> Richmond Flyover',
    estimatedArrivalTime: '4 Mins',
    trafficRisk: 'High (due to peak hour volume)',
    congestionLevel: '72%',
    routeConfidence: '91%',
    emergencyCorridorActivated: 'YES (Active Status)',
    trafficSignalPriorityEnabled: 'YES (Green Wave Opt-in)',
    signalsImpacted: '3 intersections (MG Road, Residency Rd, Trinity Circle)',
    alternativeEmergencyRoute: 'Residency Road -> Richmond Road -> Evacuation Corridor'
  };
};

export default function EmergencyResponseDashboard() {
  const { user } = useAuth();
  
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

  const location = useLocation();
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersGroup = useRef(null);
  const assetMarkersGroup = useRef(null);
  const countdownIntervalRef = useRef(null);

  // States
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [ertStatusMap, setErtStatusMap] = useState({});
  // App navigation state
  const [navigationActive, setNavigationActive] = useState(false);
  const [corridorActivated, setCorridorActivated] = useState(false);
  const [emergencyPopupOpen, setEmergencyPopupOpen] = useState(false);
  const [currentEmergency, setCurrentEmergency] = useState(null);
  const [mobileAlertNotification, setMobileAlertNotification] = useState(null);
  const [backupStatusMessage, setBackupStatusMessage] = useState(null);

  useEffect(() => {
    console.log(
      "[POPUP STATE CHANGED]",
      emergencyPopupOpen,
      currentEmergency
    );
  }, [emergencyPopupOpen, currentEmergency]);

  // Countdown timer state (seconds)
  const [countdownTime, setCountdownTime] = useState(240); // 4 minutes

  // Outcome submission state
  const [showOutcomeForm, setShowOutcomeForm] = useState(false);
  const [learningFeedback, setLearningFeedback] = useState(null);
  const [outcomeData, setOutcomeData] = useState({
    arrivalTime: '12:05 PM',
    resolutionTime: '18 Minutes',
    resourcesUsed: '1 Ambulance, 1 Tow Truck, 2 Traffic Teams',
    casualties: '0',
    roadReopenedTime: '12:23 PM',
    diversionUsed: 'Route A',
    recoveryStrategy: 'Plan B'
  });

  // Layer filters
  const [showVehicles, setShowVehicles] = useState(true);
  const [showHospitals, setShowHospitals] = useState(true);
  const [showPoliceStations, setShowPoliceStations] = useState(true);
  const [showRoadClosures, setShowRoadClosures] = useState(true);

  // Cache for detecting new assignments
  const selectedIncidentRef = useRef(null);
  const handledIncidentsRef = useRef([]); // locally ignored/declined ids
  const lastAlertIdRef = useRef(null);
  const lastProcessedIncidentIdRef = useRef(null);



  const getErtStatus = (eventId) => {
    const matched = incidents.find(ev => ev.event_id === eventId);
    if (matched) return matched.status;
    return ertStatusMap[eventId] || 'PENDING';
  };

  // Fetch active telemetry incidents
  const fetchIncidents = async () => {
    try {
      console.log("[AUTH TOKEN FOUND]");
      const activeRes = await axios.get(`${API_BASE_URL}/events/active`, getAuthConfig());
      const approvedRes = await axios.get(`${API_BASE_URL}/events/approved`, getAuthConfig());
      let mappedAlerts = [];
      try {
        const alertsRes = await axios.get(`${API_BASE_URL}/events/emergency-alerts/all`, getAuthConfig());
        mappedAlerts = alertsRes.data.map(alert => ({
          event_id: alert.alert_id,
          event_type: 'unplanned',
          event_cause: alert.incident_type,
          priority: 'Critical',
          risk_band: alert.severity,
          corridor: alert.location,
          description: alert.description,
          latitude: alert.latitude,
          longitude: alert.longitude,
          status: alert.status,
          created_at: alert.created_at,
          reported_by: alert.reported_by,
          dispatch_source: alert.dispatch_source || 'Central Traffic Command Center',
          is_emergency_alert: true
        }));
      } catch (alertErr) {
        console.error("Failed to fetch emergency alerts:", alertErr);
      }
      
      // Filter out completed, rejected, resolved and declined events
      const combined = [...mappedAlerts, ...approvedRes.data, ...activeRes.data].filter(
        ev => ev.status !== 'COMPLETED' && ev.status !== 'REJECTED' && ev.status !== 'RESOLVED' && ev.status !== 'DECLINED' && ev.status !== 'DECLINED_ALERT' && !handledIncidentsRef.current.includes(ev.event_id)
      );
      setIncidents(combined);
      
      // Set the active incidents list so map and sidebar show them
      setIncidents(combined);
    } catch (err) {
      console.error("Failed to load active emergencies:", err);
    }
  };

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 10000);
    return () => {
      clearInterval(interval);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      console.log("[CLEANUP EXECUTED]");
      console.log("[NO EMERGENCY STATE MODIFIED]");
    };
  }, []);

  useEffect(() => {
    const handleRefresh = () => {
      fetchIncidents();
    };
    window.addEventListener('refresh-notifications', handleRefresh);
    return () => {
      window.removeEventListener('refresh-notifications', handleRefresh);
      console.log("[CLEANUP EXECUTED]");
      console.log("[NO EMERGENCY STATE MODIFIED]");
    };
  }, []);

  // Persistence logic: Automatically reopen popup if there are pending alerts
  useEffect(() => {
    if (user?.role !== "EMERGENCY_RESPONSE") return;
    
    // Find the first alert that is pending response
    const pendingAlert = incidents.find(
      ev => ev.is_emergency_alert && ev.status === 'PENDING RESPONSE'
    );
    
    if (pendingAlert) {
      const alertId = pendingAlert.event_id;
      // Check if we already handled/ignored it in this session to prevent loops
      if (!handledIncidentsRef.current.includes(alertId)) {
        if (!emergencyPopupOpen || !currentEmergency || currentEmergency.alert_id !== alertId) {
          console.log("[PERSISTENCE] Reopening popup for pending alert:", alertId);
          const parsedDetails = {
            alert_id: alertId,
            incident_type: pendingAlert.event_cause || 'Emergency',
            severity: pendingAlert.risk_band || 'CRITICAL',
            location: pendingAlert.corridor,
            latitude: pendingAlert.latitude,
            longitude: pendingAlert.longitude,
            description: pendingAlert.description,
            timestamp: pendingAlert.created_at,
            reported_by: pendingAlert.reported_by,
            dispatch_source: pendingAlert.dispatch_source || 'Central Traffic Command Center',
            is_emergency_alert: true,
            original_incident: pendingAlert
          };
          
          setCurrentEmergency(parsedDetails);
          setEmergencyPopupOpen(true);
        }
      }
    }
  }, [incidents, user, emergencyPopupOpen, currentEmergency]);

  const handleEmergencyAlert = (event) => {
    if (user?.role !== "EMERGENCY_RESPONSE") {
      console.log(
        "[BLOCKED] Emergency alert ignored for role:",
        user?.role
      );
      return;
    }
    const notification = event.detail;
    if (!notification) return;

    const title = notification.title || '';
    const messageText = notification.message || '';
    const isEmergency = title.includes('SYSTEM EMERGENCY ALERT') || messageText.includes('Incident ID') || notification.alert_id;

    if (!isEmergency) return;

    const parsedDetails = getAlertDetails(notification, incidents);
    const alertId = parsedDetails.alert_id;

    // Anti-duplicate protection
    if (lastAlertIdRef.current === alertId) {
      return;
    }
    lastAlertIdRef.current = alertId;

    console.log("[WEBSOCKET ALERT RECEIVED]", notification);
    setCurrentEmergency(parsedDetails);
    console.log("[CURRENT EMERGENCY SET]", parsedDetails);
    setEmergencyPopupOpen(true);
    console.log("[EMERGENCY POPUP OPENED]");
  };

  useEffect(() => {
    window.addEventListener('emergency-alert-created', handleEmergencyAlert);
    return () => {
      window.removeEventListener('emergency-alert-created', handleEmergencyAlert);
      console.log("[CLEANUP EXECUTED]");
      console.log("[NO EMERGENCY STATE MODIFIED]");
    };
  }, [incidents]);

  // WebSocket connection inside Emergency Dashboard to listen for emergency alerts
  useEffect(() => {
    if (!user) return;
    const wsProtocol = API_BASE_URL.startsWith('https') ? 'wss:' : 'ws:';
    const wsHost = API_BASE_URL.replace(/^https?:\/\//, '');
    const wsUrl = `${wsProtocol}//${wsHost}/ws/${user.id}`;
    
    let ws;
    let reconnectTimeout;
    
    const connectWS = () => {
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log("Emergency Dashboard WebSocket connected for user:", user.id);
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'MOBILE_ALERT') {
            console.log("[MOBILE ALERT RECEIVED]", message.data);
            setMobileAlertNotification({
              incident: message.data.incident,
              location: message.data.location,
              phoneNumber: message.data.phone_number || '8341085984'
            });
            setTimeout(() => setMobileAlertNotification(null), 15000);
            return;
          }

          const isEmergency = 
            message.type === 'EMERGENCY_ALERT' ||
            message.type === 'EMERGENCY_ALERT_CREATED' ||
            (message.data && (
              (typeof message.data.title === 'string' && message.data.title.includes('SYSTEM EMERGENCY ALERT')) ||
              (typeof message.data.message === 'string' && message.data.message.includes('Incident ID'))
            ));
            
          if (isEmergency) {
            if (user?.role !== "EMERGENCY_RESPONSE") {
              return;
            }
            const alertData = message.data ? (message.data.emergency_alert || message.data) : message;
            
            const title = alertData.title || '';
            const msg = alertData.message || '';
            const isAlertDetailsPayload = alertData.alert_id || alertData.event_id;
            
            if (title.includes('SYSTEM EMERGENCY ALERT') || msg.includes('Incident ID') || isAlertDetailsPayload) {
              const parsedDetails = getAlertDetails(alertData, incidents);
              const alertId = parsedDetails.alert_id;

              if (alertId && isIncidentAccepted(alertId)) {
                console.log("[WEBSOCKET] Incident already accepted, ignoring:", alertId);
                return;
              }

              // Anti-duplicate protection
              if (lastAlertIdRef.current === alertId) {
                return;
              }
              lastAlertIdRef.current = alertId;

              console.log("[WEBSOCKET ALERT RECEIVED]", alertData);
              setCurrentEmergency(parsedDetails);
              console.log("[CURRENT EMERGENCY SET]", parsedDetails);
              setEmergencyPopupOpen(true);
              console.log("[EMERGENCY POPUP OPENED]");
              
              // Also simulate mobile alert automatically
              setMobileAlertNotification({
                incident: parsedDetails.incident_type || 'Emergency Incident',
                location: parsedDetails.location || 'Reported Location',
                phoneNumber: '8341085984'
              });
              setTimeout(() => setMobileAlertNotification(null), 15000);
              
              const mappedAlert = {
                event_id: parsedDetails.alert_id,
                event_type: 'unplanned',
                event_cause: parsedDetails.incident_type || 'Emergency',
                priority: 'Critical',
                risk_band: parsedDetails.severity || 'CRITICAL',
                corridor: parsedDetails.location,
                description: parsedDetails.description,
                latitude: parsedDetails.latitude,
                longitude: parsedDetails.longitude,
                status: parsedDetails.status || 'CREATED',
                created_at: parsedDetails.timestamp || parsedDetails.created_at,
                reported_by: parsedDetails.reported_by,
                dispatch_source: parsedDetails.dispatch_source,
                is_emergency_alert: true
              };
              
              // Filter: Show active alert only when status is CREATED, ASSIGNED, EN_ROUTE, or PENDING RESPONSE
              if (!['CREATED', 'ASSIGNED', 'EN_ROUTE', 'PENDING RESPONSE'].includes(mappedAlert.status)) {
                return;
              }
              
              // Store alert data
              setSelectedIncident(mappedAlert);
              selectedIncidentRef.current = mappedAlert;
              
              // Show incident details (center map)
              if (mappedAlert.latitude && mappedAlert.longitude && mapInstance.current) {
                mapInstance.current.setView([mappedAlert.latitude, mappedAlert.longitude], 14);
              }
            }
          }
        } catch (err) {
          console.error("Dashboard WebSocket error:", err);
        }
      };
      
      ws.onclose = () => {
        reconnectTimeout = setTimeout(connectWS, 5000);
      };
      
      ws.onerror = () => {
        ws.close();
      };
    };
    
    connectWS();
    
    return () => {
      if (ws) ws.close();
      clearTimeout(reconnectTimeout);
      console.log("[CLEANUP EXECUTED]");
      console.log("[NO EMERGENCY STATE MODIFIED]");
    };
  }, [user]);

  // Handle URL query parameters to auto-select incident (but DO NOT auto-open popup/siren on load/refresh)
  const searchParams = new URLSearchParams(location.search);
  const incidentIdParam = searchParams.get('incident_id');

  useEffect(() => {

  // Do not allow incident loading to close an active emergency popup
  if (emergencyPopupOpen) {
    console.log(
      "[ACTIVE EMERGENCY - SKIPPING INCIDENT PARAM EFFECT]"
    );
    return;
  }

  if (!incidentIdParam) {
    lastProcessedIncidentIdRef.current = null;
    return;
  }

  if (incidents.length > 0) {

    if (lastProcessedIncidentIdRef.current === incidentIdParam) {
      return;
    }

    const matchedIncident = incidents.find(
      ev => ev.event_id === incidentIdParam
    );

    if (matchedIncident) {

      lastProcessedIncidentIdRef.current = incidentIdParam;

      setSelectedIncident(matchedIncident);
      selectedIncidentRef.current = matchedIncident;

      console.log(
        "[INCIDENT PARAM PROCESSED]",
        incidentIdParam
      );

      if (
        matchedIncident.status === "EN_ROUTE" ||
        matchedIncident.status === "ON_SCENE"
      ) {
        setNavigationActive(true);
      }

      if (
        matchedIncident.latitude &&
        matchedIncident.longitude &&
        mapInstance.current
      ) {
        mapInstance.current.setView(
          [matchedIncident.latitude, matchedIncident.longitude],
          14
        );
      }
    }
  }

}, [incidentIdParam, incidents, emergencyPopupOpen]);

  // Restore navigation/active screen if there's already an active response incident
  useEffect(() => {
    const activeRouteIncident = incidents.find(ev => ev.status === 'EN_ROUTE' || ev.status === 'ON_SCENE');
    if (activeRouteIncident && !selectedIncident) {
      setSelectedIncident(activeRouteIncident);
      selectedIncidentRef.current = activeRouteIncident;
      setNavigationActive(true);
      if (activeRouteIncident.status === 'ON_SCENE') {
        setCountdownTime(0);
      }
    }
  }, [incidents, selectedIncident]);

  // Countdown timer logic
  useEffect(() => {
    if (navigationActive && countdownTime > 0) {
      countdownIntervalRef.current = setInterval(() => {
        setCountdownTime(prev => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            // Automatic on-scene transition
            if (selectedIncidentRef.current || selectedIncident) {
              const incident = selectedIncidentRef.current || selectedIncident;
              const alertId = incident.event_id || incident.alert_id;
              const isEmergency = incident.is_emergency_alert || true;
              const nowStr = new Date().toLocaleTimeString();
              localStorage.setItem(`arrived_time_${alertId}`, nowStr);
              
              updateIncidentStatus(alertId, isEmergency, 'ON_SCENE', 'Team arrived on scene (automated transition on timer expiration).')
                .then(() => {
                  fetchIncidents();
                })
                .catch(err => {
                  console.error("Auto transition to ON_SCENE failed:", err);
                });
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      console.log("[CLEANUP EXECUTED]");
      console.log("[NO EMERGENCY STATE MODIFIED]");
    };
  }, [navigationActive, selectedIncident]);

  // Format seconds to MM:SS
  const formatCountdown = () => {
    const mins = Math.floor(countdownTime / 60);
    const secs = countdownTime % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (ts) => {
    if (!ts) return "N/A";
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + d.toLocaleDateString();
  };

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const L = window.L;
    if (!L) return;

    const bangaloreCenter = [12.9716, 77.5946];
    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView(bangaloreCenter, 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapInstance.current = map;
    markersGroup.current = L.featureGroup().addTo(map);
    assetMarkersGroup.current = L.featureGroup().addTo(map);

    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }, []);

  // Update map overlays
  useEffect(() => {
    const map = mapInstance.current;
    const L = window.L;
    if (!map || !L) return;

    markersGroup.current.clearLayers();
    assetMarkersGroup.current.clearLayers();

    // 1. Draw Active Incident Markers
    incidents.forEach(ev => {
      if (!ev.latitude || !ev.longitude) return;

      const statusValue = getErtStatus(ev.event_id);
      
      let markerColor = '#ef4444'; // Red
      if (ev.priority === 'Medium') markerColor = '#f59e0b'; // Amber
      if (ev.priority === 'Low') markerColor = '#facc15'; // Yellow

      const customIcon = L.divIcon({
        className: 'custom-ert-incident-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <span class="absolute inline-flex h-8 w-8 rounded-full opacity-65 ${statusValue === 'PENDING' ? 'marker-blink-red' : ''}" style="background-color: ${markerColor}; border: 1.5px solid #ffffff;"></span>
            <div class="relative inline-flex rounded-full h-5 w-5 border border-white items-center justify-center text-[10px] font-bold shadow-lg" style="background-color: ${markerColor}; color: #000;">🚨</div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([ev.latitude, ev.longitude], { icon: customIcon }).addTo(markersGroup.current);
      marker.bindPopup(`
        <div class="p-2 font-mono text-xs bg-slate-950 border border-cyber-border rounded text-slate-300">
          <div class="font-bold text-white mb-0.5">${ev.event_id}</div>
          <div class="text-[#ef4444] font-bold uppercase text-[9px]">${ev.priority} Priority</div>
          <div>Status: <span class="text-cyber-accent">${statusValue}</span></div>
        </div>
      `, { closeButton: false });
    });

    // 2. Draw Toggleable Asset Layers
    
    // Hospitals 🏥
    if (showHospitals) {
      const hospitals = [
        { name: "Manipal Hospital Hal", lat: 12.9592, lng: 77.6444 },
        { name: "Fortis Hospital Bannerghatta", lat: 12.8953, lng: 77.5983 },
        { name: "Narayana Health Town", lat: 12.8276, lng: 77.6821 }
      ];
      hospitals.forEach(h => {
        const hospitalIcon = L.divIcon({
          html: `<div class="p-1 rounded-full bg-red-950/80 border border-red-500 text-red-500 shadow flex items-center justify-center text-xs w-6 h-6">🏥</div>`,
          iconSize: [24, 24]
        });
        L.marker([h.lat, h.lng], { icon: hospitalIcon })
          .bindPopup(`<span class="font-mono text-xs font-bold text-white">${h.name}</span>`)
          .addTo(assetMarkersGroup.current);
      });
    }

    // Police Stations 🚓
    if (showPoliceStations) {
      const stations = [
        { name: "Cubbon Park Police Station", lat: 12.9723, lng: 77.5962 },
        { name: "Indiranagar Police Station", lat: 12.9784, lng: 77.6408 },
        { name: "Koramangala Station", lat: 12.9352, lng: 77.6244 }
      ];
      stations.forEach(ps => {
        const stationIcon = L.divIcon({
          html: `<div class="p-1 rounded-full bg-blue-950/80 border border-blue-500 text-blue-400 shadow flex items-center justify-center text-xs w-6 h-6">🚓</div>`,
          iconSize: [24, 24]
        });
        L.marker([ps.lat, ps.lng], { icon: stationIcon })
          .bindPopup(`<span class="font-mono text-xs font-bold text-white">${ps.name}</span>`)
          .addTo(assetMarkersGroup.current);
      });
    }

    // Officer Current Location ( pulsing responder car ) 🚙
    if (showVehicles) {
      const officerLoc = [12.9698, 77.6105]; // Officer Kumar's location
      const vehicleIcon = L.divIcon({
        html: `<div class="p-1 rounded bg-[#00d2ff] border border-white shadow-lg animate-pulse flex items-center justify-center text-xs w-7 h-7">🚓</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });
      L.marker(officerLoc, { icon: vehicleIcon })
        .bindPopup(`<span class="font-mono text-xs font-bold text-white">Officer Location (You)</span>`)
        .addTo(assetMarkersGroup.current);
    }

    // Road Closures 🚧
    if (showRoadClosures) {
      const closures = [
        { name: "Richmond Flyover Closure", lat: 12.9610, lng: 77.5990 }
      ];
      closures.forEach(c => {
        const blockIcon = L.divIcon({
          html: `<div class="p-1 rounded bg-red-950 border border-red-500 text-red-500 flex items-center justify-center text-xs w-6 h-6">🚧</div>`,
          iconSize: [24, 24]
        });
        L.marker([c.lat, c.lng], { icon: blockIcon })
          .bindPopup(`<span class="font-mono text-xs font-bold text-white">${c.name}</span>`)
          .addTo(assetMarkersGroup.current);
      });
    }

    // Draw active navigation routes & emergency corridor activation path
    if (navigationActive && selectedIncident) {
      const startLoc = [12.9698, 77.6105]; // Officer Location
      const destLoc = [selectedIncident.latitude, selectedIncident.longitude];

      const routePoints = [
        startLoc,
        [12.9720, 77.6080],
        [12.9710, 77.5990],
        destLoc
      ];

      // Draw route line (cyan pulsing polyline for AI suggest path)
      L.polyline(routePoints, {
        color: '#00d2ff',
        weight: 6,
        opacity: 0.9,
        className: 'leaflet-animated-polyline'
      }).addTo(markersGroup.current);

      // Highlight Emergency Corridor in BLUE if activated
      if (corridorActivated) {
        L.polyline(routePoints, {
          color: '#3b82f6',
          weight: 12,
          opacity: 0.55
        }).addTo(markersGroup.current);
      }

      map.fitBounds(L.latLngBounds([startLoc, destLoc]), { padding: [60, 60] });
    }
  }, [incidents, selectedIncident, showVehicles, showHospitals, showPoliceStations, showRoadClosures, navigationActive, corridorActivated]);

  async function updateIncidentStatus(eventId, isEmergencyAlert, statusValue, comments = '') {
    console.log("[AUTH TOKEN FOUND]");
    if (isEmergencyAlert) {
      await axios.post(`${API_BASE_URL}/events/emergency-alert/update-status`, {
        alert_id: eventId,
        status: statusValue,
        comments: comments
      }, getAuthConfig());
    } else {
      await axios.post(`${API_BASE_URL}/events/update-status`, {
        event_id: eventId,
        status: statusValue,
        comments: comments
      }, getAuthConfig());
    }
  }

  // Acknowledging & Accepting incident
  const handleAcceptAssignment = async () => {
    console.log("[ASSIGNMENT ACCEPTED]");
    const activeEmergency = currentEmergency || selectedIncident;
    if (activeEmergency) {
      activeEmergency.acknowledged = true;
    }
    setEmergencyPopupOpen(false);
    
    if (activeEmergency) {
      const alertId = activeEmergency.alert_id || activeEmergency.event_id;
      const isEmergency = activeEmergency.is_emergency_alert || true;
      try {
        // Sequentially transition status: PENDING RESPONSE -> ACCEPTED -> EN_ROUTE
        
        // 1. Transition status to ACCEPTED
        await updateIncidentStatus(
          alertId, 
          isEmergency, 
          'ACCEPTED', 
          JSON.stringify({
            comments: 'Officer accepted emergency assignment.',
            accepted_by: user.name,
            accepted_at: new Date().toISOString()
          })
        );

        // 2. Transition status to EN_ROUTE
        await updateIncidentStatus(
          alertId, 
          isEmergency, 
          'EN_ROUTE', 
          JSON.stringify({
            comments: 'Officer en route to emergency.',
            accepted_by: user.name,
            accepted_at: new Date().toISOString()
          })
        );
        
        // Store accepted_by and accepted_at
        localStorage.setItem(`accepted_by_${alertId}`, user.name);
        localStorage.setItem(`accepted_time_${alertId}`, new Date().toISOString());
        
        const mappedAlert = {
          event_id: alertId,
          event_type: 'unplanned',
          event_cause: activeEmergency.incident_type || activeEmergency.event_cause || 'Emergency',
          priority: 'Critical',
          risk_band: activeEmergency.severity || activeEmergency.risk_band || 'CRITICAL',
          corridor: activeEmergency.location || activeEmergency.corridor,
          description: activeEmergency.description,
          latitude: activeEmergency.latitude,
          longitude: activeEmergency.longitude,
          status: 'EN_ROUTE',
          created_at: activeEmergency.created_at || activeEmergency.timestamp,
          reported_by: activeEmergency.reported_by,
          dispatch_source: activeEmergency.dispatch_source || 'Central Traffic Command Center',
          is_emergency_alert: true
        };
        
        setSelectedIncident(mappedAlert);
        selectedIncidentRef.current = mappedAlert;
        
        const latitude = activeEmergency.latitude;
        const longitude = activeEmergency.longitude;
        const address = activeEmergency.location || activeEmergency.corridor || '';

        // Auto-center map on destination
        if (latitude && longitude && mapInstance.current) {
          mapInstance.current.setView([latitude, longitude], 15);
          console.log("[MAP CENTERED]");
        }
        
        setNavigationActive(true);
        setCorridorActivated(true);
        setCountdownTime(240); // reset 4 minute countdown
        console.log("[ROUTE DRAWN]");
        
        // Open Google Maps Directions
        if (latitude && longitude) {
          window.open(
            `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
            "_blank"
          );
          console.log("[GOOGLE MAPS OPENED]");
        } else if (address) {
          window.open(
            `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`,
            "_blank"
          );
          console.log("[GOOGLE MAPS OPENED]");
        }
        
        fetchIncidents();
      } catch (err) {
        console.error("Failed to accept incident:", err);
      }
    }
  };

  const handleRequestBackup = async () => {
    const activeEmergency = currentEmergency || selectedIncident;
    if (activeEmergency) {
      const alertId = activeEmergency.alert_id || activeEmergency.event_id;
      try {
        const response = await axios.post(`${API_BASE_URL}/emergency/request-backup`, {
          alert_id: alertId,
          status: 'BACKUP_REQUESTED'
        }, getAuthConfig());
        
        console.log("[BACKUP REQUEST SUCCESS]", response.data);
        setBackupStatusMessage("Backup Requested Successfully | Additional Units En Route");
        setTimeout(() => setBackupStatusMessage(null), 5000);
      } catch (err) {
        console.error("Failed to request backup:", err);
        alert("Failed to request backup: " + err.message);
      }
    }
  };

  

  const handleArrivedOnScene = async () => {
    if (!selectedIncident) return;
    try {
      await updateIncidentStatus(
        selectedIncident.event_id,
        selectedIncident.is_emergency_alert,
        'ON_SCENE',
        'Officer arrived on scene.'
      );
      setCountdownTime(0);
      fetchIncidents();
    } catch (err) {
      console.error("Failed to update status to ON_SCENE:", err);
    }
  };

  const handleIncidentResolved = async () => {
    if (!selectedIncident) return;
    try {
      await updateIncidentStatus(
        selectedIncident.event_id,
        selectedIncident.is_emergency_alert,
        'RESOLVED',
        'Incident resolved by responder.'
      );
      
      // Always open outcome form to ingest details into City Learning Engine
      setShowOutcomeForm(true);
      fetchIncidents();
    } catch (err) {
      console.error("Failed to update status to RESOLVED:", err);
    }
  };

  

  // Submit outcome parameters
  const handleOutcomeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedIncident) return;
    
    const alertId = selectedIncident.event_id || selectedIncident.alert_id;
    const isEmergency = selectedIncident.is_emergency_alert || true;

    try {
      // Transition database status from RESOLVED -> KNOWLEDGE UPDATED
      await updateIncidentStatus(
        alertId,
        isEmergency,
        'KNOWLEDGE UPDATED',
        'Outcome submitted. City learning loop calibrated.'
      );
      
      // Parse actual resolution time (extract numbers)
      const actualMin = parseFloat(outcomeData.resolutionTime) || 18;
      const predictedMin = 18; // Expected resolution from our AI fields
      const accuracy = Math.max(0, Math.min(100, Math.round(100 - (Math.abs(predictedMin - actualMin) / predictedMin) * 100)));

      // Simulate update to learning feedback (Emergency Knowledge Learning Loop)
      setLearningFeedback({
        predicted: `${predictedMin} Minutes`,
        actual: `${actualMin} Minutes`,
        accuracy: accuracy,
        routeEffectiveness: '94% (Tactical route A avoided active bottleneck at Richmond Circle)',
        diversionEffectiveness: '88% (Kasturba Rd diversion sustained 34 km/h throughput)',
        recoveryEffectiveness: '96% (Cordon setup completed in 3.5 minutes)'
      });
      
      fetchIncidents();
    } catch (err) {
      console.error("Failed to submit outcome knowledge update:", err);
      alert("Failed to update learning loop: " + err.message);
    }
  };

  const handleResetDashboard = () => {
    // Put dashboard back to Standby Mode
    setNavigationActive(false);
    setCorridorActivated(false);
    setShowOutcomeForm(false);
    setLearningFeedback(null);
    
    if (selectedIncident) {
      handledIncidentsRef.current.push(selectedIncident.event_id);
    }
    
    setSelectedIncident(null);
    selectedIncidentRef.current = null;
    fetchIncidents();
  };

  if (user?.role !== "EMERGENCY_RESPONSE") {
    return null;
  }

  console.log("[PORTAL CONDITION]", user?.role, emergencyPopupOpen, currentEmergency);
  return (
    <div className="relative w-full h-[calc(100vh-140px)] min-h-[600px] font-sans text-slate-100 flex flex-col overflow-hidden select-none">
      
      {/* 100% Screen Map Canvas */}
      <div ref={mapRef} className="absolute inset-0 z-0 bg-[#050b18] rounded-xl overflow-hidden" />

      {/* ================================================= */}
      {/* ACTIVE EMERGENCY DISPATCH BANNER                 */}
      {/* ================================================= */}
      {(() => {
        // Find if there is any pending response alert
        const pending = incidents.find(ev => ev.is_emergency_alert && ev.status === 'PENDING RESPONSE');
        const activeMission = selectedIncident && ['ACCEPTED', 'EN_ROUTE', 'ON_SCENE', 'RESOLVED'].includes(getErtStatus(selectedIncident.event_id));
        
        if (pending && !navigationActive) {
          return (
            <div className="fixed top-4 right-4 z-[999999] pointer-events-auto bg-[#ff0055]/95 border-2 border-red-500 rounded-xl px-4 py-2.5 shadow-[0_0_20px_rgba(255,0,85,0.4)] animate-pulse font-mono text-center">
              <style>{`
                @keyframes pulseBorderRed {
                  0%, 100% { border-color: rgba(239, 68, 68, 0.4); box-shadow: 0 0 10px rgba(239, 68, 68, 0.2); }
                  50% { border-color: rgba(255, 68, 68, 1); box-shadow: 0 0 20px rgba(239, 68, 68, 0.5); }
                }
                .pulse-border-red {
                  animation: pulseBorderRed 1.2s infinite;
                }
              `}</style>
              <div className="pulse-border-red border rounded-lg p-1.5 bg-slate-950/90 text-white font-bold flex flex-col items-center gap-1">
                <span className="text-[11px] font-orbitron tracking-wider text-red-500 font-black">🚨 ACTIVE EMERGENCY DISPATCH</span>
                <span className="text-[9px] uppercase tracking-widest text-slate-350">Response Required</span>
              </div>
            </div>
          );
        } else if (activeMission) {
          const status = getErtStatus(selectedIncident.event_id);
          return (
            <div className="fixed top-4 right-4 z-[999999] pointer-events-auto bg-[#030611]/90 border border-[#00ff66] rounded-xl px-4 py-2 shadow-[0_0_15px_rgba(0,255,102,0.2)] font-mono text-center">
              <div className="text-white font-bold flex flex-col items-center gap-0.5">
                <span className="text-[10px] font-orbitron tracking-wider text-[#00ff66] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00ff66] animate-ping shrink-0"></span>
                  🟢 EMERGENCY RESPONSE ACTIVE
                </span>
                <span className="text-[8px] uppercase tracking-wider text-slate-400 mt-0.5">Status: {status}</span>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Backup Request Toast */}
      {backupStatusMessage && (
        <div className="fixed bottom-6 right-6 z-[999999] bg-[#080c1e]/90 border border-amber-500 rounded-xl px-4 py-3 text-xs text-white font-mono flex items-center gap-2 shadow-2xl glow-cyan animate-fade-in-up">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></div>
          <span>{backupStatusMessage}</span>
        </div>
      )}

      {/* Simulated Mobile SMS Push Notification (8341085984) */}
      {mobileAlertNotification && (
        <div className="fixed top-4 left-4 z-[999999] w-80 bg-slate-950/95 backdrop-blur-md border border-slate-700/50 shadow-2xl rounded-2xl p-4 font-sans text-xs animate-fade-in-down pointer-events-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">
              <Smartphone className="w-3.5 h-3.5 text-[#00d2ff]" />
              <span>Simulated Mobile SMS (8341085984)</span>
            </div>
            <button 
              onClick={() => setMobileAlertNotification(null)}
              className="text-slate-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-1 text-slate-200">
            <p className="font-bold text-red-500 font-orbitron">🚨 TRAFIK - 4X Emergency Alert</p>
            <p className="font-semibold text-white">New emergency assignment received.</p>
            <p className="font-semibold text-slate-350">Incident: {mobileAlertNotification.incident}</p>
            <p className="font-semibold text-slate-350 font-mono">Location: {mobileAlertNotification.location}</p>
            <p className="text-[9px] text-[#00d2ff] pt-1 uppercase font-bold font-mono">Please open the Emergency Response Dashboard immediately.</p>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* FLOATING TOP CONTROLS                            */}
      {/* ================================================= */}
      <div className="absolute top-3 left-3 right-3 z-10 pointer-events-none flex justify-between items-center gap-3">
        
        {/* Layer Filters (Interactive) */}
        <div className="pointer-events-auto flex items-center gap-2 bg-slate-950/85 backdrop-blur-md border border-cyber-border/80 px-3 py-1.5 rounded-xl font-mono text-[9px] text-slate-400">
          <Layers className="w-3.5 h-3.5 text-[#00d2ff]" />
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={showVehicles} onChange={(e) => setShowVehicles(e.target.checked)} />
            My Pos
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={showHospitals} onChange={(e) => setShowHospitals(e.target.checked)} />
            Hospitals
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={showPoliceStations} onChange={(e) => setShowPoliceStations(e.target.checked)} />
            Stations
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={showRoadClosures} onChange={(e) => setShowRoadClosures(e.target.checked)} />
            Closures
          </label>
        </div>


      </div>

      {/* ================================================= */}
      {/* 1. ENHANCED STANDBY MODE                          */}
      {/* ================================================= */}
      {!emergencyPopupOpen && !navigationActive && !showOutcomeForm && (
        <div className="absolute top-16 right-3 bottom-3 w-80 z-10 pointer-events-auto flex flex-col gap-3">
          <div className="glass-card-exact rounded-xl p-4 flex flex-col justify-between h-full overflow-hidden shadow-2xl">
            <div className="space-y-4 font-mono text-xs">
              <div className="text-cyber-green font-bold flex items-center gap-1.5 border-b border-cyber-border/40 pb-2 text-[10px]">
                <span className="w-2 h-2 rounded-full bg-cyber-green animate-ping"></span>
                EMERGENCY RESPONSE READINESS
              </div>
              
              <div className="space-y-2.5">
                <span className="text-slate-500 uppercase text-[8px] block font-bold">AVAILABLE DISPATCH SQUADS:</span>
                
                <div className="bg-[#050b18] p-3 rounded border border-slate-900 flex justify-between items-center">
                  <span className="text-slate-300">🚑 Ambulances</span>
                  <strong className="text-[#00ff66] text-sm">4</strong>
                </div>

                <div className="bg-[#050b18] p-3 rounded border border-slate-900 flex justify-between items-center">
                  <span className="text-slate-300">🚜 Heavy Tow Trucks</span>
                  <strong className="text-[#00ff66] text-sm">2</strong>
                </div>

                <div className="bg-[#050b18] p-3 rounded border border-slate-900 flex justify-between items-center">
                  <span className="text-slate-300">🦺 Rescue Squads</span>
                  <strong className="text-[#00ff66] text-sm">3</strong>
                </div>

                <div className="bg-[#050b18] p-3 rounded border border-slate-900 flex justify-between items-center">
                  <span className="text-slate-300">👮 Traffic Units</span>
                  <strong className="text-[#00ff66] text-sm">5</strong>
                </div>
              </div>

              <div className="p-3 bg-[#00ff66]/5 border border-[#00ff66]/20 rounded text-center text-[10px] text-cyber-green font-bold">
                STATUS: READY FOR DISPATCH
              </div>
            </div>
            
            <p className="text-[8.5px] text-slate-500 font-mono text-center leading-normal">
              Awaiting central NeuroTwin incident dispatches. Remaining passive.
            </p>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* TACTICAL RESPONSE WORKSPACE (PHASE 3 & 4)         */}
      {/* ================================================= */}
      {user?.role === "EMERGENCY_RESPONSE" && navigationActive && selectedIncident && !showOutcomeForm && (
        <div className="absolute top-16 right-3 bottom-3 w-80 z-10 pointer-events-auto flex flex-col gap-3 overflow-y-auto scrollbar-thin pr-1">
          {(() => {
            const aiFields = getIncidentAIFields(selectedIncident);
            const alertId = selectedIncident.event_id || selectedIncident.alert_id;
            const currentStatus = getErtStatus(alertId);
            const acceptedTimeStr = localStorage.getItem(`accepted_time_${alertId}`) 
              ? formatTime(localStorage.getItem(`accepted_time_${alertId}`)) 
              : 'N/A';

            return (
              <div className="glass-card-exact rounded-xl p-4 flex flex-col gap-4 overflow-hidden shadow-2xl bg-[#080c1e]/95 border border-slate-800 text-slate-200">
                {/* Header */}
                <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                  <span className="text-[10px] font-orbitron font-black text-[#00d2ff] tracking-wider uppercase">🚨 ACTIVE MISSION CONTROL</span>
                  <span className="text-[8px] bg-red-950 text-red-400 border border-red-800 px-1.5 py-0.5 rounded font-bold uppercase">{currentStatus}</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin max-h-[62vh]">
                  {/* 1. MISSION INFORMATION */}
                  <div className="space-y-1.5">
                    <div className="text-[9px] font-orbitron text-slate-400 font-bold uppercase tracking-wider border-b border-slate-900 pb-0.5">
                      1. Mission Information
                    </div>
                    <div className="bg-slate-950/70 p-2.5 rounded border border-slate-900 space-y-1.5 text-[8.5px] font-mono text-slate-350">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Incident Type:</span>
                        <strong className="text-white capitalize">{selectedIncident.event_cause || selectedIncident.incident_type || 'Emergency'}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Severity:</span>
                        <strong className="text-red-400 uppercase font-bold">{selectedIncident.risk_band || selectedIncident.severity || 'CRITICAL'}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Event Name:</span>
                        <strong className="text-white truncate max-w-[140px]" title={aiFields.eventName}>{aiFields.eventName}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Exact Address:</span>
                        <strong className="text-white truncate max-w-[140px]" title={selectedIncident.corridor || selectedIncident.location}>{selectedIncident.corridor || selectedIncident.location}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Lat / Lng:</span>
                        <strong className="text-white">{selectedIncident.latitude ? selectedIncident.latitude.toFixed(5) : '12.97160'} / {selectedIncident.longitude ? selectedIncident.longitude.toFixed(5) : '77.59460'}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Report Time:</span>
                        <strong className="text-white">{formatTime(selectedIncident.created_at || selectedIncident.timestamp)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Assigned By:</span>
                        <strong className="text-white">{selectedIncident.reported_by || 'Onsite Traffic Inspector'}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Assigned Zone:</span>
                        <strong className="text-white">{aiFields.assignedZone || 'Central Zone'}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Related Event:</span>
                        <strong className="text-[#00d2ff]">{aiFields.relatedEvent || 'N/A'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* 2. TACTICAL RESPONSE */}
                  <div className="space-y-1.5">
                    <div className="text-[9px] font-orbitron text-slate-400 font-bold uppercase tracking-wider border-b border-slate-900 pb-0.5">
                      2. Tactical Response
                    </div>
                    <div className="bg-slate-950/70 p-2.5 rounded border border-slate-900 space-y-1.5 text-[8.5px] font-mono text-slate-350">
                      <div className="flex flex-col gap-0.5 border-b border-slate-900 pb-1.5">
                        <span className="text-slate-500 mb-0.5">AI Recommendation:</span>
                        <span className="text-slate-200 leading-normal bg-slate-900/40 p-1.5 rounded border border-slate-950 text-[8px]">{aiFields.aiDispatchRecommendation}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Required Units:</span>
                        <strong className="text-white">{aiFields.requiredUnits}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Expected Res Time:</span>
                        <strong className="text-white">{aiFields.expectedResolutionTime}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Confidence Score:</span>
                        <strong className="text-[#00ff66] font-bold font-orbitron">{aiFields.confidenceScore}</strong>
                      </div>
                      <div className="flex flex-col gap-0.5 border-t border-slate-900 pt-1.5">
                        <span className="text-slate-500">Recovery Strategy:</span>
                        <span className="text-slate-200 leading-normal">{aiFields.recoveryPlan}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-slate-500">Recommended Diversion:</span>
                        <span className="text-[#00d2ff] leading-normal">{aiFields.recommendedDiversion}</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. ROUTE GUIDANCE */}
                  <div className="space-y-1.5">
                    <div className="text-[9px] font-orbitron text-slate-400 font-bold uppercase tracking-wider border-b border-slate-900 pb-0.5">
                      3. Route Guidance
                    </div>
                    <div className="bg-slate-950/70 p-2.5 rounded border border-slate-900 space-y-1.5 text-[8.5px] font-mono text-slate-350">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-slate-500">AI Tactical Route:</span>
                        <strong className="text-white leading-normal">{aiFields.aiTacticalRoute}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Est Arrival Time:</span>
                        <strong className="text-[#00d2ff] font-bold">{aiFields.estimatedArrivalTime}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Traffic Risk:</span>
                        <strong className="text-[#ff0055] font-bold">{aiFields.trafficRisk}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Congestion Level:</span>
                        <strong className="text-white">{aiFields.congestionLevel}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Route Confidence:</span>
                        <strong className="text-[#00ff66] font-bold font-orbitron">{aiFields.routeConfidence}</strong>
                      </div>
                    </div>
                  </div>

                  {/* 4. EMERGENCY CORRIDOR */}
                  <div className="space-y-1.5">
                    <div className="text-[9px] font-orbitron text-slate-400 font-bold uppercase tracking-wider border-b border-slate-900 pb-0.5">
                      4. Emergency Corridor
                    </div>
                    <div className="bg-slate-950/70 p-2.5 rounded border border-slate-900 space-y-1.5 text-[8.5px] font-mono text-slate-350">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Corridor Activated:</span>
                        <strong className={corridorActivated ? "text-[#00ff66] font-bold" : "text-slate-400"}>
                          {corridorActivated ? "YES (Active Status)" : "NO"}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Signal Priority Enabled:</span>
                        <strong className="text-[#00ff66] font-bold">{aiFields.trafficSignalPriorityEnabled}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Signals Impacted:</span>
                        <strong className="text-white">{aiFields.signalsImpacted}</strong>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-slate-500">Alt Emergency Route:</span>
                        <span className="text-[#00d2ff] leading-normal">{aiFields.alternativeEmergencyRoute}</span>
                      </div>
                    </div>
                  </div>

                  {/* 5. LIVE MISSION STATUS */}
                  <div className="space-y-1.5">
                    <div className="text-[9px] font-orbitron text-slate-400 font-bold uppercase tracking-wider border-b border-slate-900 pb-0.5">
                      5. Live Mission Status
                    </div>
                    <div className="bg-slate-950/70 p-2.5 rounded border border-slate-900 space-y-1.5 text-[8.5px] font-mono text-slate-350">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Accepted Time:</span>
                        <strong className="text-white">{acceptedTimeStr}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">En Route Time:</span>
                        <strong className="text-white">{acceptedTimeStr}</strong>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-900 pt-1.5 mt-1.5">
                        <div>
                          <span className="text-slate-500 block">Countdown Timer:</span>
                          {countdownTime > 0 ? (
                            <strong className="text-[#00ff66] text-[13px] font-orbitron animate-pulse">{formatCountdown()}</strong>
                          ) : (
                            <strong className="text-[#00ff66] text-[11px] font-orbitron font-bold">🟢 ON SCENE</strong>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-slate-500 block">Current Status:</span>
                          <strong className="text-white font-bold uppercase text-[9px] font-orbitron text-cyber-accent">{currentStatus}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const lat = selectedIncident.latitude;
                        const lng = selectedIncident.longitude;
                        const url = (lat && lng) 
                          ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
                          : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedIncident.corridor)}`;
                        window.open(url, '_blank');
                      }}
                      className="flex-1 py-2 bg-[#00d2ff] hover:bg-[#33dfff] text-slate-950 font-orbitron font-black text-[9px] uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Navigation className="w-3.5 h-3.5" /> Google Maps
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        alert("Route link copied to clipboard!");
                      }}
                      className="py-2 px-3 bg-slate-900 border border-slate-700 hover:text-white rounded-lg text-[8.5px] font-bold font-mono transition-all flex items-center justify-center gap-1 cursor-pointer text-slate-450"
                    >
                      Share Route
                    </button>
                  </div>

                  {currentStatus === 'ASSIGNED' || currentStatus === 'EN_ROUTE' ? (
                    <button
                      onClick={handleArrivedOnScene}
                      className="w-full py-2 bg-[#f59e0b] hover:bg-[#fbbf24] text-slate-950 font-orbitron font-black text-[10px] uppercase tracking-wider rounded-lg transition-all shadow-[0_0_12px_rgba(245,158,11,0.25)] flex items-center justify-center gap-1.5 cursor-pointer animate-pulse"
                    >
                      <CheckSquare className="w-4 h-4 text-slate-950" /> ARRIVED ON SCENE
                    </button>
                  ) : currentStatus === 'ON_SCENE' ? (
                    <button
                      onClick={handleIncidentResolved}
                      className="w-full py-2 bg-[#00ff66] hover:bg-[#12ff7b] text-slate-950 font-orbitron font-black text-[10px] uppercase tracking-wider rounded-lg transition-all shadow-[0_0_12px_rgba(0,255,102,0.25)] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4 text-slate-950" /> INCIDENT RESOLVED
                    </button>
                  ) : (
                    <div className="text-[10px] text-slate-500 font-bold uppercase text-center py-2 bg-slate-900/40 border border-slate-900 rounded">
                      Status: {currentStatus}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ================================================= */}
      {/* MISSION COMPLETED & LEARNING LOOP (PHASE 5 & 6)   */}
      {/* ================================================= */}
      {showOutcomeForm && selectedIncident && (
        <div className="absolute top-16 right-3 bottom-3 w-80 z-10 pointer-events-auto flex flex-col gap-3 overflow-y-auto scrollbar-thin pr-1">
          {learningFeedback ? (
            <div className="space-y-4">
              <div className="flex flex-col justify-center items-center font-mono text-[9px] text-center space-y-3 p-4 border border-[#00ff66]/30 bg-[#00ff66]/5 rounded-lg relative overflow-hidden shadow-[0_0_20px_rgba(0,255,102,0.15)] animate-pulse">
                <CheckCircle className="w-8 h-8 text-[#00ff66] animate-bounce" />
                
                <div className="font-bold text-[#00ff66] uppercase tracking-widest text-[11px] font-orbitron">EMERGENCY KNOWLEDGE UPDATED</div>
                
                <div className="w-full grid grid-cols-2 gap-2 text-slate-350 text-[8.5px] mt-2">
                  <div className="bg-[#050b18] p-2 rounded border border-slate-900">
                    <span className="block text-slate-500 uppercase text-[6.5px]">Predicted Resolution</span>
                    <strong className="text-white text-xs">{learningFeedback.predicted}</strong>
                  </div>
                  <div className="bg-[#050b18] p-2 rounded border border-slate-900">
                    <span className="block text-slate-550 uppercase text-[6.5px]">Actual Resolution</span>
                    <strong className="text-white text-xs">{learningFeedback.actual}</strong>
                  </div>
                  <div className="bg-[#050b18] p-2 rounded border border-slate-900 col-span-2">
                    <span className="block text-slate-500 uppercase text-[6.5px]">Prediction Accuracy</span>
                    <strong className="text-[#00ff66] text-xs">{learningFeedback.accuracy}%</strong>
                  </div>
                </div>

                <div className="w-full border-t border-slate-900 pt-2 text-left space-y-2">
                  <span className="text-[#00ff66] font-bold text-[7.5px] uppercase">Effectiveness Metrics Added:</span>
                  <div className="text-slate-300 text-[8px] bg-[#050b18] p-2 rounded border border-slate-950 font-mono space-y-1.5 w-full">
                    <div>
                      <span className="text-slate-500 block uppercase text-[6px]">Route Effectiveness</span>
                      <strong className="text-[#00d2ff]">{learningFeedback.routeEffectiveness}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase text-[6px]">Diversion Effectiveness</span>
                      <strong className="text-[#00d2ff]">{learningFeedback.diversionEffectiveness}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase text-[6px]">Recovery Effectiveness</span>
                      <strong className="text-[#00d2ff]">{learningFeedback.recoveryEffectiveness}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleResetDashboard}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded text-slate-350 hover:text-white cursor-pointer font-bold font-orbitron text-[9px] uppercase tracking-wider transition-all"
              >
                RETURN TO READY STANDBY
              </button>
            </div>
          ) : (
            <CommandCard title="MISSION COMPLETED - OUTCOME INGESTION">
              <form onSubmit={handleOutcomeSubmit} className="space-y-3 font-mono text-[9px]">
                <div>
                  <label className="text-slate-500 block text-[7.5px] font-bold">Arrival Time</label>
                  <input
                    type="text"
                    value={outcomeData.arrivalTime}
                    onChange={(e) => setOutcomeData({ ...outcomeData, arrivalTime: e.target.value })}
                    className="w-full bg-[#050b18] border border-slate-855 rounded px-2 py-1 text-white focus:border-[#00d2ff] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-500 block text-[7.5px] font-bold">Resolution Time (min)</label>
                  <input
                    type="text"
                    value={outcomeData.resolutionTime}
                    onChange={(e) => setOutcomeData({ ...outcomeData, resolutionTime: e.target.value })}
                    className="w-full bg-[#050b18] border border-slate-855 rounded px-2 py-1 text-white focus:border-[#00d2ff] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-500 block text-[7.5px] font-bold">Resources Deployed Details</label>
                  <input
                    type="text"
                    value={outcomeData.resourcesUsed}
                    onChange={(e) => setOutcomeData({ ...outcomeData, resourcesUsed: e.target.value })}
                    className="w-full bg-[#050b18] border border-slate-855 rounded px-2 py-1 text-white focus:border-[#00d2ff] focus:outline-none"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-550 block text-[7.5px] font-bold">Casualties</label>
                    <input
                      type="number"
                      value={outcomeData.casualties}
                      onChange={(e) => setOutcomeData({ ...outcomeData, casualties: e.target.value })}
                      className="w-full bg-[#050b18] border border-slate-855 rounded px-2 py-1 text-white focus:border-[#00d2ff] focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-slate-555 block text-[7.5px] font-bold">Reopened Time</label>
                    <input
                      type="text"
                      value={outcomeData.roadReopenedTime}
                      onChange={(e) => setOutcomeData({ ...outcomeData, roadReopenedTime: e.target.value })}
                      className="w-full bg-[#050b18] border border-slate-855 rounded px-2 py-1 text-white focus:border-[#00d2ff] focus:outline-none"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-slate-500 block text-[7.5px] font-bold">Diversion Used</label>
                  <input
                    type="text"
                    value={outcomeData.diversionUsed}
                    onChange={(e) => setOutcomeData({ ...outcomeData, diversionUsed: e.target.value })}
                    className="w-full bg-[#050b18] border border-slate-855 rounded px-2 py-1 text-white focus:border-[#00d2ff] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-550 block text-[7.5px] font-bold">Recovery Strategy Used</label>
                  <input
                    type="text"
                    value={outcomeData.recoveryStrategy}
                    onChange={(e) => setOutcomeData({ ...outcomeData, recoveryStrategy: e.target.value })}
                    className="w-full bg-[#050b18] border border-slate-855 rounded px-2 py-1 text-white focus:border-[#00d2ff] focus:outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#00ff66]/10 border border-[#00ff66]/40 text-[#00ff66] hover:bg-[#00ff66] hover:text-[#030611] font-bold font-orbitron rounded-lg cursor-pointer text-center transition-all text-[9px] uppercase tracking-wider"
                >
                  SUBMIT TO CITY LEARNING ENGINE
                </button>
              </form>
            </CommandCard>
          )}
        </div>
      )}
       
      {user?.role === "EMERGENCY_RESPONSE" && emergencyPopupOpen && currentEmergency && createPortal(
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-6 z-[999999] animate-fade-in select-text">
          {console.log("[EMERGENCY POPUP RENDERED]")}
          <div className="w-full max-w-md bg-[#080c1e] border-2 border-red-500 rounded-2xl p-5 overflow-hidden shadow-2xl relative space-y-3.5 max-h-[90vh] overflow-y-auto scrollbar-thin">
            
            {/* Blinking Header */}
            <div className="emergency-card-flash p-2.5 rounded-lg flex items-center justify-center gap-2 border border-red-500/30">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              <strong className="text-[10px] font-orbitron text-red-500 tracking-wider">🚨 NEW EMERGENCY ASSIGNMENT</strong>
            </div>

            {(() => {
              const displayAlert = currentEmergency;
              const severityVal = displayAlert.severity || displayAlert.risk_band || 'CRITICAL';
              const alertIdVal = displayAlert.alert_id || displayAlert.event_id;
              const incidentTypeVal = displayAlert.incident_type || displayAlert.event_cause || 'Emergency';
              const locationVal = displayAlert.location || displayAlert.corridor;
              const timeVal = formatTime(displayAlert.timestamp || displayAlert.created_at);
              const aiFields = getIncidentAIFields(displayAlert);

              return (
                <>
                  {/* Severity classification */}
                  <div className="p-2 bg-[#ff0055]/5 border border-[#ff0055]/30 rounded-lg flex justify-between items-center font-mono text-[9px]">
                    <div>
                      <span className="text-slate-500 block text-[7px] uppercase font-bold">SEVERITY CLASSIFICATION:</span>
                      <strong className="text-white block font-orbitron uppercase text-[10.5px]">{severityVal}</strong>
                    </div>
                    <span className="text-slate-400 text-[8px] italic text-right max-w-[170px] leading-tight">Critical dispatch response alert requested.</span>
                  </div>

                  {/* Emergency Incident details */}
                  <div className="space-y-2 border border-slate-900 bg-slate-950/80 p-3 rounded-lg font-mono text-[9px] text-slate-350 max-h-[50vh] overflow-y-auto scrollbar-thin">
                    <div className="flex justify-between border-b border-slate-900/50 pb-1.5">
                      <span className="text-slate-500 uppercase font-bold">Incident ID:</span>
                      <strong className="text-white">{alertIdVal}</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-900/50 pb-1.5">
                      <span className="text-slate-500 uppercase font-bold">Incident Type:</span>
                      <strong className="text-white capitalize">{incidentTypeVal}</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-900/50 pb-1.5">
                      <span className="text-slate-500 uppercase font-bold">Severity:</span>
                      <strong className="text-red-400 font-orbitron">{severityVal}</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-900/50 pb-1.5">
                      <span className="text-slate-500 uppercase font-bold">Event Name:</span>
                      <strong className="text-white text-right max-w-[180px] truncate" title={aiFields.eventName}>{aiFields.eventName}</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-900/50 pb-1.5">
                      <span className="text-slate-500 uppercase font-bold">Exact Address:</span>
                      <strong className="text-white truncate max-w-[200px]" title={locationVal}>{locationVal}</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-900/50 pb-1.5">
                      <span className="text-slate-500 uppercase font-bold">Latitude:</span>
                      <strong className="text-white">{displayAlert.latitude}</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-900/50 pb-1.5">
                      <span className="text-slate-500 uppercase font-bold">Longitude:</span>
                      <strong className="text-white">{displayAlert.longitude}</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-900/50 pb-1.5">
                      <span className="text-slate-500 uppercase font-bold">Distance:</span>
                      <strong className="text-white">1.8 KM</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-900/50 pb-1.5">
                      <span className="text-slate-500 uppercase font-bold">ETA:</span>
                      <strong className="text-[#00d2ff] font-bold">4 Mins</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-900/50 pb-1.5">
                      <span className="text-slate-500 uppercase font-bold">Time Reported:</span>
                      <strong className="text-white">{timeVal}</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-900/50 pb-1.5">
                      <span className="text-slate-500 uppercase font-bold">Priority:</span>
                      <strong className="text-red-400 font-bold">{aiFields.priority}</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-900/50 pb-1.5">
                      <span className="text-slate-500 uppercase font-bold">Assigned Zone:</span>
                      <strong className="text-white">{aiFields.assignedZone}</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-900/50 pb-1.5">
                      <span className="text-slate-500 uppercase font-bold">Reported By:</span>
                      <strong className="text-white">{displayAlert.reported_by || 'Onsite Traffic Inspector'}</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-900/50 pb-1.5">
                      <span className="text-slate-500 uppercase font-bold">Dispatch Source:</span>
                      <strong className="text-[#00d2ff]">{displayAlert.dispatch_source || 'Central Traffic Command Center'}</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-900/50 pb-1.5">
                      <span className="text-slate-500 uppercase font-bold">Related Event:</span>
                      <strong className="text-white">{aiFields.relatedEvent}</strong>
                    </div>
                    <div className="flex flex-col border-b border-slate-900/50 pb-1.5 gap-0.5">
                      <span className="text-slate-500 uppercase font-bold">AI Dispatch Recommendation:</span>
                      <span className="text-slate-200 text-[8.5px] leading-normal">{aiFields.aiDispatchRecommendation}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-900/50 pb-1.5">
                      <span className="text-slate-500 uppercase font-bold">Required Units:</span>
                      <strong className="text-white">{aiFields.requiredUnits}</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-900/50 pb-1.5">
                      <span className="text-slate-500 uppercase font-bold">Expected Resolution Time:</span>
                      <strong className="text-white">{aiFields.expectedResolutionTime}</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-900/50 pb-1.5">
                      <span className="text-slate-500 uppercase font-bold">Confidence Score:</span>
                      <strong className="text-cyber-green font-bold font-orbitron">{aiFields.confidenceScore}</strong>
                    </div>
                    <div className="flex flex-col border-b border-slate-900/50 pb-1.5 gap-0.5">
                      <span className="text-slate-500 uppercase font-bold">Incident Memory Recall:</span>
                      <span className="text-slate-200 text-[8.5px] leading-normal">{aiFields.incidentMemoryRecall}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-900/50 pb-1.5">
                      <span className="text-slate-500 uppercase font-bold">Most Similar Incident:</span>
                      <strong className="text-white">{aiFields.mostSimilarIncident}</strong>
                    </div>
                    <div className="flex flex-col border-b border-slate-900/50 pb-1.5 gap-0.5">
                      <span className="text-slate-500 uppercase font-bold">Recovery Plan:</span>
                      <span className="text-slate-200 text-[8.5px] leading-normal">{aiFields.recoveryPlan}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-slate-500 uppercase font-bold">Recommended Diversion:</span>
                      <span className="text-[#00d2ff] text-[8.5px] leading-normal">{aiFields.recommendedDiversion}</span>
                    </div>
                  </div>
                </>
              );
            })()}

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-1.5">
              <button 
                onClick={handleAcceptAssignment}
                className="w-full py-2 bg-red-500 hover:bg-red-600 text-black font-orbitron font-black text-[10px] rounded-lg tracking-wider cursor-pointer shadow-[0_0_12px_rgba(239,68,68,0.4)] transition-all flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4 text-black" />
                ACCEPT ASSIGNMENT
              </button>
              
              <div className="grid grid-cols-2 gap-2 font-mono text-[9px]">
                <button 
                  onClick={handleRequestBackup}
                  className="py-1.5 border border-amber-500 bg-amber-950/20 text-amber-400 hover:bg-amber-900/40 rounded-lg text-[8.5px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  REQUEST BACKUP
                </button>
                <button 
                  onClick={() => {
                    alert("Incident Escalated to Central Traffic Control Room Successfully.");
                  }}
                  className="py-1.5 border border-blue-500 bg-blue-950/20 text-blue-400 hover:bg-blue-900/40 rounded-lg text-[8.5px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  ESCALATE TO CONTROL
                </button>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
