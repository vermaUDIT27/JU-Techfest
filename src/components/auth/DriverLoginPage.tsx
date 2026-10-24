import React, { useState } from 'react';
import { Truck, Phone, KeyRound, ArrowRight, AlertCircle, CheckCircle2, RotateCcw, ArrowLeft, Languages } from 'lucide-react';
import { authApi } from '../../services/api';
import { PuneCivicLogo } from '../common/PuneCivicLogo';

interface DriverLoginPageProps {
  onLoginSuccess: (user: any) => void;
  onNavigate: (path: string) => void;
}

export const DriverLoginPage: React.FC<DriverLoginPageProps> = ({
  onLoginSuccess,
  onNavigate,
}) => {
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessInfo(null);
    setIsLoading(true);

    try {
      const cleanDigits = phone.replace(/\D/g, '');
      const cleanPhone = cleanDigits.length > 10 ? cleanDigits.slice(-10) : cleanDigits;
      const res = await authApi.requestDriverOtp(cleanPhone);
      setSuccessInfo(res.message);
      setStep('verify');
    } catch (err: any) {
      setErrorMessage(err.message || (lang === 'en' ? 'Failed to generate verification code.' : 'पडताळणी कोड मिळवण्यात अयशस्वी.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const cleanDigits = phone.replace(/\D/g, '');
      const cleanPhone = cleanDigits.length > 10 ? cleanDigits.slice(-10) : cleanDigits;
      const res = await authApi.verifyDriverOtp(cleanPhone, otp.trim());
      onLoginSuccess(res.user);
    } catch (err: any) {
      setErrorMessage(err.message || (lang === 'en' ? 'Invalid or expired verification code.' : 'अवैध किंवा कालबाह्य सत्यापन कोड.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-monsoon-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Back Link & Language Toggle */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="text-xs font-bold text-basalt-600 hover:text-basalt-900 flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home / Role Selection
          </button>

          <div className="flex items-center gap-1 bg-monsoon-100 p-0.5 rounded-lg border border-monsoon-300">
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`px-2 py-0.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                lang === 'en' ? 'bg-white text-sahyadri-900 shadow-xs' : 'text-basalt-600'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang('hi')}
              className={`px-2 py-0.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                lang === 'hi' ? 'bg-white text-sahyadri-900 shadow-xs' : 'text-basalt-600'
              }`}
            >
              हिंदी
            </button>
          </div>
        </div>

        {/* Mobile-First Header */}
        <div className="flex flex-col items-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-sahyadri-600 text-white flex items-center justify-center shadow-civic mb-2">
            <Truck className="w-7 h-7" />
          </div>

          <h2 className="text-center font-display text-2xl font-extrabold tracking-tight text-basalt-900">
            {lang === 'en' ? 'SANCHAYA — Driver Shift Login' : 'संचय — ड्रायव्हर शिफ्ट लॉगिन'}
          </h2>
          <p className="mt-1 text-center text-xs font-medium text-basalt-500">
            {lang === 'en' ? 'Pune Municipal Waste Collection Fleet' : 'पुणे महानगरपालिका कचरा संकलन वाहन चालक'}
          </p>
        </div>
      </div>

      <div className="mt-2 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-8 shadow-civic-md rounded-2xl border border-monsoon-200">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2 shadow-xs">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block">
                  {lang === 'en' ? 'Verification Error' : 'सत्यापन त्रुटी'}
                </strong>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {successInfo && step === 'verify' && (
            <div className="mb-4 p-3 rounded-xl bg-sahyadri-50 border border-sahyadri-200 text-sahyadri-900 text-xs flex items-start gap-2 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-sahyadri-600 shrink-0 mt-0.5" />
              <span>{successInfo}</span>
            </div>
          )}

          {step === 'request' ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label htmlFor="driver-phone" className="block text-xs font-bold text-basalt-700 uppercase tracking-wider mb-1">
                  {lang === 'en' ? 'Registered Mobile Number' : 'नोंदणीकृत मोबाइल क्रमांक'}
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-basalt-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    id="driver-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={lang === 'en' ? 'Enter 10-digit mobile number' : '१०-अंकी मोबाइल क्रमांक प्रविष्ट करा'}
                    className="block w-full pl-10 pr-3 py-3 border border-monsoon-300 rounded-xl bg-monsoon-50 text-basalt-900 text-sm font-bold tracking-wide focus:outline-none focus:ring-1 focus:ring-saffron-500"
                  />
                </div>
                <p className="mt-1 text-[11px] text-basalt-500">
                  {lang === 'en' ? 'Must be provisioned by your municipal ward supervisor.' : 'पर्यवेक्षकाद्वारे मंजूर केलेला क्रमांक प्रविष्ट करा.'}
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-[46px] flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-sahyadri-600 hover:bg-sahyadri-700 shadow-civic transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (lang === 'en' ? 'Generating Code...' : 'कोड तयार करत आहे...') : (
                  <>
                    <span>{lang === 'en' ? 'Generate Verification Code' : 'पडताळणी कोड मिळवा'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="driver-otp" className="block text-xs font-bold text-basalt-700 uppercase tracking-wider">
                    {lang === 'en' ? '6-Digit Verification Code' : '६-अंकी सत्यापन कोड (OTP)'}
                  </label>
                  <button
                    type="button"
                    onClick={() => { setStep('request'); setErrorMessage(null); setSuccessInfo(null); }}
                    className="text-[11px] text-sahyadri-700 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> {lang === 'en' ? 'Change Number' : 'क्रमांक बदला'}
                  </button>
                </div>

                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-basalt-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    id="driver-otp"
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="block w-full pl-10 pr-3 py-3 border border-monsoon-300 rounded-xl bg-monsoon-50 text-basalt-900 text-lg font-mono font-extrabold tracking-widest text-center focus:outline-none focus:ring-1 focus:ring-saffron-500"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-basalt-500">
                  {lang === 'en' 
                    ? `Development verification code generated for ${phone}. Code expires in 5 minutes.` 
                    : `${phone} साठी विकास पडताळणी कोड तयार केला. कोड ५ मिनिटांत कालबाह्य होईल.`}
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                className="w-full min-h-[46px] flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-sahyadri-600 hover:bg-sahyadri-700 shadow-civic transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (lang === 'en' ? 'Verifying...' : 'सत्यापित करत आहे...') : (
                  <>
                    <span>{lang === 'en' ? 'Verify & Open Shift Navigation' : 'सत्यापित करा आणि मार्ग उघडा'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-6 pt-5 border-t border-monsoon-200 text-center text-xs space-y-2">
            <div>
              <span className="text-basalt-500">Municipal Officer? </span>
              <button
                type="button"
                onClick={() => onNavigate('/officer/login')}
                className="font-bold text-saffron-700 hover:text-saffron-800 underline cursor-pointer"
              >
                Sign In with Officer Credentials &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};