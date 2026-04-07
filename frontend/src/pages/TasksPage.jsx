import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';
import {
  Plus, Search, Filter, Edit2, Trash2, User, Cpu,
  ChevronDown, X, Loader2, AlertCircle, Clock
} from 'lucide-react';

const PAUSE_REASONS = [
  'Material not available',
  'Machine issue',
  'Waiting for instructions',
  'Break',
  'Other',
];

const STATUS_ORDER = ['not_started', 'in_progress', 'paused', 'completed', 'delayed'];

function StatusBadge({ status, unassigned, workerStatus, machineStatus }) {
  if (unassigned && status === 'not_started') {
    return <span className="badge badge-unassigned flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Queued</span>;
  }
  if (status === 'not_started') {
    if (machineStatus === 'running') {
      return <span className="badge badge-delayed flex items-center gap-1"><AlertCircle size={10} /> Machine Busy</span>;
    }
    if (workerStatus && workerStatus !== 'idle') {
      return <span className="badge badge-paused flex items-center gap-1"><Clock size={10} /> In Queue</span>;
    }
  }
  return <span className={`badge badge-${status}`}>{status.replace('_', ' ')}</span>;
}
function PriorityBadge({ priority }) {
  return <span className={`badge badge-${priority}`}>{priority}</span>;
}

function TaskFormModal({ onClose, onSave, editTask, workers, machines }) {
  const [form, setForm] = useState({
    title: editTask?.title || '',
    description: editTask?.description || '',
    machine_id: editTask?.machine_id || '',
    priority: editTask?.priority || 'medium',
    expected_minutes: editTask?.expected_minutes || 30,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editTask) {
        await api.put(`/tasks/${editTask.id}`, form);
        toast.success('Task updated');
      } else {
        await api.post('/tasks', form);
        toast.success('Task created');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="card w-full max-w-lg animate-slide-in space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">{editTask ? 'Edit Task' : 'Create New Task'}</h3>
          <button onClick={onClose}><X size={18} className="text-slate-400 hover:text-slate-200" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Task Title *</label>
            <input className="input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required placeholder="e.g. Mill Shaft Components" />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Description</label>
            <textarea className="input resize-none" rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional details..." />
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Assign Machine</label>
              <select className="select" value={form.machine_id} onChange={e => setForm(p => ({ ...p, machine_id: e.target.value }))}>
                <option value="">— None —</option>
                {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Priority</label>
              <select className="select" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Expected Time (min)</label>
              <input className="input" type="number" min={1} value={form.expected_minutes} onChange={e => setForm(p => ({ ...p, expected_minutes: parseInt(e.target.value) }))} />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={loading}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : null}
              {loading ? 'Saving...' : (editTask ? 'Update Task' : 'Create Task')}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OverrideModal({ task, onClose, onSave }) {
  const [status, setStatus] = useState(task.status);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.put(`/tasks/${task.id}`, { status_override: status });
      toast.success('Task status overridden');
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
          <h3 className="font-bold">Override Status</h3>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <p className="text-sm text-slate-400">Task: <span className="text-slate-200 font-medium">{task.title}</span></p>
        <select className="select" value={status} onChange={e => setStatus(e.target.value)}>
          {STATUS_ORDER.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <div className="flex gap-2">
          <button className="btn-warning flex-1 justify-center" onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            Override
          </button>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [tasks, setTasks] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [overrideTask, setOverrideTask] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  const fetchAll = useCallback(async () => {
    try {
      const [tRes, wRes, mRes] = await Promise.all([
        api.get('/tasks'),
        api.get('/users/workers'),
        api.get('/machines'),
      ]);
      setTasks(tRes.data);
      setWorkers(wRes.data);
      setMachines(mRes.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => {
    if (!socket) return;
    socket.on('task:updated', fetchAll);
    socket.on('task:deleted', fetchAll);
    return () => { socket.off('task:updated', fetchAll); socket.off('task:deleted', fetchAll); };
  }, [socket, fetchAll]);

  const deleteTask = async id => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${id}`);
      toast.success('Task deleted');
      fetchAll();
    } catch { toast.error('Failed to delete'); }
  };

  const filtered = tasks.filter(t => {
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.worker_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || t.status === filterStatus;
    const matchPriority = !filterPriority || t.priority === filterPriority;
    return matchSearch && matchStatus && matchPriority;
  });

  return (
    <div className="space-y-5 animate-slide-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-100">Task Management</h1>
          <p className="text-sm text-slate-400">{tasks.length} total tasks</p>
        </div>
        {user?.role !== 'worker' && (
          <button id="create-task-btn" className="btn-primary" onClick={() => { setEditTask(null); setShowForm(true); }}>
            <Plus size={16} /> Create Task
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search tasks or workers..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUS_ORDER.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select className="select w-auto" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Task Table */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="text-blue-400 animate-spin" /></div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-700/30">
                <tr className="text-left text-slate-400 text-xs uppercase tracking-wider">
                  {['Task', 'Worker', 'Machine', 'Priority', 'Status', 'Expected', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-500">No tasks found</td></tr>
                )}
                {filtered.map(task => (
                  <tr key={task.id} className={`table-row ${task.status === 'delayed' ? 'bg-red-500/5' : (!task.assigned_worker_id ? 'bg-blue-500/5' : '')}`}>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-200 max-w-xs truncate">{task.title}</p>
                        {task.description && <p className="text-xs text-slate-500 truncate max-w-xs">{task.description}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <User size={13} className="text-slate-500" />
                        {task.worker_name || <span className="text-slate-600">Unassigned</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Cpu size={13} className="text-slate-500" />
                        {task.machine_name || <span className="text-slate-600">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3"><PriorityBadge priority={task.priority} /></td>
                    <td className="px-4 py-3"><StatusBadge status={task.status} unassigned={!task.assigned_worker_id} workerStatus={task.worker_status} machineStatus={task.machine_status} /></td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{task.expected_minutes}m</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {user?.role !== 'worker' && <>
                          <button title="Edit" className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors" onClick={() => { setEditTask(task); setShowForm(true); }}>
                            <Edit2 size={14} />
                          </button>
                          <button title="Override Status" className="p-1.5 text-slate-400 hover:text-amber-400 transition-colors" onClick={() => setOverrideTask(task)}>
                            <AlertCircle size={14} />
                          </button>
                          <button title="Delete" className="p-1.5 text-slate-400 hover:text-red-400 transition-colors" onClick={() => deleteTask(task.id)}>
                            <Trash2 size={14} />
                          </button>
                        </>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && <TaskFormModal onClose={() => setShowForm(false)} onSave={() => { setShowForm(false); fetchAll(); }} editTask={editTask} workers={workers} machines={machines} />}
      {overrideTask && <OverrideModal task={overrideTask} onClose={() => setOverrideTask(null)} onSave={() => { setOverrideTask(null); fetchAll(); }} />}
    </div>
  );
}
