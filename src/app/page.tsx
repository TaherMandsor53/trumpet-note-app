'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import {
  useGetMeQuery,
  useLoginUserMutation,
  useVerifyForgotUserMutation,
  useResetPasswordMutation,
} from '@/store/api/bandApi';
import { setCredentials, setActiveRole } from '@/store/authSlice';
import { Button } from '@/components/ui/button';
import { FloatingNoteParticles, SoundwaveAnimation } from '@/components/ui/musical-icons';
import {
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Loader2,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const { toast } = useToast();

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Forgot Password modal / view states
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [forgotUsername, setForgotUsername] = useState('');
  const [verifiedUser, setVerifiedUser] = useState<{
    name: string;
    username: string;
    role: string;
    section: string;
  } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  // API hooks
  const { data: sessionData, isLoading: isCheckingSession } = useGetMeQuery();
  const [loginUser, { isLoading: isLoggingIn }] = useLoginUserMutation();
  const [verifyForgotUser, { isLoading: isVerifyingForgot }] = useVerifyForgotUserMutation();
  const [resetPassword, { isLoading: isResettingPassword }] = useResetPasswordMutation();

  // If already authenticated, redirect to /dashboard
  useEffect(() => {
    if (!isCheckingSession) {
      if (currentUser || (sessionData?.authenticated && sessionData.user)) {
        if (sessionData?.user && !currentUser) {
          dispatch(setCredentials({ user: sessionData.user, token: '' }));
          dispatch(setActiveRole(sessionData.user.role));
        }
        router.push('/dashboard');
      }
    }
  }, [currentUser, sessionData, isCheckingSession, dispatch, router]);

  // Handle Login Submit
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!username.trim()) {
      setErrorMessage('Please enter your username or registered email.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    try {
      const res = await loginUser({
        username: username.trim(),
        password,
      }).unwrap();

      dispatch(setCredentials({ user: res.user, token: res.token }));
      dispatch(setActiveRole(res.user.role));

      setSuccessMessage(`Welcome back, ${res.user.name}! Redirecting to Dashboard...`);
      toast.success('Authentication Successful', `Welcome back, ${res.user.name}!`);
      setTimeout(() => {
        router.push('/dashboard');
      }, 500);
    } catch (err: any) {
      console.error('Login failure:', err);
      const errTxt = err?.data?.error || 'Authentication failed. Please verify your credentials.';
      setErrorMessage(errTxt);
      toast.error('Login Failed', errTxt);
    }
  };

  // Handle Forgot Password - Step 1: Verify Username
  const handleVerifyForgotUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);

    if (!forgotUsername.trim()) {
      setForgotError('Please enter your username or registered email.');
      toast.warning('Input Required', 'Please enter your username or registered email.');
      return;
    }

    try {
      const res = await verifyForgotUser({ username: forgotUsername.trim() }).unwrap();
      if (res.exists && res.user) {
        setVerifiedUser(res.user);
        setForgotStep(2);
        toast.info('Account Verified', `Welcome ${res.user.name}. Please enter your new password.`);
      } else {
        const notFoundMsg = 'Username was not found in Member Details sheet.';
        setForgotError(notFoundMsg);
        toast.error('User Not Found', notFoundMsg);
      }
    } catch (err: any) {
      const notFoundMsg = err?.data?.error || `Username '${forgotUsername}' was not found in the Member Details sheet.`;
      setForgotError(notFoundMsg);
      toast.error('Verification Error', notFoundMsg);
    }
  };

  // Handle Forgot Password - Step 2: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);

    if (!newPassword || newPassword.length < 4) {
      const lenMsg = 'New password must be at least 4 characters long.';
      setForgotError(lenMsg);
      toast.warning('Password Too Short', lenMsg);
      return;
    }
    if (newPassword !== confirmPassword) {
      const matchMsg = 'Passwords do not match. Please re-enter.';
      setForgotError(matchMsg);
      toast.warning('Password Mismatch', matchMsg);
      return;
    }

    try {
      const res = await resetPassword({
        username: verifiedUser?.username || forgotUsername.trim(),
        newPassword,
      }).unwrap();

      const successMsg = res.message || 'Password successfully updated in Member Details sheet.';
      setForgotSuccess(successMsg);
      toast.success('Password Updated & Synced', successMsg);
      setForgotStep(3);

      // Pre-fill login form with new password
      setUsername(verifiedUser?.username || forgotUsername.trim());
      setPassword(newPassword);
    } catch (err: any) {
      const failMsg = err?.data?.error || 'Failed to update password. Please try again.';
      setForgotError(failMsg);
      toast.error('Reset Failed', failMsg);
    }
  };

  const resetForgotState = () => {
    setIsForgotOpen(false);
    setForgotStep(1);
    setForgotUsername('');
    setVerifiedUser(null);
    setNewPassword('');
    setConfirmPassword('');
    setForgotError(null);
    setForgotSuccess(null);
  };

  return (
    <div className="h-screen max-h-screen overflow-hidden relative flex flex-col justify-between bg-[#140804] text-foreground selection:bg-[#D97736] selection:text-white">
      {/* Background Animated Floating Particles */}
      <FloatingNoteParticles />

      {/* Ambient glowing orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-[#D97736]/15 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 rounded-full bg-[#E5A93C]/10 blur-3xl pointer-events-none" />

      {/* Top Banner */}
      <header className="w-full shrink-0 relative z-20 border-b border-amber-900/40 bg-black/40 backdrop-blur-md px-4 py-2 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-7 h-7 rounded-full overflow-hidden border border-amber-400/50 shadow-md">
              <Image
                src="/assets/images/TaheriScoutImg.png"
                alt="Taheri Scout Crest"
                width={28}
                height={28}
                className="object-cover"
                priority
              />
            </div>
            <div>
              <span className="font-serif font-black tracking-wide text-sm sm:text-base text-amber-100">
                TAHERI SCOUT BAND
              </span>
              <p className="text-[10px] text-amber-300/70 font-mono uppercase tracking-widest hidden sm:block">
                Religious Band Khidmat • Est. 1988
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-2 sm:py-3 min-h-0 overflow-y-auto">
        <div className="w-full max-w-md my-auto">
          {/* Brand Header Icon & Welcome Title */}
          <div className="text-center mb-3 space-y-1">
            <div className="inline-flex items-center justify-center p-1.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-[#D97736]/20 border border-amber-500/30 shadow-warm-glow">
              <div className="relative w-10 h-10 rounded-full overflow-hidden border border-[#E5A93C] shadow-md">
                <Image
                  src="/assets/images/TaheriScoutImg.png"
                  alt="Taheri Scout Crest"
                  width={40}
                  height={40}
                  className="object-cover w-10 h-10"
                  style={{ width: '40px', height: '40px' }}
                  priority
                />
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 pt-0.5">
              <span className="text-[10px] uppercase tracking-widest font-mono text-[#E5A93C] font-semibold">
                TSG Band Portal
              </span>
              <SoundwaveAnimation />
            </div>

            <h1 className="text-xl sm:text-2xl font-serif font-bold text-amber-50 tracking-tight">
              T.S.G Member Authentication
            </h1>
            <p className="text-[11px] text-amber-200/70 max-w-sm mx-auto">
              Sign in using your credentials provided by your respective section Major.
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-white/[0.05] backdrop-blur-2xl border border-white/15 rounded-2xl p-5 sm:p-6 shadow-2xl shadow-black/60 relative overflow-hidden transition-all">
            {/* Status alerts */}
            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="leading-snug">{errorMessage}</div>
              </div>
            )}

            {successMessage && (
              <div className="mb-5 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="leading-snug">{successMessage}</div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-3">
              {/* Username Input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-amber-200/90 flex items-center justify-between">
                  <span>Username or Email</span>
                  <span className="text-[10px] text-amber-300/50 font-normal">From Member Details</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-400/60">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Enter your username or email"
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-black/40 border border-white/15 text-amber-100 placeholder:text-amber-100/30 text-xs focus:outline-none focus:ring-2 focus:ring-[#D97736] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-amber-200/90">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotUsername(username);
                      setIsForgotOpen(true);
                      setForgotStep(1);
                      setForgotError(null);
                    }}
                    className="text-[11px] text-[#E5A93C] hover:text-[#f3bf5d] hover:underline transition-colors font-medium"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-400/60">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2 rounded-xl bg-black/40 border border-white/15 text-amber-100 placeholder:text-amber-100/30 text-xs focus:outline-none focus:ring-2 focus:ring-[#D97736] focus:border-transparent transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-amber-400/60 hover:text-amber-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-amber-500/40 bg-black/40 text-[#D97736] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <span className="text-[11px] text-amber-200/70">Maintain session on this device</span>
                </label>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="havenly"
                size="default"
                disabled={isLoggingIn}
                className="w-full mt-1 h-10 rounded-xl text-xs sm:text-sm font-bold gap-2 shadow-warm-glow hover:scale-[1.01] transition-transform"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Validating with Member Details...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </main>

      {/* ========================================================
          FORGOT PASSWORD MODAL (Two-Step Verification & Update)
         ======================================================== */}
      {isForgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-[#1D0E07] border border-amber-900/60 shadow-2xl p-6 sm:p-7 relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#D97736]/20 border border-[#D97736]/30 text-[#D97736]">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-amber-50">Reset Portal Password</h3>
                  <p className="text-[11px] text-amber-200/60">Verified directly against the Member Details sheet</p>
                </div>
              </div>
              <button
                onClick={resetForgotState}
                className="text-amber-200/50 hover:text-amber-100 text-lg leading-none p-1"
              >
                ✕
              </button>
            </div>

            {/* Error Message */}
            {forgotError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{forgotError}</span>
              </div>
            )}

            {/* STEP 1: VERIFY USERNAME */}
            {forgotStep === 1 && (
              <form onSubmit={handleVerifyForgotUsername} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-amber-200">
                    Enter your Registered Username or Email:
                  </label>
                  <p className="text-[11px] text-amber-200/70 leading-relaxed">
                    We will check if your account exists in the Member Details spreadsheet.
                  </p>
                  <div className="relative pt-1">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-400/60">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={forgotUsername}
                      onChange={e => setForgotUsername(e.target.value)}
                      placeholder="e.g. taheriscoutgroupdahod@gmail.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-amber-100 placeholder:text-amber-100/30 text-xs focus:outline-none focus:ring-2 focus:ring-[#D97736]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" size="sm" onClick={resetForgotState} className="text-xs">
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="havenly"
                    size="sm"
                    disabled={isVerifyingForgot}
                    className="text-xs gap-1.5"
                  >
                    {isVerifyingForgot ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying in Sheet...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify Username</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* STEP 2: ENTER NEW AND CONFIRM PASSWORD */}
            {forgotStep === 2 && verifiedUser && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {/* Verified user card */}
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <p className="font-bold text-white">{verifiedUser.name}</p>
                    <p className="text-[11px] text-emerald-300">
                      {verifiedUser.role} • {verifiedUser.section} Section
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-amber-200">New Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-400/60">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Minimum 4 characters"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-black/40 border border-white/15 text-amber-100 placeholder:text-amber-100/30 text-xs focus:outline-none focus:ring-2 focus:ring-[#D97736]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-amber-400/60 hover:text-amber-200"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-amber-200">Confirm Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-400/60">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-amber-100 placeholder:text-amber-100/30 text-xs focus:outline-none focus:ring-2 focus:ring-[#D97736]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="text-xs text-amber-300/70 hover:underline"
                  >
                    ← Back
                  </button>
                  <Button
                    type="submit"
                    variant="havenly"
                    size="sm"
                    disabled={isResettingPassword}
                    className="text-xs gap-1.5"
                  >
                    {isResettingPassword ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Updating Sheet...</span>
                      </>
                    ) : (
                      <>
                        <span>Update Password in Sheet</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* STEP 3: SUCCESS CONFIRMATION */}
            {forgotStep === 3 && (
              <div className="text-center py-4 space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-white">Password Updated Successfully!</h4>
                  <p className="text-xs text-amber-200/70 max-w-xs mx-auto">
                    {forgotSuccess || 'Your new password has been saved to the Member Details sheet and synchronized.'}
                  </p>
                </div>

                <Button
                  onClick={() => {
                    setIsForgotOpen(false);
                    setSuccessMessage('Password changed! You can now sign in.');
                  }}
                  variant="havenly"
                  size="default"
                  className="w-full text-xs font-bold gap-2"
                >
                  <span>Return to Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full shrink-0 relative z-20 border-t border-amber-900/30 bg-black/40 backdrop-blur-md py-2 px-4 text-center text-[11px] text-amber-200/50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1">
          <span>TAHERI SCOUT BAND GROUP • DAHOD</span>
          <span className="text-amber-200/70 font-medium">Powered By Taher Mandsorwala</span>
        </div>
      </footer>
    </div>
  );
}
