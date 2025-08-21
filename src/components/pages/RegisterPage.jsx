import React, { useState } from 'react';
import { authService } from '../../services/api';

const RegisterPage = ({ onRegisterSuccess, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: ''
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isFormValid =
    formData.firstName.trim() &&
    formData.lastName.trim() &&
    formData.email.trim() &&
    formData.password.trim();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await authService.register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        role: formData.role || undefined,
      });

      if (!response?.success || !response?.data?.token || !response?.data?.user) {
        throw new Error(response?.message || 'Registration failed');
      }

      // Persist session based on rememberMe
      if (rememberMe) {
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      } else {
        sessionStorage.setItem('authToken', response.data.token);
        sessionStorage.setItem('user', JSON.stringify(response.data.user));
        // Ensure no leftovers in localStorage
        try {
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
        } catch (_) {}
      }

      onRegisterSuccess(response.data.user, response.data.token);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-ui-dark text-text-light overflow-hidden">
      <div className="w-full max-w-md mx-auto px-4 sm:px-6 animate-slideUp">
        <div className="relative">
          <div className="relative bg-gradient-to-br from-neutral-800/90 to-neutral-900/95 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-8 sm:p-12">
            <div className="text-center mb-8">
              <img src="/upfront-logo-3.png" alt="UpFront Restoration & Roofing" className="w-40 h-auto mx-auto mb-4" />
              <h1 className="text-3xl font-bold">Create Account</h1>
              <p className="text-text-light/60 text-sm">Join the portal to manage your projects</p>
            </div>

            {error && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                <p className="text-red-400 text-sm text-center font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="firstName" className="block text-xs font-medium text-text-light/80 mb-2 uppercase tracking-wider">First Name</label>
                  <input
                    id="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-3.5 bg-ui-dark/70 border border-white/10 rounded-xl text-text-light placeholder-ui-gray/80 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-xs font-medium text-text-light/80 mb-2 uppercase tracking-wider">Last Name</label>
                  <input
                    id="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-3.5 bg-ui-dark/70 border border-white/10 rounded-xl text-text-light placeholder-ui-gray/80 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-xs font-medium text-text-light/80 mb-2 uppercase tracking-wider">Email</label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3.5 bg-ui-dark/70 border border-white/10 rounded-xl text-text-light placeholder-ui-gray/80 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-medium text-text-light/80 mb-2 uppercase tracking-wider">Password</label>
                <input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3.5 bg-ui-dark/70 border border-white/10 rounded-xl text-text-light placeholder-ui-gray/80 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary"
                  required
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-xs font-medium text-text-light/80 mb-2 uppercase tracking-wider">Role (optional)</label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-3.5 bg-ui-dark/70 border border-white/10 rounded-xl text-text-light focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary"
                >
                  <option value="">Select a role</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="project_manager">Project Manager</option>
                  <option value="foreman">Foreman</option>
                  <option value="worker">Worker</option>
                  <option value="client">Client</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center text-sm text-text-light/70">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-ui-gray bg-ui-dark/50 text-brand-primary focus:ring-2 focus:ring-brand-primary/50 focus:ring-offset-0 mr-2"
                  />
                  Remember Me
                </label>
                <button type="button" onClick={onSwitchToLogin} className="text-sm text-brand-primary hover:text-brand-primary/80">Have an account? Sign in</button>
              </div>

              <button
                type="submit"
                disabled={isLoading || !isFormValid}
                className="w-full relative px-4 py-4 mt-2 bg-gradient-to-r from-brand-primary to-red-500 text-white font-semibold rounded-xl disabled:opacity-50"
              >
                {isLoading ? 'Creating account…' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;


