import { useState } from 'react';
import { Boxes, Mail, Lock, User as UserIcon, Package, Calendar, Wrench, ShieldCheck } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { Button } from '../components/ui/Button';
import { ApiError } from '../lib/apiClient';

export function LoginScreen() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await signup(name, email, password);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && err.details) {
        setFieldErrors(err.details);
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail('priya@assetflow.io');
    setPassword('Password123!');
  };

  return (
    <div className="min-h-screen flex bg-ink-950 relative overflow-hidden font-sans">
      {/* Left panel: Premium Light Brand Presentation */}
      <div className="hidden lg:flex flex-col justify-between pt-16 px-16 pb-8 w-[55%] relative bg-canvas-50 border-r border-canvas-400/40 overflow-hidden">
        {/* Premium Dotted Grid Background */}
        <div 
          className="absolute inset-0 opacity-[0.4] pointer-events-none" 
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(201, 122, 61, 0.2) 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }} 
        />
        
        {/* Soft Accent Glow */}
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-accent-500/5 blur-[120px] pointer-events-none" />

        {/* Top Header: Logo + Name */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-accent-600 to-accent-400 flex items-center justify-center shadow-lg shadow-accent-500/20">
            <Boxes className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <span className="text-ink-800 font-bold text-2xl tracking-tight leading-none">AssetFlow</span>
            <span className="text-[10px] text-accent-600 font-mono tracking-widest uppercase mt-0.5">Enterprise Suite</span>
          </div>
        </div>

        {/* Hero Section */}
        <div className="max-w-xl mb-auto py-12 relative z-10">
          <h1 className="text-5xl xl:text-6xl font-extrabold tracking-tight leading-[1.1] text-ink-800">
            Track every asset.<br />
            <span className="text-accent-600">
              Book every resource.
            </span>
          </h1>
          
          <p className="text-ink-500 text-base mt-6 leading-relaxed font-normal">
            AssetFlow delivers real-time visibility and coordination across your enterprise resources. 
            Automate allocation handshakes, streamline bookings, and check off audits with zero friction.
          </p>

          {/* Value Pillars / Feature Badges */}
          <div className="grid grid-cols-2 gap-5 mt-10">
            <div className="flex gap-4 p-5 rounded-2xl bg-white hover:bg-canvas-100 border border-canvas-400/40 shadow-sm transition-all duration-200">
              <div className="w-11 h-11 rounded-xl bg-accent-500/10 flex items-center justify-center shrink-0">
                <Package className="w-5.5 h-5.5 text-accent-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink-800">Asset Tracking</h3>
                <p className="text-xs text-ink-400 mt-1">Scoped audits and allocations</p>
              </div>
            </div>

            <div className="flex gap-4 p-5 rounded-2xl bg-white hover:bg-canvas-100 border border-canvas-400/40 shadow-sm transition-all duration-200">
              <div className="w-11 h-11 rounded-xl bg-accent-500/10 flex items-center justify-center shrink-0">
                <Calendar className="w-5.5 h-5.5 text-accent-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink-800">Resource Booking</h3>
                <p className="text-xs text-ink-400 mt-1">Time-slot reservation calendars</p>
              </div>
            </div>

            <div className="flex gap-4 p-5 rounded-2xl bg-white hover:bg-canvas-100 border border-canvas-400/40 shadow-sm transition-all duration-200">
              <div className="w-11 h-11 rounded-xl bg-accent-500/10 flex items-center justify-center shrink-0">
                <Wrench className="w-5.5 h-5.5 text-accent-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink-800">Maintenance Board</h3>
                <p className="text-xs text-ink-400 mt-1">Kanban repair workflows</p>
              </div>
            </div>

            <div className="flex gap-4 p-5 rounded-2xl bg-white hover:bg-canvas-100 border border-canvas-400/40 shadow-sm transition-all duration-200">
              <div className="w-11 h-11 rounded-xl bg-accent-500/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5.5 h-5.5 text-accent-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink-800">Audit Checklists</h3>
                <p className="text-xs text-ink-400 mt-1">Departmental verification runs</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex justify-between items-center text-xs text-ink-400 border-t border-canvas-400/40 pt-5 relative z-10">
          <span>Enterprise asset management system</span>
          <span className="font-mono text-[10px] text-accent-600 font-semibold uppercase tracking-wider">Authorized Access Only</span>
        </div>
      </div>

      {/* Right panel: Premium Card Login on Dark BG */}
      <div className="flex-1 flex items-center justify-center p-8 relative bg-ink-950">
        {/* Dotted pattern on dark */}
        <div 
          className="absolute inset-0 opacity-[0.05] pointer-events-none" 
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.15) 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }} 
        />
        <div className="absolute bottom-10 right-10 w-[500px] h-[500px] rounded-full bg-accent-600/5 blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-accent-600 to-accent-400 flex items-center justify-center shadow-lg shadow-accent-500/20">
              <Boxes className="w-5.5 h-5.5 text-white" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-white font-bold text-xl tracking-tight leading-none">AssetFlow</span>
              <span className="text-[9px] text-accent-400/80 font-mono tracking-widest uppercase mt-0.5">Enterprise Suite</span>
            </div>
          </div>

          {/* Premium Form Card */}
          <div className="bg-white rounded-[32px] shadow-2xl shadow-ink-950/45 p-10 border border-canvas-400/10 animate-scaleIn">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-ink-800 tracking-tight">
                {mode === 'login' ? 'Welcome back' : 'Get started'}
              </h2>
              <p className="text-xs text-ink-400 mt-1.5 leading-relaxed">
                {mode === 'login' 
                  ? 'Enter your credentials to access the AssetFlow operational suite.' 
                  : 'Register a new employee profile. System administrators assign roles later.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {mode === 'signup' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-ink-600">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-ink-300" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full h-11 pl-11 pr-4 text-sm rounded-xl border border-canvas-400 bg-canvas-50 text-ink-800 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 focus:bg-white transition-all duration-200"
                    />
                  </div>
                  {fieldErrors.name && <span className="text-xs text-status-lost">{fieldErrors.name}</span>}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-ink-600">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-ink-300" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full h-11 pl-11 pr-4 text-sm rounded-xl border border-canvas-400 bg-canvas-50 text-ink-800 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 focus:bg-white transition-all duration-200"
                  />
                </div>
                {fieldErrors.email && <span className="text-xs text-status-lost">{fieldErrors.email}</span>}
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-ink-600">Password</label>
                  {mode === 'login' && (
                    <button type="button" className="text-xs text-accent-600 hover:text-accent-700 font-semibold transition-colors">
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-ink-300" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-11 pl-11 pr-4 text-sm rounded-xl border border-canvas-400 bg-canvas-50 text-ink-800 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 focus:bg-white transition-all duration-200"
                  />
                </div>
                {fieldErrors.password && <span className="text-xs text-status-lost">{fieldErrors.password}</span>}
              </div>

              {error && (
                <div className="text-xs text-status-lost bg-status-lostSoft rounded-xl px-4 py-3 animate-slideUp border border-status-lost/10">
                  {error}
                </div>
              )}

              <Button type="submit" loading={loading} className="w-full mt-2 !rounded-xl shadow-lg shadow-accent-500/10" size="lg">
                {mode === 'login' ? 'Sign in' : 'Create account'}
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-canvas-400/60">
              <button
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="w-full text-center text-xs text-ink-500 hover:text-ink-700 transition-colors"
              >
                {mode === 'login' ? (
                  <>New to AssetFlow? <span className="text-accent-600 font-semibold">Create an account</span></>
                ) : (
                  <>Already registered? <span className="text-accent-600 font-semibold">Sign in</span></>
                )}
              </button>
            </div>

            {mode === 'login' && (
              <button onClick={fillDemo} className="w-full mt-3 text-center text-xs text-accent-500/80 hover:text-accent-600 transition-colors font-medium border border-accent-100 hover:bg-accent-50/30 rounded-xl py-2 duration-150">
                Use Demo Credentials
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
