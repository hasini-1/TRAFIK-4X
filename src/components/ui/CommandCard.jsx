import React from 'react';

export default function CommandCard({ title, children, className = '', headerRight, glowType }) {
  const getGlowClass = () => {
    if (glowType === 'cyan') return 'glow-cyan';
    if (glowType === 'critical') return 'glow-critical';
    return '';
  };

  return (
    <div className={`glass-card-exact rounded-xl relative overflow-hidden flex flex-col ${getGlowClass()} ${className}`}>
      {/* Subtle Scanline Grid Background */}
      <div className="absolute inset-0 cyber-grid-dense opacity-10 pointer-events-none"></div>
      
      {/* Header Bar */}
      {(title || headerRight) && (
        <div className="border-b border-cyber-border/80 px-5 py-3 bg-[#0a0f26]/60 flex items-center justify-between z-10 select-none">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyber-accent"></span>
            <h3 className="text-xl md:text-2xl font-bold text-slate-200 uppercase tracking-wide font-orbitron leading-tight break-words">
              {title}
            </h3>
          </div>
          {headerRight && <div className="z-10">{headerRight}</div>}
        </div>
      )}

      {/* Body Content */}
      <div className="p-5 flex-1 relative z-10">
        {children}
      </div>
    </div>
  );
}
