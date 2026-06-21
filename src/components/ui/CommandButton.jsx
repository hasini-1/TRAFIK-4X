import React from 'react';
import { astramindTheme } from '../../theme/astramindTheme';

export default function CommandButton({ 
  onClick, 
  children, 
  className = '', 
  disabled = false, 
  variant = 'primary', 
  type = 'button' 
}) {
  const getVariantStyles = () => {
    if (disabled) {
      return 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed';
    }
    
    switch (variant) {
      case 'primary':
        return 'bg-gradient-to-r from-[#00d2ff] to-[#38bdf8] hover:from-[#00f0ff] hover:to-[#00d2ff] text-black font-extrabold border-none btn-glow-cyan';
      case 'secondary':
        return 'bg-transparent text-[#00d2ff] border border-[#00d2ff]/40 hover:border-[#00d2ff] hover:bg-[#00d2ff]/5';
      case 'danger':
        return 'bg-[#ff0055] text-white font-bold border border-[#ff0055] hover:shadow-[0_0_12px_rgba(255,0,85,0.4)] hover:bg-[#e6004c]';
      case 'success':
        return 'bg-[#00ff66] text-black font-extrabold border border-[#00ff66] hover:shadow-[0_0_12px_rgba(0,255,102,0.4)] hover:bg-[#00e65c]';
      default:
        return 'bg-slate-950 text-slate-350 border border-slate-800 hover:border-slate-600 hover:bg-slate-900';
    }
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`font-orbitron text-[10px] tracking-widest uppercase py-2.5 px-5 rounded-lg transition-all duration-200 select-none cursor-pointer flex items-center justify-center gap-1.5 ${getVariantStyles()} ${className}`}
    >
      {children}
    </button>
  );
}
