// TRAFIK - 4X Centralized Theme Classes
// Aligns login, register, and all dashboards with the target military/cyber command design language.

export const astramindTheme = {
  colors: {
    bg: '#050b18',
    cardBg: 'rgba(8, 12, 30, 0.65)',
    accent: '#00d2ff',
    accentHover: '#00f0ff',
    border: 'rgba(0, 210, 255, 0.15)',
    textMuted: '#94a3b8',
    textMain: '#f1f5f9',
    textDark: '#050b18'
  },
  classes: {
    // 3-layer Background System
    bgWrapper: 'relative min-h-screen bg-[#050b18] text-slate-100 font-sans overflow-x-hidden flex flex-col text-sm md:text-base',
    gridOverlay: 'absolute inset-0 cyber-grid-exact pointer-events-none z-0',
    radialGlow: 'absolute inset-0 radial-glow-exact pointer-events-none z-0',
    
    // Glassmorphic Cyber Card with scaled padding (p-5 or p-6)
    card: 'glass-card-exact rounded-xl p-5 md:p-6 shadow-2xl relative overflow-hidden flex flex-col',
    
    // Vibrant Cyan Primary Button scaled for enterprise UI (h-12 to h-14)
    buttonPrimary: 'h-12 px-6 bg-[#00d2ff] hover:bg-[#00f0ff] text-black font-orbitron font-black uppercase text-sm md:text-base tracking-wider rounded-lg transition-all btn-glow-cyan cursor-pointer text-center border-none flex items-center justify-center gap-2 select-none disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_7px_rgba(0,210,255,0.15)]',
    
    // Secondary Button
    buttonSecondary: 'h-12 px-6 bg-transparent hover:bg-[#00d2ff]/5 text-[#00d2ff] font-orbitron font-bold uppercase text-xs md:text-sm tracking-wider rounded-lg border border-[#00d2ff]/30 hover:border-[#00d2ff] transition-all cursor-pointer text-center flex items-center justify-center gap-2 select-none disabled:opacity-50',
    
    // Inputs (h-12 to h-14)
    input: 'w-full h-12 bg-[#050b18] border border-[#00d2ff]/15 focus:border-[#00d2ff] focus:ring-1 focus:ring-[#00d2ff] rounded-lg px-4 text-sm md:text-base text-slate-100 placeholder-slate-800 outline-none transition-all font-mono',
    
    // Scaled uppercase labels
    label: 'block text-sm font-orbitron font-bold uppercase tracking-widest text-[#94a3b8] mb-2 select-none flex items-center gap-2',
    
    // Page Title (text-3xl to text-4xl)
    title: 'font-orbitron font-black uppercase tracking-wider text-white text-2xl md:text-3xl lg:text-4xl leading-tight',
    
    // Standard cyber text glow class names
    glowTextCyan: 'glow-text-cyan font-orbitron',
    glowTextCritical: 'glow-text-critical font-orbitron'
  }
};
