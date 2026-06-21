import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import CommandButton from './ui/CommandButton';
import { 
  Shield, 
  Lock, 
  Mail, 
  AlertCircle, 
  Radio, 
  User, 
  ShieldAlert, 
  Eye, 
  EyeOff,
  Activity
} from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all security fields.");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      navigate('/', { replace: true });
    } else {
      setError(result.error);
    }
  };

  const handleQuickLogin = async (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setLoading(true);
    setError(null);

    const result = await login(demoEmail, demoPassword);
    setLoading(false);

    if (result.success) {
      navigate('/', { replace: true });
    } else {
      setError(result.error);
    }
  };

  const demoUsers = [
    {
      role: 'SENIOR_OFFICIAL',
      title: 'Commissioner',
      email: 'senior@astram.gov.in',
      password: 'senior123',
      name: 'Commissioner Anirudh',
      color: 'border-cyber-red/20 hover:border-cyber-red/50 text-cyber-red bg-cyber-red/5',
      badgeColor: 'bg-cyber-red/10 text-cyber-red border-cyber-red/20',
      icon: ShieldAlert
    },
    {
      role: 'COMMAND_CENTER',
      title: 'Traffic Control Command Center Officer',
      email: 'operator@astram.gov.in',
      password: 'operator123',
      name: 'Operator Roy',
      color: 'border-cyber-accent/20 hover:border-cyber-accent/50 text-cyber-accent bg-cyber-accent/5',
      badgeColor: 'bg-cyber-accent/10 text-cyber-accent border-cyber-accent/20',
      icon: Radio
    },
    {
      role: 'INSPECTOR',
      title: 'Onsite Traffic Inspector',
      email: 'inspector@astram.gov.in',
      password: 'inspector123',
      name: 'Inspector Sharma',
      color: 'border-cyber-accent/20 hover:border-cyber-accent/50 text-cyber-accent bg-[#00d2ff]/5',
      badgeColor: 'bg-cyber-accent/10 text-cyber-accent border-cyber-accent/20',
      icon: User
    },
    {
      role: 'EMERGENCY_RESPONSE',
      title: 'Emergency Response Team',
      email: 'responder@astram.gov.in',
      password: 'responder123',
      name: 'Rescue Team Kumar',
      color: 'border-cyber-red/20 hover:border-cyber-red/50 text-cyber-red bg-[#ef4444]/5',
      badgeColor: 'bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20',
      icon: Activity
    }
  ];

  return (
    <div className="relative min-h-screen bg-[#050b18] text-slate-100 flex flex-col justify-center items-center p-6 font-sans overflow-hidden">
      
      {/* 3-layer Background System */}
      <div className="absolute inset-0 bg-[#050b18] z-0"></div>
      <div className="absolute inset-0 cyber-grid-exact pointer-events-none z-0"></div>
      <div className="absolute inset-0 radial-glow-exact pointer-events-none z-0"></div>

      <div className="w-full max-w-[500px] z-10 flex flex-col items-center relative">
        
        {/* Shield Logo Outline with Glow */}
        <div className="w-20 h-20 rounded-2xl bg-[#080c1e]/90 border border-[#00d2ff]/30 flex items-center justify-center shadow-[0_0_15px_rgba(0,210,255,0.2)] mb-[9px]">
          <Shield className="w-10 h-10 text-[#00d2ff]" />
        </div>

        {/* Title */}
        <div className="text-center select-none mb-[9px]">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-black font-orbitron tracking-[0.1em] text-white">
            TRAFIK - <span className="text-[#00d2ff] font-orbitron">4X</span>
          </h1>
          <p className="text-sm font-orbitron tracking-[0.2em] uppercase font-bold text-slate-400 mt-[1px]">
            AUTHORIZED PERSONNEL ONLY
          </p>
        </div>

        {/* Glassmorphic Form Card */}
        <div className="glass-card-exact rounded-xl p-6 w-full shadow-2xl relative flex flex-col gap-3 mb-[9px]">
          
          {error && (
            <div className="bg-[#ff0055]/5 border border-[#ff0055]/30 rounded-lg p-2.5 text-sm text-[#ff0055] font-mono flex items-start gap-2 shadow-[0_0_8px_rgba(255,0,85,0.1)]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold uppercase block text-xs">Clearance Denied</span>
                <span className="text-xs">{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            
            {/* Badge Number */}
            <div className="space-y-1">
              <label className="block text-xs font-orbitron font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 select-none">
                <span className="w-1 h-1 bg-[#00d2ff] rounded-sm inline-block"></span>
                Badge Number
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. OP-001"
                  className="w-full h-12 bg-[#050b18] border border-[#00d2ff]/15 focus:border-[#00d2ff] focus:ring-1 focus:ring-[#00d2ff] rounded-lg px-4 text-sm text-slate-100 placeholder-slate-800 outline-none transition-all font-mono"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Security Clearance */}
            <div className="space-y-1">
              <label className="block text-xs font-orbitron font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 select-none">
                <span className="w-1 h-1 bg-[#00d2ff] rounded-sm inline-block"></span>
                Security Clearance
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 bg-[#050b18] border border-[#00d2ff]/15 focus:border-[#00d2ff] focus:ring-1 focus:ring-[#00d2ff] rounded-lg px-4 text-sm text-slate-100 placeholder-slate-800 outline-none transition-all font-mono"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-0.5">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-[#00d2ff] hover:bg-[#00f0ff] text-black font-orbitron font-black uppercase text-base tracking-[0.05em] rounded-lg transition-all btn-glow-cyan cursor-pointer text-center select-none border-none flex items-center justify-center font-bold"
              >
                {loading ? "ESTABLISHING CONNECTION..." : "ESTABLISH CONNECTION"}
              </button>
            </div>

          </form>

          {/* Onboarding Request Link */}
          <div className="text-center border-t border-[#00d2ff]/10 pt-2.5 z-10 relative">
            <span className="text-xs text-slate-500 font-mono">New Operator? </span>
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="text-xs text-[#00d2ff] hover:text-[#00f0ff] font-bold font-mono uppercase tracking-widest transition-colors cursor-pointer ml-1 bg-transparent border-none"
            >
              Request Onboarding
            </button>
          </div>

        </div>

        {/* Demo Quick-Access Gateway */}
        <div className="w-full space-y-1.5 mb-[9px]">
          <div className="flex items-center gap-3 px-1">
            <span className="text-[9px] font-mono tracking-widest uppercase text-slate-600 select-none">
              Demo Access Bypass Keys
            </span>
            <div className="flex-1 border-t border-[#00d2ff]/10"></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {demoUsers.map((demo) => (
              <button
                key={demo.role}
                onClick={() => handleQuickLogin(demo.email, demo.password)}
                disabled={loading}
                className="flex items-center justify-between p-2.5 border border-[#00d2ff]/10 hover:border-[#00d2ff]/30 bg-[#080c1e]/40 rounded-lg text-left transition-all group disabled:opacity-50 cursor-pointer"
              >
                <div className="font-mono text-[9px] leading-tight space-y-0.5">
                  <div className="font-bold text-xs text-white group-hover:text-[#00d2ff] transition-colors">{demo.title}</div>
                  <div className="text-slate-500 text-[9px]">{demo.name}</div>
                </div>
                <span className="text-[9px] text-[#00d2ff] font-orbitron font-bold">BYPASS</span>
              </button>
            ))}
          </div>
        </div>

        {/* System Details Footer */}
        <div className="text-center font-mono text-[10px] text-slate-600 tracking-wider space-y-0.5 mt-1">
          <div>SYSTEM v0.9.4.2</div>
          <div className="tracking-[0.2em] uppercase">UNAUTHORIZED ACCESS IS STRICTLY PROHIBITED</div>
        </div>

      </div>

    </div>
  );
}
