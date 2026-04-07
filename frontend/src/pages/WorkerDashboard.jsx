import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';
import { Play, Pause, CheckCircle, Clock, AlertTriangle, Cpu, X, Loader2 } from 'lucide-react';

const PAUSE_REASONS = [
  'Material not available',
  'Machine issue',
  'Waiting for instructions',
  'Break',
  'Other',
];

function PauseModal({ onConfirm, onClose }) {
  const [reason, setReason] = useState(PAUSE_REASONS[0]);
  const [otherText, setOtherText] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70">
      <div className="card w-full max-w-sm animate-slide-in space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">Why are you pausing?</h3>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="space-y-2">
          {PAUSE_REASONS.map(r => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 active:scale-95
                ${reason === r ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-500'}`}
            >
              {r}
            </button>
          ))}
        </div>
        {reason === 'Other' && (
          <textarea
            className="input resize-none"
            rows={2}
            placeholder="Describe the issue..."
            value={otherText}
            onChange={e => setOtherText(e.target.value)}
          />
        )}
        <div className="flex gap-3">
          <button
            className="btn-warning flex-1 justify-center py-3 text-base"
            onClick={() => onConfirm(reason, reason === 'Other' ? otherText : undefined)}
          >
            <Pause size={18} /> Confirm Pause
          </button>
          <button className="btn-secondary py-3" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function TaskCard({ task, onAction }) {
  const [loading, setLoading] = useState(false);
  const [showPause, setShowPause] = useState(false);

  const elapsed = task.started_at
    ? Math.round((Date.now() - new Date(task.started_at).getTime()) / 60000)
    : null;
  const overtime = task.deadline_at && new Date() > new Date(task.deadline_at);

  const handleAction = async (action, pauseReason, note) => {
    setLoading(true);
    try {
      await api.put(`/tasks/${task.id}`, { action, pause_reason: pauseReason, note });
      toast.success(action === 'start' ? '▶ Task started!' : action === 'pause' ? '⏸ Task paused' : '✅ Task completed!');
      onAction();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const statusGlow = {
    in_progress: 'border-blue-500/40 bg-blue-500/5',
    delayed: 'border-red-500/40 bg-red-500/5',
    paused: 'border-amber-500/40 bg-amber-500/5',
    completed: 'border-emerald-500/40 bg-emerald-500/5',
    not_started: 'border-slate-600 bg-slate-800',
  }[task.status] || '';

  return (
    <div className={`card border transition-all duration-300 ${statusGlow}`}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`badge badge-${task.priority}`}>{task.priority}</span>
            <span className={`badge badge-${task.status}`}>{task.status.replace('_', ' ')}</span>
            {overtime && task.status !== 'completed' && (
              <span className="badge bg-red-500/20 text-red-400 border-red-500/30">
                <AlertTriangle size={10} /> OVERDUE
              </span>
            )}
          </div>
          <h3 className="font-bold text-slate-100 text-base leading-snug mt-1">{task.title}</h3>
          {task.description && <p className="text-xs text-slate-400 mt-1">{task.description}</p>}
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
        {task.machine_name && (
          <span className="flex items-center gap-1"><Cpu size={11} /> {task.machine_name}</span>
        )}
        <span className="flex items-center gap-1">
          <Clock size={11} /> {task.expected_minutes}m expected
        </span>
        {elapsed !== null && (
          <span className={`flex items-center gap-1 font-medium ${overtime ? 'text-red-400' : 'text-slate-300'}`}>
            <Clock size={11} /> {elapsed}m elapsed
          </span>
        )}
      </div>

      {/* Progress bar */}
      {elapsed !== null && task.status !== 'completed' && (
        <div className="mb-4">
          <div className="bg-slate-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${overtime ? 'bg-red-500' : elapsed > task.expected_minutes * 0.8 ? 'bg-amber-500' : 'bg-blue-500'}`}
              style={{ width: `${Math.min((elapsed / task.expected_minutes) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">{Math.round((elapsed / task.expected_minutes) * 100)}% of expected time</p>
        </div>
      )}

      {/* Action Buttons */}
      {task.status === 'completed' ? (
        <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle size={18} className="text-emerald-400" />
          <span className="text-emerald-400 font-semibold">Completed</span>
        </div>
      ) : (
        <div className="flex gap-2">
          {(task.status === 'not_started' || task.status === 'paused') && (
            <button
              id={`start-task-${task.id}`}
              className="btn-success flex-1 justify-center py-3.5 text-base"
              onClick={() => handleAction(task.status === 'paused' ? 'start' : 'start')}
              disabled={loading}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
              {task.status === 'paused' ? 'Resume' : 'Start Task'}
            </button>
          )}
          {task.status === 'in_progress' && <>
            <button
              id={`pause-task-${task.id}`}
              className="btn-warning flex-1 justify-center py-3.5 text-base"
              onClick={() => setShowPause(true)}
              disabled={loading}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Pause size={18} />}
              Pause
            </button>
            <button
              id={`complete-task-${task.id}`}
              className="btn-success flex-1 justify-center py-3.5 text-base"
              onClick={() => handleAction('complete')}
              disabled={loading}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
              Complete
            </button>
          </>}
          {task.status === 'delayed' && (
            <button
              className="btn-success flex-1 justify-center py-3.5 text-base"
              onClick={() => handleAction('complete')}
              disabled={loading}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
              Mark Complete
            </button>
          )}
        </div>
      )}

      {showPause && (
        <PauseModal
          onClose={() => setShowPause(false)}
          onConfirm={(reason, note) => { setShowPause(false); handleAction('pause', reason, note); }}
        />
      )}
    </div>
  );
}

export default function WorkerDashboard() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.get('/tasks');
      setTasks(res.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => {
    if (!socket) return;
    socket.on('task:updated', fetchTasks);
    socket.on('notification:new', n => toast(n.message, { icon: n.type === 'error' ? '🔴' : n.type === 'warning' ? '⚠️' : 'ℹ️' }));
    return () => { socket.off('task:updated', fetchTasks); socket.off('notification:new'); };
  }, [socket, fetchTasks]);

  const active = tasks.filter(t => ['in_progress', 'delayed'].includes(t.status));
  const pending = tasks.filter(t => ['not_started', 'paused'].includes(t.status));
  const done = tasks.filter(t => t.status === 'completed');

  return (
    <div className="space-y-5 animate-slide-in max-w-2xl mx-auto">
      {/* Welcome */}
      <div className="card border border-blue-500/20 bg-blue-500/5">
        <p className="text-slate-400 text-sm">Welcome back,</p>
        <h1 className="text-2xl font-bold text-slate-100 mt-0.5">{user?.name}</h1>
        <div className="flex gap-3 mt-3 text-sm">
          <span className="text-blue-400 font-semibold">{active.length} Active</span>
          <span className="text-slate-500">·</span>
          <span className="text-amber-400 font-semibold">{pending.length} Pending</span>
          <span className="text-slate-500">·</span>
          <span className="text-emerald-400 font-semibold">{done.length} Done</span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="text-blue-400 animate-spin" /></div>
      ) : (
        <>
          {/* Active / Delayed */}
          {active.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">🔴 Active / Delayed</h2>
              <div className="space-y-3">
                {active.map(t => <TaskCard key={t.id} task={t} onAction={fetchTasks} />)}
              </div>
            </div>
          )}

          {/* Pending */}
          {pending.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">⏳ Pending / Paused</h2>
              <div className="space-y-3">
                {pending.map(t => <TaskCard key={t.id} task={t} onAction={fetchTasks} />)}
              </div>
            </div>
          )}

          {/* Completed */}
          {done.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">✅ Completed</h2>
              <div className="space-y-3">
                {done.map(t => <TaskCard key={t.id} task={t} onAction={fetchTasks} />)}
              </div>
            </div>
          )}

          {tasks.length === 0 && (
            <div className="text-center py-16 space-y-2">
              <p className="text-4xl">🎉</p>
              <p className="text-slate-300 font-semibold">No tasks assigned yet</p>
              <p className="text-sm text-slate-500">Your supervisor will assign tasks here</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
