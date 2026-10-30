import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from '../../hooks/use-toast';
import { adminAuth } from '../../services/adminApi';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import busLogo from '../../assets/BusLogo.png';
import {
  ShieldCheck,
  Lock,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  Shield,
  ArrowLeft,
  Sparkles
} from 'lucide-react';

const AdminAuth: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAdminAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Check if redirected from protected route
  useEffect(() => {
    if (location.state?.from) {
      setMessage('');
    }

    // Debug: Check current authentication status
    const adminToken = localStorage.getItem('adminToken');
    const adminData = localStorage.getItem('adminData');
    if (adminToken && adminData) {
      try {
        const parsed = JSON.parse(adminData);
        console.log('Parsed admin data:', parsed);
      } catch (e) {
        console.error('Error parsing admin data:', e);
      }
    }
  }, [location.state]);

  // Login form state - keeping only phone and password fields
  const [loginForm, setLoginForm] = useState({
    phone: '',
    password: ''
  });

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginForm({
      ...loginForm,
      [e.target.name]: e.target.value
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await adminAuth.login(loginForm.phone, loginForm.password);
      if (response.success && response.token && response.admin) {
        // Create complete admin data object with default values for missing fields
        const adminData = {
          id: response.admin.id,
          firstName: response.admin.firstName,
          lastName: response.admin.lastName,
          phone: response.admin.phone,
          profilePicture: response.admin.profilePicture || undefined,
          isActive: response.admin.isActive !== undefined ? response.admin.isActive : true,
          isVerified: response.admin.isVerified !== undefined ? response.admin.isVerified : true,
          lastLogin: response.admin.lastLogin || undefined,
          lastPasswordChange: response.admin.lastPasswordChange || undefined,
          createdAt: response.admin.createdAt || new Date().toISOString(),
          token: response.token
        };

        login(adminData);
        toast({ title: 'Success!', description: 'Login successful! Redirecting...' });
        navigate('/admin');
      } else {
        throw new Error(response.message || 'Login failed - invalid response');
      }
    } catch (error: any) {
      const errMsg = error?.response?.data?.message || error?.message || 'Login failed';
      setMessage(errMsg);
      toast({ title: 'Login Failed', description: errMsg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between relative overflow-hidden selection:bg-blue-600 selection:text-white">
      {/* Ambient background glow and grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.25),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />



      {/* Center Auth Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Card Container */}
          <div className="relative bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl shadow-blue-950/50 overflow-hidden">

            {/* Top decorative gradient line */}
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400" />

            <div className="p-8 sm:p-10 space-y-6">

              {/* Header with Logo & Brand Title */}
              <div className="text-center space-y-3">
                <div className="inline-flex items-center justify-center p-3 bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700/80 rounded-2xl shadow-lg relative group">
                  <img
                    src={busLogo}
                    alt="Chalo Sawari Logo"
                    className="w-12 h-12 object-contain transition-transform duration-300 group-hover:scale-110"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full p-1 border-2 border-slate-900 shadow">
                    <Shield className="w-3 h-3 text-white" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-semibold tracking-wide uppercase">
                    <Sparkles className="w-3 h-3" />
                    <span>Admin Control Center</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                    Sign in to Portal
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400">
                    Enter your credentials to manage Chalo Sawari
                  </p>
                </div>
              </div>

              {/* Alert Message */}
              {message && (
                <div className={`p-3.5 rounded-xl text-xs sm:text-sm flex items-start space-x-2.5 transition-all ${message.toLowerCase().includes('success')
                  ? 'bg-emerald-950/50 border border-emerald-800/80 text-emerald-300'
                  : 'bg-rose-950/50 border border-rose-800/80 text-rose-300'
                  }`}>
                  {message.toLowerCase().includes('success') ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <span className="leading-relaxed">{message}</span>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-5">
                {/* Field 1: Phone Number */}
                <div className="space-y-2">
                  <Label htmlFor="loginPhone" className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Phone Number</span>
                    <span className="text-[10px] text-slate-500 font-normal normal-case">10-digit mobile</span>
                  </Label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-400 transition-colors">
                      <Phone className="w-4 h-4" />
                    </div>
                    <Input
                      id="loginPhone"
                      name="phone"
                      type="tel"
                      value={loginForm.phone}
                      onChange={handleLoginChange}
                      required
                      autoComplete="tel"
                      className="pl-10 h-12 bg-slate-800/60 border-slate-700/80 text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl transition-all"
                      placeholder="e.g. 9876543210"
                      pattern="[0-9]{10}"
                      maxLength={10}
                    />
                  </div>
                </div>

                {/* Field 2: Password */}
                <div className="space-y-2">
                  <Label htmlFor="loginPassword" className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Password</span>
                  </Label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-400 transition-colors">
                      <Lock className="w-4 h-4" />
                    </div>
                    <Input
                      id="loginPassword"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={loginForm.password}
                      onChange={handleLoginChange}
                      required
                      autoComplete="current-password"
                      className="pl-10 pr-10 h-12 bg-slate-800/60 border-slate-700/80 text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={loading || !loginForm.phone || !loginForm.password}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/25 transition-all duration-200 active:scale-[0.99] flex items-center justify-center space-x-2 group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Login to Admin Panel</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </Button>
              </form>

            </div>
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="relative z-10 py-4 px-6 text-center text-[11px] text-slate-500">
        © {new Date().getFullYear()} Chalo Sawari Admin Portal. All rights reserved.
      </footer>
    </div>
  );
};

export default AdminAuth; 