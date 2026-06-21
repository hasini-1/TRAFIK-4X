import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import CommandButton from './ui/CommandButton';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Cpu, 
  TrendingUp, 
  Activity, 
  Sparkles, 
  Layers, 
  Clock, 
  ShieldAlert,
  Save,
  Send,
  CheckSquare,
  FileText,
  Loader2
} from 'lucide-react';

function GaugeCircle({ percent, label, colorClass = 'stroke-cyber-accent', glowClass = 'glow-blue' }) {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center bg-[#070c1e]/60 border border-cyber-border/40 p-4 rounded-xl relative overflow-hidden">
      <div className="relative flex items-center justify-center w-16 h-16">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="32" cy="32" r={radius} className="stroke-[#091129] fill-none" strokeWidth="4.5" />
          <circle 
            cx="32" 
            cy="32" 
            r={radius} 
            className={`fill-none transition-all duration-1000 ${colorClass}`} 
            strokeWidth="4.5" 
            strokeDasharray={circumference} 
            strokeDashoffset={strokeDashoffset} 
            strokeLinecap="round" 
          />
        </svg>
        <span className="absolute text-sm font-black text-white font-orbitron">{Math.round(percent)}%</span>
      </div>
      <span className="text-[9px] font-bold font-mono text-slate-400 mt-2 text-center uppercase tracking-wider max-w-[100px] leading-tight">
        {label}
      </span>
    </div>
  );
}

export default function PostEventAnalysis({ event, onComparisonComplete }) {
  const [lessonsLearned, setLessonsLearned] = useState('');
  const [loading, setLoading] = useState(false);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    if (event) {
      setLessonsLearned(event.lessons_learned || '');
      setComparisonResult(null);
      setError(null);
      setSuccessMsg(null);
      
      // If success_rate already exists, pre-fill some metrics or calculate locally
      if (event.success_rate !== null && event.success_rate !== undefined) {
        // Calculate locally to show the details initially
        const predictedImpact = event.impact_score || 0;
        const actualImpact = Math.min(100.0, ((event.actual_delay || 0.0) / 60.0) * 100.0);
        const predAccuracy = Math.max(10.0, 100.0 - Math.abs(predictedImpact - actualImpact));

        const predOfficers = event.ai_officers || 4;
        const actualOfficers = event.officers_deployed || 4;
        const resourceAccuracy = Math.max(10.0, 100.0 - (Math.abs(predOfficers - actualOfficers) / Math.max(1, predOfficers)) * 100.0);

        const predRecovery = 45.0;
        const actualRecovery = event.road_clearance_time_minutes || 45.0;
        const recoveryAccuracy = Math.max(10.0, 100.0 - (Math.abs(predRecovery - actualRecovery) / Math.max(1.0, predRecovery)) * 100.0);

        setComparisonResult({
          prediction_accuracy: Math.round(predAccuracy * 10) / 10,
          resource_accuracy: Math.round(resourceAccuracy * 10) / 10,
          recovery_accuracy: Math.round(recoveryAccuracy * 10) / 10,
          success_rate: event.success_rate,
          operational_gaps: resourceAccuracy > 80 ? "Resource counts matched requirements" : "Calibrate manpower reserves for peak traffic zones.",
          improvement_suggestions: predAccuracy > 80 ? "Maintain current DNA calibrations." : "Ingest additional weather and date parameters into ML training set."
        });
      }
    }
  }, [event]);

  const handleRunComparison = async (e) => {
    e.preventDefault();
    if (!event || event.status !== 'COMPLETED') return;

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await axios.post(`${API_BASE_URL}/events/learning/compare/${event.event_id}`, {
        lessons_learned: lessonsLearned
      });
      setComparisonResult(res.data);
      setSuccessMsg("Post-event outcome evaluated and executive report sent to Traffic Commissioner!");
      if (onComparisonComplete) {
        onComparisonComplete();
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to submit post-event learning evaluation.");
    } finally {
      setLoading(false);
    }
  };

  if (!event) return null;

  const isCompleted = event.status === 'COMPLETED';

  return (
    <div className="space-y-4">
      {/* Event Overview Summary Banner */}
      <div className="p-3 bg-[#0a0f26]/80 border border-cyber-border/40 rounded-lg font-mono text-xs flex flex-col md:flex-row justify-between gap-3">
        <div>
          <span className="text-slate-500 uppercase">TELEMETRY ID</span>
          <div className="text-white font-bold tracking-wider">{event.event_id}</div>
        </div>
        <div>
          <span className="text-slate-500 uppercase">EVENT TYPE & CAUSE</span>
          <div className="text-cyber-accent font-bold capitalize">
            {event.event_type} &bull; {event.event_cause.replace('_', ' ')}
          </div>
        </div>
        <div>
          <span className="text-slate-500 uppercase">PRIORITY LEVEL</span>
          <div className={`font-bold uppercase ${
            event.priority === 'CRITICAL' ? 'text-cyber-red' : 
            event.priority === 'HIGH' ? 'text-cyber-orange' : 'text-cyber-green'
          }`}>
            {event.priority}
          </div>
        </div>
        <div>
          <span className="text-slate-500 uppercase">DATE</span>
          <div className="text-slate-300 font-bold">{event.event_date}</div>
        </div>
      </div>

      {!isCompleted ? (
        <div className="p-6 text-center border border-dashed border-cyber-border/40 rounded-xl space-y-3 bg-[#050b18]/40">
          <AlertTriangle className="w-8 h-8 text-cyber-yellow mx-auto animate-pulse" />
          <div className="text-xs font-mono text-slate-400 uppercase tracking-widest max-w-[340px] mx-auto leading-relaxed">
            Telemetry comparison unavailable. Outcome metrics are only calculated for finished events.
            <div className="text-slate-600 mt-2 text-[10px]">CURRENT STATUS: <span className="text-cyber-accent font-bold">{event.status}</span></div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Comparison Graphs / Results (lg:col-span-7) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="border border-cyber-border/30 rounded-xl p-4 bg-[#050b18]/60 space-y-4">
              <h4 className="text-xs font-orbitron font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-cyber-border/30 pb-2">
                <Activity className="w-4 h-4 text-cyber-accent" />
                PREDICTED VS ACTUAL ACCURACY
              </h4>

              {comparisonResult ? (
                <div className="space-y-4">
                  {/* Gauges Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <GaugeCircle 
                      percent={comparisonResult.success_rate} 
                      label="SUCCESS RATE" 
                      colorClass="stroke-cyber-green"
                    />
                    <GaugeCircle 
                      percent={comparisonResult.prediction_accuracy} 
                      label="PREDICTION ACCURACY" 
                      colorClass="stroke-cyber-accent"
                    />
                    <GaugeCircle 
                      percent={comparisonResult.resource_accuracy} 
                      label="RESOURCE ACCURACY" 
                      colorClass="stroke-cyber-orange"
                    />
                    <GaugeCircle 
                      percent={comparisonResult.recovery_accuracy} 
                      label="RECOVERY ACCURACY" 
                      colorClass="stroke-cyber-yellow"
                    />
                  </div>

                  {/* Operational Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-[11px] text-slate-350 bg-[#070c1d]/80 border border-cyber-border/40 p-3 rounded-lg">
                    <div>
                      <span className="text-slate-500 uppercase block text-[9px] tracking-wider mb-1">PREDICTED VALUES</span>
                      <ul className="space-y-1">
                        <li>Impact Score: <span className="text-white font-bold">{event.impact_score?.toFixed(1)}</span></li>
                        <li>AI Manpower: <span className="text-white font-bold">{event.ai_officers || 4} Officers</span></li>
                        <li>Est. Recovery: <span className="text-white font-bold">45 mins</span></li>
                      </ul>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase block text-[9px] tracking-wider mb-1">ACTUAL VALUES</span>
                      <ul className="space-y-1">
                        <li>Delay-based Impact: <span className="text-white font-bold">{Math.round(Math.min(100.0, ((event.actual_delay || 0.0) / 60.0) * 100.0) * 10) / 10}</span></li>
                        <li>Deployed Manpower: <span className="text-white font-bold">{event.officers_deployed || 4} Officers</span></li>
                        <li>Clearance Recovery: <span className="text-white font-bold">{event.road_clearance_time_minutes || 45} mins</span></li>
                      </ul>
                    </div>
                  </div>

                  {/* AI Learning Synthesis */}
                  <div className="space-y-2.5 font-mono">
                    <div className="text-[10px] text-slate-400 uppercase tracking-widest border-b border-cyber-border/20 pb-1 flex items-center gap-1">
                      <Cpu className="w-3.5 h-3.5 text-cyber-accent" />
                      AI LEARNING SYNTHESIS
                    </div>
                    
                    <div className="p-3 bg-cyber-accent/5 border border-cyber-accent/30 rounded-lg text-xs leading-relaxed space-y-2">
                      <div>
                        <span className="text-cyber-orange font-bold uppercase text-[9px] tracking-wide block">Operational Gap Detected:</span>
                        <span className="text-slate-300">{comparisonResult.operational_gaps}</span>
                      </div>
                      <div>
                        <span className="text-cyber-green font-bold uppercase text-[9px] tracking-wide block">Improvement Suggestion:</span>
                        <span className="text-slate-300">{comparisonResult.improvement_suggestions}</span>
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="p-10 text-center text-xs font-mono text-slate-500 uppercase">
                  Awaiting analysis run. Fill in the lessons learned and select execute comparison.
                </div>
              )}
            </div>
          </div>

          {/* Form to submit Lessons Learned (lg:col-span-5) */}
          <div className="lg:col-span-5 space-y-4">
            <form onSubmit={handleRunComparison} className="border border-cyber-border/30 rounded-xl p-4 bg-[#050b18]/60 space-y-4 flex flex-col justify-between h-full">
              <div className="space-y-4">
                <h4 className="text-xs font-orbitron font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-cyber-border/30 pb-2">
                  <Sparkles className="w-4 h-4 text-cyber-yellow" />
                  POST-EVENT REFLECTION
                </h4>

                {error && (
                  <div className="bg-[#ff0055]/5 border border-[#ff0055]/30 rounded-lg p-2.5 text-[11px] text-[#ff0055] font-mono leading-tight">
                    {error}
                  </div>
                )}

                {successMsg && (
                  <div className="bg-cyber-green/5 border border-cyber-green/30 rounded-lg p-2.5 text-[11px] text-cyber-green font-mono leading-tight flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{successMsg}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-orbitron font-bold uppercase tracking-wider text-slate-400">
                    Lessons Learned & Observations
                  </label>
                  <textarea
                    value={lessonsLearned}
                    onChange={(e) => setLessonsLearned(e.target.value)}
                    required
                    placeholder="Describe observations, resource shortages, signal bottlenecks, or improvements to optimize similar event twins..."
                    className="w-full h-32 bg-[#030612]/90 border border-cyber-border rounded-lg p-2.5 text-xs text-slate-100 font-mono focus:border-cyber-accent outline-none resize-none transition-all placeholder-slate-600"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-cyber-border/20">
                <CommandButton
                  type="submit"
                  disabled={loading}
                  variant="success"
                  className="w-full py-2.5 text-xs font-orbitron uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                      CALCULATING OUTCOMES...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      EVALUATE OUTCOME & REPORT
                    </>
                  )}
                </CommandButton>
              </div>
            </form>
          </div>

        </div>
      )}

    </div>
  );
}
