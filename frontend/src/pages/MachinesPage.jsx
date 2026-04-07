import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, X, Loader2, Clock } from 'lucide-react';

function MachineCard({ machine, canEdit, onEdit, onDelete }) {
  const statusCls = {
    running: 'glow-green border-emerald-500/40 bg-emerald-500/5',
    idle: 'glow-yellow border-amber-500/40 bg-amber-500/5',
    breakdown: 'glow-red border-red-500/40 bg-red-500/5',
  }[machine.status] || '';

  const dotCls = {
    running: 'bg-emerald-400 animate-pulse',
    idle: 'bg-amber-400 animate-pulse-soft',
    breakdown: 'bg-red-400 animate-pulse',
  }[machine.status] || 'bg-slate-400';

  const idleDuration = machine.idle_since
    ? Math.round((Date.now() - new Date(machine.idle_since).getTime()) / 60000)
    : null;

  return (
    <div className={`card border transition-all duration-300 ${statusCls}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-3 h-3 rounded-full ${dotCls}`} />
          <div>
            <p className="font-semibold text-slate-100">{machine.name}</p>
            <p className="text-xs text-slate-400">{machine.type}</p>
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-1">
            <button onClick={() => onEdit(machine)} className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors">
              <Edit2 size={13} />
            </button>
            <button onClick={() => onDelete(machine.id)} className="p-1.5 text-slate-400 hover:text-red-400 transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>
      <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between">
        <span className={`badge badge-${machine.status}`}>{machine.status.toUpperCase()}</span>
        {machine.status !== 'running' && idleDuration !== null && (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Clock size={11} /> {idleDuration}m ago
          </span>
        )}
        {machine.status === 'running' && machine.last_active_at && (
          <span className="text-xs text-emerald-400/70">Active now</span>
        )}
      </div>
    </div>
  );
}

function MachineModal({ machine, onClose, onSave }) {
  const [form, setForm] = useState({ name: machine?.name || '', type: machine?.type || '', status: machine?.status || 'idle' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      if (machine) {
        await api.put(`/machines/${machine.id}`, form);
        toast.success('Machine updated');
      } else {
        await api.post('/machines', form);
        toast.success('Machine added');
      }
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
          <h3 className="font-bold">{machine ? 'Edit Machine' : 'Add Machine'}</h3>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Machine Name</label>
            <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required placeholder="CNC Machine #1" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Machine Type</label>
            <input className="input" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} required placeholder="CNC Milling" />
          </div>
          {machine && (
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Status</label>
              <select className="select" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                <option value="running">Running</option>
                <option value="idle">Idle</option>
                <option value="breakdown">Breakdown</option>
              </select>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={loading}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : null}
              {machine ? 'Update' : 'Add Machine'}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MachinesPage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMachine, setEditMachine] = useState(null);

  const fetchMachines = useCallback(async () => {
    try {
      const res = await api.get('/machines');
      setMachines(res.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchMachines(); }, [fetchMachines]);
  useEffect(() => {
    if (!socket) return;
    socket.on('machine:status', fetchMachines);
    return () => socket.off('machine:status', fetchMachines);
  }, [socket, fetchMachines]);

  const deleteMachine = async id => {
    if (!confirm('Delete this machine?')) return;
    try {
      await api.delete(`/machines/${id}`);
      toast.success('Machine deleted');
      fetchMachines();
    } catch { toast.error('Failed to delete'); }
  };

  const canEdit = user?.role !== 'worker';

  const grouped = {
    running: machines.filter(m => m.status === 'running'),
    idle: machines.filter(m => m.status === 'idle'),
    breakdown: machines.filter(m => m.status === 'breakdown'),
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Machines</h1>
          <p className="text-sm text-slate-400">{machines.length} machines registered</p>
        </div>
        {canEdit && (
          <button id="add-machine-btn" className="btn-primary" onClick={() => { setEditMachine(null); setShowModal(true); }}>
            <Plus size={16} /> Add Machine
          </button>
        )}
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Running', count: grouped.running.length, cls: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' },
          { label: 'Idle', count: grouped.idle.length, cls: 'bg-amber-500/10 border-amber-500/30 text-amber-400' },
          { label: 'Breakdown', count: grouped.breakdown.length, cls: 'bg-red-500/10 border-red-500/30 text-red-400' },
        ].map(({ label, count, cls }) => (
          <div key={label} className={`border rounded-xl p-3 text-center ${cls}`}>
            <p className="text-2xl font-bold">{count}</p>
            <p className="text-xs font-semibold mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="text-blue-400 animate-spin" /></div>
      ) : (
        <div className="space-y-5">
          {['running', 'idle', 'breakdown'].map(status => (
            grouped[status].length > 0 && (
              <div key={status}>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{status}</h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {grouped[status].map(m => (
                    <MachineCard
                      key={m.id}
                      machine={m}
                      canEdit={canEdit}
                      onEdit={m => { setEditMachine(m); setShowModal(true); }}
                      onDelete={deleteMachine}
                    />
                  ))}
                </div>
              </div>
            )
          ))}
          {machines.length === 0 && (
            <div className="text-center py-16 text-slate-500">No machines registered yet.</div>
          )}
        </div>
      )}

      {showModal && (
        <MachineModal
          machine={editMachine}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); fetchMachines(); }}
        />
      )}
    </div>
  );
}
