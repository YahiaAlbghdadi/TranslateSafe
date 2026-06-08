import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import type { UserRole } from '../types/database';
import { ShieldCheck, Loader2, AlertCircle, GraduationCap, BookOpen, School, MailCheck } from 'lucide-react';

const AuthView: React.FC = () => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [schoolAccount, setSchoolAccount] = useState(false);
  const [role, setRole] = useState<UserRole>('student');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const resetForm = () => {
    setError(null);
    setSchoolAccount(false);
    setRole('student');
    setDisplayName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        const metadata: Record<string, string> = {
          display_name: displayName.trim() || email,
        };
        if (schoolAccount) metadata.role = role;

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: metadata },
        });
        if (error) throw error;
        setRegisteredEmail(email);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  if (registeredEmail) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-10 shadow-xl flex flex-col items-center text-center gap-6">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
              <MailCheck className="w-10 h-10 text-emerald-400" />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold text-slate-100">Check your email</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                We sent a confirmation link to
              </p>
              <p className="text-indigo-300 font-medium text-sm">{registeredEmail}</p>
              <p className="text-slate-400 text-sm leading-relaxed mt-1">
                Click the link in that email to activate your account, then come back here to sign in.
              </p>
            </div>
            <button
              onClick={() => { setRegisteredEmail(null); setMode('signin'); resetForm(); }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/20"
            >
              Back to Sign In
            </button>
            <p className="text-slate-600 text-xs">
              Didn't receive it? Check your spam folder.
            </p>
          </div>
        </div>

        <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-900/10 rounded-full blur-3xl opacity-50" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-3xl opacity-50" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="p-3 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl shadow-lg shadow-indigo-500/30">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
            TranslateSafe
          </h1>
          <p className="text-slate-400 text-sm text-center">
            Your personal language learning companion
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-xl">
          <h2 className="text-lg font-semibold text-slate-100 mb-6">
            {mode === 'signin' ? 'Sign in to your account' : 'Create an account'}
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === 'signup' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Display Name <span className="normal-case text-slate-600">(optional)</span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 outline-none focus:border-indigo-500 transition-colors text-sm"
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 outline-none focus:border-indigo-500 transition-colors text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                placeholder="••••••••"
                minLength={6}
                className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 outline-none focus:border-indigo-500 transition-colors text-sm"
              />
            </div>

            {/* School account section — only on signup, hidden by default */}
            {mode === 'signup' && (
              <div className="flex flex-col gap-3">
                {!schoolAccount ? (
                  <button
                    type="button"
                    onClick={() => setSchoolAccount(true)}
                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-indigo-400 transition-colors w-fit"
                  >
                    <School className="w-4 h-4" />
                    Creating a school account?
                  </button>
                ) : (
                  <div className="flex flex-col gap-2 bg-slate-900/60 border border-slate-700 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-slate-300 font-medium">
                        <School className="w-4 h-4 text-indigo-400" />
                        School account
                      </div>
                      <button
                        type="button"
                        onClick={() => setSchoolAccount(false)}
                        className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {([['student', 'Student', GraduationCap], ['teacher', 'Teacher', BookOpen]] as const).map(([val, label, Icon]) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setRole(val)}
                          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border font-medium text-sm transition-all ${
                            role === val
                              ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            {mode === 'signin' ? (
              <>
                Don't have an account?{' '}
                <button
                  onClick={() => { setMode('signup'); resetForm(); }}
                  className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => { setMode('signin'); resetForm(); }}
                  className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-900/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-3xl opacity-50" />
      </div>
    </div>
  );
};

export default AuthView;
