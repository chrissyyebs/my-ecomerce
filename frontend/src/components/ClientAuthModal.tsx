import React, { useState, useEffect } from 'react';
import { 
  X, User, Mail, Lock, LogOut, Package,
  Clock, Phone, ShieldCheck, ArrowRight, UserPlus,
  Eye, EyeOff, Check, AlertCircle, RefreshCw, KeyRound, Trash2, AlertTriangle
} from 'lucide-react';
import { Button } from './Button';

export interface ClientUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  joinedAt: string;
}

export interface ClientOrder {
  id: string;
  date: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  itemsCount: number;
  deliveryMethod: string;
  itemsSummary: string;
}

interface ClientAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: ClientUser | null;
  onLogin: (user: ClientUser) => void;
  onLogout: () => void;
  userOrders?: ClientOrder[];
  initialTab?: 'signin' | 'signup' | 'verify_otp' | 'forgot_password' | 'reset_password' | 'account' | 'orders';
}

export const ClientAuthModal: React.FC<ClientAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogin,
  onLogout,
  userOrders = [],
  initialTab,
}) => {
  const [activeTab, setActiveTab] = useState<
    'signin' | 'signup' | 'verify_otp' | 'forgot_password' | 'reset_password' | 'account' | 'orders'
  >(initialTab || (currentUser ? 'account' : 'signin'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpPurpose, setOtpPurpose] = useState<'signup_verification' | 'password_reset'>('signup_verification');
  
  // OTP Expiration Countdown (300 seconds = 5 minutes)
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(300);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [fetchedOrders, setFetchedOrders] = useState<ClientOrder[]>([]);

  // Delete Account State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteWord, setDeleteWord] = useState('');
  const [deleteTypedWord, setDeleteTypedWord] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // Password Requirement Rules for Sign Up
  const reqMinLength = password.length >= 8;
  const reqUppercase = /[A-Z]/.test(password);
  const reqLowercase = /[a-z]/.test(password);
  const reqNumber = /[0-9]/.test(password);
  const reqSymbol = /[^A-Za-z0-9]/.test(password);
  const passedRulesCount = [reqMinLength, reqUppercase, reqLowercase, reqNumber, reqSymbol].filter(Boolean).length;
  const isPasswordValid = passedRulesCount === 5;

  // Password Requirement Rules for Reset Password
  const resetMinLength = newPassword.length >= 8;
  const resetUppercase = /[A-Z]/.test(newPassword);
  const resetLowercase = /[a-z]/.test(newPassword);
  const resetNumber = /[0-9]/.test(newPassword);
  const resetSymbol = /[^A-Za-z0-9]/.test(newPassword);
  const passedResetRulesCount = [resetMinLength, resetUppercase, resetLowercase, resetNumber, resetSymbol].filter(Boolean).length;
  const isResetPasswordValid = passedResetRulesCount === 5;

  // Start OTP 5-minute timer whenever entering verification tabs
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if ((activeTab === 'verify_otp' || activeTab === 'reset_password') && otpSecondsLeft > 0) {
      timer = setInterval(() => {
        setOtpSecondsLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeTab, otpSecondsLeft]);

  // Resend cooldown timer
  useEffect(() => {
    let cooldownTimer: ReturnType<typeof setInterval>;
    if (resendCooldown > 0) {
      cooldownTimer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(cooldownTimer);
  }, [resendCooldown]);

  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      } else if (currentUser) {
        setActiveTab('account');
      } else {
        setActiveTab('signin');
      }
      if (currentUser) fetchMyOrders();
    }
  }, [currentUser, isOpen, initialTab]);

  // Live Auto-Refresh Order Status (polling + custom event listener)
  useEffect(() => {
    if (!currentUser || !isOpen) return;

    fetchMyOrders();

    const handleStatusUpdate = () => fetchMyOrders();
    window.addEventListener('ttl_order_status_updated', handleStatusUpdate);
    const interval = setInterval(fetchMyOrders, 4000);

    return () => {
      window.removeEventListener('ttl_order_status_updated', handleStatusUpdate);
      clearInterval(interval);
    };
  }, [currentUser, isOpen]);

  const fetchMyOrders = async () => {
    try {
      const res = await fetch('/api/orders/mine');
      if (res.ok) {
        const data = await res.json();
        if (data.orders) {
          const mapped: ClientOrder[] = data.orders.map((o: any) => ({
            id: o.id.slice(0, 8).toUpperCase(),
            date: new Date(o.placed_at).toISOString().split('T')[0],
            status: o.status,
            total: Number(o.total_amount),
            itemsCount: o.items?.length || 1,
            deliveryMethod: o.delivery_method === 'door' ? 'Door Delivery' : 'Store Pickup',
            itemsSummary: o.items?.map((i: any) => i.product?.name).filter(Boolean).join(', ') || 'Order Items',
          }));
          setFetchedOrders(mapped);
        }
      }
    } catch {
      /* ignore */
    }
  };

  if (!isOpen) return null;

  const validateInputs = () => {
    if (!name.trim()) {
      setErrorMsg('Full name is required.');
      return false;
    }
    if (!/^[A-Za-z\s]+$/.test(name.trim())) {
      setErrorMsg('Full name must contain letters and spaces only (no digits or special symbols).');
      return false;
    }
    if (!email.trim()) {
      setErrorMsg('Email address is required.');
      return false;
    }
    if (!email.trim().toLowerCase().endsWith('@gmail.com')) {
      setErrorMsg('Registration requires a valid @gmail.com email address.');
      return false;
    }
    if (!phone.trim()) {
      setErrorMsg('Phone number is required.');
      return false;
    }
    if (!/^\d{10}$/.test(phone.trim())) {
      setErrorMsg('Phone number must contain numbers only and be exactly 10 digits.');
      return false;
    }
    if (!isPasswordValid) {
      setErrorMsg('Password does not meet all security requirements listed below.');
      return false;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return false;
    }
    return true;
  };

  // Real Database Login
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (!email.trim().toLowerCase().endsWith('@gmail.com')) {
      setErrorMsg('Please enter a valid @gmail.com email address.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Login failed. Please check your credentials.');
      }

      onLogin(data.user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Sign Up Step 1: Pre-validation & Send OTP
  const handleStartSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (!validateInputs()) return;

    setLoading(true);

    try {
      // Validate signup & check if already registered
      const validateRes = await fetch('/api/auth/validate-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          confirmPassword,
          phone: phone.trim(),
        }),
      });

      const validateData = await validateRes.json();
      if (!validateRes.ok) {
        throw new Error(validateData.message || 'Sign-up details invalid');
      }

      // Send verification OTP to user's email
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          purpose: 'signup_verification',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed sending OTP code');
      }

      setOtpPurpose('signup_verification');
      setInfoMsg(data.message || 'Verification code sent to your @gmail.com address.');
      setOtpSecondsLeft(300);
      setResendCooldown(60);
      setActiveTab('verify_otp');
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  // Sign Up Step 2: Verify OTP & Register User in DB
  const handleCompleteSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (otpSecondsLeft <= 0) {
      setErrorMsg('Verification code has expired. Please click "Resend Code".');
      return;
    }

    if (!otpCode || otpCode.length !== 6) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          phone: phone.trim(),
          otpCode: otpCode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Registration failed.');
      }

      onLogin(data.user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please check your code.');
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password: Verifies email exists in DB before sending OTP
  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (!email.trim() || !email.trim().toLowerCase().endsWith('@gmail.com')) {
      setErrorMsg('Please enter a valid @gmail.com address.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          purpose: 'password_reset',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Account check failed.');
      }

      setOtpPurpose('password_reset');
      setInfoMsg('Password reset code sent to your registered Gmail address.');
      setOtpSecondsLeft(300);
      setResendCooldown(60);
      setActiveTab('reset_password');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initiate password reset.');
    } finally {
      setLoading(false);
    }
  };

  // Reset Password Execution
  const handleExecutePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (otpSecondsLeft <= 0) {
      setErrorMsg('Reset code has expired. Please request a new code.');
      return;
    }

    if (!otpCode || otpCode.length !== 6) {
      setErrorMsg('Please enter the 6-digit reset code.');
      return;
    }

    if (!isResetPasswordValid) {
      setErrorMsg('New password does not meet security requirements.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: otpCode.trim(),
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to reset password.');
      }

      setPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setOtpCode('');
      setInfoMsg('Password reset successfully! You can now log in with your new password.');
      setActiveTab('signin');
    } catch (err: any) {
      setErrorMsg(err.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP code
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setErrorMsg('');
    setInfoMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          purpose: otpPurpose,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed resending code');
      }

      setOtpSecondsLeft(300);
      setResendCooldown(60);
      setOtpCode('');
      setInfoMsg('New verification code sent to your email.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const combinedOrders = currentUser 
    ? [...(userOrders || []), ...fetchedOrders]
    : [];

  const getStatusBadge = (status: ClientOrder['status']) => {
    switch (status) {
      case 'delivered':
        return <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider">Delivered</span>;
      case 'shipped':
        return <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider">Shipped</span>;
      case 'processing':
        return <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider">Processing</span>;
      case 'pending':
        return <span className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider">Pending</span>;
      case 'cancelled':
        return <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider">Cancelled</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-surface rounded-2xl border border-border shadow-luxury overflow-hidden flex flex-col max-h-[90vh]">

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border/80 flex items-center justify-between bg-surface-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center font-bold text-xs">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-semibold text-on-surface leading-snug">
                {currentUser ? `Welcome, ${currentUser.name.split(' ')[0]}` : 
                 activeTab === 'signup' ? 'Create Account' : 
                 activeTab === 'verify_otp' ? 'Verify OTP' : 
                 activeTab === 'forgot_password' ? 'Forgot Password' :
                 activeTab === 'reset_password' ? 'Reset Password' :
                 'Client Login'}
              </h2>
              <p className="text-[11px] text-on-surface-muted">
                {currentUser ? currentUser.email : 'Manage your orders & profile'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-on-surface-muted hover:text-on-surface rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs if logged in */}
        {currentUser && (
          <div className="flex border-b border-border bg-surface px-6 pt-2">
            <button
              onClick={() => setActiveTab('account')}
              className={`pb-2.5 px-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
                activeTab === 'account'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-muted hover:text-on-surface'
              }`}
            >
              My Profile
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`pb-2.5 px-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'orders'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-muted hover:text-on-surface'
              }`}
            >
              My Orders ({combinedOrders.length})
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* SIGN IN TAB */}
          {!currentUser && activeTab === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              {infoMsg && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>{infoMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-on-surface-muted mb-1">
                  Email Address <span className="text-primary">* (@gmail.com)</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-on-surface-muted absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="you@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-surface-subtle border border-border rounded-xl pl-9 pr-4 py-2.5 text-xs text-on-surface placeholder:text-on-surface-muted/50 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-on-surface-muted">
                    Password <span className="text-primary">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg('');
                      setInfoMsg('');
                      setActiveTab('forgot_password');
                    }}
                    className="text-[11px] text-primary hover:underline font-medium"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-on-surface-muted absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-surface-subtle border border-border rounded-xl pl-9 pr-10 py-2.5 text-xs text-on-surface placeholder:text-on-surface-muted/50 focus:outline-none focus:border-primary transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 p-0.5 text-on-surface-muted hover:text-on-surface transition-colors"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={loading}
                className="w-full py-3 text-xs font-semibold uppercase tracking-widest flex items-center justify-center gap-2"
              >
                {loading ? 'Logging In...' : 'Log In'} <ArrowRight className="w-3.5 h-3.5" />
              </Button>

              <div className="text-center pt-2">
                <span className="text-xs text-on-surface-muted">Don't have a client account? </span>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg('');
                    setInfoMsg('');
                    setActiveTab('signup');
                  }}
                  className="text-xs font-semibold text-primary hover:underline ml-1"
                >
                  Create One
                </button>
              </div>
            </form>
          )}

          {/* FORGOT PASSWORD TAB */}
          {!currentUser && activeTab === 'forgot_password' && (
            <form onSubmit={handleRequestPasswordReset} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="text-center space-y-1">
                <KeyRound className="w-8 h-8 text-primary mx-auto opacity-90" />
                <h3 className="text-sm font-semibold text-on-surface">Reset Account Password</h3>
                <p className="text-xs text-on-surface-muted">
                  Enter your registered Gmail address to receive a 6-digit reset code.
                </p>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-on-surface-muted mb-1">
                  Gmail Address <span className="text-primary">* (@gmail.com)</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-on-surface-muted absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="yourname@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-surface-subtle border border-border rounded-xl pl-9 pr-4 py-2.5 text-xs text-on-surface placeholder:text-on-surface-muted/50 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={loading}
                className="w-full py-3 text-xs font-semibold uppercase tracking-widest flex items-center justify-center gap-2"
              >
                {loading ? 'Verifying Account...' : 'Send Password Reset Code'} <ArrowRight className="w-3.5 h-3.5" />
              </Button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg('');
                    setInfoMsg('');
                    setActiveTab('signin');
                  }}
                  className="text-xs text-on-surface-muted hover:text-primary transition-colors"
                >
                  ← Back to Log In
                </button>
              </div>
            </form>
          )}

          {/* RESET PASSWORD TAB */}
          {!currentUser && activeTab === 'reset_password' && (
            <form onSubmit={handleExecutePasswordReset} className="space-y-4">
              {infoMsg && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>{infoMsg}</span>
                </div>
              )}
              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 5-Minute Countdown */}
              <div className="text-center py-2 bg-surface-subtle border border-border/80 rounded-2xl p-3 space-y-1">
                <span className="text-xs font-semibold text-on-surface">Enter Reset Code & New Password</span>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <Clock className={`w-3.5 h-3.5 ${otpSecondsLeft > 60 ? 'text-primary' : 'text-rose-500 animate-pulse'}`} />
                  <span className={`font-mono text-xs font-bold tracking-wider ${otpSecondsLeft > 60 ? 'text-primary' : 'text-rose-500'}`}>
                    Code Expires in {formatTimer(otpSecondsLeft)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-on-surface-muted mb-1">
                  6-Digit Reset Code <span className="text-primary">*</span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center font-mono text-xl tracking-[0.4em] bg-surface-subtle border-2 border-primary/50 rounded-xl py-2.5 text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-on-surface-muted mb-1">
                  New Password <span className="text-primary">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-surface-subtle border border-border rounded-xl pl-3.5 pr-10 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 p-0.5 text-on-surface-muted hover:text-on-surface transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Criteria Checklist */}
                <div className="mt-2.5 p-2.5 rounded-xl bg-surface-subtle border border-border/80 space-y-1 text-[11px]">
                  <div className={`flex items-center gap-1.5 ${resetMinLength ? 'text-emerald-500 font-semibold' : 'text-on-surface-muted'}`}>
                    <Check className={`w-3.5 h-3.5 ${resetMinLength ? 'text-emerald-500' : 'opacity-40'}`} />
                    <span>Min 8 characters</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${resetUppercase ? 'text-emerald-500 font-semibold' : 'text-on-surface-muted'}`}>
                    <Check className={`w-3.5 h-3.5 ${resetUppercase ? 'text-emerald-500' : 'opacity-40'}`} />
                    <span>At least 1 uppercase letter (A-Z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${resetLowercase ? 'text-emerald-500 font-semibold' : 'text-on-surface-muted'}`}>
                    <Check className={`w-3.5 h-3.5 ${resetLowercase ? 'text-emerald-500' : 'opacity-40'}`} />
                    <span>At least 1 lowercase letter (a-z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${resetNumber ? 'text-emerald-500 font-semibold' : 'text-on-surface-muted'}`}>
                    <Check className={`w-3.5 h-3.5 ${resetNumber ? 'text-emerald-500' : 'opacity-40'}`} />
                    <span>At least 1 number (0-9)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${resetSymbol ? 'text-emerald-500 font-semibold' : 'text-on-surface-muted'}`}>
                    <Check className={`w-3.5 h-3.5 ${resetSymbol ? 'text-emerald-500' : 'opacity-40'}`} />
                    <span>At least 1 special character (!@#$%^&*)</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-on-surface-muted mb-1">
                  Confirm New Password <span className="text-primary">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full bg-surface-subtle border border-border rounded-xl px-3.5 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={loading || !isResetPasswordValid || otpSecondsLeft <= 0}
                className="w-full py-3 text-xs font-semibold uppercase tracking-widest flex items-center justify-center gap-2"
              >
                {loading ? 'Resetting Password...' : 'Reset Password & Save'} <ArrowRight className="w-3.5 h-3.5" />
              </Button>

              <div className="text-center pt-1 space-y-1">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading || resendCooldown > 0}
                  className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
                >
                  {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : 'Resend Code'}
                </button>
              </div>
            </form>
          )}

          {/* CREATE ACCOUNT TAB */}
          {!currentUser && activeTab === 'signup' && (
            <form onSubmit={handleStartSignUp} className="space-y-3.5">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-on-surface-muted mb-1">
                  Full Name <span className="text-primary">* (letters & spaces only)</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="First and Last Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-surface-subtle border border-border rounded-xl px-3.5 py-2 text-xs text-on-surface placeholder:text-on-surface-muted/50 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-on-surface-muted mb-1">
                  Gmail Address <span className="text-primary">* (@gmail.com)</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="yourname@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-subtle border border-border rounded-xl px-3.5 py-2 text-xs text-on-surface placeholder:text-on-surface-muted/50 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-on-surface-muted mb-1">
                  Password <span className="text-primary">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-surface-subtle border border-border rounded-xl pl-3.5 pr-10 py-2 text-xs text-on-surface placeholder:text-on-surface-muted/50 focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 p-0.5 text-on-surface-muted hover:text-on-surface transition-colors"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Live Strength Meter Bar */}
                {password.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider">
                      <span className="text-on-surface-muted">Strength:</span>
                      <span className={
                        passedRulesCount <= 2 ? 'text-rose-500' :
                        passedRulesCount <= 4 ? 'text-amber-500' : 'text-emerald-500'
                      }>
                        {passedRulesCount <= 2 ? 'Weak' : passedRulesCount <= 4 ? 'Medium' : 'Strong'}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-border/60 rounded-full overflow-hidden flex gap-0.5">
                      <div className={`h-full transition-all duration-300 ${
                        passedRulesCount >= 1 ? (passedRulesCount <= 2 ? 'bg-rose-500' : passedRulesCount <= 4 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-transparent'
                      }`} style={{ width: '20%' }}></div>
                      <div className={`h-full transition-all duration-300 ${
                        passedRulesCount >= 2 ? (passedRulesCount <= 2 ? 'bg-rose-500' : passedRulesCount <= 4 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-transparent'
                      }`} style={{ width: '20%' }}></div>
                      <div className={`h-full transition-all duration-300 ${
                        passedRulesCount >= 3 ? (passedRulesCount <= 4 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-transparent'
                      }`} style={{ width: '20%' }}></div>
                      <div className={`h-full transition-all duration-300 ${
                        passedRulesCount >= 4 ? (passedRulesCount <= 4 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-transparent'
                      }`} style={{ width: '20%' }}></div>
                      <div className={`h-full transition-all duration-300 ${
                        passedRulesCount === 5 ? 'bg-emerald-500' : 'bg-transparent'
                      }`} style={{ width: '20%' }}></div>
                    </div>
                  </div>
                )}

                {/* Password Criteria Checklist */}
                <div className="mt-2.5 p-3 rounded-xl bg-surface-subtle border border-border/80 space-y-1.5 text-[11px]">
                  <p className="font-semibold text-on-surface-muted uppercase text-[10px] tracking-wider mb-1">
                    Password Requirements:
                  </p>
                  <div className={`flex items-center gap-1.5 transition-colors ${reqMinLength ? 'text-emerald-500 font-semibold' : 'text-on-surface-muted'}`}>
                    <Check className={`w-3.5 h-3.5 ${reqMinLength ? 'text-emerald-500 opacity-100' : 'opacity-40'}`} />
                    <span>At least 8 characters long</span>
                  </div>
                  <div className={`flex items-center gap-1.5 transition-colors ${reqUppercase ? 'text-emerald-500 font-semibold' : 'text-on-surface-muted'}`}>
                    <Check className={`w-3.5 h-3.5 ${reqUppercase ? 'text-emerald-500 opacity-100' : 'opacity-40'}`} />
                    <span>At least 1 uppercase letter (A-Z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 transition-colors ${reqLowercase ? 'text-emerald-500 font-semibold' : 'text-on-surface-muted'}`}>
                    <Check className={`w-3.5 h-3.5 ${reqLowercase ? 'text-emerald-500 opacity-100' : 'opacity-40'}`} />
                    <span>At least 1 lowercase letter (a-z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 transition-colors ${reqNumber ? 'text-emerald-500 font-semibold' : 'text-on-surface-muted'}`}>
                    <Check className={`w-3.5 h-3.5 ${reqNumber ? 'text-emerald-500 opacity-100' : 'opacity-40'}`} />
                    <span>At least 1 number (0-9)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 transition-colors ${reqSymbol ? 'text-emerald-500 font-semibold' : 'text-on-surface-muted'}`}>
                    <Check className={`w-3.5 h-3.5 ${reqSymbol ? 'text-emerald-500 opacity-100' : 'opacity-40'}`} />
                    <span>At least 1 special character (!@#$%^&*)</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-on-surface-muted mb-1">
                  Confirm Password <span className="text-primary">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-surface-subtle border border-border rounded-xl pl-3.5 pr-10 py-2 text-xs text-on-surface placeholder:text-on-surface-muted/50 focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 p-0.5 text-on-surface-muted hover:text-on-surface transition-colors"
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-on-surface-muted mb-1">
                  Phone Number <span className="text-primary">* (10 digits only)</span>
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="0241234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full bg-surface-subtle border border-border rounded-xl px-3.5 py-2 text-xs text-on-surface placeholder:text-on-surface-muted/50 focus:outline-none focus:border-primary font-mono tracking-wider"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={loading || !isPasswordValid}
                className="w-full py-3 text-xs font-semibold uppercase tracking-widest flex items-center justify-center gap-2 mt-2"
              >
                {loading ? 'Sending Code...' : 'Create Account & Send OTP'} <UserPlus className="w-3.5 h-3.5" />
              </Button>

              <div className="text-center pt-2">
                <span className="text-xs text-on-surface-muted">Already registered? </span>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg('');
                    setInfoMsg('');
                    setActiveTab('signin');
                  }}
                  className="text-xs font-semibold text-primary hover:underline ml-1"
                >
                  Log In
                </button>
              </div>
            </form>
          )}

          {/* VERIFY OTP TAB FOR SIGN UP */}
          {!currentUser && activeTab === 'verify_otp' && (
            <form onSubmit={handleCompleteSignUp} className="space-y-4">
              {infoMsg && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>{infoMsg}</span>
                </div>
              )}
              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 5-Minute Expiration Countdown Display */}
              <div className="text-center py-2 bg-surface-subtle border border-border/80 rounded-2xl p-4 space-y-1.5">
                <span className="text-xs font-semibold text-on-surface">Enter 6-Digit Verification Code</span>
                <p className="text-[11px] text-on-surface-muted">
                  Sent to <strong className="text-primary">{email}</strong>.
                </p>
                <div className="pt-2 flex items-center justify-center gap-2">
                  <Clock className={`w-4 h-4 ${otpSecondsLeft > 60 ? 'text-primary' : 'text-rose-500 animate-pulse'}`} />
                  <span className={`font-mono text-sm font-bold tracking-wider ${otpSecondsLeft > 60 ? 'text-primary' : 'text-rose-500'}`}>
                    Expires in {formatTimer(otpSecondsLeft)}
                  </span>
                </div>
                {otpSecondsLeft <= 0 && (
                  <p className="text-[11px] text-rose-500 font-semibold pt-1">
                    Code has expired! Please click below to resend a new code.
                  </p>
                )}
              </div>

              <div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  disabled={otpSecondsLeft <= 0}
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center font-mono text-2xl tracking-[0.5em] bg-surface-subtle border-2 border-primary/50 rounded-xl py-3 text-on-surface focus:outline-none focus:border-primary disabled:opacity-50"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={loading || otpSecondsLeft <= 0}
                className="w-full py-3 text-xs font-semibold uppercase tracking-widest flex items-center justify-center gap-2"
              >
                {loading ? 'Registering Account...' : 'Verify Code & Complete Sign Up'} <ArrowRight className="w-3.5 h-3.5" />
              </Button>

              <div className="text-center pt-2 space-y-2">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading || resendCooldown > 0}
                  className="text-xs font-semibold text-primary hover:underline disabled:opacity-50 disabled:no-underline flex items-center justify-center gap-1.5 mx-auto"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : 'Resend Verification Code'}
                </button>

                <div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('signup')}
                    className="text-[11px] text-on-surface-muted hover:text-primary transition-colors"
                  >
                    ← Edit registration details
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* LOGGED IN — MY PROFILE */}
          {currentUser && activeTab === 'account' && (
            <div className="space-y-5">
              <div className="bg-surface-subtle border border-border rounded-2xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-base shadow-sm">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-serif text-base font-semibold text-on-surface">{currentUser.name}</h3>
                  <p className="text-xs text-on-surface-muted">{currentUser.email}</p>
                  <span className="inline-block mt-1 bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider">
                    Member since {currentUser.joinedAt}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[11px] uppercase tracking-wider font-semibold text-on-surface-muted">
                  Saved Contact Info
                </h4>

                <div className="space-y-2 text-xs bg-surface border border-border/80 rounded-xl p-3.5">
                  <div className="flex items-center gap-2 text-on-surface">
                    <Phone className="w-3.5 h-3.5 text-primary" />
                    <span>{currentUser.phone || 'No phone number saved'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-on-surface">
                    <Mail className="w-3.5 h-3.5 text-primary" />
                    <span>{currentUser.email}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-border flex gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-primary text-primary hover:bg-primary/5 text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                >
                  <Package className="w-4 h-4" /> View Orders
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="py-2.5 px-4 rounded-xl border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>

              {/* DELETE ACCOUNT SECTION */}
              <div className="pt-3 border-t border-border/60">
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => {
                      // Generate a random 6-letter word
                      const words = ['REMOVE', 'ERASE', 'DELETE', 'PURGE', 'CANCEL', 'WIPE', 'DETACH', 'REVOKE', 'DISCARD', 'EXPIRE', 'VANISH', 'OBLITERATE', 'DESTROY', 'TERMINATE'];
                      const randomWord = words[Math.floor(Math.random() * words.length)];
                      setDeleteWord(randomWord);
                      setDeleteTypedWord('');
                      setDeletePassword('');
                      setDeleteError('');
                      setShowDeleteConfirm(true);
                    }}
                    className="w-full py-2 text-[11px] text-on-surface-muted hover:text-rose-500 transition-colors flex items-center justify-center gap-1.5 uppercase tracking-wider"
                  >
                    <Trash2 className="w-3 h-3" /> Delete My Account
                  </button>
                ) : (
                  <div className="space-y-3 p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl">
                    {/* Risk Warning */}
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Danger Zone — Permanent Deletion</h4>
                        <ul className="text-[11px] text-on-surface-muted space-y-0.5 list-disc list-inside">
                          <li>Your account and all personal data will be <strong className="text-rose-500">permanently erased</strong></li>
                          <li>Order history and saved information will be <strong className="text-rose-500">unrecoverable</strong></li>
                          <li>This action <strong className="text-rose-500">cannot be undone</strong></li>
                        </ul>
                      </div>
                    </div>

                    {deleteError && (
                      <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[11px] font-medium">
                        {deleteError}
                      </div>
                    )}

                    {/* Confirmation Word Challenge */}
                    <div>
                      <label className="block text-[11px] text-on-surface-muted mb-1">
                        Type <strong className="text-rose-500 font-mono tracking-wider text-xs">{deleteWord}</strong> below to confirm deletion:
                      </label>
                      <input
                        type="text"
                        placeholder={deleteWord}
                        value={deleteTypedWord}
                        onChange={(e) => setDeleteTypedWord(e.target.value.toUpperCase())}
                        className="w-full bg-surface border border-rose-500/30 rounded-lg px-3 py-2 text-xs font-mono tracking-wider text-on-surface placeholder:text-on-surface-muted/30 focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 py-2 rounded-lg border border-border text-on-surface-muted hover:text-on-surface text-[11px] font-semibold uppercase tracking-wider transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={loading || deleteTypedWord.trim().toUpperCase() !== deleteWord.toUpperCase()}
                        onClick={async () => {
                          setDeleteError('');
                          setLoading(true);
                          try {
                            const res = await fetch('/api/auth/delete-account', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                email: currentUser.email,
                                confirmationWord: deleteTypedWord,
                                expectedWord: deleteWord,
                              }),
                            });
                            const data = await res.json();
                            if (!res.ok) {
                              throw new Error(data.message || 'Deletion failed.');
                            }
                            setShowDeleteConfirm(false);
                            onLogout();
                          } catch (err: any) {
                            setDeleteError(err.message || 'Account deletion failed.');
                          } finally {
                            setLoading(false);
                          }
                        }}
                        className="flex-1 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-[11px] font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="w-3 h-3" /> {loading ? 'Deleting...' : 'Delete Forever'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* LOGGED IN — MY ORDERS */}
          {currentUser && activeTab === 'orders' && (
            <div className="space-y-4">
              {combinedOrders.length === 0 ? (
                <div className="text-center py-8 bg-surface-subtle rounded-2xl border border-border/60">
                  <Package className="w-8 h-8 text-on-surface-muted mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-semibold text-on-surface">No Orders Yet</p>
                  <p className="text-[11px] text-on-surface-muted mt-1 max-w-xs mx-auto">
                    When you place orders, they will appear here with live tracking & status updates.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {combinedOrders.map((ord) => (
                    <div key={ord.id} className="bg-surface-subtle border border-border rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-on-surface">{ord.id}</span>
                          {getStatusBadge(ord.status)}
                        </div>
                        <span className="text-[11px] text-on-surface-muted flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {ord.date}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface font-medium line-clamp-1">{ord.itemsSummary}</p>
                      <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                        <span className="text-on-surface-muted">{ord.deliveryMethod}</span>
                        <span className="font-bold text-primary">GH₵{ord.total.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer Security Note */}
        <div className="px-6 py-2.5 bg-surface-subtle border-t border-border/60 flex items-center justify-center gap-1.5 text-[10px] text-on-surface-muted">
          <ShieldCheck className="w-3 h-3 text-primary" />
          <span>Encrypted Client Session & Secure Storage</span>
        </div>

      </div>
    </div>
  );
};
