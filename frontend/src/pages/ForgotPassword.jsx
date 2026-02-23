import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import loginBackground from '@/assets/login-background.webp';
import loginLogo from '@/assets/login logo.png';
import { APP_VERSION } from '@/constants';

const STEPS = { PHONE: 1, OTP: 2, PASSWORD: 3 };

const ForgotPassword = () => {
  const [step, setStep] = useState(STEPS.PHONE);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const inputClass = 'h-12 bg-[#0a0a0a] border-[#0a0a0a] text-[#a0a0a0] placeholder:text-[#6b6b6b]';
  const labelClass = 'text-[#D3D3D3]';
  const linkClass = 'text-[#6A6FF7] hover:text-[#8b8ff9]';

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const data = await api.auth.forgotPassword(phone.trim());
      if (data.success) {
        setStep(STEPS.OTP);
        if (data.devOtp) {
          setDevOtp(data.devOtp);
        }
        setSuccess(data.message || 'OTP sent to your registered phone number.');
      }
    } catch (err) {
      setError(err.message || 'Could not send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.auth.verifyOtp(phone.trim(), otp.replace(/\s/g, ''));
      if (data.success && data.resetToken) {
        setResetToken(data.resetToken);
        setStep(STEPS.PASSWORD);
        setSuccess('');
      }
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    const pwd = newPassword.trim();
    const conf = confirmPassword.trim();
    if (pwd.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (pwd !== conf) {
      setError('Passwords do not match. Please enter the same password in both fields.');
      return;
    }
    setLoading(true);
    try {
      await api.auth.resetPassword(resetToken, pwd);
      setSuccess('Password updated successfully. You can now sign in.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message || 'Could not reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Forgot Password - MyAccounts</title>
        <meta name="description" content="Reset your MyAccounts password via OTP" />
      </Helmet>

      <div
        className="min-h-screen flex items-center justify-center p-6 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${loginBackground})` }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="bg-[#1e1e1e] rounded-3xl shadow-xl p-8 sm:p-10">
            <div className="flex justify-center mb-6">
              <img src={loginLogo} alt="MyAccounts" className="h-10 object-contain" />
            </div>
            <h2 className="text-xl font-bold text-[#D3D3D3] mb-2 text-center">Forgot Password</h2>
            <p className="text-sm text-[#a0a0a0] text-center mb-6">
              {step === STEPS.PHONE && 'Enter your registered phone number to receive an OTP'}
              {step === STEPS.OTP && 'Enter the OTP sent to your phone'}
              {step === STEPS.PASSWORD && 'Create your new password'}
            </p>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2 mb-6"
                role="alert"
              >
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <span className="text-sm text-red-400">{error}</span>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 flex items-center gap-2 mb-6"
                role="alert"
              >
                <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <span className="text-sm text-emerald-400">{success}</span>
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {step === STEPS.PHONE && (
                <motion.form
                  key="phone"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onSubmit={handleRequestOtp}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <Label htmlFor="phone" className={labelClass}>Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="07XXXXXXXX or +947XXXXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className={inputClass}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-colors"
                  >
                    {loading ? 'Sending OTP...' : 'Send OTP'}
                  </Button>
                </motion.form>
              )}

              {step === STEPS.OTP && (
                <motion.form
                  key="otp"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onSubmit={handleVerifyOtp}
                  className="space-y-5"
                >
                  {devOtp && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                      <p className="text-xs text-amber-400 mb-1">Testing mode – use this OTP:</p>
                      <p className="text-lg font-mono font-bold text-amber-300">{devOtp}</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="otp" className={labelClass}>OTP</Label>
                    <Input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      placeholder="000000"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      className={`${inputClass} text-center font-mono text-lg tracking-[0.3em]`}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-colors"
                  >
                    {loading ? 'Verifying...' : 'Verify OTP'}
                  </Button>
                  <button
                    type="button"
                    onClick={() => { setStep(STEPS.PHONE); setPhone(''); setOtp(''); setDevOtp(''); setError(''); setSuccess(''); }}
                    className="w-full text-sm text-[#a0a0a0] hover:text-[#D3D3D3]"
                  >
                    Use a different phone number
                  </button>
                </motion.form>
              )}

              {step === STEPS.PASSWORD && (
                <motion.form
                  key="password"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onSubmit={handleResetPassword}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className={labelClass}>New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="At least 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                        className={`${inputClass} pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a0a0a0] hover:text-[#D3D3D3]"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className={labelClass}>Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className={inputClass}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-colors"
                  >
                    {loading ? 'Updating...' : 'Update Password'}
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>

            <p className="text-center text-[#D3D3D3] mt-6 text-sm">
              Remember your password?{' '}
              <Link to="/login" className={`${linkClass} font-medium`}>
                Sign in
              </Link>
            </p>

            <div className="text-center mt-4">
              <p className="text-[#a0a0a0] text-xs">Version: {APP_VERSION}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default ForgotPassword;
