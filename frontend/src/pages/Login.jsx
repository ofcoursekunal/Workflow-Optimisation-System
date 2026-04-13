import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Factory, Loader2, Lock, Mail, Sun, Moon, Eye, EyeOff, RefreshCcw } from 'lucide-react';
import FactoryAnimation from '../components/FactoryAnimation';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '', captcha_answer: '' });
  const [captcha, setCaptcha] = useState({ n1: 0, n2: 0, token: '' });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const { login } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const fetchCaptcha = async () => {
    try {
      const res = await api.get('/auth/captcha');
      setCaptcha(res.data);
    } catch (err) {
      toast.error('Failed to load captcha');
    }
  };

  useEffect(() => {
    fetchCaptcha();
  }, []);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/login', {
        ...form,
        captcha_token: captcha.token
      });
      login(res.data.token, res.data.user);
      const role = res.data.user.role;
      if (role === 'admin') navigate('/admin');
      else if (role === 'supervisor') navigate('/supervisor');
      else if (role === 'monitor') navigate('/analytics');
      else navigate('/worker');
      toast.success(`Welcome back, ${res.data.user.name}!`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
      fetchCaptcha(); // Refresh captcha on failure
      setForm(p => ({ ...p, captcha_answer: '' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden theme-bg">
      <FactoryAnimation />

      <button
        id="theme-toggle"
        onClick={toggleTheme}
        className="fixed top-4 right-4 p-2.5 rounded-xl glass-card border z-50 transition-all hover:scale-110 active:scale-95"
      >
        {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-blue-500" />}
      </button>

      <div className="w-full max-w-md space-y-5 animate-slide-in relative z-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/20 border border-blue-500/40 rounded-2xl backdrop-blur-sm logo-glow">
            <Factory size={30} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold gradient-text">Shopfloor OS</h1>
            <p className="theme-muted text-sm mt-1">Workflow Optimization System</p>
          </div>
        </div>

        <div className="glass-card space-y-4">
          <h2 className="text-base font-semibold theme-text">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium theme-muted block mb-1.5">Email Address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 theme-muted" />
                <input
                  type="email"
                  className="input pl-9"
                  placeholder="admin@shopfloor.com"
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 theme-muted hover:text-blue-400"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium theme-muted">Security Check</label>
                <button type="button" onClick={fetchCaptcha} className="text-[10px] text-blue-500 hover:text-blue-400 flex items-center gap-1 font-bold uppercase tracking-wider">
                  <RefreshCcw size={10} /> Refresh
                </button>
              </div>
              <div className="flex gap-4 items-center">
                <div className="flex-1 glass-card border-dashed py-2.5 text-center font-bold text-lg tracking-[0.2em] theme-text bg-zinc-50/50 dark:bg-zinc-900/50 select-none">
                  {captcha.n1} + {captcha.n2} = ?
                </div>
                <input
                  type="number"
                  className="input w-24 text-center text-lg font-bold"
                  placeholder="?"
                  value={form.captcha_answer}
                  onChange={e => setForm(p => ({ ...p, captcha_answer: e.target.value }))}
                  required
                />
              </div>
            </div>

            <button
              id="login-btn"
              type="submit"
              className="btn-primary w-full justify-center py-3 mt-2"
              disabled={loading}
            >
              {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
