import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { X, Loader2, Camera, User, Mail, Lock, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';

export default function UserFormModal({ user, onClose, onSave }) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'worker',
    status: user?.status || 'idle'
  });
  
  const [errors, setErrors] = useState({});
  const [avatar, setAvatar] = useState(null);
  const [preview, setPreview] = useState(user?.avatar_url ? `http://localhost:5000${user.avatar_url}` : null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Real-time validation
  useEffect(() => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Full name is required';
    
    if (!form.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!isEdit && !form.password) {
      newErrors.password = 'Password is required';
    } else if (!isEdit && form.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    setErrors(newErrors);
  }, [form, isEdit]);

  const handleInputChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size must be less than 2MB');
        return;
      }
      setAvatar(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (Object.keys(errors).length > 0) return;

    setLoading(true);

    const formData = new FormData();
    formData.append('name', form.name.trim());
    formData.append('email', form.email.trim());
    formData.append('role', form.role);
    formData.append('status', form.status);
    if (form.password.trim()) formData.append('password', form.password.trim());
    if (avatar) formData.append('avatar', avatar);

    // Debugging values
    console.log('--- Submitting User Form ---');
    console.log('Mode:', isEdit ? 'Edit' : 'Create');
    for (let [key, value] of formData.entries()) {
      console.log(`${key}:`, key === 'password' ? '********' : value);
    }

    try {
      if (isEdit) {
        await api.put(`/users/${user.id}`, formData);
        toast.success('User updated successfully');
      } else {
        await api.post('/users', formData);
        toast.success(`User "${form.name.trim()}" created successfully`);
        // Reset form after success for new users
        setForm({ name: '', email: '', password: '', role: 'worker', status: 'idle' });
        setAvatar(null);
        setPreview(null);
      }
      onSave();
    } catch (err) {
      console.error('Submission Error:', err.response?.data);
      toast.error(err.response?.data?.error || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const isFormInvalid = Object.keys(errors).length > 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 w-full max-w-md rounded-[2.5rem] shadow-2xl animate-slide-up flex flex-col overflow-hidden">
        <div className="px-8 py-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight leading-none">
              {isEdit ? 'Edit Profile' : 'New User'}
            </h3>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-2">
              {isEdit ? 'Update member details' : 'Join the shopfloor team'}
            </p>
          </div>
          <button onClick={onClose} className="p-2.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl transition-all">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center mb-4">
            <div className="relative group">
              <div className="w-24 h-24 rounded-[2rem] bg-zinc-100 dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-inner flex items-center justify-center">
                {preview ? (
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <User size={32} className="text-zinc-300" />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 p-2.5 bg-zinc-950 text-white rounded-xl shadow-xl hover:scale-110 active:scale-95 transition-all"
              >
                <Camera size={14} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageChange} 
                className="hidden" 
                accept="image/*"
              />
            </div>
            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-3">Profile Photo</p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-3 mb-1 flex justify-between">
                Full Name {errors.name && <span className="text-red-500 flex items-center gap-0.5"><AlertCircle size={10}/> {errors.name}</span>}
              </label>
              <div className="relative">
                <User size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${errors.name ? 'text-red-400' : 'text-zinc-400'}`} />
                <input 
                  className={`w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-2 rounded-2xl focus:ring-0 transition-all font-semibold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 
                    ${errors.name ? 'border-red-200 dark:border-red-900/40' : 'border-transparent focus:border-zinc-900 dark:focus:border-zinc-50'}`}
                  placeholder="e.g. Abhimanyu Kumar"
                  value={form.name}
                  onChange={e => handleInputChange('name', e.target.value)}
                  readOnly={loading}
                />
              </div>
            </div>

            <div className="relative">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-3 mb-1 flex justify-between">
                Email Address {errors.email && <span className="text-red-500 flex items-center gap-0.5"><AlertCircle size={10}/> {errors.email}</span>}
              </label>
              <div className="relative">
                <Mail size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${errors.email ? 'text-red-400' : 'text-zinc-400'}`} />
                <input 
                  className={`w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-2 rounded-2xl focus:ring-0 transition-all font-semibold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 
                    ${errors.email ? 'border-red-200 dark:border-red-900/40' : 'border-transparent focus:border-zinc-900 dark:focus:border-zinc-50'}`}
                  type="email"
                  placeholder="email@example.com"
                  value={form.email}
                  onChange={e => handleInputChange('email', e.target.value)}
                  readOnly={loading}
                />
              </div>
            </div>

            {!isEdit && (
              <div className="relative">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-3 mb-1 flex justify-between">
                  Password {errors.password && <span className="text-red-500 flex items-center gap-0.5"><AlertCircle size={10}/> {errors.password}</span>}
                </label>
                <div className="relative">
                  <Lock size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${errors.password ? 'text-red-400' : 'text-zinc-400'}`} />
                  <input 
                    className={`w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-2 rounded-2xl focus:ring-0 transition-all font-semibold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 
                      ${errors.password ? 'border-red-200 dark:border-red-900/40' : 'border-transparent focus:border-zinc-900 dark:focus:border-zinc-50'}`}
                    type="password"
                    placeholder="Min. 8 characters"
                    value={form.password}
                    onChange={e => handleInputChange('password', e.target.value)}
                    readOnly={loading}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-3 mb-1 block">Role</label>
                <select
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-none rounded-2xl focus:ring-2 ring-zinc-900 dark:ring-zinc-50 transition-all font-bold text-sm text-zinc-800 dark:text-zinc-200 appearance-none cursor-pointer"
                  value={form.role}
                  onChange={e => handleInputChange('role', e.target.value)}
                  disabled={loading}
                >
                  <option value="supervisor">Supervisor</option>
                  <option value="worker">Worker</option>
                  <option value="monitor">Monitor</option>
                </select>
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-3 mb-1 block">Status</label>
                <select
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-none rounded-2xl focus:ring-2 ring-zinc-900 dark:ring-zinc-50 transition-all font-bold text-sm text-zinc-800 dark:text-zinc-200 appearance-none cursor-pointer"
                  value={form.status}
                  onChange={e => handleInputChange('status', e.target.value)}
                  disabled={loading}
                >
                  <option value="idle">Idle</option>
                  <option value="busy">Busy</option>
                  <option value="paused">Paused</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button 
              type="submit" 
              className={`w-full py-4 rounded-[1.5rem] font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all
                ${isFormInvalid || loading 
                  ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400 cursor-not-allowed' 
                  : 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:shadow-xl hover:-translate-y-0.5'}`}
              disabled={isFormInvalid || loading}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
              {isEdit ? 'Update Details' : 'Create Account'}
              {(!loading && !isFormInvalid) && <ArrowRight size={16} className="ml-1 opacity-50" />}
            </button>
            <button 
              type="button" 
              className="w-full py-4 mt-2 text-zinc-500 font-bold uppercase tracking-widest text-[10px] hover:text-zinc-900 dark:hover:text-white transition-colors"
              onClick={onClose}
              disabled={loading}
            >
              Cancel and go back
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
