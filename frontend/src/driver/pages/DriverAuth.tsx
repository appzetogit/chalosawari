import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  ArrowRight, 
  Phone, 
  User, 
  Mail, 
  ShieldCheck, 
  Zap, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  Edit2,
  Car
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import busLogo from "@/assets/BusLogo.png";
import { useDriverAuth } from "@/contexts/DriverAuthContext";
import { toast } from "@/hooks/use-toast";

type AuthStep = "phone" | "otp" | "profile";

const DriverAuth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, registerDriver, sendOTP, resendOTP, isLoggedIn } = useDriverAuth();

  const [step, setStep] = useState<AuthStep>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(120);
  const [canResend, setCanResend] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  // Profile data for first-time drivers
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: ""
  });

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Get return URL from location state
  const returnUrl = location.state?.returnUrl || "/driver";

  // Redirect if already authenticated
  useEffect(() => {
    if (isLoggedIn && !isLoading) {
      navigate(returnUrl, { replace: true });
    }
  }, [isLoggedIn, isLoading, navigate, returnUrl]);

  // Handle browser back button to navigate between auth steps
  useEffect(() => {
    const handlePopState = () => {
      if (step === "otp" || step === "profile") {
        setStep("phone");
        setOtp(["", "", "", "", "", ""]);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [step]);

  // Format timer into MM:SS
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Function to go back to phone step cleanly
  const handleGoBackToPhone = () => {
    setStep("phone");
    setOtp(["", "", "", "", "", ""]);
  };

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === "otp" && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  // Handle phone number input (only digits, max 10)
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "").slice(0, 10);
    setPhoneNumber(value);
  };

  // Step 1: Send OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!phoneNumber || phoneNumber.length !== 10) {
      toast({
        title: "Invalid Mobile Number",
        description: "Please enter a valid 10-digit mobile number.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await sendOTP(phoneNumber, "auth");
      
      if (response.success) {
        setIsNewUser(!!response.data?.isNewUser);
        try {
          window.history.pushState({ authStep: "otp" }, "");
        } catch (_) {}
        setStep("otp");
        setTimer(120);
        setCanResend(false);
        setOtp(["", "", "", "", "", ""]);
        
        toast({
          title: "OTP Sent Successfully",
          description: `Verification code sent to ${countryCode} ${phoneNumber}`,
        });

        // Focus first OTP input on next tick
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 100);
      } else {
        throw new Error(response.error?.message || response.message || "Failed to send OTP");
      }
    } catch (error: any) {
      console.error("Send OTP error:", error);
      toast({
        title: "Error Sending OTP",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Handle OTP input typing and pasting
  const handleOtpChange = (index: number, value: string) => {
    const cleanVal = value.replace(/[^0-9]/g, "");
    
    // If pasted multi-digit string
    if (cleanVal.length > 1) {
      const pasteValues = cleanVal.slice(0, 6).split("");
      const newOtp = [...otp];
      pasteValues.forEach((digit, i) => {
        if (i < 6) newOtp[i] = digit;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(pasteValues.length, 5);
      otpInputRefs.current[nextIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = cleanVal.slice(-1);
    setOtp(newOtp);

    // Auto-advance
    if (cleanVal && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullOtp = otp.join("");
    if (fullOtp.length !== 6) {
      toast({
        title: "Incomplete OTP",
        description: "Please enter the complete 6-digit verification code.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await login(phoneNumber, fullOtp);
      
      if (response.success && response.token) {
        // Existing driver - Logged in directly!
        toast({
          title: "Welcome Back! 🚖",
          description: "Logged in successfully to Driver Partner Dashboard.",
        });
        navigate(returnUrl, { replace: true });
      } else if (response.success && response.isNewUser) {
        // First-time driver - Move to Profile setup step
        setIsNewUser(true);
        setStep("profile");
        toast({
          title: "Mobile Verified! 🎉",
          description: "Please enter your details to complete driver registration.",
        });
      }
    } catch (error: any) {
      console.error("Verify OTP error:", error);
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid or expired OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (!canResend || isLoading) return;

    try {
      setIsLoading(true);
      const response = await resendOTP(phoneNumber, "auth");
      if (response.success) {
        setTimer(120);
        setCanResend(false);
        setOtp(["", "", "", "", "", ""]);
        toast({
          title: "OTP Resent",
          description: `A fresh code has been sent to ${countryCode} ${phoneNumber}`,
        });
        otpInputRefs.current[0]?.focus();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resend OTP.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Complete Registration for First-Time Drivers
  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileData.firstName.trim() || !profileData.lastName.trim()) {
      toast({
        title: "Missing Details",
        description: "Please provide your first and last name.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const fullOtp = otp.join("");
      
      const payload = {
        firstName: profileData.firstName.trim(),
        lastName: profileData.lastName.trim(),
        email: profileData.email.trim() || undefined,
        phone: phoneNumber,
        otp: fullOtp
      };

      const response = await registerDriver(payload);

      if (response.success) {
        toast({
          title: "Welcome Partner! 🚗",
          description: "Your driver partner account has been created successfully.",
        });
        navigate(returnUrl, { replace: true });
      }
    } catch (error: any) {
      console.error("Driver profile registration error:", error);
      toast({
        title: "Registration Error",
        description: error.message || "Failed to complete driver registration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // fixed: pinned to the viewport so the page itself can't be dragged (body has safe-area padding); scrolls inside only if content is taller
    <div className="fixed inset-0 mx-auto w-full max-w-[480px] overflow-y-auto overscroll-none bg-white flex flex-col justify-between font-sans pb-[env(safe-area-inset-bottom)]">
      {/* Top Mobile App Header */}
      <header className="w-full bg-white border-b border-gray-100 px-4 py-3 flex justify-between items-center sticky top-0 z-30 shadow-2xs">
        <Link to="/driver" className="flex items-center space-x-2">
          <img 
            src={busLogo} 
            alt="Chalo Sawari" 
            className="w-9 h-9 object-contain" 
          />
          <div className="flex flex-col leading-tight">
            <div className="flex items-baseline">
              <span className="text-base font-black text-gray-900 tracking-tight">CHALO</span>
              <span className="text-base font-black text-blue-600 ml-1">SAWARI</span>
            </div>
            <span className="text-[10px] font-bold text-blue-600 tracking-wide uppercase">Driver Partner</span>
          </div>
        </Link>

        <div className="flex items-center space-x-1 text-xs text-gray-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="font-semibold text-gray-700 text-[11px]">Official Portal</span>
        </div>
      </header>

      {/* Main Full-Page Authentication Section (No Card Wrapper) */}
      <main className="flex-1 flex flex-col justify-start max-w-md w-full mx-auto px-5 pt-3 sm:pt-6 pb-8">
        {/* Brand Center Hero Banner */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-2">
            <img 
              src={busLogo} 
              alt="Chalo Sawari Partner" 
              className="w-36 h-28 sm:w-44 sm:h-34 object-contain filter drop-shadow-sm transition-transform hover:scale-105" 
            />
          </div>
          <div className="inline-flex items-center space-x-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
            <Car className="w-3.5 h-3.5 mr-1" />
            <span>Driver & Fleet Portal</span>
          </div>
        </div>

        {/* STEP 1: MOBILE NUMBER INPUT */}
        {step === "phone" && (
          <form onSubmit={handleSendOtp} className="space-y-6">
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                Driver Partner Login
              </h1>
              <p className="text-xs text-gray-500">
                Enter your mobile number to log in or register instantly
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneInput" className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Mobile Number
              </Label>
              <div className="flex rounded-xl border border-gray-300 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-100 bg-white transition-all overflow-hidden shadow-xs">
                {/* Country Code */}
                <div className="flex items-center px-3.5 bg-gray-50 border-r border-gray-200 text-sm font-semibold text-gray-700 select-none">
                  <span className="mr-1.5">🇮🇳</span>
                  <span>{countryCode}</span>
                </div>
                {/* Phone Input */}
                <div className="relative flex-1 flex items-center">
                  <Input
                    id="phoneInput"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoFocus
                    placeholder="Enter 10-digit mobile number"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    className="border-0 shadow-none focus-visible:ring-0 text-base font-semibold text-gray-900 placeholder:text-gray-400 placeholder:font-normal h-12 px-3 tracking-wide"
                    maxLength={10}
                  />
                </div>
              </div>
              <p className="text-[11px] text-gray-400">
                New driver partners are registered automatically upon verification.
              </p>
            </div>

            {/* Send OTP Button */}
            <Button
              type="submit"
              disabled={phoneNumber.length !== 10 || isLoading}
              className="w-full h-12 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all duration-200 active:scale-[0.99] flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Sending OTP...</span>
                </div>
              ) : (
                <>
                  <span>Send OTP</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>

            {/* Feature Highlights */}
            <div className="pt-2 grid grid-cols-3 gap-2 text-center border-t border-gray-100">
              <div className="flex flex-col items-center p-2 rounded-xl bg-gray-50 border border-gray-100">
                <Zap className="w-4 h-4 text-amber-500 mb-1" />
                <span className="text-[10px] font-semibold text-gray-700">Instant OTP</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-xl bg-gray-50 border border-gray-100">
                <ShieldCheck className="w-4 h-4 text-emerald-500 mb-1" />
                <span className="text-[10px] font-semibold text-gray-700">Fast Setup</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-xl bg-gray-50 border border-gray-100">
                <Sparkles className="w-4 h-4 text-blue-500 mb-1" />
                <span className="text-[10px] font-semibold text-gray-700">Easy Payouts</span>
              </div>
            </div>
          </form>
        )}

        {/* STEP 2: OTP VERIFICATION */}
        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                Enter Verification Code
              </h1>
              <p className="text-xs text-gray-500">
                We've sent a 6-digit OTP to your registered mobile number
              </p>
            </div>

            {/* Number summary with Edit button */}
            <div className="flex items-center justify-between p-3 bg-blue-50/70 border border-blue-100 rounded-xl">
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-bold text-gray-800 tracking-wide">
                  {countryCode} {phoneNumber}
                </span>
              </div>
              <button
                type="button"
                onClick={handleGoBackToPhone}
                className="flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-white border border-blue-200 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <Edit2 className="w-3 h-3" />
                <span>Change</span>
              </button>
            </div>

            {/* 6-Digit OTP Boxes */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider block text-center">
                Enter 6-Digit OTP
              </Label>
              <div className="flex justify-between gap-1.5 sm:gap-2 max-w-[320px] mx-auto">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (otpInputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className={`w-11 h-12 sm:w-12 sm:h-13 text-center text-xl font-bold rounded-xl border transition-all outline-none ${
                      digit
                        ? "border-blue-600 bg-blue-50/40 text-blue-900 ring-2 ring-blue-100"
                        : "border-gray-300 bg-gray-50/50 text-gray-800 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Resend OTP & Timer */}
            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center space-x-1 text-gray-500">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                {!canResend ? (
                  <span>
                    Resend code in <strong className="text-gray-700 font-mono font-semibold">{formatTimer(timer)}</strong>
                  </span>
                ) : (
                  <span className="text-gray-500">Didn't receive code?</span>
                )}
              </div>

              <button
                type="button"
                disabled={!canResend || isLoading}
                onClick={handleResendOtp}
                className={`font-semibold transition-colors ${
                  canResend
                    ? "text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    : "text-gray-300 cursor-not-allowed"
                }`}
              >
                Resend OTP
              </button>
            </div>

            {/* Verify Button */}
            <Button
              type="submit"
              disabled={otp.join("").length !== 6 || isLoading}
              className="w-full h-12 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all duration-200 active:scale-[0.99] flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Verifying Code...</span>
                </div>
              ) : (
                <>
                  <span>Verify & Proceed</span>
                  <CheckCircle2 className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>

            {/* Back to Phone button */}
            <button
              type="button"
              onClick={handleGoBackToPhone}
              className="w-full text-center text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors flex items-center justify-center space-x-1 py-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Mobile Number</span>
            </button>
          </form>
        )}

        {/* STEP 3: FIRST TIME DRIVER PROFILE DETAILS */}
        {step === "profile" && (
          <form onSubmit={handleCompleteProfile} className="space-y-4">
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                Complete Driver Profile
              </h1>
              <p className="text-xs text-gray-500">
                Enter your details to finish registration and start accepting rides
              </p>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Mobile <strong>+91 {phoneNumber}</strong> verified successfully.</span>
            </div>

            {/* First & Last Name */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-xs font-bold text-gray-700">
                  First Name *
                </Label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    id="firstName"
                    required
                    autoFocus
                    placeholder="First name"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                    className="pl-9 h-11 text-xs sm:text-sm rounded-xl border-gray-300 focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-xs font-bold text-gray-700">
                  Last Name *
                </Label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    id="lastName"
                    required
                    placeholder="Last name"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                    className="pl-9 h-11 text-xs sm:text-sm rounded-xl border-gray-300 focus:border-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* Email (Optional) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="email" className="text-xs font-bold text-gray-700">
                  Email Address
                </Label>
                <span className="text-[10px] text-gray-400">(Optional)</span>
              </div>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  id="email"
                  type="email"
                  placeholder="driver@example.com"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  className="pl-9 h-11 text-xs sm:text-sm rounded-xl border-gray-300 focus:border-blue-600"
                />
              </div>
            </div>

            {/* Submit Profile Button */}
            <Button
              type="submit"
              disabled={!profileData.firstName.trim() || !profileData.lastName.trim() || isLoading}
              className="w-full h-12 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all duration-200 active:scale-[0.99] flex items-center justify-center space-x-2 mt-2"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Completing Registration...</span>
                </div>
              ) : (
                <>
                  <span>Complete & Start Partnering</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </form>
        )}
      </main>

      {/* Bottom Footer Note */}
      <footer className="px-4 py-4 text-center text-[11px] text-gray-400 border-t border-gray-100 bg-white">
        <p>
          By continuing, you agree to Chalo Sawari{" "}
          <Link to="/driver/terms-conditions" className="text-blue-600 hover:underline font-medium">
            Driver Partner Terms
          </Link>{" "}
          &{" "}
          <Link to="/driver/privacy-policy" className="text-blue-600 hover:underline font-medium">
            Privacy Policy
          </Link>
          .
        </p>
        <p className="text-[10px] text-gray-400 mt-1">© {new Date().getFullYear()} Chalo Sawari. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default DriverAuth;