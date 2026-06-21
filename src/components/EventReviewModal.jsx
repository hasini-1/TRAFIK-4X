import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import CommandButton from './ui/CommandButton';
import { 
  X, 
  MapPin, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  Info, 
  ShieldCheck,
  AlertTriangle 
} from 'lucide-react';

function CircularGauge({ score }) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  let colorClass = 'stroke-cyber-green'; // 0-25
  if (score > 75) colorClass = 'stroke-cyber-red'; // 76-100 (Red)
  else if (score > 50) colorClass = 'stroke-cyber-orange'; // 51-75 (Orange)
  else if (score > 25) colorClass = 'stroke-cyber-yellow'; // 26-50 (Yellow)
  
  return (
    <div className="relative flex items-center justify-center w-14 h-14 select-none font-mono">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="28"
          cy="28"
          r={radius}
          className="stroke-[#0c142c] fill-none"
          strokeWidth="3.5"
        />
        <circle
          cx="28"
          cy="28"
          r={radius}
          className={`fill-none transition-all duration-500 ${colorClass}`}
          strokeWidth="3.5"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-[10px] font-bold text-white font-orbitron">
        {Math.round(score)}
      </span>
    </div>
  );
}

export default function EventReviewModal({ event, onClose, onActionSuccess }) {
  if (!event) return null;

  const [historyLogs, setHistoryLogs] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Rejection modal states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState(null);

  const fetchEventDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch history logs and NeuroTwin analysis in parallel
      const [histRes, analysisRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/events/history/${event.event_id}`),
        axios.post(`${API_BASE_URL}/neurotwin/analyze`, {
          event_type: event.event_type,
          event_cause: event.event_cause,
          priority: event.priority,
          zone: event.zone,
          corridor: event.corridor,
          requires_road_closure: event.requires_road_closure,
          latitude: event.latitude,
          longitude: event.longitude
        }).catch(err => {
          console.warn("ML Analysis failed, using heuristics: ", err);
          return { data: null };
        })
      ]);
      
      setHistoryLogs(histRes.data);
      if (analysisRes.data) {
        setAnalysis(analysisRes.data);
      }
    } catch (err) {
      console.error("Failed to load event details: ", err);
      setError("Failed to fetch event history and intelligence recommendations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventDetails();
  }, [event.event_id]);

  const handleApprove = async () => {
    setActionLoading(true);
    setError(null);
    try {
      await axios.post(`${API_BASE_URL}/events/approve`, {
        event_id: event.event_id,
        comments: "Approved by Traffic Commissioner."
      });
      
      // Emit immediate notification refresh event
      window.dispatchEvent(new Event('refresh-notifications'));
      
      if (onActionSuccess) onActionSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to approve event: " + (err.response?.data?.detail || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError("Rejection reason is required.");
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      await axios.post(`${API_BASE_URL}/events/reject`, {
        event_id: event.event_id,
        comments: rejectionReason
      });
      
      // Emit immediate notification refresh event
      window.dispatchEvent(new Event('refresh-notifications'));
      
      setShowRejectModal(false);
      if (onActionSuccess) onActionSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to reject event: " + (err.response?.data?.detail || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // Compile operator notes from logs
  const operatorNotes = historyLogs
    .filter(log => log.role === 'INSPECTOR' || log.role === 'COMMAND_CENTER')
    .map(log => `${log.user_name} (${log.role.replace('_', ' ')}): "${log.comments}"`)
    .join('\n') || 'No notes reported by Command Control Operators.';

  const getPriorityColor = (p) => {
    switch (String(p).toLowerCase()) {
      case 'critical': return 'text-cyber-red';
      case 'high': return 'text-cyber-orange';
      case 'medium': return 'text-cyber-yellow';
      default: return 'text-cyber-green';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-[9999]">
      <div className="w-full max-w-3xl bg-[#080c1e] border border-cyber-accent rounded-2xl overflow-hidden shadow-2xl flex flex-col relative animate-slide-in-modal max-h-[90vh]">
        
        {/* Dynamic Glowing border top line */}
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-right from-cyber-accent via-[#00f0ff] to-cyber-accent shadow-[0_0_12px_rgba(0,210,255,0.5)]"></div>

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-cyber-border/40 flex justify-between items-center bg-[#0a0f26]/80 select-none">
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">TACTICAL INCIDENT DISPATCH REVIEW</span>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-black text-white font-orbitron tracking-wider">{event.event_id}</h2>
              <span className={`px-2 py-0.5 border text-[9px] rounded font-bold uppercase ${
                event.event_type === 'planned' ? 'border-[#3b82f6]/40 text-[#3b82f6] bg-[#3b82f6]/5' : 'border-[#ef4444]/40 text-[#ef4444] bg-[#ef4444]/5'
              }`}>
                {event.event_type}
              </span>
              <span className={`text-[10px] font-bold uppercase font-mono ${getPriorityColor(event.priority)}`}>
                {event.priority} Priority
              </span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 border border-cyber-border rounded-lg hover:border-white transition-all cursor-pointer bg-transparent"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 min-h-0">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3 font-mono text-xs text-slate-500">
              <div className="animate-spin w-8 h-8 border-2 border-cyber-accent border-t-transparent rounded-full"></div>
              <span className="tracking-widest uppercase">Analyzing network ripple impact models...</span>
            </div>
          ) : (
            <div className="space-y-5">
              
              {/* Top stats grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Column 1: Info and Impact Gauge */}
                <div className="bg-[#050b18]/60 p-4 border border-cyber-border/30 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1 font-mono text-xs">
                      <span className="text-[9px] text-slate-550 uppercase tracking-wider block">CITIZEN IMPACT ESTIMATE</span>
                      <span className="text-[10px] text-slate-400">Street network spillover delays</span>
                    </div>
                    <CircularGauge score={event.impact_score} />
                  </div>

                  <div className="border-t border-cyber-border/20 pt-3 space-y-2 font-mono text-xs text-slate-350">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-cyber-accent shrink-0" />
                      <div>
                        <div className="text-white font-bold">{event.corridor}</div>
                        <div className="text-[10px] text-slate-500">
                          {event.latitude?.toFixed(4)}, {event.longitude?.toFixed(4)} ({event.zone})
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-cyber-border/10 text-[10px]">
                      <div><strong>Road Closure:</strong> <span className="text-white">{event.requires_road_closure ? 'REQUIRED' : 'NO'}</span></div>
                      <div><strong>Confidence:</strong> <span className="text-cyber-green font-bold">{(event.confidence_score || 92).toFixed(0)}%</span></div>
                      <div><strong>Cause:</strong> <span className="text-white capitalize">{event.event_cause.replace('_', ' ')}</span></div>
                      <div><strong>Submitted By:</strong> <span className="text-white truncate max-w-[120px] inline-block align-bottom">{event.creator_name || 'System'}</span></div>
                    </div>
                  </div>
                </div>

                {/* Column 2: Resources Grid */}
                <div className="bg-[#050b18]/60 p-4 border border-cyber-border/30 rounded-xl space-y-3 font-mono text-xs">
                  <span className="text-[9px] text-slate-550 uppercase tracking-widest block font-bold">DEPLOYMENT RESOURCE SCHEDULING</span>
                  
                  <div className="border border-cyber-border/30 rounded-lg overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-900/60 border-b border-cyber-border/40 text-[9px] text-slate-500">
                          <th className="p-2">RESOURCE</th>
                          <th className="p-2">AI REC</th>
                          <th className="p-2 text-cyber-accent">OPERATOR DECISION</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-cyber-border/15 text-[10px]">
                        <tr>
                          <td className="p-2 text-slate-400 font-bold">Officers</td>
                          <td className="p-2">{event.ai_officers || 0}</td>
                          <td className="p-2 text-cyber-accent font-bold">{event.final_officers || event.ai_officers || 0}</td>
                        </tr>
                        <tr>
                          <td className="p-2 text-slate-400 font-bold">Barricades</td>
                          <td className="p-2">{event.ai_barricades || 0}</td>
                          <td className="p-2 text-cyber-accent font-bold">{event.final_barricades || event.ai_barricades || 0}</td>
                        </tr>
                        <tr>
                          <td className="p-2 text-slate-400 font-bold">Tow Vehicles</td>
                          <td className="p-2">{event.ai_tow_vehicles || 0}</td>
                          <td className="p-2 text-cyber-accent font-bold">{event.final_tow_vehicles || event.ai_tow_vehicles || 0}</td>
                        </tr>
                        <tr>
                          <td className="p-2 text-slate-400 font-bold">Response Level</td>
                          <td className="p-2 text-slate-350">{event.ai_response_level || 'Normal'}</td>
                          <td className="p-2 text-cyber-accent font-bold">{event.final_response_level || event.ai_response_level || 'Normal'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* Command Notes */}
              <div className="space-y-1.5 font-mono text-xs">
                <span className="text-[9px] text-slate-550 uppercase tracking-widest block font-bold">COMMAND CONTROL OPERATOR REMARKS</span>
                <div className="bg-[#050b18]/45 border border-cyber-border/25 rounded-lg p-3 text-slate-300 whitespace-pre-wrap leading-relaxed max-h-[100px] overflow-y-auto">
                  {operatorNotes}
                </div>
              </div>

              {/* Similar Events */}
              {analysis && analysis.similar_events && (
                <div className="space-y-2 font-mono text-xs">
                  <span className="text-[9px] text-slate-550 uppercase tracking-widest block font-bold">SIMILAR HISTORICAL INCIDENT RECALLS</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {analysis.similar_events.slice(0, 3).map((sev, idx) => (
                      <div key={idx} className="bg-[#050b18]/30 p-2.5 border border-cyber-border/15 rounded-lg flex justify-between items-center">
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-200 font-bold">{sev.event_id}</span>
                          <span className="text-[8px] text-slate-550 block capitalize">{sev.event_cause.replace('_', ' ')}</span>
                        </div>
                        <span className="text-cyber-green text-[10px] font-bold font-orbitron">
                          {(sev.similarity_score * 100).toFixed(0)}% Match
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action warnings & errors */}
              {error && (
                <div className="p-3 border border-cyber-red/45 bg-cyber-red/5 rounded-lg text-xs text-cyber-red flex items-center gap-2 font-mono">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

            </div>
          )}
        </div>

        {/* Modal Sticky Footer Actions */}
        <div className="px-6 py-4 border-t border-cyber-border/40 bg-[#060a1d] flex flex-wrap items-center justify-between gap-3 select-none">
          <div>
            <button 
              onClick={onClose}
              className="px-4 py-2 border border-cyber-border hover:border-white text-slate-400 hover:text-white rounded-xl text-xs font-mono font-bold transition-all cursor-pointer bg-transparent"
            >
              BACK TO MAP
            </button>
          </div>

          <div className="flex gap-3">
            <CommandButton
              onClick={() => setShowRejectModal(true)}
              disabled={actionLoading || loading}
              variant="danger"
              className="py-2 px-5 text-xs font-orbitron font-bold flex items-center justify-center gap-1.5"
            >
              <XCircle className="w-4 h-4" />
              REJECT EVENT
            </CommandButton>

            {event.event_type === 'planned' ? (
              <CommandButton
                onClick={handleApprove}
                disabled={actionLoading || loading}
                variant="success"
                className="py-2 px-5 text-xs font-orbitron font-bold flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
                APPROVE PLANNED EVENT
              </CommandButton>
            ) : (
              <div className="max-w-[280px] text-[9px] font-mono text-cyber-yellow border border-cyber-yellow/20 bg-cyber-yellow/5 rounded-lg p-2 leading-tight">
                Unplanned events follow emergency operational workflows and cannot be approved through the Commissioner portal.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Secondary Rejection Overlay Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-[10000]">
          <div className="w-full max-w-md bg-[#080c1e] border border-cyber-accent rounded-xl p-5 space-y-4 relative shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-[4px] bg-[#ef4444] animate-pulse"></div>

            <div className="flex justify-between items-center border-b border-cyber-border pb-2.5">
              <h3 className="text-sm font-bold text-white font-orbitron uppercase tracking-wider">
                Explain Rejection Reasons
              </h3>
              <button 
                onClick={() => setShowRejectModal(false)}
                className="text-[10px] text-slate-500 hover:text-white font-mono border border-cyber-border px-1.5 py-0.5 rounded cursor-pointer bg-transparent"
              >
                CANCEL
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <p className="text-slate-400">Specify operational constraints or reasoning justification for rejecting this plan:</p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Details of manpower shortage, route clash, security concerns..."
                rows="4"
                className="w-full bg-[#050b18] border border-cyber-red/20 focus:border-[#ef4444] rounded-lg p-2 text-xs text-white placeholder-slate-700 outline-none transition-all resize-none font-sans"
              />
            </div>

            <div className="flex justify-end gap-3 select-none">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-3 py-1.5 border border-cyber-border text-slate-400 hover:text-white rounded-lg text-xs font-mono font-bold transition-all cursor-pointer bg-transparent"
              >
                CANCEL
              </button>
              <CommandButton
                onClick={handleReject}
                disabled={actionLoading || !rejectionReason.trim()}
                variant="danger"
                className="py-1.5 px-4 text-xs font-bold font-orbitron"
              >
                CONFIRM REJECTION
              </CommandButton>
            </div>
          </div>
        </div>
      )}

      {/* CSS animation styles */}
      <style>{`
        @keyframes slideInModal {
          from { opacity: 0; transform: scale(0.95) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-slide-in-modal {
          animation: slideInModal 250ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
