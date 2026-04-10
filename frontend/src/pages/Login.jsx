import { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import loginBackground from '@/assets/login-background.webp';
import logozopos from '@/assets/logozopos.png';
import { APP_VERSION } from '@/constants';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        navigate('/');
      } else {
        setError(result.error || 'Invalid credentials');
      }
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Login - V Cabanas HMS</title>
        <meta name="description" content="Login to V Cabanas HMS business management system" />
      </Helmet>

      <div className="login-page">
        <div className="page">
          <section
            className="hero a1"
            style={{ backgroundImage: `url(${loginBackground})` }}
          >
            <div className="hero-bg" aria-hidden="true" />

            <header className="nav a2">
              <Link to="/login" className="logo">
                <img src={logozopos} alt="LogozoPOS" className="logo-image" />
                <span className="logo-text">
                  <strong className="logo-brand">Logozo</strong>
                  <span className="logo-pos">POS</span>
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
                Invoices, bookings, cash flow, and reports in one place—built for teams who run
                properties without the spreadsheet chaos.
              </p>
            </div>

            <footer className="hero-footer a4">
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#">Contact</a>
            </footer>
          </section>

          <section className="panel">
            <div className="panel-inner">
              <p className="panel-eyebrow p1">Secure access</p>
              <h2 className="panel-title p2">Welcome back</h2>
              <p className="panel-sub p3">Sign in with your business email and password.</p>

              <form onSubmit={handleSubmit} noValidate>
                <div className="form-group p4">
                  <label htmlFor="login-email" className="form-label">
                    Business email
                  </label>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="hello@yourcompany.com"
                    className="form-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group p5">
                  <label htmlFor="login-password" className="form-label">
                    Password
                  </label>
                  <div className="password-input-wrapper">
                    <input
                      id="login-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="form-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
                    </button>
                  </div>
                </div>

                <div className="forgot-link-row p5">
                  <Link to="/forgot-password" className="forgot-link">
                    Forgot password?
                  </Link>
                </div>

                <button type="submit" className="submit-btn p6" disabled={loading}>
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>

              <p className="panel-bottom p6">
                New to V Cabanas HMS?{' '}
                <a href="#" onClick={(e) => e.preventDefault()}>
                  Request access
                </a>
              </p>

              <p className="note-text">Version {APP_VERSION}</p>
            </div>

            {error ? (
              <div className="login-notifications" role="alert">
                <div className="login-notification login-notification--error">
                  <span className="login-notification-icon">
                    <AlertCircle size={18} strokeWidth={2} />
                  </span>
                  <span className="login-notification-text">{error}</span>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </>
  );
};

export default Login;
