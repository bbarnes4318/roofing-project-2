import React, { useState } from 'react';
import { authService } from '../../services/api';

const BlueprintLoginPage = ({ onLoginSuccess, onSwitchToRegister }) => {
  // State for form data, password visibility, loading, and errors
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Check if both fields have values to enable/disable button
  const isFormValid = formData.email.trim() !== '' && formData.password.trim() !== '';

  // Handles the login process
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await authService.login({
        email: formData.email,
        password: formData.password
      });

      if (!response?.success || !response?.data?.token || !response?.data?.user) {
        throw new Error(response?.message || 'Login failed');
      }

      // Persist session based on rememberMe
      if (rememberMe) {
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      } else {
        sessionStorage.setItem('authToken', response.data.token);
        sessionStorage.setItem('token', response.data.token);
        sessionStorage.setItem('user', JSON.stringify(response.data.user));
      }

      onLoginSuccess(response.data.user, response.data.token);

    } catch (err) {
      console.error('Login error:', err);
      setError(err?.response?.data?.message || err?.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-ui-dark text-text-light overflow-hidden">
      
      {/* Enhanced Blueprint Background with Construction Elements */}
      <div className="blueprint-bg">
        {/* Additional Blueprint Markers */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="blueprint-marker" style={{ top: '15%', left: '10%' }}>A1</div>
          <div className="blueprint-marker" style={{ top: '15%', right: '10%' }}>A2</div>
          <div className="blueprint-marker" style={{ bottom: '15%', left: '10%' }}>B1</div>
          <div className="blueprint-marker" style={{ bottom: '15%', right: '10%' }}>B2</div>
        </div>
        {/* Construction Dimension Lines */}
        <svg className="absolute w-full h-full pointer-events-none opacity-50" viewBox="0 0 100 100" preserveAspectRatio="none">
          <line x1="5" y1="20" x2="5" y2="80" stroke="rgba(59, 130, 246, 0.1)" strokeWidth="0.1" strokeDasharray="2,2"/>
          <line x1="95" y1="20" x2="95" y2="80" stroke="rgba(59, 130, 246, 0.1)" strokeWidth="0.1" strokeDasharray="2,2"/>
          <line x1="20" y1="5" x2="80" y2="5" stroke="rgba(59, 130, 246, 0.1)" strokeWidth="0.1" strokeDasharray="2,2"/>
          <line x1="20" y1="95" x2="80" y2="95" stroke="rgba(59, 130, 246, 0.1)" strokeWidth="0.1" strokeDasharray="2,2"/>
        </svg>
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(9)].map((_, i) => (
          <div 
            key={i} 
            className="blueprint-particle" 
            style={{ 
              left: `${(i + 1) * 10}%`, 
              animationDelay: `${i}s` 
            }}
          />
        ))}
      </div>

      {/* Login form container */}
      <div className="w-full max-w-md mx-auto px-4 sm:px-6 animate-slideUp">
        <div className="relative">
          {/* Main login card */}
          <div className="login-card relative bg-gradient-to-br from-neutral-800/90 to-neutral-900/95 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-8 sm:p-12">
            
            {/* Tech Lines Animation */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-3xl">
              <div className="tech-line tech-line-1"></div>
              <div className="tech-line tech-line-2"></div>
              <div className="tech-line tech-line-3"></div>
            </div>

            {/* Logo and header section */}
            <div className="text-center mb-8 animate-fadeIn">
              <div className="logo-container w-44 h-20 mx-auto mb-6 flex items-center justify-center bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl border border-white/10 relative overflow-hidden">
                <div className="logo-shimmer"></div>
                <img
                  src="/upfront-logo-3.png"
                  alt="UpFront Restoration & Roofing"
                  className="w-40 h-auto relative z-10"
                />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-text-light to-text-light/70 bg-clip-text text-transparent mb-2">
                Secure Login
              </h1>
              <p className="text-text-light/60 text-sm font-medium mb-1">
                UpFront Restoration & Roofing Portal
              </p>
              <p className="text-brand-primary text-xs font-semibold tracking-wider uppercase">
                Your Trusted Partner in Roofing Solutions
              </p>
            </div>

            {/* Error message display */}
            {error && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-xl animate-shake">
                <p className="text-red-400 text-sm text-center font-medium">
                  {error}
                </p>
              </div>
            )}

            {/* Login form */}
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Email input field */}
              <div className="form-group animate-fadeIn">
                <label htmlFor="email" className="block text-xs font-medium text-text-light/80 mb-2 uppercase tracking-wider">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="login-input w-full px-4 py-3.5 bg-ui-dark/70 border border-white/10 rounded-xl text-text-light placeholder-ui-gray/80
                             focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary focus:bg-ui-dark/90
                             transition-all duration-300 hover:border-brand-primary/30 backdrop-blur-sm"
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                />
              </div>

              {/* Password input field */}
              <div className="form-group animate-fadeIn animation-delay-100">
                <label htmlFor="password" className="block text-xs font-medium text-text-light/80 mb-2 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="login-input w-full px-4 py-3.5 bg-ui-dark/70 border border-white/10 rounded-xl text-text-light placeholder-ui-gray/80
                               focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary focus:bg-ui-dark/90
                               transition-all duration-300 hover:border-brand-primary/30 pr-12 backdrop-blur-sm"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-ui-gray hover:text-brand-primary transition-colors duration-200 p-2 hover:bg-brand-primary/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex justify-between items-center animate-fadeIn animation-delay-200">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-ui-gray bg-ui-dark/50 text-brand-primary focus:ring-2 focus:ring-brand-primary/50 focus:ring-offset-0"
                  />
                  <label htmlFor="remember" className="ml-2 text-sm text-text-light/70 cursor-pointer hover:text-text-light transition-colors">
                    Remember Me
                  </label>
                </div>
                <a href="/forgot-password" className="text-sm text-brand-primary hover:text-brand-primary/80 transition-colors font-medium">
                  Forgot password?
                </a>
              </div>

              {/* Login button */}
              <button
                type="submit"
                disabled={isLoading || !isFormValid}
                className="login-button w-full relative px-4 py-4 mt-4 bg-gradient-to-r from-brand-primary to-red-500 text-white font-semibold rounded-xl
                           hover:shadow-2xl hover:shadow-brand-primary/30 hover:-translate-y-0.5
                           active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none
                           transition-all duration-300 ease-out text-sm uppercase tracking-wider
                           focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-ui-dark focus:ring-brand-primary/50
                           animate-fadeIn animation-delay-300 overflow-hidden group"
              >
                <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-500"></span>
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></span>
                    Logging in...
                  </span>
                ) : (
                  'Access Account'
                )}
              </button>
              {/* Registration helper (optional) */}
              <div className="text-center text-xs text-text-light/60">
                Don't have an account?{' '}
                <button type="button" onClick={onSwitchToRegister} className="text-brand-primary hover:text-brand-primary/80 font-medium">
                  Create one
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <style jsx>{`
        .blueprint-bg {
          position: fixed;
          inset: 0;
          background: 
            linear-gradient(rgba(59, 130, 246, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.08) 1px, transparent 1px),
            linear-gradient(rgba(59, 130, 246, 0.03) 0.5px, transparent 0.5px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.03) 0.5px, transparent 0.5px),
            linear-gradient(135deg, #0a0f1c 0%, #0f172a 25%, #1e293b 50%, #0f172a 75%, #0a0f1c 100%);
          background-size: 60px 60px, 60px 60px, 12px 12px, 12px 12px, cover;
          animation: gridMove 30s linear infinite;
        }

        .blueprint-bg::before {
          content: '';
          position: absolute;
          inset: 0;
          background: 
            repeating-linear-gradient(45deg, transparent, transparent 100px, rgba(59, 130, 246, 0.02) 100px, rgba(59, 130, 246, 0.02) 101px),
            repeating-linear-gradient(-45deg, transparent, transparent 100px, rgba(59, 130, 246, 0.02) 100px, rgba(59, 130, 246, 0.02) 101px);
          pointer-events: none;
        }

        .blueprint-bg::after {
          content: '';
          position: absolute;
          inset: 0;
          background: 
            radial-gradient(circle at 20% 50%, rgba(30, 58, 138, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 50%, rgba(208, 35, 39, 0.05) 0%, transparent 50%);
          pointer-events: none;
        }

        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(60px, 60px); }
        }

        .blueprint-marker {
          position: absolute;
          width: 30px;
          height: 30px;
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 600;
          color: rgba(59, 130, 246, 0.4);
          font-family: 'Courier New', monospace;
          background: rgba(30, 58, 138, 0.05);
          animation: pulse 4s ease-in-out infinite;
        }

        .blueprint-marker::before {
          content: '';
          position: absolute;
          inset: -5px;
          border: 1px dashed rgba(59, 130, 246, 0.1);
          border-radius: 50%;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }

        .blueprint-particle {
          position: absolute;
          width: 3px;
          height: 3px;
          background: rgba(59, 130, 246, 0.6);
          opacity: 0;
          animation: float 20s infinite;
          border-radius: 1px;
        }

        .blueprint-particle::before {
          content: '';
          position: absolute;
          top: -1px;
          left: -1px;
          right: -1px;
          bottom: -1px;
          background: inherit;
          opacity: 0.3;
          filter: blur(2px);
        }

        .blueprint-particle:nth-child(odd) {
          background: rgba(208, 35, 39, 0.6);
          animation-duration: 25s;
          width: 2px;
          height: 2px;
        }

        .blueprint-particle:nth-child(3n) {
          width: 4px;
          height: 1px;
          background: rgba(59, 130, 246, 0.4);
          transform: rotate(45deg);
        }

        @keyframes float {
          0%, 100% {
            opacity: 0;
            transform: translateY(100vh) translateX(0) rotate(0deg);
          }
          10% {
            opacity: 0.4;
            transform: translateY(90vh) translateX(10px) rotate(90deg);
          }
          90% {
            opacity: 0.4;
            transform: translateY(10vh) translateX(-10px) rotate(450deg);
          }
        }

        .login-card::before {
          content: '';
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          background: linear-gradient(45deg, #D02327, transparent, #1e3a8a);
          border-radius: 24px;
          opacity: 0;
          animation: borderGlow 3s ease-in-out infinite;
          z-index: -1;
        }

        @keyframes borderGlow {
          0%, 100% { opacity: 0; }
          50% { opacity: 0.3; }
        }

        .logo-container::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(45deg, transparent, rgba(208, 35, 39, 0.1), transparent);
          animation: shimmer 3s infinite;
        }

        .logo-shimmer {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(45deg, transparent, rgba(208, 35, 39, 0.1), transparent);
          animation: shimmer 3s infinite;
        }

        @keyframes shimmer {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .tech-line {
          position: absolute;
          background: linear-gradient(90deg, transparent, rgba(208, 35, 39, 0.5), transparent);
          height: 1px;
          width: 100px;
          animation: scan 8s linear infinite;
        }

        .tech-line-1 { top: 20%; animation-delay: 0s; }
        .tech-line-2 { top: 50%; animation-delay: 2s; }
        .tech-line-3 { top: 80%; animation-delay: 4s; }

        @keyframes scan {
          0% { left: -100px; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        .animate-slideUp { animation: slideUp 0.8s ease-out; }
        .animate-fadeIn { animation: fadeIn 0.6s ease-out both; }
        .animate-shake { animation: shake 0.5s; }
        .animation-delay-100 { animation-delay: 0.1s; }
        .animation-delay-200 { animation-delay: 0.2s; }
        .animation-delay-300 { animation-delay: 0.3s; }

        .login-input:focus {
          box-shadow: 0 0 0 3px rgba(208, 35, 39, 0.1), 0 0 40px rgba(208, 35, 39, 0.2);
        }

        .login-button::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          transform: translate(-50%, -50%);
          transition: width 0.6s, height 0.6s;
        }

        .login-button:not(:disabled):hover::before {
          width: 300px;
          height: 300px;
        }
      `}</style>
    </div>
  );
};

export default BlueprintLoginPage;