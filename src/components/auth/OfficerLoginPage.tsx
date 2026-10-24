import React, { useState } from 'react';
import { Shield, Lock, User, ArrowRight, AlertCircle, Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react';
import { authApi } from '../../services/api';
import { PuneCivicLogo } from '../common/PuneCivicLogo';

interface OfficerLoginPageProps {
  onLoginSuccess: (user: any) => void;
  onNavigate: (path: string) => void;
}

export const OfficerLoginPage: React.FC<OfficerLoginPageProps> = ({
  onLoginSuccess,
  onNavigate,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await authApi.loginOfficer(identifier, password);
      onLoginSuccess(res.user);
    } catch (err: any) {
      if (err.statusCode === 401 || err.code === 'INVALID_CREDENTIALS') {
        setErrorMessage('Invalid username or password. Please verify your credentials.');
      } else if (
        err.statusCode === 0 ||
        err.statusCode === 502 ||
        err.statusCode === 503 ||
        err.statusCode === 504 ||
        err.code === 'NETWORK_FAILURE' ||
        err.code === 'SERVICE_UNAVAILABLE'
      ) {
        setErrorMessage(
          'Authentication service cannot be reached. Please ensure the backend server is running on port 5000 (npm run server:dev).'
        );
      } else if (err.statusCode >= 500) {
        setErrorMessage('A server error occurred while processing your request. Please try again later.');
      } else {
        setErrorMessage(err.message || 'Authentication failed. Please verify your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-monsoon-50 flex flex-col justify-center py-10 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        {/* Back Link */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="text-xs font-bold text-basalt-600 hover:text-basalt-900 flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home / Role Selection
          </button>
        </div>

        {/* Pune Civic Emblem & Brand */}
        <div className="flex flex-col items-center mb-6">
          <PuneCivicLogo size="lg" showSubtitle={false} className="justify-center mb-2" />
          <h2 className="text-center font-display text-2xl font-extrabold tracking-tight text-basalt-900">
            SANCHAYA — Officer Portal
          </h2>
          <p className="mt-1 text-center text-xs font-medium text-basalt-500">
            Municipal Officer Secure Authentication
          </p>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-civic-md rounded-2xl border border-monsoon-200">
          <div className="flex items-center gap-2 mb-6 pb-3 border-b border-monsoon-200">
            <Shield className="w-5 h-5 text-saffron-600" />
            <h3 className="text-sm font-bold text-basalt-900 uppercase tracking-wide">
              Authorized Officer Authentication
            </h3>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2.5 shadow-xs">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block">Authentication Failed</strong>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="identifier" className="block text-xs font-bold text-basalt-700 uppercase tracking-wider mb-1.5">
                Officer Identifier / Username
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-basalt-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="identifier"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter officer username"
                  className="block w-full pl-10 pr-3 py-2.5 border border-monsoon-300 rounded-xl bg-monsoon-50 text-basalt-900 placeholder-basalt-400 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-saffron-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-basalt-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-basalt-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your authorized password"
                  className="block w-full pl-10 pr-10 py-2.5 border border-monsoon-300 rounded-xl bg-monsoon-50 text-basalt-900 placeholder-basalt-400 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-saffron-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-basalt-400 hover:text-basalt-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="text-[11px] text-basalt-500 leading-relaxed bg-monsoon-100 p-2.5 rounded-lg border border-monsoon-200">
              <span className="font-bold text-basalt-700">Security Notice:</span> Access restricted to authorized municipal officers. Sessions are encrypted with HttpOnly cookies. No persistent remember-me is permitted.
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[46px] flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-basalt-900 hover:bg-black active:bg-basalt-950 border border-basalt-950 shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-saffron-400" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to SANCHAYA</span>
                  <ArrowRight className="w-4 h-4 text-saffron-400" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-monsoon-200 space-y-2 text-center text-xs">
            <div>
              <span className="text-basalt-500">Collection Truck Crew? </span>
              <button
                type="button"
                onClick={() => onNavigate('/driver/login')}
                className="font-bold text-sahyadri-700 hover:text-sahyadri-800 underline cursor-pointer"
              >
                Sign In with Mobile OTP &rarr;
              </button>
            </div>
            <div>
              <span className="text-basalt-500">Public Resident? </span>
              <button
                type="button"
                onClick={() => onNavigate('/complaints/new')}
                className="font-bold text-rose-700 hover:text-rose-800 underline cursor-pointer"
              >
                File Civic Waste Grievance
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};