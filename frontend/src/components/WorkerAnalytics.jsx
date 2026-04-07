import { useState, useEffect } from 'react';
import api from '../utils/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts';
import { Calendar, TrendingUp, CheckCircle2, Clock, AlertTriangle, RefreshCw } from 'lucide-react';

export default function WorkerAnalytics({ workerId = 'me', workerName = 'My' }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get(`/reports/worker/${workerId}`);
        setData(res.data);
      } catch (err) {
        console.error('Failed to fetch worker stats');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [workerId]);

  if (loading) return (
    <div className="flex items-center justify-center py-10">
      <RefreshCw size={24} className="text-blue-400 animate-spin" />
    </div>
  );

  if (!data) return <div className="text-slate-500 text-center py-10">No analytics data found.</div>;

  const { dailyTrend, weeklyTrend, collective } = data;
  const efficiency = collective.total_tasks > 0 
    ? Math.round((collective.completed / collective.total_tasks) * 100) 
    : 0;

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Tasks', value: collective.total_tasks || 0, icon: Calendar, color: 'text-blue-400' },
          { label: 'Completed', value: collective.completed || 0, icon: CheckCircle2, color: 'text-emerald-400' },
          { label: 'Efficiency', value: `${efficiency}%`, icon: TrendingUp, color: 'text-purple-400' },
          { label: 'Avg Time', value: `${collective.avg_time ? Math.round(collective.avg_time) : 0}m`, icon: Clock, color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="card p-4 border border-slate-700/50 bg-slate-800/30">
            <div className="flex items-center gap-3 mb-2">
              <s.icon size={16} className={s.color} />
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{s.label}</p>
            </div>
            <p className="text-2xl font-bold text-slate-100">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Daily Trend Chart */}
        <div className="card">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Calendar size={16} className="text-blue-400" /> Daily Performance (Last 7 Days)
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip 
                  contentStyle={{ background: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} name="Completed Tasks" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Trend Chart */}
        <div className="card">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-400" /> Weekly Distribution
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="week_num" label={{ value: 'Week #', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#64748b' }} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip 
                  contentStyle={{ background: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name="Completed Tasks" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Delay Warning Footer */}
      {collective.delayed > 0 && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-4">
          <AlertTriangle className="text-red-400 mt-1" size={20} />
          <div>
            <p className="text-sm font-bold text-red-200">Wait, there are {collective.delayed} delayed tasks in your history.</p>
            <p className="text-xs text-red-400/80">Try to optimize your process to stay within the estimated timeframes.</p>
          </div>
        </div>
      )}
    </div>
  );
}
