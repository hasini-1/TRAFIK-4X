import React, { useEffect, useRef, useState } from 'react';
import { Sliders, CheckCircle2, ShieldAlert, Navigation, Layers, Compass, AlertCircle, Info } from 'lucide-react';
import CommandCard from './ui/CommandCard';
import CommandButton from './ui/CommandButton';

const getSimulationRoadColors = (scenario, resourcesDelta) => {
  let colors = {
    route1: '#22c55e', // Green
    route2: '#22c55e', // Green
    route3: '#22c55e'  // Green
  };

  const scen = (scenario || '').toUpperCase();

  if (scen.includes('SCENARIO A') || scen.includes('MINIMAL') || scen.includes('TACTICAL')) {
    colors.route1 = '#f97316'; // Orange
    colors.route2 = '#eab308'; // Yellow
    colors.route3 = '#22c55e'; // Green
  } else if (scen.includes('SCENARIO B') || scen.includes('BALANCED')) {
    colors.route1 = '#eab308'; // Yellow
    colors.route2 = '#22c55e'; // Green
    colors.route3 = '#22c55e'; // Green
  } else if (scen.includes('SCENARIO C') || scen.includes('CONSERVATIVE') || scen.includes('MAXIMUM') || scen.includes('FULL') || scen.includes('SCENARIO C')) {
    colors.route1 = '#22c55e'; // Green
    colors.route2 = '#eab308'; // Yellow
    colors.route3 = '#ef4444'; // Red
  }

  if (resourcesDelta) {
    const { officers = 0, barricades = 0, tows = 0 } = resourcesDelta;
    if (officers > 0) {
      if (colors.route1 === '#ef4444') colors.route1 = '#f97316';
      else if (colors.route1 === '#f97316') colors.route1 = '#eab308';
      else if (colors.route1 === '#eab308') colors.route1 = '#22c55e';
    } else if (officers < 0) {
      if (colors.route1 === '#22c55e') colors.route1 = '#eab308';
      else if (colors.route1 === '#eab308') colors.route1 = '#f97316';
    }

    if (barricades < 0) {
      colors.route2 = '#f97316';
    } else if (barricades > 0) {
      colors.route2 = '#22c55e';
    }

    if (tows > 0) {
      if (colors.route3 === '#ef4444') colors.route3 = '#eab308';
      else if (colors.route3 === '#eab308') colors.route3 = '#22c55e';
    } else if (tows < 0) {
      if (colors.route3 === '#22c55e') colors.route3 = '#eab308';
      else if (colors.route3 === '#eab308') colors.route3 = '#ef4444';
    }
  }

  return colors;
};

export default function MapCommandCenter({ 
  events = [], 
  onSelectEvent,
  simulationScenario = null,
  simulationResources = null,
  simulationCenter = null,
  legendType = 'command_center'
}) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersGroup = useRef(null);
  const radiusCircle = useRef(null);
  const detourMarkers = useRef([]);
  const simulationLayers = useRef([]);
  const parkingMarkers = useRef([]);

  const [selectedEventId, setSelectedEventId] = useState(null);
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterZone, setFilterZone] = useState('ALL');
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapLayers, setHeatmapLayers] = useState([]);
  const [showParkingLayer, setShowParkingLayer] = useState(true);
  const [legendExpanded, setLegendExpanded] = useState(true);

  // Extract unique zones for filters
  const zones = ['ALL', ...new Set(events.map(e => e.zone).filter(Boolean))];

  // Helper to get marker color
  const getMarkerColor = (ev) => {
    const status = (ev.status || '').toUpperCase();
    
    if (['ACTIVE', 'ZONE ACTIVE', 'ZONE_ACTIVE'].includes(status)) return '#ef4444'; // Red
    if (['APPROVED', 'ZONE_ASSIGNED'].includes(status)) return '#22c55e'; // Green
    if (['PENDING_REVIEW', 'INSPECTOR_REVIEWED', 'PENDING_APPROVAL'].includes(status)) return '#eab308'; // Yellow
    if (['COMPLETED', 'RESOLVED'].includes(status)) return '#3b82f6'; // Blue
    return '#6b7280'; // Gray fallback
  };

  const renderCircularGaugeHTML = (score) => {
    const radius = 16;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;
    let color = '#22c55e'; // Green
    if (score > 75) color = '#ef4444';
    else if (score > 50) color = '#f97316';
    else if (score > 25) color = '#eab308';

    return `
      <div style="position: relative; display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px;">
        <svg width="40" height="40" style="transform: rotate(-90deg);">
          <circle cx="20" cy="20" r="${radius}" fill="none" stroke="#0c142c" stroke-width="3.5"></circle>
          <circle cx="20" cy="20" r="${radius}" fill="none" stroke="${color}" stroke-width="3.5" 
                  stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}" stroke-linecap="round"></circle>
        </svg>
        <span style="position: absolute; font-family: 'Orbitron', monospace; font-size: 9px; font-weight: bold; color: #fff;">
          ${Math.round(score)}
        </span>
      </div>
    `;
  };

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const L = window.L;
    if (!L) {
      console.error("Leaflet library not loaded via CDN.");
      return;
    }

    // Centered in Bangalore (main location of the dataset coordinates)
    const bangaloreCenter = [12.9716, 77.5946];
    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView(bangaloreCenter, 12);

    // CartoDB Dark Matter tiles (sleek dark cyber command center look)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(map);

    // Zoom controls at bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapInstance.current = map;
    markersGroup.current = L.featureGroup().addTo(map);

    // Verify container dimensions and invalidate size once rendered
    setTimeout(() => {
      if (mapInstance.current) {
        mapInstance.current.invalidateSize();
      }
    }, 150);
  }, []);

  // Update Markers and Heatmap layers when events or filters change
  useEffect(() => {
    const map = mapInstance.current;
    const L = window.L;
    if (!map || !L) return;

    // Clear old elements
    markersGroup.current.clearLayers();
    heatmapLayers.forEach(l => map.removeLayer(l));
    parkingMarkers.current.forEach(m => map.removeLayer(m));
    parkingMarkers.current = [];
    
    const newHeatmapLayers = [];

    // Filter events
    const filteredEvents = events.filter(ev => {
      const matchPriority = filterPriority === 'ALL' || ev.priority === filterPriority;
      const matchStatus = filterStatus === 'ALL' || ev.status === filterStatus;
      const matchZone = filterZone === 'ALL' || ev.zone === filterZone;
      return matchPriority && matchStatus && matchZone;
    });

    filteredEvents.forEach(ev => {
      if (!ev.latitude || !ev.longitude) return;

      const markerColor = getMarkerColor(ev);

      if (showHeatmap) {
        // Render simple simulated heatmap circle blocks
        const intensity = (ev.impact_score || 30.0) / 100.0;
        const heatCircle = L.circle([ev.latitude, ev.longitude], {
          radius: 800,
          fillColor: markerColor,
          fillOpacity: intensity * 0.4,
          stroke: false
        }).addTo(map);
        newHeatmapLayers.push(heatCircle);
      } else {
        // Custom glowing cyber marker using Leaflet divIcon
        const customIcon = L.divIcon({
          className: 'custom-cyber-marker',
          html: `
            <div class="relative flex items-center justify-center">
              <span class="animate-ping absolute inline-flex h-5.5 w-5.5 rounded-full opacity-60" style="background-color: ${markerColor}"></span>
              <span class="relative inline-flex rounded-full h-3.5 w-3.5 border border-white shadow-lg" style="background-color: ${markerColor}"></span>
            </div>
          `,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        const popupContent = `
          <div class="glass-card-exact rounded-xl border border-cyber-border p-3 font-mono text-slate-350 text-[11px] min-w-[240px] leading-relaxed select-none">
            <div class="flex justify-between items-center border-b border-cyber-border/40 pb-1 mb-1.5">
              <span class="font-bold text-white">${ev.event_id}</span>
              <span class="text-[8px] px-1.5 py-0.2 rounded font-bold uppercase bg-slate-900 border" style="color: ${markerColor}; border-color: ${markerColor}40">
                ${ev.risk_band}
              </span>
            </div>
            
            <div class="flex items-center justify-between mb-2">
              <div class="space-y-0.5">
                <div><strong>Type:</strong> <span class="capitalize text-white">${ev.event_type}</span></div>
                <div><strong>Cause:</strong> <span class="capitalize text-white">${ev.event_cause.replace('_', ' ')}</span></div>
                <div><strong>Priority:</strong> <span class="font-bold capitalize" style="color: ${markerColor}">${ev.priority}</span></div>
              </div>
              <div class="flex flex-col items-center">
                <span class="text-[8px] text-slate-500 uppercase font-orbitron mb-0.5" style="font-size: 8px;">CITIZEN IMPACT</span>
                ${renderCircularGaugeHTML(ev.impact_score)}
              </div>
            </div>

            <div class="space-y-0.5 border-t border-cyber-border/30 pt-1.5">
              <div><strong>Location:</strong> <span class="text-white">${ev.corridor}</span></div>
              <div><strong>Closure:</strong> <span class="text-white">${ev.requires_road_closure ? 'Yes' : 'No'}</span></div>
              <div><strong>Status:</strong> <span class="text-cyber-accent font-bold uppercase">${ev.status}</span></div>
              <div><strong>Submitted By:</strong> <span class="text-white">${ev.creator_name || 'System'}</span></div>
            </div>
            
            <div class="mt-2.5">
              <button class="w-full py-1 bg-[#00d2ff] hover:bg-[#00f0ff] text-slate-950 font-orbitron font-bold text-[9px] rounded cursor-pointer border-none" onclick="window.triggerMapSelect('${ev.event_id}')">
                VIEW EVENT DETAILS
              </button>
            </div>
          </div>
        `;

        const marker = L.marker([ev.latitude, ev.longitude], { icon: customIcon })
          .bindPopup(popupContent, { className: 'cyber-popup-bubble', closeButton: false })
          .addTo(markersGroup.current);

        // Hover opens popup
        marker.on('mouseover', function (e) {
          this.openPopup();
        });

        marker.on('click', () => {
          setSelectedEventId(ev.event_id);
          if (onSelectEvent) onSelectEvent(ev);
        });

        // Road Block circle highlighter
        if (ev.requires_road_closure) {
          const roadCircle = L.circle([ev.latitude, ev.longitude], {
            radius: 250,
            color: '#ef4444',
            weight: 3,
            fillColor: '#ef4444',
            fillOpacity: 0.15,
            dashArray: '5, 5'
          }).addTo(markersGroup.current);

          const duration = ev.road_closure_duration_minutes || 60;
          const alternative = ev.traffic_diversions_used || 'Alternative Route Available';

          roadCircle.bindTooltip(`
            <div style="font-family: monospace; font-size: 10px; color: #fff; background: rgba(5,11,24,0.95); padding: 5px; border: 1px solid #ef4444; border-radius: 4px;">
              <strong style="color: #ef4444;">ROAD BLOCKED</strong><br/>
              Expected Duration: ${duration} mins<br/>
              Route: ${alternative}
            </div>
          `, { sticky: true });
        }
      }

      // Draw color-coded Smart Parking Hubs if event is Active/Zone Active
      if (showParkingLayer && (ev.status === 'ZONE ACTIVE' || ev.status === 'ACTIVE')) {
        const parkingLots = [
          { type: 'A', name: 'St. Joseph Ground (Parking A)', cap: '1000/1000', status: 'full', color: '#ff0055', lat: ev.latitude + 0.005, lng: ev.longitude - 0.004 },
          { type: 'B', name: 'Bypass Lot (Parking B)', cap: '920/1000', status: 'near_capacity', color: '#ffcc00', lat: ev.latitude - 0.006, lng: ev.longitude + 0.005 },
          { type: 'C', name: 'Metro Station Link (Parking C)', cap: '400/1500', status: 'available', color: '#00ff66', lat: ev.latitude + 0.004, lng: ev.longitude + 0.007 }
        ];

        parkingLots.forEach((lot) => {
          const customIcon = L.divIcon({
            html: `<div class="w-6 h-6 rounded bg-[#030611] border-2 border-[${lot.color}] flex flex-col items-center justify-center text-[8px] font-bold shadow-[0_0_8px_${lot.color}] cursor-pointer">🅿️</div>`,
            className: 'custom-div-icon',
            iconSize: [24, 24]
          });

          const m = L.marker([lot.lat, lot.lng], { icon: customIcon })
            .addTo(map)
            .bindTooltip(`<b>${lot.name}</b><br/>Capacity: ${lot.cap}<br/>Status: <span style="color: ${lot.color}; font-weight: bold">${lot.status.toUpperCase()}</span>`, {
              className: 'bg-[#080c1e] text-slate-100 border border-slate-700 font-mono text-[9px] p-1.5 rounded shadow'
            });

          parkingMarkers.current.push(m);
        });

        // Draw parking redirection route line (redirection paths from Parking A to C)
        const redirectPath = [
          [parkingLots[0].lat, parkingLots[0].lng],
          [ev.latitude + 0.002, ev.longitude - 0.001],
          [parkingLots[2].lat, parkingLots[2].lng]
        ];

        const redirectLine = L.polyline(redirectPath, {
          color: '#3b82f6',
          weight: 4,
          opacity: 0.8,
          dashArray: '5, 5',
          className: 'leaflet-animated-polyline'
        }).addTo(map).bindTooltip(`
          <div style="font-family: monospace; font-size: 8px; color: #fff; background: rgba(5,11,24,0.95); padding: 4px; border: 1px solid #3b82f6; border-radius: 4px;">
            <strong style="color: #3b82f6;">PARKING DIVERSION DETOUR</strong><br/>
            Redirecting vehicles from Parking A (Full) → Parking C
          </div>
        `, { sticky: true });

        parkingMarkers.current.push(redirectLine);
      }
    });

    setHeatmapLayers(newHeatmapLayers);

    // Expose select callback to popup window scope
    window.triggerMapSelect = (id) => {
      setSelectedEventId(id);
      const ev = events.find(e => e.event_id === id);
      if (ev) {
        window.dispatchEvent(new CustomEvent('open-event-details', { detail: { event: ev } }));
      }
    };

    // Zoom out or auto fit bounds if elements exist
    if (filteredEvents.length > 0 && markersGroup.current.getLayers().length > 0) {
      map.fitBounds(markersGroup.current.getBounds(), { padding: [30, 30] });
    }
  }, [events, filterPriority, filterStatus, filterZone, showHeatmap, showParkingLayer]);

  // Handle selected incident Detour visual circles and checkpoint markers
  useEffect(() => {
    const map = mapInstance.current;
    const L = window.L;
    if (!map || !L || !selectedEventId) return;

    const ev = events.find(e => e.event_id === selectedEventId);
    if (!ev || !ev.latitude || !ev.longitude) return;

    // Clear previous shapes
    if (radiusCircle.current) map.removeLayer(radiusCircle.current);
    detourMarkers.current.forEach(m => map.removeLayer(m));
    detourMarkers.current = [];

    // Detour range config based on severity
    let radius = 1000; // 1km
    let color = '#eab308'; // Moderate Neon Yellow
    if (ev.risk_band === 'Critical') {
      radius = 3000; // 3km
      color = '#ef4444'; // Red
    } else if (ev.risk_band === 'High') {
      radius = 2000; // 2km
      color = '#f97316'; // Orange
    }

    // Add detour range boundary circle
    radiusCircle.current = L.circle([ev.latitude, ev.longitude], {
      radius: radius,
      color: color,
      weight: 1,
      fillColor: color,
      fillOpacity: 0.08,
      dashArray: '5, 5'
    }).addTo(map);

    // Pan map to view and recalculate bounds
    map.setView([ev.latitude, ev.longitude], 13);
    map.invalidateSize();

    // Generate surrounding detour checkpoint pins
    const offset = 0.009 * (radius / 1000.0);
    const checkPoints = [
      { name: "North checkpoint", lat: ev.latitude + offset * 0.7, lng: ev.longitude },
      { name: "South checkpoint", lat: ev.latitude - offset * 0.7, lng: ev.longitude },
      { name: "East checkpoint", lat: ev.latitude, lng: ev.longitude + offset * 0.7 },
      { name: "West checkpoint", lat: ev.latitude, lng: ev.longitude - offset * 0.7 }
    ];

    checkPoints.forEach((cp, idx) => {
      const pinIcon = L.divIcon({
        className: 'detour-checkpoint-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="w-3.5 h-3.5 rotate-45 border border-white bg-cyber-accent shadow-md"></div>
            <div class="absolute -top-5 text-[8px] font-mono font-black text-cyber-accent bg-slate-950 px-1 border border-cyber-border rounded whitespace-nowrap">
              CP-${idx + 1}
            </div>
          </div>
        `,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      const m = L.marker([cp.lat, cp.lng], { icon: pinIcon }).addTo(map);
      detourMarkers.current.push(m);
    });
  }, [selectedEventId, events]);

  // Handle NeuroTwin simulation overlay polylines
  useEffect(() => {
    const map = mapInstance.current;
    const L = window.L;
    if (!map || !L) return;

    // Clear previous simulation layers
    simulationLayers.current.forEach(layer => {
      try {
        map.removeLayer(layer);
      } catch (e) {}
    });
    simulationLayers.current = [];

    if (!simulationScenario || !simulationCenter) return;

    const lat = simulationCenter[0];
    const lng = simulationCenter[1];
    if (!lat || !lng) return;

    // Center map on the simulation center
    map.setView([lat, lng], 14);

    // Get colors for the routes based on scenario and resource overrides
    const colors = getSimulationRoadColors(simulationScenario, simulationResources);

    // Draw three routes relative to the event location
    const path1 = [
      [lat - 0.006, lng - 0.008],
      [lat - 0.002, lng - 0.003],
      [lat, lng],
      [lat + 0.003, lng + 0.004],
      [lat + 0.007, lng + 0.009]
    ];
    const path2 = [
      [lat - 0.005, lng + 0.007],
      [lat - 0.002, lng + 0.003],
      [lat, lng],
      [lat + 0.002, lng - 0.003],
      [lat + 0.006, lng - 0.008]
    ];
    const path3 = [
      [lat - 0.009, lng - 0.001],
      [lat - 0.003, lng],
      [lat, lng],
      [lat + 0.003, lng],
      [lat + 0.008, lng + 0.002]
    ];

    const route1Line = L.polyline(path1, {
      color: colors.route1,
      weight: 6,
      opacity: 0.85
    }).addTo(map).bindTooltip(`
      <div style="font-family: monospace; font-size: 9px; color: #fff; background: rgba(5,11,24,0.95); padding: 4px; border: 1px solid ${colors.route1}; border-radius: 4px;">
        <strong>MG Road Corridor (Main Corridor)</strong><br/>
        Traffic load: ${colors.route1 === '#ef4444' ? 'Critical Congestion' : colors.route1 === '#f97316' ? 'Heavy Congestion' : colors.route1 === '#eab308' ? 'Moderate Congestion' : 'Normal Flow'}
      </div>
    `, { sticky: true });

    const route2Line = L.polyline(path2, {
      color: colors.route2,
      weight: 5,
      opacity: 0.85
    }).addTo(map).bindTooltip(`
      <div style="font-family: monospace; font-size: 9px; color: #fff; background: rgba(5,11,24,0.95); padding: 4px; border: 1px solid ${colors.route2}; border-radius: 4px;">
        <strong>Alternative Route A (Junction Bypass)</strong><br/>
        Traffic load: ${colors.route2 === '#ef4444' ? 'Critical Congestion' : colors.route2 === '#f97316' ? 'Heavy Congestion' : colors.route2 === '#eab308' ? 'Moderate Congestion' : 'Normal Flow'}
      </div>
    `, { sticky: true });

    const route3Line = L.polyline(path3, {
      color: colors.route3,
      weight: 5,
      opacity: 0.85
    }).addTo(map).bindTooltip(`
      <div style="font-family: monospace; font-size: 9px; color: #fff; background: rgba(5,11,24,0.95); padding: 4px; border: 1px solid ${colors.route3}; border-radius: 4px;">
        <strong>Alternative Route B (Outer Loop)</strong><br/>
        Traffic load: ${colors.route3 === '#ef4444' ? 'Critical Congestion' : colors.route3 === '#f97316' ? 'Heavy Congestion' : colors.route3 === '#eab308' ? 'Moderate Congestion' : 'Normal Flow'}
      </div>
    `, { sticky: true });

    simulationLayers.current = [route1Line, route2Line, route3Line];

  }, [simulationScenario, simulationResources, simulationCenter]);

  return (
    <div className="relative border border-cyber-border rounded-xl overflow-hidden w-full min-h-[600px] lg:min-h-[700px] flex flex-col">
      {/* Top Map Filter Rail */}
      <div className="absolute top-4 left-4 z-[400] flex flex-wrap gap-2 select-none">
        
        {/* Status Filter */}
        <div className="bg-[#050b18]/85 backdrop-blur border border-cyber-border px-2 py-1 rounded-lg flex items-center gap-1.5">
          <Sliders className="w-3 h-3 text-slate-500" />
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-transparent text-[10px] font-mono font-bold text-white border-none outline-none cursor-pointer"
          >
            <option value="ALL" className="bg-[#050b18]">STATUS: ALL</option>
            <option value="ACTIVE" className="bg-[#050b18]">STATUS: ACTIVE</option>
            <option value="APPROVED" className="bg-[#050b18]">STATUS: STANDBY</option>
            <option value="COMPLETED" className="bg-[#050b18]">STATUS: RESOLVED</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div className="bg-[#050b18]/85 backdrop-blur border border-cyber-border px-2 py-1 rounded-lg flex items-center gap-1.5">
          <ShieldAlert className="w-3 h-3 text-slate-500" />
          <select 
            value={filterPriority} 
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-transparent text-[10px] font-mono font-bold text-white border-none outline-none cursor-pointer"
          >
            <option value="ALL" className="bg-[#050b18]">PRIORITY: ALL</option>
            <option value="High" className="bg-[#050b18]">HIGH ONLY</option>
            <option value="Medium" className="bg-[#050b18]">MEDIUM ONLY</option>
            <option value="Low" className="bg-[#050b18]">LOW ONLY</option>
          </select>
        </div>

        {/* Zone Filter */}
        <div className="bg-[#050b18]/85 backdrop-blur border border-cyber-border px-2 py-1 rounded-lg flex items-center gap-1.5">
          <Compass className="w-3 h-3 text-slate-500" />
          <select 
            value={filterZone} 
            onChange={(e) => setFilterZone(e.target.value)}
            className="bg-transparent text-[10px] font-mono font-bold text-white border-none outline-none cursor-pointer max-w-[120px]"
          >
            {zones.map(z => (
              <option key={z} value={z} className="bg-[#050b18]">{z === 'ALL' ? 'ZONE: ALL' : z}</option>
            ))}
          </select>
        </div>

        {/* Heatmap Overlay Toggle */}
        <button 
          onClick={() => setShowHeatmap(!showHeatmap)}
          className={`px-3 py-1 border rounded-lg text-[10px] font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
            showHeatmap 
              ? 'bg-cyber-accent text-slate-950 border-cyber-accent' 
              : 'bg-[#050b18]/85 backdrop-blur text-white border-cyber-border hover:border-slate-700'
          }`}
        >
          <Layers className="w-3 h-3" />
          HEATMAP OVERLAY
        </button>

        {/* Smart Parking Layer Toggle */}
        <button 
          onClick={() => setShowParkingLayer(!showParkingLayer)}
          className={`px-3 py-1 border rounded-lg text-[10px] font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
            showParkingLayer 
              ? 'bg-[#3b82f6] text-white border-[#3b82f6]' 
              : 'bg-[#050b18]/85 backdrop-blur text-white border-cyber-border hover:border-slate-700'
          }`}
        >
          <span>🅿️ PARKING DETAILS</span>
        </button>
      </div>

      {/* Map Container Target */}
      <div ref={mapRef} className="w-full min-h-[600px] lg:min-h-[700px] flex-grow bg-[#050b18]"></div>

      {/* Collapsible Futuristic Map Operations Legend */}
      <div 
        className="absolute bottom-4 left-4 bg-[#080c1e]/95 backdrop-blur border border-cyber-border/80 p-3.5 rounded-xl flex flex-col gap-2 font-mono text-[9px] text-slate-350 shadow-[0_0_20px_rgba(0,210,255,0.15)] min-w-[200px] select-none transition-all duration-300"
        style={{ zIndex: 1000 }}
      >
        <div className="flex justify-between items-center border-b border-cyber-border/30 pb-1.5 mb-1 cursor-pointer" onClick={() => setLegendExpanded(!legendExpanded)}>
          <span className="font-bold text-white uppercase tracking-wider font-orbitron">Map Operations Legend</span>
          <span className="text-[10px] text-cyber-accent font-bold font-orbitron">{legendExpanded ? '[-]' : '[+]'}</span>
        </div>
        
        {legendExpanded && (
          <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
            {/* Markers */}
            <div className="space-y-1">
              <span className="text-[8px] text-slate-500 font-bold uppercase block tracking-widest font-orbitron">Incident Markers</span>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] animate-pulse shadow-[0_0_8px_#ef4444]"></span>
                <span>Active / Critical Incident</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#eab308] shadow-[0_0_5px_#eab308]"></span>
                <span>Pending Review / Approval</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] shadow-[0_0_5px_#22c55e]"></span>
                <span>Approved Standby / Plan Lock</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6] shadow-[0_0_5px_#3b82f6]"></span>
                <span>Resolved / Completed</span>
              </div>
            </div>

            {/* Priorities */}
            <div className="space-y-1 border-t border-cyber-border/25 pt-2">
              <span className="text-[8px] text-slate-500 font-bold uppercase block tracking-widest font-orbitron">Incident Priorities</span>
              <div className="flex items-center gap-2">
                <span className="px-1 text-[7px] font-bold border border-[#ff0055] text-[#ff0055] bg-[#ff0055]/10 rounded uppercase">Critical</span>
                <span>Severe gridlock / Full closure</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-1 text-[7px] font-bold border border-[#f97316] text-[#f97316] bg-[#f97316]/10 rounded uppercase">High</span>
                <span>Major arterial slowdowns</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-1 text-[7px] font-bold border border-[#eab308] text-[#eab308] bg-[#eab308]/10 rounded uppercase">Medium</span>
                <span>Secondary corridor delays</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-1 text-[7px] font-bold border border-[#22c55e] text-[#22c55e] bg-[#22c55e]/10 rounded uppercase">Low</span>
                <span>Minor / Localized impact</span>
              </div>
            </div>

            {/* Resources & Layers */}
            <div className="space-y-1.5 border-t border-cyber-border/25 pt-2">
              <span className="text-[8px] text-slate-500 font-bold uppercase block tracking-widest font-orbitron">Resources & Indicators</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px]">🅿️</span>
                <span>Smart Parking Hub (Capacity Level)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-1 bg-[#3b82f6] inline-block border border-dashed"></span>
                <span>Parking Redirection Detour Path</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 inline-block border border-dashed border-[#ef4444] rounded-full bg-[#ef4444]/10"></span>
                <span>Road Closure Exclusion Range</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rotate-45 border border-white bg-cyber-accent inline-block"></span>
                <span>Traffic Checkpoint (CP-X)</span>
              </div>
            </div>

            {/* Traffic Congestion */}
            <div className="space-y-1 border-t border-cyber-border/25 pt-2">
              <span className="text-[8px] text-slate-500 font-bold uppercase block tracking-widest font-orbitron">Congestion Levels (Routes)</span>
              <div className="flex items-center gap-2">
                <span className="w-4 h-1 bg-[#22c55e] inline-block rounded"></span>
                <span>Normal Flow (&gt;60 km/h)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-1 bg-[#eab308] inline-block rounded"></span>
                <span>Moderate Congestion (30-60 km/h)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-1 bg-[#f97316] inline-block rounded"></span>
                <span>Heavy Congestion (15-30 km/h)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-1 bg-[#ef4444] inline-block rounded animate-pulse"></span>
                <span>Critical Gridlock (&lt;15 km/h)</span>
              </div>
            </div>

            {/* Alerts */}
            <div className="space-y-1 border-t border-cyber-border/25 pt-2">
              <span className="text-[8px] text-slate-500 font-bold uppercase block tracking-widest font-orbitron">Emergency Warnings</span>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff0055] animate-ping inline-block"></span>
                <span className="text-[#ff0055] font-bold">Pulsing Red Alarm strip &amp; sound siren</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
