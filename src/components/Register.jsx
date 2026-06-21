import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Link } from 'react-router-dom';
import CommandButton from './ui/CommandButton';
import { 
  User, 
  Lock, 
  Mail, 
  Phone, 
  IdCard, 
  MapPin, 
  ShieldAlert,
  CheckCircle,
  Activity,
  ArrowLeft
} from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('CONSTABLE');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [zone, setZone] = useState('Central Zone 2');
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !employeeId) {
      setError("Please fill in all mandatory security fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await axios.post(`${API_BASE_URL}/auth/register`, {
        name,
        email,
        password,
        role,
        phone_number: phoneNumber,
        employee_id: employeeId,
        zone
      });
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Registration failed. Verify connection.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#030611] text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
        <div className="absolute inset-0 cyber-grid opacity-30 pointer-events-none"></div>
        <div className="w-full max-w-md bg-[#080c1e] border border-cyber-border rounded-xl p-6 md:p-8 shadow-2xl relative text-center space-y-5">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-cyber-green"></div>
          
          <div className="mx-auto w-12 h-12 rounded-full bg-cyber-green/10 border border-cyber-green/30 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-cyber-green" />
          </div>

          <div className="space-y-1.5 select-none">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest font-orbitron">
              REGISTRATION SUBMITTED
            </h2>
            <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
              Security Protocol Level 1
            </p>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            Your onboarding request for account <span className="text-white font-mono font-bold">{email}</span> has been logged. Access is currently <span className="text-cyber-yellow font-bold">PENDING AUTHORIZATION</span> by a Traffic Commissioner.
          </p>

          <div className="border-t border-cyber-border pt-4 mt-2">
            <Link to="/login" className="w-full">
              <CommandButton variant="secondary" className="w-full flex items-center justify-center gap-2">
                <ArrowLeft className="w-3.5 h-3.5" />
                Return to Login
              </CommandButton>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#050b18] text-slate-100 flex flex-col justify-center items-center p-6 font-sans overflow-hidden">
      
      {/* 3-layer Background System */}
      <div className="absolute inset-0 bg-[#050b18] z-0"></div>
      <div className="absolute inset-0 cyber-grid-exact pointer-events-none z-0"></div>
      <div className="absolute inset-0 radial-glow-exact pointer-events-none z-0"></div>

      <div className="w-full max-w-[560px] z-10 flex flex-col items-center gap-4 relative">
        
        {/* Shield Logo Outline */}
        <div className="w-14 h-14 rounded-xl bg-[#080c1e]/90 border border-[#00d2ff]/30 flex items-center justify-center shadow-[0_0_12px_rgba(0,210,255,0.15)]">
          <ShieldAlert className="w-6 h-6 text-[#00d2ff]" />
        </div>

        {/* Header Branding */}
        <div className="text-center space-y-0.5 select-none">
          <h1 className="text-2xl font-black font-orbitron tracking-[0.1em] text-white">
            TRAFIK - <span className="text-[#00d2ff] font-orbitron">4X</span>
          </h1>
          <p className="text-slate-500 text-[10px] font-orbitron tracking-[0.2em] uppercase font-bold">
            ONBOARDING REGISTRY PROTOCOL
          </p>
        </div>

        {/* Register Card */}
        <div className="glass-card-exact rounded-xl p-5 md:p-6 w-full shadow-2xl relative flex flex-col gap-4">

          {error && (
            <div className="bg-[#ff0055]/5 border border-[#ff0055]/30 rounded-lg p-2.5 text-xs text-[#ff0055] font-mono flex items-start gap-2 shadow-[0_0_8px_rgba(255,0,85,0.1)]">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold uppercase block text-xs">Access Error</span>
                {error}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Name */}
              <div className="space-y-1">
                <label className="block text-sm font-orbitron font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <span className="w-1 h-1 bg-[#00d2ff] rounded-sm inline-block"></span>
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-650" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Officer Name"
                    className="w-full h-12 bg-[#050b18] border border-[#00d2ff]/15 focus:border-[#00d2ff] focus:ring-1 focus:ring-[#00d2ff] rounded-lg pl-9 pr-3 text-sm text-white placeholder-slate-700 outline-none transition-all font-mono"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              {/* Employee ID */}
              <div className="space-y-1">
                <label className="block text-sm font-orbitron font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <span className="w-1 h-1 bg-[#00d2ff] rounded-sm inline-block"></span>
                  Employee ID
                </label>
                <div className="relative">
                  <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-650" />
                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="EMP-XXXX"
                    className="w-full h-12 bg-[#050b18] border border-[#00d2ff]/15 focus:border-[#00d2ff] focus:ring-1 focus:ring-[#00d2ff] rounded-lg pl-9 pr-3 text-sm text-white placeholder-slate-700 outline-none transition-all font-mono"
                    disabled={loading}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Email */}
              <div className="space-y-1">
                <label className="block text-sm font-orbitron font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <span className="w-1 h-1 bg-[#00d2ff] rounded-sm inline-block"></span>
                  Official Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-650" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@astram.gov.in"
                    className="w-full h-12 bg-[#050b18] border border-[#00d2ff]/15 focus:border-[#00d2ff] focus:ring-1 focus:ring-[#00d2ff] rounded-lg pl-9 pr-3 text-sm text-white placeholder-slate-700 outline-none transition-all font-mono"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="block text-sm font-orbitron font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <span className="w-1 h-1 bg-[#00d2ff] rounded-sm inline-block"></span>
                  Passphrase
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-650" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-12 bg-[#050b18] border border-[#00d2ff]/15 focus:border-[#00d2ff] focus:ring-1 focus:ring-[#00d2ff] rounded-lg pl-9 pr-3 text-sm text-white placeholder-slate-700 outline-none transition-all font-mono"
                    disabled={loading}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Phone */}
              <div className="space-y-1">
                <label className="block text-sm font-orbitron font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <span className="w-1 h-1 bg-[#00d2ff] rounded-sm inline-block"></span>
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-650" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+91 XXXXX"
                    className="w-full h-12 bg-[#050b18] border border-[#00d2ff]/15 focus:border-[#00d2ff] focus:ring-1 focus:ring-[#00d2ff] rounded-lg pl-9 pr-3 text-sm text-white placeholder-slate-700 outline-none transition-all font-mono"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Role Select */}
              <div className="space-y-1">
                <label className="block text-sm font-orbitron font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <span className="w-1 h-1 bg-[#00d2ff] rounded-sm inline-block"></span>
                  Requested Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full h-12 bg-[#050b18] border border-[#00d2ff]/15 focus:border-[#00d2ff] focus:ring-1 focus:ring-[#00d2ff] rounded-lg px-3 text-sm text-white outline-none transition-all font-mono cursor-pointer"
                  disabled={loading}
                >
                  <option value="SENIOR_OFFICIAL">Traffic Commissioner</option>
                  <option value="COMMAND_CENTER">Traffic Command Control Operator</option>
                  <option value="CONSTABLE">On-Site Traffic Officer</option>
                  <option value="EMERGENCY_RESPONSE">Emergency Rescue Team</option>
                </select>
                {role && (
                  <p className="text-[10px] font-mono text-[#00d2ff] mt-1.5 min-h-[15px] select-none uppercase tracking-wider">
                    {role === 'SENIOR_OFFICIAL' && 'Traffic Commissioner: Executive city-wide operations authority'}
                    {role === 'COMMAND_CENTER' && 'Traffic Command Control Operator: Live traffic monitoring and deployment'}
                    {role === 'CONSTABLE' && 'On-Site Traffic Officer: Field operations and incident reporting'}
                    {role === 'EMERGENCY_RESPONSE' && 'Emergency Rescue Team: Emergency handling and rescue coordination'}
                  </p>
                )}
              </div>
            </div>

            {/* Zone Selection */}
            <div className="space-y-1">
              <label className="block text-sm font-orbitron font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span className="w-1 h-1 bg-[#00d2ff] rounded-sm inline-block"></span>
                Assigned Operational Zone
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-650" />
                <select
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  className="w-full h-12 bg-[#050b18] border border-[#00d2ff]/15 focus:border-[#00d2ff] focus:ring-1 focus:ring-[#00d2ff] rounded-lg pl-9 pr-3 text-sm text-white outline-none transition-all font-mono cursor-pointer"
                  disabled={loading}
                >
                  <option value="Central Zone 2">Central Zone 2</option>
                  <option value="East Zone">East Zone</option>
                  <option value="West Zone">West Zone</option>
                  <option value="North Zone">North Zone</option>
                  <option value="South Zone">South Zone</option>
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-[#00d2ff] hover:bg-[#00f0ff] text-black font-orbitron font-extrabold uppercase text-sm tracking-wider rounded-lg transition-all btn-glow-cyan cursor-pointer text-center select-none border-none flex items-center justify-center"
              >
                {loading ? "REGISTERING CREDENTIALS..." : "SUBMIT ACCESS REQUEST"}
              </button>
            </div>

          </form>
        </div>

        {/* Return to Login link */}
        <div className="text-center font-mono text-[10px] mt-1">
          <Link to="/login" className="text-slate-500 hover:text-white transition-colors uppercase flex items-center justify-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Login
          </Link>
        </div>

      </div>
    </div>
  );
}
