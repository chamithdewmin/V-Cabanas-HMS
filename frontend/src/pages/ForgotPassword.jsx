import { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import loginBackground from '@/assets/login-background.webp';
import loginLogo from '@/assets/login logo.png';
import './Login.css';

const EyeIcon = ({ open }) =>
  open ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

const SuccessIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 12.5 11 15l5-6" />
  </svg>
);

const ErrorIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 7v7" />
    <circle cx="12" cy="16" r="0.8" />
  </svg>
);

const getPasswordRuleState = (password, { email, phone } = {}) => {
  const value = password || '';
  const lower = value.toLowerCase();
  const emailName = (email || '').split('@')[0]?.toLowerCase() || '';
  const phoneDigits = String(phone || '').replace(/\D/g, '');
  const last4 = phoneDigits.length >= 4 ? phoneDigits.slice(-4) : '';

  return {
    length: value.length >= 8,
    upper: /[A-Z]/.test(value),
    number: /\d/.test(value),
    symbol: /[^A-Za-z0-9]/.test(value),
    noPersonal:
      value.length > 0
        ? !(
            (emailName.length >= 2 && lower.includes(emailName)) ||
            (last4 && lower.includes(last4))
          )
        : false,
  };
};

const PasswordChecklist = ({ password, email, phone }) => {
  const hasValue = (password || '').length > 0;
  const rules = getPasswordRuleState(password, { email, phone });

  const items = [
    { key: 'length', label: 'Be at least 8 characters' },
    { key: 'noPersonal', label: 'Not contain your phone number (last 4 digits) or email username' },
    { key: 'upper', label: 'Include at least one uppercase letter' },
    { key: 'number', label: 'Include at least one number' },
    { key: 'symbol', label: 'Include at least one symbol' },
  ];

  return (
    <div className="password-rules">
      <p className="password-rules-title">Password must include:</p>
      <ul>
        {items.map((item) => {
          const ok = hasValue && rules[item.key];
          return (
            <li key={item.key} className={ok ? 'password-rule password-rule--ok' : 'password-rule'}>
              <span className="password-rule-icon">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={ok ? '#22c55e' : '#4b5563'} strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M8.5 12.5 11 15l4.5-5.5" />
                </svg>
              </span>
              <span className="password-rule-text">{item.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default function ForgotPassword() {
  const navigate = useNavigate();
  const countdownRef = useRef(null);

  const [view, setView] = useState('forgot');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [resetToken, setResetToken] = useState('');
  const [devOtp, setDevOtp] = useState('');

  const startCountdown = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(60);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          countdownRef.current = null;
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const goLogin = () => {
    navigate('/login');
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setOtpError('');
    setOtpSuccess('');
    const trimmed = (phone || '').trim();
    if (!trimmed) {
      setOtpError('Phone number is required.');
      return;
    }
    setLoading(true);
    setDevOtp('');
    try {
      const data = await api.auth.forgotPassword(trimmed);
      if (data.success) {
        setOtpSuccess(data.message || 'OTP sent to your registered phone number.');
        if (data.devOtp) setDevOtp(String(data.devOtp));
        setView('otp');
        startCountdown();
      }
    } catch (err) {
      setOtpError(err.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (val, i) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    setOtpError('');

    if (val && i < otp.length - 1) {
      const el = document.getElementById(`otp-${i + 1}`);
      el?.focus();
    }
  };

  const handleOtpKey = (e, i) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      const el = document.getElementById(`otp-${i - 1}`);
      el?.focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.every((d) => d !== '')) {
      setOtpError('Please enter the complete OTP code');
      return;
    }
    setOtpError('');
    setOtpSuccess('');
    const code = otp.join('');
    setLoading(true);
    try {
      const data = await api.auth.verifyOtp(phone.trim(), code);
      if (data.success && data.resetToken) {
        setResetToken(data.resetToken);
        setOtpSuccess('OTP verified. Set your new password below.');
        setView('reset');
      }
    } catch (err) {
      setOtpError(err.message || 'Invalid or expired OTP. Please try again or request a new code.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setOtpError('');

    const ruleState = getPasswordRuleState(newPassword, { email: '', phone });
    const rulesOk = Object.values(ruleState).every(Boolean);

    if (!rulesOk) {
      setOtpError('Password does not meet all requirements');
      return;
    }
    if (newPassword !== confirmPassword) {
      setOtpError('Passwords do not match');
      return;
    }
    if (!resetToken) {
      setOtpError('Session expired. Please start again from the phone step.');
      return;
    }

    setLoading(true);
    try {
      await api.auth.resetPassword(resetToken, newPassword.trim());
      setOtpSuccess('Password updated successfully. Redirecting to sign in…');
      setOtp(['', '', '', '', '', '']);
      setNewPassword('');
      setConfirmPassword('');
      setPhone('');
      setResetToken('');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setOtpError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpError('');
    setOtpSuccess('');
    const trimmed = (phone || '').trim();
    if (!trimmed) {
      setOtpError('Phone number is missing. Go back and enter your phone.');
      return;
    }
    setLoading(true);
    setDevOtp('');
    try {
      const data = await api.auth.forgotPassword(trimmed);
      if (data.success) {
        setOtpSuccess('OTP resent successfully.');
        if (data.devOtp) setDevOtp(String(data.devOtp));
        startCountdown();
      }
    } catch (err) {
      setOtpError(err.message || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  const otpFilled = otp.every((d) => d !== '');

  const notifications = [];
  if (otpError) notifications.push({ type: 'error', message: otpError });
  if (otpSuccess) notifications.push({ type: 'success', message: otpSuccess });

  const passwordRules = getPasswordRuleState(newPassword, { email: '', phone });
  const allPasswordRulesOk = Object.values(passwordRules).every(Boolean);

  useEffect(() => {
    if (!otpError && !otpSuccess) return;
    const t = setTimeout(() => {
      setOtpError('');
      setOtpSuccess('');
    }, 5000);
    return () => clearTimeout(t);
  }, [otpError, otpSuccess]);

  return (
    <>
      <Helmet>
        <title>Forgot Password - V Cabanas HMS</title>
        <meta name="description" content="Reset your V Cabanas HMS password via SMS OTP" />
      </Helmet>

      <div className="login-page">
        <div className="page">
          <section className="hero a1" style={{ backgroundImage: `url(${loginBackground})` }}>
            <div className="hero-bg" aria-hidden="true" />

            <header className="nav a2">
              <Link className="logo" to="/login">
                <img src={loginLogo} alt="" className="logo-image" width={32} height={32} />
                <span className="logo-text">
                  V Cabanas <span>HMS</span>
                </span>
              </Link>
              <p className="hotline">
                <strong>Support</strong> · Business operations
              </p>
            </header>

            <div className="hero-inner a3">
              <p className="eyebrow">Hotel management</p>
              <h1 className="headline">
                Calm control for <em>every</em> stay.
              </h1>
              <p className="tagline">
                Invoices, bookings, cash flow, and reports in one place—built for teams who run properties without the
                spreadsheet chaos.
              </p>
            </div>

            <footer className="hero-footer a4">
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#">Contact</a>
            </footer>
          </section>

          <section className="panel">
            {view === 'forgot' && (
              <form className="panel-inner" onSubmit={handleSendOtp}>
                <button
                  type="button"
                  className="back-btn p1"
                  onClick={() => {
                    setOtpError('');
                    setOtpSuccess('');
                    setPhone('');
                    goLogin();
                  }}
                >
                  ← Back to Sign In
                </button>

                <p className="panel-eyebrow p1">Account recovery</p>
                <h2 className="panel-title p2">
                  Forgot your
                  <br />
                  password?
                </h2>
                <p className="panel-sub p2">
                  Enter the <strong>phone number saved in Settings</strong> for your account. We&apos;ll text a 6-digit
                  code to that number.
                </p>

                <div className="form-group p3">
                  <label htmlFor="forgot-phone" className="form-label">
                    Registered phone number
                  </label>
                  <input
                    id="forgot-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    className="form-input"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setOtpError('');
                    }}
                    placeholder="07XXXXXXXX or +94XXXXXXXXX"
                    required
                  />
                </div>

                <button className="submit-btn p4" type="submit" disabled={loading || !phone.trim()}>
                  {loading ? 'Sending…' : 'Send OTP →'}
                </button>

                <p className="note-text p5">
                  Remember your password?{' '}
                  <Link to="/login">Sign in here</Link>
                </p>
              </form>
            )}

            {view === 'otp' && (
              <form className="panel-inner panel-stack" onSubmit={handleVerifyOtp}>
                <h2 className="panel-title p1" style={{ marginBottom: 6 }}>
                  Enter OTP
                </h2>
                <p className="panel-sub p2" style={{ marginBottom: 12 }}>
                  We sent a 6-digit code to your registered phone. The code is valid for a few minutes.
                </p>

                {devOtp ? (
                  <div className="dev-otp-banner p2" role="status">
                    SMS gateway not configured (dev). Use this OTP:
                    <strong>{devOtp}</strong>
                  </div>
                ) : null}

                <div className="otp-row p3">
                  {otp.map((d, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      className="otp-digit"
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      autoComplete="one-time-code"
                      value={d}
                      onChange={(e) => handleOtpChange(e.target.value, i)}
                      onKeyDown={(e) => handleOtpKey(e, i)}
                      aria-label={`Digit ${i + 1}`}
                    />
                  ))}
                </div>

                <div className="resend-row p4">
                  {countdown > 0 ? (
                    <span>
                      Resend OTP in <span className="resend-count">{countdown}s</span>
                    </span>
                  ) : (
                    <button type="button" className="resend-link" onClick={handleResendOtp} disabled={loading}>
                      Resend OTP
                    </button>
                  )}
                </div>

                <button className="submit-btn p4" type="submit" disabled={loading || !otpFilled}>
                  {loading ? 'Verifying…' : 'Verify OTP →'}
                </button>

                <button
                  type="button"
                  className="back-btn p5"
                  onClick={() => {
                    setView('forgot');
                    setOtp(['', '', '', '', '', '']);
                    setOtpError('');
                    setOtpSuccess('');
                    setDevOtp('');
                  }}
                >
                  ← Change phone number
                </button>
              </form>
            )}

            {view === 'reset' && (
              <form className="panel-inner panel-stack" onSubmit={handleReset}>
                <h2 className="panel-title p1" style={{ marginBottom: 6 }}>
                  Set new password
                </h2>
                <p className="panel-sub p2" style={{ marginBottom: 12 }}>
                  OTP verified. Create a strong password for your account.
                </p>

                <div className="form-group p3">
                  <label htmlFor="new-password" className="form-label">
                    New password
                  </label>
                  <div className="password-input-wrapper">
                    <input
                      id="new-password"
                      className="form-input password-input-large"
                      type={showNewPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowNewPassword((v) => !v)}
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      <EyeIcon open={showNewPassword} />
                    </button>
                  </div>
                </div>

                <div className="form-group p4">
                  <label htmlFor="confirm-password" className="form-label">
                    Confirm password
                  </label>
                  <div className="password-input-wrapper">
                    <input
                      id="confirm-password"
                      className="form-input password-input-large"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      <EyeIcon open={showConfirmPassword} />
                    </button>
                  </div>
                  {newPassword && confirmPassword && newPassword !== confirmPassword ? (
                    <p className="form-hint-error">Passwords do not match.</p>
                  ) : null}
                </div>

                <PasswordChecklist password={newPassword} email="" phone={phone} />

                <button
                  className="submit-btn p5"
                  type="submit"
                  disabled={loading || !allPasswordRulesOk || !newPassword || newPassword !== confirmPassword}
                >
                  {loading ? 'Saving…' : 'Reset password →'}
                </button>
              </form>
            )}

            {notifications.length > 0 ? (
              <div className="login-notifications">
                {notifications.map((n, idx) => (
                  <div key={idx} className={`login-notification login-notification--${n.type}`}>
                    <span className="login-notification-icon">
                      {n.type === 'success' ? <SuccessIcon /> : null}
                      {n.type === 'error' ? <ErrorIcon /> : null}
                    </span>
                    <span className="login-notification-text">{n.message}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </>
  );
}
