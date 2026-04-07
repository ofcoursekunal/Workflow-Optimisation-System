import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useSocket } from '../context/SocketContext';
import { Plus, Trash2, X, Loader2, Shield, UserCog, HardHat, Circle } from 'lucide-react';

const ROLE_ICONS = { admin: Shield, supervisor: UserCog, worker: HardHat };
const ROLE_COLORS = {
  admin: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  supervisor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  worker: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const STATUS_COLORS = {
  idle: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  busy: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  paused: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

function AddUserModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'worker' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/users', form);
      toast.success('User created');
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="card w-full max-w-sm animate-slide-in space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Add User</h3>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input className="input" placeholder="Full Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          <input className="input" type="email" placeholder="Email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
          <input className="input" type="password" placeholder="Password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required minLength={6} />
          <select className="select" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
            <option value="worker">Worker</option>
            <option value="supervisor">Supervisor</option>
            <option value="admin">Admin</option>
          </select>
          <div className="flex gap-2 pt-1">
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={loading}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : null}
              Create User
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch {}
    setLoading(false);
  }, []);

  const { socket } = useSocket();

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    if (!socket) return;
    const handleStatus = ({ userId, status }) => {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status } : u));
    };
    socket.on('user:status', handleStatus);
    return () => socket.off('user:status', handleStatus);
  }, [socket]);

  const deleteUser = async id => {
    if (!confirm('Delete this user?')) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('User deleted');
      fetchUsers();
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-5 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">User Management</h1>
          <p className="text-sm text-slate-400">{users.length} registered users</p>
        </div>
        <button id="add-user-btn" className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add User
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="text-blue-400 animate-spin" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map(u => {
            const Icon = ROLE_ICONS[u.role] || HardHat;
            return (
              <div key={u.id} className="card flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${ROLE_COLORS[u.role]}`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-200 truncate">{u.name}</p>
                    {u.role === 'worker' && (
                      <span className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full border ${STATUS_COLORS[u.status || 'idle']}`}>
                        <Circle size={8} fill="currentColor" /> {u.status || 'idle'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{u.email}</p>
                  <span className={`inline-block text-xs px-2 py-0.5 rounded border font-medium mt-1 ${ROLE_COLORS[u.role]}`}>
                    {u.role}
                  </span>
                </div>
                <button onClick={() => deleteUser(u.id)} className="p-1.5 text-slate-600 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showModal && <AddUserModal onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); fetchUsers(); }} />}
    </div>
  );
}
