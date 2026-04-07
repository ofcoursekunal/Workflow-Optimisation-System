import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Factory, Loader2, Lock, Mail, User, Briefcase, Eye, EyeOff } from 'lucide-react';
import FactoryAnimation from '../components/FactoryAnimation';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', role: 'worker' });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error("Passwords don't match!");
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await api.post('/auth/register', { name: form.name, email: form.email, password: form.password, role: form.role });
      toast.success('Account created! Please login.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const set = field => e => setForm(p => ({ ...p, [field]: e.target.value }));

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden theme-bg">
      {/* Animated background */}
      <FactoryAnimation />

      <div className="w-full max-w-md space-y-5 animate-slide-in relative z-10">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600/20 border border-blue-500/30 rounded-2xl backdrop-blur-sm">
            <Factory size={28} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Create Account</h1>
            <p className="theme-muted text-sm mt-1">Join Shopfloor OS</p>
          </div>
        </div>

        {/* Form */}
        <div className="glass-card space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="text-xs font-medium theme-muted block mb-1.5">Full Name</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 theme-muted" />
                <input id="reg-name" className="input pl-9" placeholder="Arjun Kumar" value={form.name} onChange={set('name')} required />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-xs font-medium theme-muted block mb-1.5">Email Address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 theme-muted" />
                <input id="reg-email" type="email" className="input pl-9" placeholder="you@shopfloor.com" value={form.email} onChange={set('email')} required />
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="text-xs font-medium theme-muted block mb-1.5">Role</label>
              <div className="relative">
                <Briefcase size={15} className="absolute left-3 top-1/2 -translate-y-1/2 theme-muted" />
                <select id="reg-role" className="input pl-9 cursor-pointer" value={form.role} onChange={set('role')}>
                  <option value="worker">Worker</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-medium theme-muted block mb-1.5">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 theme-muted" />
                <input id="reg-password" type={showPw ? 'text' : 'password'} className="input pl-9 pr-10" placeholder="Min. 6 characters" value={form.password} onChange={set('password')} required />
                <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 theme-muted hover:text-blue-400 transition-colors">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-xs font-medium theme-muted block mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 theme-muted" />
                <input id="reg-confirm" type={showPw ? 'text' : 'password'} className="input pl-9" placeholder="Repeat password" value={form.confirm} onChange={set('confirm')} required />
              </div>
            </div>

            <button id="register-btn" type="submit" className="btn-primary w-full justify-center py-3" disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm theme-muted">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
