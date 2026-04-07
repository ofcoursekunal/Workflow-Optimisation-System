import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Factory, Loader2, Lock, Mail, Sun, Moon, Eye, EyeOff } from 'lucide-react';
import FactoryAnimation from '../components/FactoryAnimation';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const { login } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      login(res.data.token, res.data.user);
      const role = res.data.user.role;
      if (role === 'admin') navigate('/admin');
      else if (role === 'supervisor') navigate('/supervisor');
      else navigate('/worker');
      toast.success(`Welcome back, ${res.data.user.name}!`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden theme-bg">

      {/* ── Animated Background ── */}
      <FactoryAnimation />

      {/* Theme Toggle */}
      <button
        id="theme-toggle"
        onClick={toggleTheme}
        className="fixed top-4 right-4 p-2.5 rounded-xl glass-card border z-50 transition-all hover:scale-110 active:scale-95"
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {isDark
          ? <Sun size={18} className="text-amber-400" />
          : <Moon size={18} className="text-blue-500" />
        }
      </button>

      {/* Card */}
      <div className="w-full max-w-md space-y-5 animate-slide-in relative z-10">

        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/20 border border-blue-500/40 rounded-2xl backdrop-blur-sm logo-glow">
            <Factory size={30} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold gradient-text">Shopfloor OS</h1>
            <p className="theme-muted text-sm mt-1">Workflow Optimization System</p>
          </div>
        </div>

        {/* Login form */}
        <div className="glass-card space-y-4">
          <h2 className="text-base font-semibold theme-text">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium theme-muted block mb-1.5">Email Address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 theme-muted" />
                <input
                  id="email"
                  type="email"
                  className="input pl-9"
                  placeholder="you@shopfloor.com"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium theme-muted block mb-1.5">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 theme-muted" />
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  className="input pl-9 pr-10"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 theme-muted hover:text-blue-400 transition-colors"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              id="login-btn"
              type="submit"
              className="btn-primary w-full justify-center py-3"
              disabled={loading}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm theme-muted">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
              Create one
            </Link>
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { icon: '⚡', label: 'Real-time' },
            { icon: '🔐', label: 'Role-Based' },
            { icon: '📊', label: 'Analytics' },
          ].map(({ icon, label }) => (
            <div key={label} className="glass-card py-2.5 text-xs theme-muted">
              <div className="text-lg mb-0.5">{icon}</div>
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
