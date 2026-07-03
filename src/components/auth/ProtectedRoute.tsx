import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/src/store/useAuthStore';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('student' | 'teacher' | 'admin')[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuthStore();
  const location = useLocation();

  // Show a beautifully themed loader while restoring session
  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 text-white">
        <div className="relative">
          <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
          <div className="absolute inset-0 bg-cyan-400/20 blur-xl rounded-full" />
        </div>
        <p className="text-zinc-400 font-medium animate-pulse tracking-widest text-xs uppercase">
          Verifying Security Link...
        </p>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check roles if allowedRoles is specified
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If they are a student trying to access teacher panel, or similar, redirect to home
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
