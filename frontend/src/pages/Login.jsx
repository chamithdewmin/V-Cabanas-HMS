import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import loginBackground from '@/assets/login-background.webp';
import loginLogo from '@/assets/login logo.png';
import { APP_VERSION } from '@/constants';

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
        navigate('/dashboard');
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
        <title>Login - MyAccounts</title>
        <meta name="description" content="Login to MyAccounts business management system" />
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
            <h2 className="text-xl font-bold text-[#D3D3D3] mb-8 text-center">Login to your Account</h2>

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

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#D3D3D3]">Business Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="hello@yourcompany.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 bg-[#0a0a0a] border-[#0a0a0a] text-[#a0a0a0] placeholder:text-[#6b6b6b] "
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-[#D3D3D3]">Password</Label>
                  <Link to="/forgot-password" className="text-sm text-[#6A6FF7] hover:text-[#8b8ff9]">
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 bg-[#0a0a0a] border-[#0a0a0a] text-[#a0a0a0] placeholder:text-[#6b6b6b] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a0a0a0] hover:text-[#D3D3D3] transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-colors"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            <p className="text-center text-[#D3D3D3] mt-6 text-sm">
              New to MyAccounts?{' '}
              <a href="#" className="text-[#6A6FF7] hover:text-[#8b8ff9] font-medium">
                Sign Up
              </a>
            </p>

            <div className="text-center mt-4">
              <p className="text-[#D3D3D3] text-xs">Version: {APP_VERSION}</p>
            </div>
          </div>

        </motion.div>
      </div>
    </>
  );
};

export default Login;
