import React from 'react';
import CommandCard from './ui/CommandCard';

export default function DashboardMetrics({ events = [], pendingCount = 0 }) {
  const activeEvents = events.filter(e => e.status === 'ACTIVE');
  const criticalEvents = activeEvents.filter(e => e.risk_band === 'Critical' || e.final_response_level === 'Emergency');
  
  // Calculate personnel deployed
  const personnelDeployed = activeEvents.reduce((sum, e) => sum + (e.final_officers || 0), 0);
  
  // Calculate average risk score of active incidents
  const avgRiskScore = activeEvents.length > 0
    ? activeEvents.reduce((sum, e) => sum + (e.impact_score || 0), 0) / activeEvents.length
    : 0.0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 select-none font-orbitron">
      
      {/* Active Incidents */}
      <CommandCard>
        <div className="py-2 space-y-1.5 text-center sm:text-left">
          <span className="text-xs text-[#94a3b8] uppercase tracking-widest block font-sans">
            ACTIVE INCIDENTS
          </span>
          <div className="text-3xl md:text-4xl font-black text-cyber-accent font-orbitron tracking-tight">
            {activeEvents.length}
          </div>
        </div>
      </CommandCard>

      {/* Pending Reviews */}
      <CommandCard>
        <div className="py-2 space-y-1.5 text-center sm:text-left">
          <span className="text-xs text-[#94a3b8] uppercase tracking-widest block font-sans">
            PENDING REVIEWS
          </span>
          <div className="text-3xl md:text-4xl font-black text-cyber-yellow font-orbitron tracking-tight">
            {pendingCount}
          </div>
        </div>
      </CommandCard>

      {/* Critical Events */}
      <CommandCard>
        <div className="py-2 space-y-1.5 text-center sm:text-left">
          <span className="text-xs text-[#94a3b8] uppercase tracking-widest block font-sans">
            CRITICAL ALERTS
          </span>
          <div className="text-3xl md:text-4xl font-black text-cyber-red font-orbitron tracking-tight">
            {criticalEvents.length}
          </div>
        </div>
      </CommandCard>

      {/* Personnel Deployed */}
      <CommandCard>
        <div className="py-2 space-y-1.5 text-center sm:text-left">
          <span className="text-xs text-[#94a3b8] uppercase tracking-widest block font-sans">
            OFFICERS DEPLOYED
          </span>
          <div className="text-3xl md:text-4xl font-black text-cyber-green font-orbitron tracking-tight">
            {personnelDeployed}
          </div>
        </div>
      </CommandCard>

      {/* Average Risk Score */}
      <CommandCard>
        <div className="py-2 space-y-1.5 text-center sm:text-left">
          <span className="text-xs text-[#94a3b8] uppercase tracking-widest block font-sans">
            AVG RISK SCORE
          </span>
          <div className="text-3xl md:text-4xl font-black text-cyber-purple font-orbitron tracking-tight">
            {avgRiskScore.toFixed(1)}
          </div>
        </div>
      </CommandCard>

    </div>
  );
}
