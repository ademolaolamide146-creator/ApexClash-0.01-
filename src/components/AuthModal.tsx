import React, { useState, useEffect } from 'react';
import { X, Lock, Mail, User, AlertCircle, CheckCircle2, ShieldAlert, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { checkUsernameAvailabilityRpc } from '../lib/supabase';
import { UsernameCheckResult } from '../types';
import { ErrorCard } from './ErrorCard';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'signin' | 'signup' | 'forgot_password';
  onClose: () => void;
  onRequireLegalGate: () => void;
  onSuccess: () => void;
  onAuthSubmit?: (
    e: React.FormEvent,
    data: { email: string; password: string; username?: string; mode: 'signin' | 'signup' }
  ) => Promise<void>;
  authLoading?: boolean;
  authError?: string | null;
  emailConfirmationNotice?: string | null;
  onClearError?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'signin',
  onClose,
  onRequireLegalGate,
  onSuccess,
  onAuthSubmit,
  authLoading,
  authError,
  emailConfirmationNotice,
  onClearError,
}) => {
  const { signIn, signUp, resetPassword, is18Verified } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot_password'>(initialMode);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Username validation state
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    result: UsernameCheckResult | null;
  }>({
    checking: false,
    result: null,
  });

  // Debounced 400ms username check
  useEffect(() => {
    if (mode !== 'signup') {
      setUsernameStatus({ checking: false, result: null });
      return;
    }

    const trimmed = username.trim();
    if (trimmed.length < 3) {
      setUsernameStatus({ checking: false, result: null });
      return;
    }

    setUsernameStatus((prev) => ({ ...prev, checking: true }));

    const handler = setTimeout(async () => {
      const res = await checkUsernameAvailabilityRpc(trimmed);
      setUsernameStatus({ checking: false, result: res });
    }, 400);

    return () => clearTimeout(handler);
  }, [username, mode]);

  // States
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState<boolean>(false);

  // Keep in sync with external error / email notification if provided
  useEffect(() => {
    if (authError !== undefined) {
      setErrorMessage(authError);
    }
  }, [authError]);

  useEffect(() => {
    if (emailConfirmationNotice) {
      setEmailSent(true);
      if (emailConfirmationNotice !== email) {
        setEmail(emailConfirmationNotice);
      }
    }
  }, [emailConfirmationNotice]);

  if (!isOpen) return null;

  const calculatePasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500' };
    if (score <= 3) return { score: 2, label: 'Moderate', color: 'bg-amber-500' };
    return { score: 3, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = calculatePasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    // Enforce 18+ gate
    if (!is18Verified) {
      setErrorMessage('Age 18+ and Fair Play Charter confirmation is required before accessing ApexClash.');
      onRequireLegalGate();
      return;
    }

    if (mode === 'forgot_password') {
      if (!email.trim()) {
        setErrorMessage('Please enter your email address to recover your password.');
        return;
      }
      setSubmitting(true);
      const res = await resetPassword(email);
      setSubmitting(false);
      if (res.success) {
        setSuccessNotice(res.message || 'Password reset email sent! Check your inbox.');
      } else {
        setErrorMessage(res.error || 'Failed to send password reset email.');
      }
      return;
    }

    if (onAuthSubmit && (mode === 'signup' || mode === 'signin')) {
      await onAuthSubmit(e, { email, password, username, mode });
      return;
    }

    if (mode === 'signup') {
      if (!username.trim() || !email.trim() || !password) {
        setErrorMessage('Please fill in all registration fields.');
        return;
      }
      if (username.length < 3) {
        setErrorMessage('Username must be at least 3 characters.');
        return;
      }
      if (password.length < 8) {
        setErrorMessage('Password must be at least 8 characters for account safety.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match. Please re-enter.');
        return;
      }

      setSubmitting(true);
      const res = await signUp(email, password, username);
      setSubmitting(false);

      if (res.success) {
        if (res.requiresEmailConfirmation || !res.session) {
          setEmailSent(true);
        } else {
          onSuccess();
          onClose();
        }
      } else {
        setErrorMessage(res.error || 'Registration failed. Please try again.');
      }
      return;
    }

    if (mode === 'signin') {
      if (!email.trim() || !password) {
        setErrorMessage('Please provide both your email and password.');
        return;
      }

      setSubmitting(true);
      const res = await signIn(email, password);
      setSubmitting(false);

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage(res.error || 'Invalid credentials or connection error.');
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md bg-[#0F0F0F] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        
        {/* Top Gold Accent Bar */}
        <div className="h-1 w-full bg-gradient-to-r from-[#F5A623] to-[#E0921A]" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#F5A623] font-mono">
                {mode === 'signin' && 'Sign In to Arena'}
                {mode === 'signup' && 'Create Contender Account'}
                {mode === 'forgot_password' && 'Password Recovery'}
              </span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              {mode === 'signin' && 'Welcome Back'}
              {mode === 'signup' && 'Join ApexClash'}
              {mode === 'forgot_password' && 'Reset Password'}
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              {mode === 'signin' && 'Enter your credentials to access your matches and coin wallet.'}
              {mode === 'signup' && 'Create a contender account to stake and compete in skill duels.'}
              {mode === 'forgot_password' && 'Enter your registered email address to receive reset instructions.'}
            </p>
          </div>

          {/* 18+ Warning if not yet verified */}
          {!is18Verified && (
            <div className="mb-5 p-3 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/30 flex items-start gap-3">
              <ShieldAlert className="w-4 h-4 text-[#DC2626] flex-shrink-0 mt-0.5" />
              <div className="text-xs text-[#FCA5A5] leading-relaxed">
                <span>18+ verification is required. </span>
                <button
                  type="button"
                  onClick={onRequireLegalGate}
                  className="font-bold underline text-white hover:text-[#F5A623] ml-1"
                >
                  Verify your age now
                </button>
              </div>
            </div>
          )}

          {/* Error Message Box */}
          {errorMessage && (
            <div className="mb-4">
              <ErrorCard
                title={
                  mode === 'signin'
                    ? 'Authentication Failed'
                    : mode === 'signup'
                    ? 'Registration Error'
                    : 'Password Recovery Failed'
                }
                message={errorMessage}
                onDismiss={() => {
                  if (onClearError) onClearError();
                  setErrorMessage(null);
                }}
                autoDismissSeconds={5}
              />
            </div>
          )}

          {/* Success Message Box */}
          {successNotice && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400 mt-0.5" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* Mode Switcher Tabs */}
          {emailSent ? (
            <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center animate-fade-in space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center text-2xl">
                ✉️
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1">Check Your Email ✉️</h3>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  We sent a confirmation link to <span className="font-semibold text-white">{email}</span>. Click the link to verify your account.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEmailSent(false);
                  setMode('signin');
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                ← Back to Log In
              </button>
            </div>
          ) : (
            <>
              {mode !== 'forgot_password' && (
                <div className="flex p-1 mb-6 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setErrorMessage(null);
                    }}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      mode === 'signin'
                        ? 'bg-white/10 text-white shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Log In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setErrorMessage(null);
                    }}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      mode === 'signup'
                        ? 'bg-white/10 text-white shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Sign Up
                  </button>
                </div>
              )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username for Signup */}
            {mode === 'signup' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-neutral-300">
                    Player Username / Gamer Tag
                  </label>
                  {usernameStatus.checking && (
                    <span className="text-[10px] font-mono text-neutral-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin text-[#F5A623]" />
                      Checking...
                    </span>
                  )}
                  {!usernameStatus.checking && usernameStatus.result?.available && (
                    <span className="text-[10px] font-mono text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      ✓ Username is available
                    </span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. LagosGrandmaster"
                    className={`w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none transition-colors ${
                      usernameStatus.result && !usernameStatus.result.available
                        ? 'border-[#DC2626] focus:border-[#DC2626]'
                        : usernameStatus.result?.available
                        ? 'border-emerald-500/60 focus:border-emerald-500'
                        : 'border-white/[0.08] focus:border-[#F5A623]'
                    }`}
                    required
                  />
                </div>

                {/* Username Taken Crimson Banner & Clickable Suggestion Chips */}
                {!usernameStatus.checking && usernameStatus.result && !usernameStatus.result.available && (
                  <div className="mt-2 p-2.5 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/30 space-y-2 animate-fade-in">
                    <div className="flex items-center gap-1.5 text-xs text-[#FCA5A5] font-semibold">
                      <span>✕ Username is already taken</span>
                    </div>

                    {usernameStatus.result.suggestions.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-neutral-400 block">
                          Suggested alternatives:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {usernameStatus.result.suggestions.map((sug) => (
                            <button
                              key={sug}
                              type="button"
                              onClick={() => setUsername(sug)}
                              className="px-2 py-0.5 rounded-lg bg-white/[0.05] border border-white/[0.1] text-xs text-[#F5A623] font-mono hover:bg-white/[0.1]"
                            >
                              {sug}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Email Address */}
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#F5A623] transition-colors"
                  required
                />
              </div>
            </div>

            {/* Password (for Sign In & Sign Up) */}
            {mode !== 'forgot_password' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-neutral-300">Password</label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot_password');
                        setErrorMessage(null);
                      }}
                      className="text-xs text-[#F5A623] hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#F5A623] transition-colors font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password strength indicator on signup */}
                {mode === 'signup' && password.length > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden flex gap-1">
                      <div
                        className={`h-full ${strength.color} transition-all`}
                        style={{ width: `${(strength.score / 3) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-neutral-400">
                      {strength.label}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Confirm Password (for Sign Up) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#F5A623] transition-colors font-mono"
                    required
                  />
                </div>
              </div>
            )}

            {/* Primary Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting || Boolean(authLoading)}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-[#F5A623] to-[#E0921A] text-[#0A0A0A] hover:brightness-105 active:scale-[0.98] transition-all shadow-lg shadow-[#F5A623]/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {submitting || authLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>
                      {mode === 'signin' && 'Sign In to Account'}
                      {mode === 'signup' && 'Create Account'}
                      {mode === 'forgot_password' && 'Send Reset Link'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Fast-Login Option for reviewers */}
          {mode === 'signin' && (
            <div className="mt-4 pt-4 border-t border-white/[0.06] text-center">
              <button
                type="button"
                onClick={() => {
                  setEmail('ademolaolamide146@gmail.com');
                  setPassword('ApexPass123!');
                }}
                className="text-xs text-neutral-400 hover:text-[#F5A623] transition-colors font-mono"
              >
                [Auto-Fill Demo Reviewer Account]
              </button>
            </div>
          )}

          {/* Back link when in forgot password */}
          {mode === 'forgot_password' && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="text-xs text-neutral-400 hover:text-white transition-colors"
              >
                ← Back to Log In
              </button>
            </div>
          )}
          </>
          )}

        </div>
      </div>
    </div>
  );
};
