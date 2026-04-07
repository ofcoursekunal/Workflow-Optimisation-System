import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useSocket } from '../context/SocketContext';
import { 
  TrendingUp, Calendar, Users, Cpu, Clock, 
  CheckCircle2, AlertTriangle, RefreshCw, ChevronRight, Activity, ClipboardList, X
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import WorkerAnalytics from '../components/WorkerAnalytics';

const STATUS_ICONS = {
  running: '🟢', idle: '🟡', breakdown: '🔴',
};

const TASK_COLORS = { 
  not_started: '#64748b', 
  in_progress: '#3b82f6', 
  paused: '#f59e0b', 
  completed: '#10b981', 
  delayed: '#ef4444' 
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [summary, setSummary] = useState(null);
  const [weeklyData, setWeeklyData] = useState(null);
  const [monthlyData, setMonthlyData] = useState(null);
  const [workerData, setWorkerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const { socket } = useSocket();

  const fetchSummary = useCallback(async () => {
    try {
      const res = await api.get('/analytics/summary');
      setSummary(res.data);
    } catch {}
    setLoading(false);
  }, []);

  const fetchWeekly = async () => {
    try {
      const res = await api.get('/reports/weekly');
      setWeeklyData(res.data);
    } catch {}
  };

  const fetchMonthly = async () => {
    try {
      const res = await api.get('/reports/monthly');
      setMonthlyData(res.data);
    } catch {}
  };

  const fetchWorkers = async () => {
    try {
      const res = await api.get('/reports/workers');
      setWorkerData(res.data);
    } catch {}
  };

  useEffect(() => {
    if (activeTab === 'overview') fetchSummary();
    if (activeTab === 'weekly') fetchWeekly();
    if (activeTab === 'monthly') fetchMonthly();
    if (activeTab === 'workers') fetchWorkers();
  }, [activeTab, fetchSummary]);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => {
      if (activeTab === 'overview') fetchSummary();
      if (activeTab === 'weekly') fetchWeekly();
      if (activeTab === 'monthly') fetchMonthly();
      if (activeTab === 'workers') fetchWorkers();
    };

    socket.on('task:updated', refresh);
    socket.on('task:deleted', refresh);
    socket.on('machine:status', refresh);
    socket.on('user:status', refresh);

    return () => { 
      socket.off('task:updated', refresh); 
      socket.off('task:deleted', refresh);
      socket.off('machine:status', refresh); 
      socket.off('user:status', refresh);
    };
  }, [socket, activeTab, fetchSummary]);

  if (loading && !summary && activeTab === 'overview') return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw size={32} className="text-blue-400 animate-spin" />
    </div>
  );

  const renderOverview = () => {
    if (!summary) return null;
    const taskMap = Object.fromEntries((summary.taskCounts || []).map(r => [r.status, r.count]));
    const machineMap = Object.fromEntries((summary.machineCounts || []).map(r => [r.status, r.count]));
    const totalTasks = Object.values(taskMap).reduce((a, b) => a + b, 0);
    const completionRate = totalTasks > 0 ? Math.round(((taskMap.completed || 0) / totalTasks) * 100) : 0;
    const pieData = (summary.taskCounts || []).map(r => ({ name: r.status.replace('_', ' '), value: r.count }));

    return (
      <div className="space-y-6 animate-slide-in">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Tasks', value: totalTasks, icon: ClipboardList, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
            { label: 'Delayed Tasks', value: summary.delayedTasks || 0, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
            { label: 'Completed Today', value: summary.completedToday || 0, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
            { label: 'Completion Rate', value: `${completionRate}%`, icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`card flex items-center gap-4 border ${bg}`}>
              <div className={`p-2.5 rounded-xl ${bg}`}><Icon size={22} className={color} /></div>
              <div><p className="text-2xl font-bold text-slate-100">{value}</p><p className="text-xs text-slate-400">{label}</p></div>
            </div>
          ))}
        </div>

        <div className="card">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Cpu size={18} className="text-blue-400" /> Machine Status</h3>
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
          <div className="card">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Activity size={18} className="text-blue-400" /> Task Distribution</h3>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" label={({name}) => name}>
                    {pieData.map((e, i) => <Cell key={i} fill={TASK_COLORS[e.name.replace(' ', '_')] || '#64748b'} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1e293b', border: 'none' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-blue-400" /> Daily Trend</h3>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={summary.dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="day" tick={{fontSize: 10}} />
                  <YAxis tick={{fontSize: 10}} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: 'none' }} />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" name="Tasks" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderWeekly = () => {
    if (!weeklyData) return <div className="text-center py-10"><RefreshCw className="animate-spin inline mr-2" /> Loading stats...</div>;
    const { current, dailyTrend } = weeklyData;
    return (
      <div className="space-y-6 animate-slide-in">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card text-center">
            <p className="text-slate-400 text-xs uppercase mb-1">Total Tasks</p>
            <p className="text-3xl font-bold">{current.total_tasks || 0}</p>
          </div>
          <div className="card text-center border-l-4 border-emerald-500">
            <p className="text-slate-400 text-xs uppercase mb-1">Completed</p>
            <p className="text-3xl font-bold text-emerald-400">{current.completed || 0}</p>
          </div>
          <div className="card text-center border-l-4 border-red-500">
            <p className="text-slate-400 text-xs uppercase mb-1">Delayed</p>
            <p className="text-3xl font-bold text-red-400">{current.delayed || 0}</p>
          </div>
        </div>
        <div className="card">
          <h3 className="font-semibold mb-4">7-Day Productivity Trend</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="date" tick={{fontSize: 10}} />
                <YAxis />
                <Tooltip contentStyle={{ background: '#1e293b', border: 'none' }} />
                <Legend />
                <Bar dataKey="count" fill="#3b82f6" name="Total Tasks" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" fill="#10b981" name="Completed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  const renderMonthly = () => {
    if (!monthlyData) return <div className="text-center py-10"><RefreshCw className="animate-spin inline mr-2" /> Loading stats...</div>;
    const { current, machineUtilization } = monthlyData;
    return (
      <div className="space-y-6 animate-slide-in">
        <div className="card">
          <h3 className="font-semibold mb-4">Monthly Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><p className="text-xs text-slate-400">Total Tasks</p><p className="text-xl font-bold">{current.total_tasks || 0}</p></div>
            <div><p className="text-xs text-slate-400">Completed</p><p className="text-xl font-bold text-emerald-400">{current.completed || 0}</p></div>
            <div><p className="text-xs text-slate-400">Delays</p><p className="text-xl font-bold text-red-400">{current.delayed || 0}</p></div>
            <div><p className="text-xs text-slate-400">Avg Time</p><p className="text-xl font-bold">{current.avg_completion_time ? Math.round(current.avg_completion_time) : 0} min</p></div>
          </div>
        </div>
        <div className="card">
          <h3 className="font-semibold mb-4">Machine Utilization (Tasks Assigned)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={machineUtilization} layout="vertical">
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11}} />
                <Tooltip contentStyle={{ background: '#1e293b', border: 'none' }} />
                <Bar dataKey="task_count" fill="#6366f1" name="Total Tasks" radius={[0, 4, 4, 0]} />
                <Bar dataKey="completed" fill="#10b981" name="Completed" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  const renderWorkers = () => {
    if (!workerData) return <div className="text-center py-10"><RefreshCw className="animate-spin inline mr-2" /> Loading stats...</div>;
    return (
      <div className="card animate-slide-in">
        <h3 className="font-semibold mb-4">Collective Worker Performance</h3>
        <p className="text-xs text-slate-500 mb-4 italic">Tip: Click on a worker to view detailed daily/weekly analytics.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 uppercase text-xs border-b border-slate-700">
                <th className="pb-3 px-2">Worker</th>
                <th className="pb-3 text-center">Tasks</th>
                <th className="pb-3 text-center">Completed</th>
                <th className="pb-3 text-center">Delayed</th>
                <th className="pb-3 text-right pr-4">Efficiency</th>
                <th className="pb-3 text-right">Avg Time</th>
              </tr>
            </thead>
            <tbody>
              {workerData.map(w => {
                const eff = w.total_tasks > 0 ? Math.round((w.completed / w.total_tasks) * 100) : 0;
                return (
                  <tr 
                    key={w.id} 
                    onClick={() => setSelectedWorker(w)}
                    className="border-b border-slate-800/50 hover:bg-slate-700/20 cursor-pointer transition-colors group"
                  >
                    <td className="py-4 px-2 font-medium text-slate-100 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        {w.worker_name?.charAt(0)}
                      </div>
                      {w.worker_name}
                    </td>
                    <td className="py-4 text-center text-slate-300">{w.total_tasks}</td>
                    <td className="py-4 text-center text-emerald-400 font-semibold">{w.completed}</td>
                    <td className="py-4 text-center text-red-400 font-semibold">{w.delayed}</td>
                    <td className="py-4 text-right pr-4">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 w-12 bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full ${eff > 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${eff}%` }} />
                        </div>
                        <span className={`text-xs font-bold ${eff > 80 ? 'text-emerald-400' : 'text-amber-400'}`}>{eff}%</span>
                      </div>
                    </td>
                    <td className="py-4 text-right text-slate-400">{w.avg_completion_time ? Math.round(w.avg_completion_time) : 0} min</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-xl w-fit border border-slate-700/50">
        {[
          { id: 'overview', icon: Activity, label: 'Overview' },
          { id: 'weekly', icon: Clock, label: 'Weekly' },
          { id: 'monthly', icon: TrendingUp, label: 'Monthly' },
          { id: 'workers', icon: Users, label: 'Workers' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'weekly' && renderWeekly()}
      {activeTab === 'monthly' && renderMonthly()}
      {activeTab === 'workers' && renderWorkers()}

      {/* Analytics Drill-down Modal */}
      {selectedWorker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl animate-scale-in">
            <div className="sticky top-0 bg-slate-900/95 backdrop-blur z-10 flex items-center justify-between p-6 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <TrendingUp className="text-blue-400" />
                  Performance Drill-down: {selectedWorker.worker_name || selectedWorker.name}
                </h2>
                <p className="text-xs text-slate-500">Individual productivity trends and historical data</p>
              </div>
              <button 
                onClick={() => setSelectedWorker(null)}
                className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <WorkerAnalytics workerId={selectedWorker.id} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
