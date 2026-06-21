import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import CommandCard from './ui/CommandCard';
import CommandButton from './ui/CommandButton';
import { Clock, MapPin, Zap, AlertTriangle, AlertCircle, RefreshCw, Send, CheckCircle, ShieldAlert, Cpu, X, Loader2 } from 'lucide-react';

export default function ConstableDashboard() {
  const [selectedZone, setSelectedZone] = useState('North Zone');
  const [readinessScore, setReadinessScore] = useState(92);
  const [status, setStatus] = useState('ACTIVE');
  

  
  // Available Resource Roster
  const [availableResources, setAvailableResources] = useState({
    officers: 28,
    barricades: 15,
    towVehicles: 4,
    emergencyUnits: 3
  });

  const [zones, setZones] = useState({
    'North Zone': {
      name: 'North Zone',
      center: [12.9984, 77.5926],
      status: 'ACTIVE',
      statusColor: 'red',
      priority: 'PRIMARY',
      readiness: 92,
      readinessLabel: 'READY',
      officers: 28,
      barricades: 15,
      towVehicles: 4,
      emergencyUnits: 3,
      activeEvents: 1,
      citizenImpact: 'Critical',
      boundary: [
        [13.0180, 77.5720],
        [13.0180, 77.6120],
        [12.9830, 77.6120],
        [12.9830, 77.5720]
      ]
    },
    'West Zone': {
      name: 'West Zone',
      center: [12.9604, 77.5326],
      status: 'STANDBY',
      statusColor: 'yellow',
      priority: 'SECONDARY',
      readiness: 78,
      readinessLabel: 'STANDBY',
      officers: 12,
      barricades: 8,
      towVehicles: 2,
      emergencyUnits: 1,
      activeEvents: 0,
      citizenImpact: 'Moderate',
      boundary: [
        [12.9800, 77.5120],
        [12.9800, 77.5520],
        [12.9400, 77.5520],
        [12.9400, 77.5120]
      ]
    },
    'Central Zone': {
      name: 'Central Zone',
      center: [12.9716, 77.5946],
      status: 'WATCHLIST',
      statusColor: 'orange',
      priority: 'TERTIARY',
      readiness: 71,
      readinessLabel: 'WATCH',
      officers: 18,
      barricades: 10,
      towVehicles: 3,
      emergencyUnits: 2,
      activeEvents: 1,
      citizenImpact: 'Elevated',
      boundary: [
        [12.9850, 77.5740],
        [12.9850, 77.6140],
        [12.9500, 77.6140],
        [12.9500, 77.5740]
      ]
    },
    'South Zone': {
      name: 'South Zone',
      center: [12.9304, 77.6226],
      status: 'INACTIVE',
      statusColor: 'gray',
      priority: 'INACTIVE',
      readiness: 95,
      readinessLabel: 'READY',
      officers: 15,
      barricades: 12,
      towVehicles: 3,
      emergencyUnits: 2,
      activeEvents: 0,
      citizenImpact: 'Low',
      boundary: [
        [12.9500, 77.6020],
        [12.9500, 77.6420],
        [12.9100, 77.6420],
        [12.9100, 77.6020]
      ]
    },
    'East Zone': {
      name: 'East Zone',
      center: [12.9784, 77.6408],
      status: 'INACTIVE',
      statusColor: 'gray',
      priority: 'INACTIVE',
      readiness: 88,
      readinessLabel: 'READY',
      officers: 14,
      barricades: 9,
      towVehicles: 2,
      emergencyUnits: 1,
      activeEvents: 0,
      citizenImpact: 'Low',
      boundary: [
        [13.0000, 77.6200],
        [13.0000, 77.6600],
        [12.9600, 77.6600],
        [12.9600, 77.6200]
      ]
    }
  });

  const [hoveredZone, setHoveredZone] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const handleZoneMouseEnter = (e, zoneName) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const parentRect = e.currentTarget.offsetParent.getBoundingClientRect();
    setTooltipPos({
      x: rect.left - parentRect.left + rect.width / 2,
      y: rect.top - parentRect.top - 10
    });
    setHoveredZone(zoneName);
  };

  const handleZoneMouseLeave = () => {
    setHoveredZone(null);
  };

  const handleZoneClick = (zoneName) => {
    setSelectedZone(zoneName);
    const zone = zones[zoneName];
    if (zone) {
      if (mapInstance.current) {
        mapInstance.current.setView(zone.center, 13);
      }
      setStatus(zone.status);
      setReadinessScore(zone.readiness);
      setAvailableResources({
        officers: zone.officers,
        barricades: zone.barricades,
        towVehicles: zone.towVehicles,
        emergencyUnits: zone.emergencyUnits
      });
      
      if (zoneName === 'North Zone') {
        setEventDetails({
          name: 'Political Rally',
          attendance: '50,000',
          start: '4 PM',
          end: '9 PM',
          risk: 'High',
          confidence: '91%',
          citizenImpact: 'Critical'
        });
      } else if (zoneName === 'Central Zone') {
        setEventDetails({
          name: 'Metro Construction Spillover',
          attendance: 'N/A',
          start: 'Ongoing',
          end: '11 PM',
          risk: 'Medium',
          confidence: '85%',
          citizenImpact: 'Elevated'
        });
      } else {
        setEventDetails({
          name: 'None',
          attendance: '0',
          start: '-',
          end: '-',
          risk: 'Low',
          confidence: '100%',
          citizenImpact: 'None'
        });
      }
    }
  };

  const renderZoneCard = (zoneName) => {
    const zone = zones[zoneName];
    if (!zone) return <div />;
    
    let glowClass = "zone-glow-inactive";
    let textColor = "text-slate-400";
    let glowDot = "bg-slate-400";
    
    if (zone.status === 'ACTIVE') {
      glowClass = "zone-glow-active";
      textColor = "text-cyber-red";
      glowDot = "bg-cyber-red animate-pulse";
    } else if (zone.status === 'STANDBY') {
      glowClass = "zone-glow-standby";
      textColor = "text-[#ffcc00]";
      glowDot = "bg-[#ffcc00]";
    } else if (zone.status === 'WATCHLIST') {
      glowClass = "zone-glow-watchlist";
      textColor = "text-[#ff7700]";
      glowDot = "bg-[#ff7700]";
    }

    let priorityBadge = null;
    if (zone.priority === 'PRIMARY') {
      priorityBadge = <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-cyber-red/40 bg-cyber-red/10 text-cyber-red">PRIMARY</span>;
    } else if (zone.priority === 'SECONDARY') {
      priorityBadge = <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-[#ffcc00]/40 bg-[#ffcc00]/10 text-[#ffcc00]">SECONDARY</span>;
    } else if (zone.priority === 'TERTIARY') {
      priorityBadge = <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-[#ff7700]/40 bg-[#ff7700]/10 text-[#ff7700]">TERTIARY</span>;
    } else {
      priorityBadge = <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-700 bg-slate-800/40 text-slate-500">INACTIVE</span>;
    }

    return (
      <div
        onClick={() => handleZoneClick(zoneName)}
        onMouseEnter={(e) => handleZoneMouseEnter(e, zoneName)}
        onMouseLeave={handleZoneMouseLeave}
        className={`glass-card-exact rounded-xl cursor-pointer p-4 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 select-none ${glowClass} ${selectedZone === zoneName ? 'ring-2 ring-cyber-accent' : ''}`}
        style={{ minHeight: '100px' }}
      >
        <div className="flex justify-between items-start gap-1 mb-1">
          <span className="font-orbitron font-extrabold text-[12px] tracking-wide text-slate-100 uppercase">{zone.name.replace(' Zone', '')}</span>
          <div className="flex items-center gap-1 shrink-0">
            <span className={`w-1.5 h-1.5 rounded-full ${glowDot}`}></span>
            <span className={`font-mono text-[9px] font-extrabold uppercase ${textColor}`}>{zone.status}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1 mt-1.5">
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
            <span>Readiness:</span>
            <span className="font-bold text-white">{zone.readiness}%</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            {priorityBadge}
            <span className="text-[8px] text-slate-500 font-mono font-bold uppercase">{zone.readinessLabel}</span>
          </div>
        </div>
      </div>
    );
  };

  // Event Details State
  const [eventDetails, setEventDetails] = useState({
    name: 'Political Rally',
    attendance: '50,000',
    start: '4 PM',
    end: '9 PM',
    risk: 'High',
    confidence: '91%',
    citizenImpact: 'Critical'
  });

  // Strategy Report State
  const [strategyAccepted, setStrategyAccepted] = useState(false);
  const [strategyPlan, setStrategyPlan] = useState({
    officers: 25,
    barricades: 10,
    tows: 4,
    emergencyTeam: 'Active'
  });

  // Road status simulation state (SimCity style)
  const [roads, setRoads] = useState({
    'Road A': { status: 'Normal', color: 'green', flow: 100 },
    'Road B': { status: 'Normal', color: 'green', flow: 100 },
    'Main Rally Road': { status: 'Normal', color: 'green', flow: 100 },
    'Road X': { status: 'Busy', color: 'yellow', flow: 70 },
    'Road Y': { status: 'Normal', color: 'green', flow: 100 },
    'Road Z': { status: 'Normal', color: 'green', flow: 100 }
  });

  // AI impact HUD overlay state
  const [aiImpact, setAiImpact] = useState(null);

  // Cross-Zone Ripple metrics
  const [rippleData, setRippleData] = useState({
    north: '100% (🔴)',
    west: '+21% (🟡)',
    central: '+9% (🟠)',
    south: '+3% (⚪)'
  });

  // Emergency Scenario State
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [emergencyScenario, setEmergencyScenario] = useState(null);

  // Task Timeline logs
  const [timeline, setTimeline] = useState([
    { time: '03:00 PM', text: 'Event Activated (Political Rally Approved by Commissioner)' },
    { time: '03:10 PM', text: 'Barricades Deployed at Junction 1 & 3' }
  ]);

  // Escalation & Emergency Request States
  const [escalated, setEscalated] = useState(false);
  const [ertRequested, setErtRequested] = useState(false);

  // Deployed map markers state
  const [deployedMarkers, setDeployedMarkers] = useState([]);

  // Completion Form State
  const [completionData, setCompletionData] = useState({
    actualDelay: 12,
    actualCongestion: 24,
    resourcesUsed: '25 Officers, 10 Barricades, 1 ERT Unit',
    incidents: '1 Minor fender bender',
    complaints: '3 minor noise level complaints',
    notes: 'Detour Route B successfully prevented gridlock.'
  });

  const [chatMessages, setChatMessages] = useState([
    { sender: 'ACP Anirudh', time: '14:32', text: 'Inspector Sharma, please check the congestion spillover at MG Road link.', channel: 'Command' },
    { sender: 'Operator Roy', time: '14:35', text: 'Ambulance dispatched to Richmond underpass waterlogging site.', channel: 'Command' },
    { sender: 'Field Officer Patil', time: '14:40', text: 'Barricades deployed at South End Road checkpost.', channel: 'Field' }
  ]);
  const [chatInput, setChatInput] = useState('');

  // Leaflet Map Refs
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersGroup = useRef(null);

  const addTimelineEvent = (text) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setTimeline(prev => [...prev, { time: timeStr, text }]);
  };

  const handleAcceptStrategy = () => {
    if (strategyAccepted) return;
    setStrategyAccepted(true);
    setAvailableResources(prev => ({
      ...prev,
      officers: 3,
      barricades: 5,
      towVehicles: 0
    }));
    setZones(prev => ({
      ...prev,
      'North Zone': {
        ...prev['North Zone'],
        officers: 3,
        barricades: 5,
        towVehicles: 0
      }
    }));
    
    // Spawn default markers representing strategy deployment
    const defaultMarkers = [
      { id: 'def-off-1', type: 'officer', latlng: { lat: 12.9994, lng: 77.5936 } },
      { id: 'def-off-2', type: 'officer', latlng: { lat: 12.9964, lng: 77.5946 } },
      { id: 'def-bar-1', type: 'barricade', latlng: { lat: 12.9984, lng: 77.5926 } },
      { id: 'def-bar-2', type: 'barricade', latlng: { lat: 12.9944, lng: 77.5966 } }
    ];
    setDeployedMarkers(prev => [...prev, ...defaultMarkers]);
    addTimelineEvent("Strategy Accepted. 25 Officers, 10 Barricades & 4 Tows deployed on map.");
  };

  const handleModifyStrategy = () => {
    alert("Manual overrides active. Adjust strategy settings below or drag-and-drop assets directly onto the map.");
  };

  // Drag and drop event handlers
  const handleDragStart = (e, teamType) => {
    e.dataTransfer.setData("text/plain", teamType);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const teamType = e.dataTransfer.getData("text/plain");
    
    if (!mapRef.current || !mapInstance.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const latlng = mapInstance.current.containerPointToLatLng([x, y]);
    deployTeam(teamType, latlng);
  };

  const deployTeam = (teamType, latlng) => {
    if (teamType === 'officer') {
      if (availableResources.officers <= 0) return alert("No available Officer teams.");
      setAvailableResources(prev => ({ ...prev, officers: prev.officers - 1 }));
      setZones(prev => ({
        ...prev,
        [selectedZone]: {
          ...prev[selectedZone],
          officers: Math.max(0, prev[selectedZone].officers - 1)
        }
      }));
      setDeployedMarkers(prev => [...prev, { id: `off-${Date.now()}`, type: 'officer', latlng }]);
      addTimelineEvent(`Deployed Officer Team at [${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}]`);
    } else if (teamType === 'barricade') {
      if (availableResources.barricades <= 0) return alert("No available Barricade materials.");
      setAvailableResources(prev => ({ ...prev, barricades: prev.barricades - 1 }));
      setZones(prev => ({
        ...prev,
        [selectedZone]: {
          ...prev[selectedZone],
          barricades: Math.max(0, prev[selectedZone].barricades - 1)
        }
      }));
      setDeployedMarkers(prev => [...prev, { id: `bar-${Date.now()}`, type: 'barricade', latlng }]);
      addTimelineEvent(`Deployed Barricade at [${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}]`);
    } else if (teamType === 'tow') {
      if (availableResources.towVehicles <= 0) return alert("No available Tow units.");
      setAvailableResources(prev => ({ ...prev, towVehicles: prev.towVehicles - 1 }));
      setZones(prev => ({
        ...prev,
        [selectedZone]: {
          ...prev[selectedZone],
          towVehicles: Math.max(0, prev[selectedZone].towVehicles - 1)
        }
      }));
      setDeployedMarkers(prev => [...prev, { id: `tow-${Date.now()}`, type: 'tow', latlng }]);
      addTimelineEvent(`Deployed Tow Unit at [${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}]`);
    } else if (teamType === 'emergency') {
      if (availableResources.emergencyUnits <= 0) return alert("No available Emergency units.");
      setAvailableResources(prev => ({ ...prev, emergencyUnits: prev.emergencyUnits - 1 }));
      setZones(prev => ({
        ...prev,
        [selectedZone]: {
          ...prev[selectedZone],
          emergencyUnits: Math.max(0, prev[selectedZone].emergencyUnits - 1)
        }
      }));
      setDeployedMarkers(prev => [...prev, { id: `emerg-${Date.now()}`, type: 'emergency', latlng }]);
      addTimelineEvent(`Deployed Emergency Unit at [${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}]`);
    }
  };

  // Road Control logic
  const applyRoadControl = (roadName, controlType) => {
    let newRoads = { ...roads };
    
    if (controlType === 'Close') {
      newRoads[roadName] = { status: 'Closed', color: 'red', flow: 0 };
      
      if (roadName === 'Main Rally Road') {
        newRoads['Road X'] = { status: 'Congested', color: 'red', flow: 15 };
        newRoads['Road Y'] = { status: 'Busy', color: 'yellow', flow: 50 };
        newRoads['Road Z'] = { status: 'Busy', color: 'yellow', flow: 60 };
        
        setAiImpact({
          congestionBefore: 12,
          congestionAfter: 32,
          delayBefore: 4,
          delayAfter: 12,
          affectedRoads: 'Road X, Y, Z',
          citizenBefore: 200,
          citizenAfter: 850,
          recoveryBefore: 15,
          recoveryAfter: 45
        });
        addTimelineEvent("03:20 PM - Main Rally Road Closed. Diversion Activated.");
      } else {
        newRoads['Road B'] = { status: 'Congested', color: 'red', flow: 20 };
        setAiImpact({
          congestionBefore: 8,
          congestionAfter: 18,
          delayBefore: 3,
          delayAfter: 7,
          affectedRoads: 'Road B',
          citizenBefore: 100,
          citizenAfter: 350,
          recoveryBefore: 10,
          recoveryAfter: 25
        });
        addTimelineEvent(`${roadName} Closed. Traffic flow shifted.`);
      }
    } else if (controlType === 'Open') {
      newRoads[roadName] = { status: 'Normal', color: 'green', flow: 100 };
      if (roadName === 'Main Rally Road') {
        newRoads['Road X'] = { status: 'Busy', color: 'yellow', flow: 70 };
        newRoads['Road Y'] = { status: 'Normal', color: 'green', flow: 100 };
        newRoads['Road Z'] = { status: 'Normal', color: 'green', flow: 100 };
      }
      setAiImpact(null);
      addTimelineEvent(`${roadName} opened. Traffic flow normalized.`);
    } else {
      newRoads[roadName] = { status: `${controlType} Active`, color: 'yellow', flow: 60 };
      addTimelineEvent(`Applied ${controlType} control on ${roadName}.`);
    }

    setRoads(newRoads);
  };

  const handleTriggerEmergency = () => {
    setEmergencyActive(true);
    setEmergencyScenario({
      scenario: 'Emergency Scenario D',
      officers: 8,
      tows: 2,
      ambulances: 1
    });

    const emergencyMarkers = [
      { id: 'emerg-amb-1', type: 'ambulance', latlng: { lat: 13.0014, lng: 77.5906 } },
      { id: 'emerg-tow-1', type: 'tow', latlng: { lat: 12.9974, lng: 77.5916 } }
    ];
    setDeployedMarkers(prev => [...prev, ...emergencyMarkers]);
    addTimelineEvent("04:15 PM - Accident Detected (Bus Accident). AI generated Response Scenario D.");
  };

  const handleEscalateRequest = () => {
    setEscalated(true);
    addTimelineEvent("Escalate Resource Request sent to mainframe (Need 8 Officers, 3 Barricades, 2 Tows).");
    alert("Resource escalation request dispatched.");
  };

  const handleRequestERT = () => {
    setErtRequested(true);
    addTimelineEvent("04:18 PM - Emergency Team Dispatched. ETA: 4 Mins.");
    alert("Emergency Response Team requested.");
  };

  const handleCompletionSubmit = async (e) => {
    e.preventDefault();
    alert("Operational logs transmitted to Learning Engine and City Memory Vault.");
    addTimelineEvent("04:30 PM - Situation Stabilized. Data archived.");
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages(prev => [...prev, { sender: 'Officer Sharma', time: timeStr, text: chatInput }]);
    setChatInput('');
  };

  // Readiness Score Band Color Helper
  const getReadinessColor = (score) => {
    if (score >= 90) return 'text-[#00ff66] border-[#00ff66]/30 bg-[#00ff66]/10';
    if (score >= 75) return 'text-[#ffcc00] border-[#ffcc00]/30 bg-[#ffcc00]/10';
    if (score >= 50) return 'text-[#ff7700] border-[#ff7700]/30 bg-[#ff7700]/10';
    return 'text-[#ff0055] border-[#ff0055]/30 bg-[#ff0055]/10';
  };

  const getReadinessLabel = (score) => {
    if (score >= 90) return 'READY';
    if (score >= 75) return 'STABLE';
    if (score >= 50) return 'CAUTION';
    return 'CRITICAL';
  };



  // Map Drawing Effect
  useEffect(() => {
    const L = window.L;
    if (!L || !mapRef.current) return;

    const center = [12.9984, 77.5926];

    if (!mapInstance.current) {
      const map = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView(center, 12);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapInstance.current = map;
      markersGroup.current = L.featureGroup().addTo(map);
    }

    markersGroup.current.clearLayers();

    // Custom Emojis Leaflet DivIcons
    const getIcon = (type) => {
      if (type === 'officer') {
        return L.divIcon({
          html: `<div class="w-8 h-8 rounded-full bg-[#00f0ff]/10 border border-[#00f0ff] flex items-center justify-center text-xs shadow-[0_0_8px_#00f0ff]">👮</div>`,
          className: 'custom-div-icon',
          iconSize: [32, 32]
        });
      }
      if (type === 'barricade') {
        return L.divIcon({
          html: `<div class="w-8 h-8 rounded bg-[#ff7700]/10 border border-[#ff7700] flex items-center justify-center text-xs shadow-[0_0_8px_#ff7700]">🚧</div>`,
          className: 'custom-div-icon',
          iconSize: [32, 32]
        });
      }
      if (type === 'ambulance') {
        return L.divIcon({
          html: `<div class="w-8 h-8 rounded bg-[#ff0055]/10 border border-[#ff0055] flex items-center justify-center text-xs shadow-[0_0_8px_#ff0055] animate-pulse">🚑</div>`,
          className: 'custom-div-icon',
          iconSize: [32, 32]
        });
      }
      if (type === 'tow') {
        return L.divIcon({
          html: `<div class="w-8 h-8 rounded bg-[#ffcc00]/10 border border-[#ffcc00] flex items-center justify-center text-xs shadow-[0_0_8px_#ffcc00]">🚜</div>`,
          className: 'custom-div-icon',
          iconSize: [32, 32]
        });
      }
      return null;
    };

    // Draw Event Location Circle
    const rallyRange = L.circle(center, {
      color: '#ff0055',
      fillColor: '#ff0055',
      fillOpacity: 0.1,
      radius: 300
    }).addTo(markersGroup.current);
    rallyRange.bindTooltip("POLITICAL RALLY CENTER", { permanent: true, className: "bg-[#080c1e] text-white border-cyber-border font-mono text-[9px]", direction: "center" });

    // Draw Zone Boundaries Polygons
    const zoneStyles = {
      'North Zone': { color: '#ff0055', fillColor: '#ff0055' },
      'West Zone': { color: '#ffcc00', fillColor: '#ffcc00' },
      'Central Zone': { color: '#ff7700', fillColor: '#ff7700' },
      'South Zone': { color: '#64748b', fillColor: '#64748b' },
      'East Zone': { color: '#64748b', fillColor: '#64748b' }
    };

    Object.entries(zones).forEach(([zoneName, zoneData]) => {
      const style = zoneStyles[zoneName] || { color: '#64748b', fillColor: '#64748b' };
      const isSelected = selectedZone === zoneName;
      
      const poly = L.polygon(zoneData.boundary, {
        color: style.color,
        weight: isSelected ? 3.5 : 1.5,
        fillColor: style.fillColor,
        fillOpacity: isSelected ? 0.08 : 0.02,
        dashArray: isSelected ? '5, 5' : null
      }).addTo(markersGroup.current);

      poly.bindTooltip(`${zoneData.name.toUpperCase()} Boundary (${zoneData.status})`, {
        direction: 'center',
        permanent: false
      });
      
      poly.on('click', () => {
        handleZoneClick(zoneName);
      });
    });

    // Draw animated traffic propagation ripple pulse: North -> West -> Central
    const ripplePath = [
      zones['North Zone'].center,
      zones['West Zone'].center,
      zones['Central Zone'].center
    ];

    const ripplePoly = L.polyline(ripplePath, {
      color: '#00d2ff',
      weight: 4,
      opacity: 0.85,
      className: 'leaflet-animated-polyline',
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(markersGroup.current);

    ripplePoly.bindTooltip("AI TRAFFIC CASCADE RIPPLE PULSE", {
      direction: 'top',
      sticky: true
    });

    // Simulator Roads definitions
    const roadGeometries = {
      'Road A': [[12.9984, 77.5926], [12.9954, 77.5956]],
      'Road B': [[12.9954, 77.5956], [12.9924, 77.5986]],
      'Main Rally Road': [[12.9984, 77.5926], [13.0034, 77.5926]],
      'Road X': [[13.0034, 77.5926], [13.0064, 77.5956]],
      'Road Y': [[13.0034, 77.5926], [13.0004, 77.5896]],
      'Road Z': [[13.0004, 77.5896], [12.9974, 77.5866]]
    };

    const handleRoadPolyClick = (roadName, latlng) => {
      const popupContent = document.createElement('div');
      popupContent.className = 'p-3 font-mono text-xs text-white bg-[#080c1e] border border-cyber-border rounded space-y-2';
      popupContent.innerHTML = `
        <div class="font-bold text-[#00d2ff] uppercase border-b border-cyber-border/40 pb-1 mb-1">${roadName} Controls</div>
        <button class="w-full text-left px-2 py-1 rounded bg-[#ff0055]/10 border border-[#ff0055]/30 text-[#ff0055] hover:bg-[#ff0055] hover:text-white transition-all mb-1 cursor-pointer" onclick="window.setRoadStateConstable('${roadName}', 'Close')">Close Road</button>
        <button class="w-full text-left px-2 py-1 rounded bg-[#ff7700]/10 border border-[#ff7700]/30 text-[#ff7700] hover:bg-[#ff7700] hover:text-white transition-all mb-1 cursor-pointer" onclick="window.setRoadStateConstable('${roadName}', 'Partial')">Partial Closure</button>
        <button class="w-full text-left px-2 py-1 rounded bg-[#ffcc00]/10 border border-[#ffcc00]/30 text-[#ffcc00] hover:bg-[#ffcc00] hover:text-white transition-all mb-1 cursor-pointer" onclick="window.setRoadStateConstable('${roadName}', 'Diversion')">Diversion</button>
        <button class="w-full text-left px-2 py-1 rounded bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#00f0ff] hover:bg-[#00f0ff] hover:text-white transition-all mb-1 cursor-pointer" onclick="window.setRoadStateConstable('${roadName}', 'OneWay')">One Way</button>
        <button class="w-full text-left px-2 py-1 rounded bg-[#00ff66]/10 border border-[#00ff66]/30 text-[#00ff66] hover:bg-[#00ff66] hover:text-white transition-all cursor-pointer" onclick="window.setRoadStateConstable('${roadName}', 'Open')">Open Road</button>
      `;

      L.popup()
        .setLatLng(latlng)
        .setContent(popupContent)
        .openOn(mapInstance.current);
    };

    window.setRoadStateConstable = (roadName, controlType) => {
      applyRoadControl(roadName, controlType);
      if (mapInstance.current) {
        mapInstance.current.closePopup();
      }
    };

    Object.entries(roadGeometries).forEach(([roadName, coords]) => {
      const roadData = roads[roadName] || { color: 'green', status: 'Normal' };
      const colorMap = {
        green: '#00ff66',
        yellow: '#ffcc00',
        orange: '#ff7700',
        red: '#ff0055'
      };
      
      const poly = L.polyline(coords, {
        color: colorMap[roadData.color] || '#00ff66',
        weight: 6,
        opacity: 0.85
      }).addTo(markersGroup.current);

      poly.bindTooltip(`${roadName} (${roadData.status})`, { direction: 'top' });

      poly.on('click', (e) => {
        handleRoadPolyClick(roadName, e.latlng);
      });
    });

    // Deployed markers
    deployedMarkers.forEach((marker) => {
      const icon = getIcon(marker.type);
      if (icon) {
        L.marker(marker.latlng, { icon })
          .addTo(markersGroup.current)
          .bindTooltip(`${marker.type.toUpperCase()} DEPLOYED`, { direction: 'top' });
      }
    });

  }, [roads, deployedMarkers, selectedZone, zones]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#030611] text-slate-100 font-sans select-none pb-4">
      
      {/* ================================================= */}
      {/* TOP STATUS BAR                                    */}
      {/* ================================================= */}
      <div className="bg-[#080c1e]/90 border-b border-[#00d2ff]/15 px-5 py-2.5 flex flex-wrap items-center justify-between gap-4 z-10 relative">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-cyber-accent animate-pulse"></span>
          <div className="font-mono text-xs font-bold text-white uppercase">
            On-Site Operations: {selectedZone}
          </div>
          <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded border border-[#00ff66]/30 bg-[#00ff66]/10 text-[#00ff66]">
            STATUS: {status}
          </span>
        </div>

        {/* Resources Available counters */}
        <div className="flex items-center gap-4 text-[11px] font-mono">
          <span className="text-slate-500 uppercase">RESOURCES AVAILABLE:</span>
          <div className="flex gap-3">
            <span className="bg-[#050b18] border border-cyber-border px-2 py-0.5 rounded text-white">
              👮 Officers: <strong className="text-cyber-accent">{availableResources.officers}</strong>
            </span>
            <span className="bg-[#050b18] border border-cyber-border px-2 py-0.5 rounded text-white">
              🚧 Barricades: <strong className="text-cyber-orange">{availableResources.barricades}</strong>
            </span>
            <span className="bg-[#050b18] border border-cyber-border px-2 py-0.5 rounded text-white">
              🚜 Tows: <strong className="text-[#ffcc00]">{availableResources.towVehicles}</strong>
            </span>
            <span className="bg-[#050b18] border border-cyber-border px-2 py-0.5 rounded text-white">
              🚑 ERT Units: <strong className="text-cyber-red">{availableResources.emergencyUnits}</strong>
            </span>
          </div>
        </div>



        {/* Executive Readiness Score */}
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-mono text-slate-500 animate-pulse uppercase">
            {escalated ? '⚠️ Escalated resource request' : 'Roster Active'}
          </span>
          <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border ${getReadinessColor(readinessScore)}`}>
            READINESS: {readinessScore}% ({getReadinessLabel(readinessScore)})
          </span>
        </div>
      </div>

      {/* ================================================= */}
      {/* MAIN PANEL GRID                                   */}
      {/* ================================================= */}
      <div className="flex-1 w-full max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 overflow-hidden">
        
        {/* ================================================= */}
        {/* LEFT PANEL (25% width)                            */}
        {/* ================================================= */}
        <div className="lg:col-span-3 flex flex-col gap-4 overflow-y-auto pr-1">
          
          {/* Event Intelligence Card */}
          <CommandCard title="Event Intelligence">
            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-cyber-border/40 pb-1.5">
                <span className="text-slate-500 uppercase">Event Name:</span>
                <span className="text-white font-bold capitalize">{eventDetails.name}</span>
              </div>
              <div className="flex justify-between border-b border-cyber-border/40 pb-1.5">
                <span className="text-slate-500 uppercase">Expected Crowd:</span>
                <span className="text-white font-bold">{eventDetails.attendance}</span>
              </div>
              <div className="flex justify-between border-b border-cyber-border/40 pb-1.5">
                <span className="text-slate-500 uppercase">Window:</span>
                <span className="text-white font-bold">{eventDetails.start} - {eventDetails.end}</span>
              </div>
              <div className="flex justify-between border-b border-cyber-border/40 pb-1.5">
                <span className="text-slate-500 uppercase">Risk Level:</span>
                <span className="text-cyber-red font-bold uppercase">{eventDetails.risk}</span>
              </div>
              <div className="flex justify-between border-b border-cyber-border/40 pb-1.5">
                <span className="text-slate-500 uppercase">AI Confidence:</span>
                <span className="text-cyber-accent font-bold">{eventDetails.confidence}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 uppercase">Citizen Impact:</span>
                <span className="text-[#ff7700] font-bold uppercase">{eventDetails.citizenImpact}</span>
              </div>
            </div>
          </CommandCard>

          {/* Strategy Report Card */}
          <CommandCard title="Strategy Report">
            <div className="space-y-3 font-mono text-xs">
              <div className="text-[10px] text-slate-500 uppercase border-b border-cyber-border/20 pb-1">AI Recommendation Blueprint</div>
              
              <ul className="space-y-1.5 text-slate-350 list-disc list-inside">
                <li>Deploy <strong className="text-white">{strategyPlan.officers} Officers</strong></li>
                <li>Deploy <strong className="text-white">{strategyPlan.barricades} Barricades</strong></li>
                <li>Deploy <strong className="text-white">{strategyPlan.tows} Tows</strong></li>
                <li>Emergency Team: <strong className="text-cyber-green">{strategyPlan.emergencyTeam}</strong></li>
              </ul>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleAcceptStrategy}
                  className={`flex-1 py-1.5 rounded text-[10px] font-bold font-orbitron transition-all cursor-pointer text-center ${
                    strategyAccepted 
                      ? 'bg-cyber-green/10 border border-cyber-green/30 text-cyber-green cursor-not-allowed' 
                      : 'bg-cyber-accent text-slate-950 font-black hover:shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                  }`}
                  disabled={strategyAccepted}
                >
                  {strategyAccepted ? 'STRATEGY ACCEPTED' : 'ACCEPT STRATEGY'}
                </button>
                <button
                  onClick={handleModifyStrategy}
                  className="px-3 py-1.5 rounded border border-cyber-border text-slate-400 hover:text-white hover:border-slate-600 text-[10px] font-bold font-orbitron transition-colors cursor-pointer"
                >
                  MODIFY
                </button>
              </div>
            </div>
          </CommandCard>

          {/* Resource Dashboard Card */}
          <CommandCard title="Resource Dashboard">
            <div className="space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between p-2.5 bg-[#050b18]/60 border border-cyber-border/30 rounded-lg">
                <div>
                  <div className="text-[9px] text-slate-500 uppercase">Force Deployment Status</div>
                  <div className="text-xs font-bold text-white mt-1">
                    {strategyAccepted ? 'TACTICAL FORCE IN FIELD' : 'STANDBY MODE'}
                  </div>
                </div>
                <div className="text-xl font-black font-orbitron text-cyber-green glow-text-green">
                  {strategyAccepted ? 'DEPLOYED' : 'STANDBY'}
                </div>
              </div>
              <div className="text-[9px] text-slate-500">
                * Real-time deployment counts automatically updated when accepting strategy blueprints.
              </div>
            </div>
          </CommandCard>

        </div>

        {/* ================================================= */}
        {/* CENTER PANEL (50% width)                          */}
        {/* ================================================= */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          
          {/* City Zone Command Grid */}
          <CommandCard title="City Zone Command Grid">
            <div className="relative p-2 bg-[#050b18]/30 rounded-lg">
              <div className="grid grid-cols-3 gap-3.5 max-w-[580px] mx-auto py-2">
                {/* Row 1 */}
                <div></div>
                {renderZoneCard('North Zone')}
                <div></div>

                {/* Row 2 */}
                {renderZoneCard('West Zone')}
                {renderZoneCard('Central Zone')}
                {renderZoneCard('East Zone')}

                {/* Row 3 */}
                <div></div>
                {renderZoneCard('South Zone')}
                <div></div>
              </div>
              
              {/* HUD Hover Tooltip Overlay */}
              {hoveredZone && zones[hoveredZone] && (
                <div
                  className="absolute bg-[#080c1e]/95 border-2 border-cyber-accent p-4 rounded-lg font-mono text-[11px] z-50 shadow-2xl pointer-events-none w-[240px] transition-all"
                  style={{
                    left: `${tooltipPos.x}px`,
                    top: `${tooltipPos.y}px`,
                    transform: 'translate(-50%, -105%)',
                  }}
                >
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#080c1e] border-r-2 border-b-2 border-cyber-accent rotate-45"></div>
                  
                  <div className="font-extrabold text-[#00d2ff] uppercase border-b border-cyber-border/60 pb-1 mb-2 text-center tracking-wider font-orbitron text-[12px]">
                    {zones[hoveredZone].name} TELEMETRY
                  </div>
                  
                  <div className="space-y-1.5 text-slate-200">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 uppercase text-[9px]">Status:</span>
                      <strong className={
                        zones[hoveredZone].status === 'ACTIVE' ? 'text-cyber-red animate-pulse' :
                        zones[hoveredZone].status === 'STANDBY' ? 'text-[#ffcc00]' :
                        zones[hoveredZone].status === 'WATCHLIST' ? 'text-[#ff7700]' : 'text-slate-400'
                      }>
                        {zones[hoveredZone].status}
                      </strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 uppercase text-[9px]">Readiness Score:</span>
                      <strong className="text-white">{zones[hoveredZone].readiness}% ({zones[hoveredZone].readinessLabel})</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 uppercase text-[9px]">Available Officers:</span>
                      <strong className="text-white">{zones[hoveredZone].officers}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 uppercase text-[9px]">Barricades Material:</span>
                      <strong className="text-white">{zones[hoveredZone].barricades}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 uppercase text-[9px]">Active Events:</span>
                      <strong className="text-white">{zones[hoveredZone].activeEvents}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 uppercase text-[9px]">Citizen Impact:</span>
                      <strong className={
                        zones[hoveredZone].citizenImpact === 'Critical' ? 'text-cyber-red font-bold' :
                        zones[hoveredZone].citizenImpact === 'Elevated' ? 'text-[#ff7700]' :
                        zones[hoveredZone].citizenImpact === 'Moderate' ? 'text-[#ffcc00]' : 'text-slate-400'
                      }>
                        {zones[hoveredZone].citizenImpact}
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CommandCard>

          <CommandCard title="GEOINT DIGITAL TWIN CONTROL ROOM">
            <div className="h-[460px] relative w-full rounded-lg overflow-hidden border border-cyber-border/40 bg-[#050b18]/45">
              
              {/* Map Canvas */}
              <div ref={mapRef} onDragOver={handleDragOver} onDrop={handleDrop} className="w-full h-full z-0" />

              {/* Floating Instant AI Impact HUD */}
              {aiImpact && (
                <div className="absolute bottom-3 left-3 bg-[#ff0055]/10 border border-[#ff0055] p-3 rounded-lg font-mono text-xs z-10 shadow-lg min-w-[220px] animate-pulse">
                  <div className="font-bold text-[#ff0055] uppercase border-b border-[#ff0055]/30 pb-1 mb-1 text-[10px]">AI Impact Analysis</div>
                  <div className="space-y-1 text-slate-200">
                    <div className="flex justify-between">
                      <span>Congestion:</span>
                      <strong className="text-cyber-red">+{aiImpact.congestionAfter}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Delay Duration:</span>
                      <strong className="text-cyber-red">+{aiImpact.delayAfter} Min</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Citizens Impacted:</span>
                      <strong className="text-cyber-red">{aiImpact.citizenAfter}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Recovery Time:</span>
                      <strong className="text-cyber-red">{aiImpact.recoveryAfter} Min</strong>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </CommandCard>
        </div>

        {/* ================================================= */}
        {/* RIGHT PANEL (25% width)                           */}
        {/* ================================================= */}
        <div className="lg:col-span-3 flex flex-col gap-4 overflow-y-auto pr-1">
          
          {/* Zone Impact Simulator */}
          <CommandCard title="Impact Simulator">
            <div className="space-y-3 font-mono text-xs">
              <div className="text-[10px] text-slate-500 uppercase border-b border-cyber-border/20 pb-1">Spillover Congestion Forecast</div>
              
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between mb-0.5 text-slate-355">
                    <span>Road X (Spillover Link)</span>
                    <span className="text-cyber-red font-bold">+{roads['Road X'].status === 'Congested' ? '25%' : '8%'}</span>
                  </div>
                  <div className="w-full bg-[#050b18] h-1.5 rounded-full overflow-hidden border border-cyber-border/40">
                    <div className="bg-[#ff0055] h-full" style={{ width: roads['Road X'].status === 'Congested' ? '25%' : '8%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-0.5 text-slate-355">
                    <span>Road Y (Alternate Bypass)</span>
                    <span className="text-[#ffcc00] font-bold">+{roads['Road Y'].status === 'Busy' ? '18%' : '5%'}</span>
                  </div>
                  <div className="w-full bg-[#050b18] h-1.5 rounded-full overflow-hidden border border-cyber-border/40">
                    <div className="bg-[#ffcc00] h-full" style={{ width: roads['Road Y'].status === 'Busy' ? '18%' : '5%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-0.5 text-slate-355">
                    <span>Road Z (Detour Link)</span>
                    <span className="text-[#ffcc00] font-bold">+{roads['Road Z'].status === 'Busy' ? '11%' : '3%'}</span>
                  </div>
                  <div className="w-full bg-[#050b18] h-1.5 rounded-full overflow-hidden border border-cyber-border/40">
                    <div className="bg-[#ffcc00] h-full" style={{ width: roads['Road Z'].status === 'Busy' ? '11%' : '3%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </CommandCard>

          {/* Cross-Zone Ripple Panel */}
          <CommandCard title="Cross-Zone Ripple">
            <div className="space-y-2 font-mono text-[10px] text-slate-300">
              <div className="flex justify-between p-1.5 bg-[#050b18]/60 border border-cyber-border/25 rounded">
                <span className="text-cyber-red font-bold">North Zone</span>
                <span className="text-white">Impact Score: 100%</span>
              </div>
              <div className="flex justify-between p-1.5 bg-[#050b18]/60 border border-cyber-border/25 rounded">
                <span className="text-[#ffcc00] font-bold">West Zone</span>
                <span className="text-slate-400">Congestion Ripple: +21%</span>
              </div>
              <div className="flex justify-between p-1.5 bg-[#050b18]/60 border border-cyber-border/25 rounded">
                <span className="text-[#ff7700] font-bold">Central Zone</span>
                <span className="text-slate-400">Congestion Ripple: +9%</span>
              </div>
              <div className="flex justify-between p-1.5 bg-[#050b18]/60 border border-cyber-border/25 rounded">
                <span className="text-slate-400 font-bold">South Zone</span>
                <span className="text-slate-500">Congestion Ripple: +3%</span>
              </div>
            </div>
          </CommandCard>

          {/* Deployment Planner */}
          <CommandCard title="Deployment Planner">
            <div className="space-y-3 font-mono text-[10px] select-none">
              <div className="text-[10px] text-slate-500 uppercase border-b border-cyber-border/20 pb-1">Draggable Deployment Chips</div>
              
              <div className="grid grid-cols-2 gap-2">
                {/* Draggable Officer Chip */}
                <div
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, 'officer')}
                  className="p-2 bg-[#00f0ff]/10 border border-[#00f0ff]/40 rounded-lg text-center cursor-grab hover:bg-[#00f0ff]/20 transition-all font-bold text-[#00f0ff]"
                >
                  👮 OFFICER TEAM
                </div>
                
                {/* Draggable Barricade Chip */}
                <div
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, 'barricade')}
                  className="p-2 bg-[#ff7700]/10 border border-[#ff7700]/40 rounded-lg text-center cursor-grab hover:bg-[#ff7700]/20 transition-all font-bold text-[#ff7700]"
                >
                  🚧 BARRICADE TEAM
                </div>

                {/* Draggable Tow Chip */}
                <div
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, 'tow')}
                  className="p-2 bg-[#ffcc00]/10 border border-[#ffcc00]/40 rounded-lg text-center cursor-grab hover:bg-[#ffcc00]/20 transition-all font-bold text-[#ffcc00]"
                >
                  🚜 TOW TEAM
                </div>

                {/* Draggable Emergency Unit Chip */}
                <div
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, 'emergency')}
                  className="p-2 bg-[#ff0055]/10 border border-[#ff0055]/40 rounded-lg text-center cursor-grab hover:bg-[#ff0055]/20 transition-all font-bold text-[#ff0055]"
                >
                  🚑 EMERGENCY TEAM
                </div>
              </div>
              <div className="text-[8px] text-slate-500 text-center uppercase tracking-wider">Drag chip onto map to deploy.</div>
            </div>
          </CommandCard>

          {/* Emergency Operations Center */}
          <CommandCard title="Emergency Operations">
            <div className="space-y-3 font-mono text-xs">
              
              <button
                onClick={handleTriggerEmergency}
                className="w-full py-2 bg-cyber-red/10 border border-cyber-red/30 text-cyber-red hover:bg-cyber-red hover:text-white font-bold font-orbitron rounded transition-all cursor-pointer flex items-center justify-center gap-1.5 text-[11px]"
              >
                <AlertCircle className="w-4 h-4 animate-pulse" />
                TRIGGER EMERGENCY ALERT
              </button>

              {emergencyActive && emergencyScenario && (
                <div className="p-2.5 bg-[#ff0055]/5 border border-[#ff0055]/30 rounded-lg space-y-1.5">
                  <div className="text-[#ff0055] font-bold uppercase text-[9px]">Scenario D Optimization Active</div>
                  <div className="text-[10px] text-slate-300">
                    <div>Need Officers: <strong className="text-white">+{emergencyScenario.officers}</strong></div>
                    <div>Need Tows: <strong className="text-white">+{emergencyScenario.tows}</strong></div>
                    <div>Need Ambulance: <strong className="text-white">+{emergencyScenario.ambulances}</strong></div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2 pt-1.5">
                <button
                  onClick={handleEscalateRequest}
                  className={`w-full py-2 rounded text-[10px] font-bold font-orbitron transition-all cursor-pointer text-center ${
                    escalated
                      ? 'bg-cyber-orange/10 border border-cyber-orange/30 text-cyber-orange cursor-not-allowed'
                      : 'bg-cyber-orange text-slate-950 hover:shadow-[0_0_10px_rgba(255,119,0,0.3)]'
                  }`}
                  disabled={escalated}
                >
                  {escalated ? 'ESCALATE SENT' : 'ESCALATE RESOURCE REQUEST'}
                </button>
                <button
                  onClick={handleRequestERT}
                  className={`w-full py-2 rounded text-[10px] font-bold font-orbitron transition-all border cursor-pointer text-center ${
                    ertRequested
                      ? 'bg-cyber-red/10 border-cyber-red/30 text-cyber-red cursor-not-allowed'
                      : 'border-cyber-red text-cyber-red bg-[#ff0055]/5 hover:bg-[#ff0055]/10'
                  }`}
                  disabled={ertRequested}
                >
                  {ertRequested ? 'ERT DISPATCHED' : 'REQUEST RESPONSE TEAM'}
                </button>
              </div>

            </div>
          </CommandCard>

        </div>

      </div>

      {/* ================================================= */}
      {/* BOTTOM TIMELINE & COMPLETION PANEL                */}
      {/* ================================================= */}
      <div className="max-w-[1600px] mx-auto w-full px-4 select-none pb-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 border-t border-cyber-border/40 pt-4 bg-[#080c1e]/40 p-5 rounded-xl">
          
          {/* Timeline Center */}
          <div className="lg:col-span-3">
            <CommandCard title="Task Timeline" className="h-full">
              <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1 text-[11px] font-mono select-text">
                {timeline.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-[120px_1fr] gap-2 items-start border-l border-cyber-border/40 pl-2.5 ml-2 relative py-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyber-accent absolute -left-[4px] top-1.5"></span>
                    <span className="text-[#00d2ff] font-bold tracking-wider shrink-0">{item.time} |</span>
                    <span className="text-slate-300 break-words">{item.text}</span>
                  </div>
                ))}
              </div>
            </CommandCard>
          </div>

          {/* Dispatch signals */}
          <div className="lg:col-span-5">
            <CommandCard title="Operational Messages" className="h-full">
              <div className="flex flex-col h-[180px] justify-between font-mono">
                <div className="space-y-3 overflow-y-auto pr-1 flex-1 mb-2 select-text text-sm">
                  {chatMessages.map((msg, idx) => {
                    const isSelf = msg.sender.includes('Officer Sharma') || msg.sender.includes('Constable') || msg.sender.includes('Inspector') || msg.sender.includes('Patil');
                    return (
                      <div key={idx} className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-1.5 mb-0.5 text-[10px] text-slate-500 font-mono">
                          <span className="text-[#00d2ff] font-semibold">{msg.sender}</span>
                          <span>•</span>
                          <span>{msg.time}</span>
                        </div>
                        <div className={`px-3 py-1.5 rounded-lg max-w-[85%] break-words text-sm ${
                          isSelf 
                            ? 'bg-[#00d2ff]/15 border border-[#00d2ff]/30 text-slate-100 rounded-tr-none' 
                            : 'bg-slate-800/60 border border-slate-700/60 text-slate-200 rounded-tl-none'
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <form onSubmit={handleSendChat} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Transmit dispatch signal..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 bg-[#050b18] border border-cyber-border rounded-md px-3 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-[#00d2ff] transition-all"
                  />
                  <button
                    type="submit"
                    className="px-4 bg-cyber-accent text-slate-950 font-bold rounded-md cursor-pointer font-orbitron tracking-wider text-[11px] hover:shadow-[0_0_10px_rgba(0,210,255,0.4)] transition-all"
                  >
                    SEND
                  </button>
                </form>
              </div>
            </CommandCard>
          </div>

          {/* Post Event Learning Outcome Logger */}
          <div className="lg:col-span-4">
            <CommandCard title="Post Event Learning" className="h-full">
              <form onSubmit={handleCompletionSubmit} className="flex flex-col gap-3 text-xs font-mono">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-0.5 font-semibold">Congestion (%)</label>
                    <input
                      type="number"
                      value={completionData.actualCongestion}
                      onChange={(e) => setCompletionData({ ...completionData, actualCongestion: parseInt(e.target.value) })}
                      className="w-full bg-[#050b18] border border-cyber-border rounded px-2.5 py-1 text-white focus:outline-none focus:border-[#00d2ff]/50 transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-0.5 font-semibold">Delay (min)</label>
                    <input
                      type="number"
                      value={completionData.actualDelay}
                      onChange={(e) => setCompletionData({ ...completionData, actualDelay: parseInt(e.target.value) })}
                      className="w-full bg-[#050b18] border border-cyber-border rounded px-2.5 py-1 text-white focus:outline-none focus:border-[#00d2ff]/50 transition-colors"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-slate-400 block mb-0.5 font-semibold">Telemetry & Incidents Notes</label>
                  <textarea
                    value={completionData.notes || completionData.resourcesUsed}
                    onChange={(e) => setCompletionData({ ...completionData, notes: e.target.value, resourcesUsed: e.target.value })}
                    rows={2}
                    className="w-full bg-[#050b18] border border-cyber-border rounded px-2.5 py-1 text-white focus:outline-none focus:border-[#00d2ff]/50 transition-colors resize-y min-h-[50px]"
                    placeholder="Enter post-event notes..."
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-1.5 bg-[#00ff66]/10 border border-[#00ff66]/30 text-[#00ff66] hover:bg-[#00ff66] hover:text-[#030611] font-bold font-orbitron rounded cursor-pointer text-center transition-all shadow-[0_0_6px_rgba(0,255,102,0.15)] hover:shadow-[0_0_12px_rgba(0,255,102,0.4)]"
                >
                  SUBMIT TELEMETRY TO ENGINE
                </button>
              </form>
            </CommandCard>
          </div>

        </div>
      </div>

      </div>
    );
  }
