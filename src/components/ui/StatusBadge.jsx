import React from 'react';

export default function StatusBadge({ status, className = '' }) {
  const getStatusStyles = (statusVal) => {
    switch (statusVal) {
      case 'DRAFT':
        return 'text-slate-400 bg-slate-900/50 border-slate-800';
      case 'PENDING_REVIEW':
      case 'PENDING_APPROVAL':
      case 'PENDING APPROVAL':
      case 'SUBMITTED_TO_TC':
      case 'SUBMITTED TO TC':
        return 'text-cyber-yellow bg-cyber-yellow/5 border-cyber-yellow/30';
      case 'INSPECTOR_REVIEWED':
        return 'text-sky-400 bg-sky-950/10 border-sky-500/20';
      case 'APPROVED':
        return 'text-cyber-green bg-cyber-green/5 border-cyber-green/30';
      case 'REJECTED':
        return 'text-cyber-red bg-cyber-red/5 border-cyber-red/30';
      case 'ACTIVE':
      case 'ZONE_ACTIVE':
      case 'ZONE ACTIVE':
        return 'text-cyber-accent bg-cyber-accent/10 border-cyber-accent/30 font-bold';
      case 'COMPLETED':
        return 'text-cyber-purple bg-cyber-purple/5 border-cyber-purple/30';
      default:
        return 'text-slate-300 bg-slate-800 border-slate-700';
    }
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[9px] font-mono font-bold tracking-widest uppercase ${getStatusStyles(status)} ${className}`}>
      {status ? status.replace('_', ' ') : 'UNKNOWN'}
    </span>
  );
}
