import React, { useState } from 'react';
import { Shield, Eye, EyeOff, Lock, User } from 'lucide-react';
import { saveUser } from '../utils/storage';

interface Props {
  onLogin: (email: string) => void;
}

export default function LoginPage({ onLogin }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('All fields are required.');
      return;
    }
    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }
    }
    saveUser(email);
    onLogin(email);
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex flex-col">
      {/* Top bar */}
      <div className="bg-[#0f4c81] text-white text-xs text-center py-1.5">
        Government of India Portal — For Taxpayer Services
      </div>

      {/* Header */}
      <header className="bg-white shadow-sm border-b-4 border-[#0f766e]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <div className="w-14 h-14 bg-[#0f4c81] rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <div className="text-[#0f4c81] font-bold text-xl tracking-tight">
              Goods and Services Tax Network
            </div>
            <div className="text-[#0f766e] text-sm font-medium">
              GST Portal — Smart Compliance Simulator
            </div>
          </div>
          <div className="ml-auto text-right hidden md:block">
            <div className="text-xs text-gray-500">Government of India</div>
            <div className="text-xs text-gray-400">Ministry of Finance</div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-[#0f4c81] px-6 py-5 text-white text-center">
              <Lock className="w-8 h-8 mx-auto mb-2 opacity-90" />
              <h2 className="text-lg font-semibold">Taxpayer Login</h2>
              <p className="text-blue-200 text-sm mt-1">GST Portal — Secure Access</p>
            </div>

            <div className="flex border-b border-gray-200">
              {(['login', 'signup'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(''); }}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    mode === m
                      ? 'bg-[#0f766e] text-white'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {m === 'login' ? 'Sign In' : 'New Registration'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-300 text-red-700 text-sm px-3 py-2 rounded">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                  Email / Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e]"
                    placeholder="Enter registered email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-9 py-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e]"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e]"
                      placeholder="Re-enter password"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-[#0f766e] hover:bg-[#0d6560] text-white py-2.5 rounded font-semibold text-sm transition-colors"
              >
                {mode === 'login' ? 'Login to Portal' : 'Register & Login'}
              </button>

              {mode === 'login' && (
                <p className="text-center text-xs text-[#0f4c81] cursor-pointer hover:underline">
                  Forgot Password? Reset via OTP
                </p>
              )}
            </form>
          </div>

          <div className="text-center mt-4 text-xs text-gray-500">
            Best viewed in Chrome 90+ | Screen Resolution 1280x800
          </div>
        </div>
      </div>

      <footer className="bg-[#0f4c81] text-white text-xs text-center py-3">
        © 2024 Goods and Services Tax Network. All Rights Reserved. | Designed & Developed by GSTN
      </footer>
    </div>
  );
}
