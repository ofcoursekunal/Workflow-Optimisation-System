import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useSocket } from '../context/SocketContext';
import {
  ClipboardList, Cpu, Users, AlertTriangle, CheckCircle2,
  Clock, TrendingUp, Activity, RefreshCw
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';

const STATUS_ICONS = {
  running: '🟢', idle: '🟡', breakdown: '🔴',
};

const TASK_COLORS = { not_started: '#64748b', in_progress: '#3b82f6', paused: '#f59e0b', completed: '#10b981', delayed: '#ef4444' };

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  const fetchSummary = useCallback(async () => {
    try {
      const res = await api.get('/analytics/summary');
      setSummary(res.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  useEffect(() => {
    if (!socket) return;
    socket.on('task:updated', fetchSummary);
    socket.on('machine:status', fetchSummary);
    socket.on('user:status', fetchSummary);
    return () => { 
      socket.off('task:updated', fetchSummary); 
      socket.off('machine:status', fetchSummary); 
      socket.off('user:status', fetchSummary);
    };
  }, [socket, fetchSummary]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <RefreshCw size={32} className="text-blue-400 animate-spin" />
        <p className="text-slate-400">Loading dashboard...</p>
      </div>
    </div>
  );

  const taskMap = Object.fromEntries((summary?.taskCounts || []).map(r => [r.status, r.count]));
  const machineMap = Object.fromEntries((summary?.machineCounts || []).map(r => [r.status, r.count]));
  const totalTasks = Object.values(taskMap).reduce((a, b) => a + b, 0);
  const completionRate = totalTasks > 0 ? Math.round(((taskMap.completed || 0) / totalTasks) * 100) : 0;

  const pieData = (summary?.taskCounts || []).map(r => ({ name: r.status.replace('_', ' '), value: r.count }));

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Tasks', value: totalTasks, icon: ClipboardList, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
          { label: 'Delayed Tasks', value: summary?.delayedTasks || 0, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
          { label: 'Completed Today', value: summary?.completedToday || 0, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Completion Rate', value: `${completionRate}%`, icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`card flex items-center gap-4 border ${bg}`}>
            <div className={`p-2.5 rounded-xl ${bg}`}>
              <Icon size={22} className={color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-100">{value}</p>
              <p className="text-xs text-slate-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Machine Status Row */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2"><Cpu size={18} className="text-blue-400" /> Machine Status</h3>
          <Link to="/admin/machines" className="text-xs text-blue-400 hover:text-blue-300">View all →</Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Running', key: 'running', cls: 'badge-running', count: machineMap.running || 0 },
            { label: 'Occupied', key: 'occupied', cls: 'badge-paused', count: machineMap.occupied || 0 },
            { label: 'Idle', key: 'idle', cls: 'badge-idle', count: machineMap.idle || 0 },
            { label: 'Breakdown', key: 'breakdown', cls: 'badge-breakdown', count: machineMap.breakdown || 0 },
          ].map(({ label, cls, count }) => (
            <div key={label} className="text-center p-4 rounded-xl bg-slate-700/30 border border-slate-700/50">
              <p className="text-3xl font-bold text-slate-100">{count}</p>
              <span className={`${cls} mt-2`}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Task Distribution Pie */}
        <div className="card">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Activity size={18} className="text-blue-400" /> Task Distribution</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={TASK_COLORS[entry.name.replace(' ', '_')] || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-500 text-center py-8">No task data yet</p>}
        </div>

        {/* Daily Trend */}
        <div className="card">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-blue-400" /> 7-Day Completion Trend</h3>
          {(summary?.dailyTrend?.length > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={summary.dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }} />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 4 }} name="Completed" />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-500 text-center py-8">No completion data yet</p>}
        </div>
      </div>

      {/* Worker Performance */}
      <div className="card">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Users size={18} className="text-blue-400" /> Worker Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700">
                {['Worker', 'Status', 'Total Tasks', 'Completed', 'Delayed', 'Avg Time (min)', 'Efficiency'].map(h => (
                  <th key={h} className="pb-2 pr-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(summary?.workerPerformance || []).map(w => {
                const eff = w.total_tasks > 0 ? Math.round((w.completed / w.total_tasks) * 100) : 0;
                return (
                  <tr key={w.name} className="table-row">
                    <td className="py-3 pr-4 font-medium text-slate-200">{w.name}</td>
                    <td className="py-3 pr-4">
                      <span className={`badge ${w.status === 'idle' ? 'badge-idle' : w.status === 'busy' ? 'badge-in_progress' : 'badge-paused'}`}>
                        {w.status || 'idle'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-slate-300">{w.total_tasks}</td>
                    <td className="py-3 pr-4 text-emerald-400 font-semibold">{w.completed}</td>
                    <td className="py-3 pr-4 text-red-400 font-semibold">{w.delayed}</td>
                    <td className="py-3 pr-4 text-slate-300">{w.avg_completion_min ? Math.round(w.avg_completion_min) : '—'}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-700 rounded-full h-1.5 max-w-20">
                          <div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${eff}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-slate-300">{eff}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pause Reasons */}
      {(summary?.pauseReasons?.length > 0) && (
        <div className="card">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Clock size={18} className="text-amber-400" /> Top Pause Reasons</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={summary.pauseReasons.slice(0, 5)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis type="category" dataKey="pause_reason" tick={{ fill: '#94a3b8', fontSize: 11 }} width={140} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }} />
              <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
