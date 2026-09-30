import React, { useState, useEffect } from 'react';
import { X, Lock, Mail, User, Building, ShieldCheck, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { UserPersona, PersonaRole } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: any, token: string) => void;
  personas: UserPersona[];
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  personas,
}) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<PersonaRole>('SUPPLIER');
  const [organizationName, setOrganizationName] = useState('');
  const [gstin, setGstin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'LOGIN') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to authenticate');
        }
        localStorage.setItem('invoicenet_auth_token', data.data.token);
        localStorage.setItem('invoicenet_auth_user', JSON.stringify(data.data.user));
        onLoginSuccess(data.data.user, data.data.token);
        onClose();
      } else {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName,
            email,
            password,
            role,
            organizationName: organizationName || undefined,
            gstin: gstin || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to register account');
        }
        localStorage.setItem('invoicenet_auth_token', data.data.token);
        localStorage.setItem('invoicenet_auth_user', JSON.stringify(data.data.user));
        onLoginSuccess(data.data.user, data.data.token);
        onClose();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Login handler
  const handleQuickLogin = (persona: UserPersona) => {
    let demoEmail = 'priya@techparts.in';
    if (persona.role === 'BUYER') demoEmail = 'rajesh@autoworks.com';
    else if (persona.role === 'FINANCIER') demoEmail = 'vikram@apexcap.in';
    else if (persona.role === 'EXPLORER') demoEmail = 'ananya@drunix.org';

    setEmail(demoEmail);
    setPassword('password123');
    setMode('LOGIN');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 font-sans">
        {/* Header */}
        <div className="bg-gradient-to-r from-navy to-slate-900 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center space-x-2 text-royal-light text-xs font-mono font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="h-4 w-4 text-royal-light" />
            <span>DRUNIX Multi-Party Authentication</span>
          </div>
          <h2 className="text-xl font-bold">
            {mode === 'LOGIN' ? 'Sign In to InvoiceNet' : 'Create Consortium Account'}
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            {mode === 'LOGIN'
              ? 'Access role-authorized invoices, AI copilot, and DRUNIX ledger.'
              : 'Register your enterprise or institution on the DRUNIX DLT network.'}
          </p>
        </div>

        {/* Quick Demo Login Presets */}
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>⚡ Quick Demo Personas</span>
            <span className="text-[10px] text-royal font-mono font-normal">Pass: password123</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {personas.map((p) => (
              <button
                key={p.role}
                type="button"
                onClick={() => handleQuickLogin(p)}
                className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-royal hover:bg-royal/5 text-left transition-all text-xs flex flex-col group"
              >
                <span className="font-semibold text-navy group-hover:text-royal truncate">{p.name}</span>
                <span className="text-[10px] text-slate-500 font-mono">{p.role}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start space-x-2">
              <span className="font-bold">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {mode === 'REGISTER' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-navy mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ramesh Patel"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-royal"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy mb-1">Select Role</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['SUPPLIER', 'BUYER', 'FINANCIER', 'AUDITOR'] as PersonaRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`py-1.5 rounded text-xs font-semibold border transition-all ${
                        role === r
                          ? 'bg-navy text-white border-navy'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {r.slice(0, 4)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy mb-1">Organization Name</label>
                <div className="relative">
                  <Building className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="e.g. Acme Components Pvt Ltd"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-royal"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-navy mb-1">Corporate Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-royal"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-navy mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-royal"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-navy hover:bg-slate-800 text-white font-semibold text-xs transition-colors flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>
                <span>{mode === 'LOGIN' ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <div className="text-center pt-2 border-t border-slate-100">
            {mode === 'LOGIN' ? (
              <p className="text-xs text-slate-500">
                Don't have an enterprise account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('REGISTER')}
                  className="font-bold text-royal hover:underline"
                >
                  Register Organization
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => setMode('LOGIN')}
                  className="font-bold text-royal hover:underline"
                >
                  Sign In
                </button>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
