import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ allowedRoles }) {
  const { token, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-command-bg flex items-center justify-center font-mono text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-command-accent border-t-transparent rounded-full animate-spin"></div>
          <span>SECURE CHANNEL INITIALIZING...</span>
        </div>
      </div>
    );
  }

  // If no auth token, redirect to login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // If role is restricted and user doesn't have it, redirect to home or login
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
