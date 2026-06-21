import { jsPDF } from 'jspdf';
import axios from 'axios';
import { API_BASE_URL } from '../config';

/**
 * Downloads a detailed operations report as a PDF for a given event.
 * Organized strictly around the Event Impact Genome / NeuroTwin layout.
 */
export const downloadEventReportPDF = async (event) => {
  const doc = new jsPDF();
  const eventId = event.event_id;

  // Fetch workflow history from API
  let history = [];
  try {
    const histRes = await axios.get(`${API_BASE_URL}/events/history/${eventId}`);
    history = histRes.data;
  } catch (err) {
    console.error("Failed to fetch history for PDF report:", err);
  }

  // Document Styling & Theme (Confidential Operations theme)
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont("helvetica", "bold");

  // Header Title block
  doc.setFontSize(18);
  doc.text("EVENT IMPACT GENOME", 14, 18);
  doc.setFontSize(14);
  doc.text("NEUROTWIN PREDICTION REPORT", 14, 25);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Document Reference: ${eventId} | Generated: ${new Date().toLocaleString()}`, 14, 30);
  
  // Header underline
  doc.setLineWidth(0.5);
  doc.line(14, 32, 196, 32);

  let y = 42;

  // 1. Event Information
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text("Event Information", 14, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  y += 6;

  const eventInfo = [
    ["Event ID", event.event_id],
    ["Event Type", (event.event_type || 'planned').toUpperCase()],
    ["Event Cause", (event.event_cause || '').replace(/_/g, ' ').toUpperCase()],
    ["Priority Rating", (event.priority || 'Medium').toUpperCase()],
    ["City Zone", event.zone || 'Central Zone'],
    ["Corridor Route", event.corridor || 'MG Road Corridor'],
    ["Geomap Location", `${event.latitude || '12.9716'}, ${event.longitude || '77.5946'}`],
    ["Closure Required", event.requires_road_closure ? "YES (FULL ROAD CLOSION ACTIVE)" : "NO"],
    ["Scheduled Date", event.event_date || "Tomorrow"],
    ["Operational Window", `${event.start_time || '09:00'} - ${event.end_time || '13:00'}`]
  ];

  eventInfo.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, 18, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(value), 70, y);
    y += 5;
  });

  // 2. Risk Analysis
  y += 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Risk Analysis", 14, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  y += 6;

  const riskAnalysis = [
    ["Risk Score", `${event.impact_score || event.risk_score || '45.0'} / 100`],
    ["Confidence Score", `${event.confidence_score || '90.0'}% Cosine Match`],
    ["Threat Band", event.final_response_level || event.ai_response_level || 'Moderate']
  ];

  riskAnalysis.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, 18, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(value), 70, y);
    y += 5;
  });

  // 3. Traffic Forecast
  y += 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Traffic Forecast", 14, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  y += 6;

  const congestionVal = event.congestion_prediction || (event.impact_score ? event.impact_score * 0.9 : 40.5);
  const travelDelay = event.expected_travel_delay || Math.round((event.impact_score || 45.0) * 0.7 + 10);
  
  const trafficForecast = [
    ["Congestion Prediction", `${congestionVal} % Network Load`],
    ["Estimated Travel Delay", `+${travelDelay} Minutes`],
    ["Affected Corridor Spills", `${event.corridor || 'Route'} Approach A & intersection corridors`]
  ];

  trafficForecast.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, 18, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(value), 70, y);
    y += 5;
  });

  // Page Break for formatting
  if (y > 210) {
    doc.addPage();
    y = 20;
  }

  // 4. Resource Allocation
  y += 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Resource Allocation", 14, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  y += 6;

  const resAlloc = [
    ["Police Units Required", String(event.final_officers || event.police_units_required || event.ai_officers || 80)],
    ["Barricades Required", String(event.final_barricades || event.barricades_required || event.ai_barricades || 50)],
    ["Traffic Personnel Required", String(event.final_traffic_personnel || event.traffic_personnel_required || event.ai_traffic_personnel || 48)],
    ["Towing Sweeps Assigned", String(event.final_tow_vehicles || event.ai_tow_vehicles || 4)]
  ];

  resAlloc.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, 18, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(value), 70, y);
    y += 5;
  });

  // 5. Deployment Plan
  y += 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Deployment Plan", 14, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  y += 6;

  const timelineText = event.deployment_timeline || `T-3h: Deploy barricades; T-2h: Post traffic personnel; T-1h: Position towing sweeps; T-0h: Event start.`;
  doc.setFont("helvetica", "bold");
  doc.text("Deployment Timeline:", 18, y);
  doc.setFont("helvetica", "normal");
  const splitTimeline = doc.splitTextToSize(timelineText, 120);
  doc.text(splitTimeline, 70, y);
  y += (splitTimeline.length * 4.5) + 2;

  const planBText = event.neurotwin_plan_b || "Standard Contingency: Reroute non-essential vehicles to adjacent service lanes.";
  doc.setFont("helvetica", "bold");
  doc.text("Crisis Plan (Plan B):", 18, y);
  doc.setFont("helvetica", "normal");
  const splitPlanB = doc.splitTextToSize(planBText, 120);
  doc.text(splitPlanB, 70, y);
  y += (splitPlanB.length * 4.5) + 5;

  // 6. Recommendations
  y += 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Recommendations", 14, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Mitigation Scenario:", 18, y);
  doc.setFont("helvetica", "normal");
  doc.text(event.approved_scenario || "Scenario B (Balanced Route Optimizations)", 70, y);
  y += 5;

  const recSummary = event.ai_recommendation_summary || `Mitigation level: Moderate. Deploy resources according to plan.`;
  doc.setFont("helvetica", "bold");
  doc.text("AI Recommendation Summary:", 18, y);
  doc.setFont("helvetica", "normal");
  const splitRec = doc.splitTextToSize(recSummary, 120);
  doc.text(splitRec, 70, y);
  y += (splitRec.length * 4.5) + 5;

  // Render history logs if any
  if (history.length > 0) {
    if (y > 230) {
      doc.addPage();
      y = 20;
    }
    y += 3;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Operational Workflow Audit Logs", 14, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    y += 6;

    history.forEach((h, idx) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const timeStr = new Date(h.timestamp).toLocaleString();
      doc.setFont("helvetica", "bold");
      doc.text(`${idx + 1}. [${timeStr}]`, 18, y);
      doc.setFont("helvetica", "normal");
      
      const transitionStr = `${h.role} (${h.user_name}) transitioned state to [${h.new_status}]`;
      doc.text(transitionStr, 50, y);
      y += 4.5;
      
      if (h.comments) {
        doc.setFont("helvetica", "italic");
        doc.setTextColor(71, 85, 105);
        const splitComments = doc.splitTextToSize(`Notes: ${h.comments}`, 160);
        doc.text(splitComments, 22, y);
        doc.setTextColor(15, 23, 42);
        y += (splitComments.length * 4) + 2;
      } else {
        y += 1.5;
      }
    });
  }

  // Page Footer line
  doc.setLineWidth(0.2);
  doc.line(14, 282, 196, 282);
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text("TRAFIK - 4X Threat Intelligence | Central Control Registry | CONFIDENTIAL", 14, 287);

  doc.save(`Trafik_4X_Operational_Report_${eventId}.pdf`);
};
