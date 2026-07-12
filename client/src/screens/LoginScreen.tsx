import { useState } from 'react';
import { Boxes, Mail, Lock, User as UserIcon } from 'lucide-react';
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
    <div className="min-h-screen flex bg-ink-800 relative overflow-hidden">
      {/* Geometric pattern background */}
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: `repeating-linear-gradient(45deg, #C97A3D 0, #C97A3D 1px, transparent 1px, transparent 24px),
                          repeating-linear-gradient(-45deg, #C97A3D 0, #C97A3D 1px, transparent 1px, transparent 24px)`,
      }} />
      <div className="absolute inset-0 bg-gradient-to-br from-ink-800 via-ink-900 to-ink-950" />
      {/* Accent glow */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 rounded-full bg-accent-500/10 blur-3xl" />
      <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-accent-600/5 blur-3xl" />

      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 w-1/2 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-accent-500 flex items-center justify-center">
            <Boxes className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">AssetFlow</span>
        </div>
        <div className="max-w-md">
          <h1 className="text-3xl font-semibold text-white tracking-tight leading-tight">
            Track every asset.<br />Book every resource.
          </h1>
          <p className="text-ink-200 text-sm mt-4 leading-relaxed">
            Enterprise asset and resource management for organizations that need to know where things are, who's using them, and what needs attention — at a glance.
          </p>
          <div className="flex gap-6 mt-8">
            <div>
              <div className="tag-mono text-accent-300 text-lg">15</div>
              <div className="text-xs text-ink-300 mt-0.5">Assets tracked</div>
            </div>
            <div>
              <div className="tag-mono text-accent-300 text-lg">5</div>
              <div className="text-xs text-ink-300 mt-0.5">Departments</div>
            </div>
            <div>
              <div className="tag-mono text-accent-300 text-lg">6</div>
              <div className="text-xs text-ink-300 mt-0.5">Active bookings</div>
            </div>
          </div>
        </div>
        <div className="text-xs text-ink-400">Internal operational tool — authorized personnel only</div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="w-9 h-9 rounded-xl bg-accent-500 flex items-center justify-center">
              <Boxes className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">AssetFlow</span>
          </div>

          <div className="bg-white rounded-xl2 shadow-elevated p-7 animate-scaleIn">
            <h2 className="text-lg font-semibold text-ink-800">
              {mode === 'login' ? 'Sign in to your account' : 'Create an account'}
            </h2>
            <p className="text-xs text-ink-400 mt-1 mb-5">
              {mode === 'login' ? 'Enter your credentials to access AssetFlow' : 'Sign up creates an employee account — admin roles are assigned later'}
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              {mode === 'signup' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-ink-600">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full h-10 pl-9 pr-3 text-sm rounded-lg border border-canvas-400 bg-white text-ink-800 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400 transition-all"
                    />
                  </div>
                  {fieldErrors.name && <span className="text-xs text-status-lost">{fieldErrors.name}</span>}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-ink-600">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full h-10 pl-9 pr-3 text-sm rounded-lg border border-canvas-400 bg-white text-ink-800 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400 transition-all"
                  />
                </div>
                {fieldErrors.email && <span className="text-xs text-status-lost">{fieldErrors.email}</span>}
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-ink-600">Password</label>
                  {mode === 'login' && (
                    <button type="button" className="text-xs text-accent-600 hover:text-accent-700 font-medium">
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-10 pl-9 pr-3 text-sm rounded-lg border border-canvas-400 bg-white text-ink-800 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400 transition-all"
                  />
                </div>
                {fieldErrors.password && <span className="text-xs text-status-lost">{fieldErrors.password}</span>}
              </div>

              {error && (
                <div className="text-xs text-status-lost bg-status-lostSoft rounded-lg px-3 py-2 animate-slideUp">
                  {error}
                </div>
              )}

              <Button type="submit" loading={loading} className="w-full mt-1" size="lg">
                {mode === 'login' ? 'Sign in' : 'Create account'}
              </Button>
            </form>

            <div className="mt-4 pt-4 border-t border-canvas-400/60">
              <button
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="w-full text-center text-xs text-ink-500 hover:text-ink-700 transition-colors"
              >
                {mode === 'login' ? (
                  <>New here? <span className="text-accent-600 font-medium">Create an account</span></>
                ) : (
                  <>Already have an account? <span className="text-accent-600 font-medium">Sign in</span></>
                )}
              </button>
            </div>

            {mode === 'login' && (
              <button onClick={fillDemo} className="w-full mt-2 text-center text-[11px] text-ink-300 hover:text-ink-500 transition-colors">
                Use demo credentials
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
