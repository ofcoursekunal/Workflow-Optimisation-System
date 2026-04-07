import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { Loader2, TrendingDown, Cpu, Users } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadialBarChart, RadialBar, Legend
} from 'recharts';

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [downtime, setDowntime] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [sRes, dRes] = await Promise.all([api.get('/analytics/summary'), api.get('/analytics/downtime')]);
      setData(sRes.data);
      setDowntime(dRes.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={28} className="text-blue-400 animate-spin" /></div>;

  const workerChartData = (data?.workerPerformance || []).map(w => ({
    name: w.name.split(' ')[0],
    completed: w.completed || 0,
    delayed: w.delayed || 0,
    total: w.total_tasks || 0,
    efficiency: w.total_tasks > 0 ? Math.round((w.completed / w.total_tasks) * 100) : 0,
  }));

  const machineChartData = (data?.machineUtilization || []).map(m => ({
    name: m.name.length > 12 ? m.name.substring(0, 12) + '…' : m.name,
    tasks: m.total_tasks || 0,
    completed: m.completed_tasks || 0,
    active: m.active_tasks || 0,
  }));

  const pauseData = (data?.pauseReasons || []).map(p => ({
    name: p.pause_reason,
    count: p.count,
  }));

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Analytics & Reports</h1>
        <p className="text-sm text-slate-400">Operational efficiency insights</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Workers', value: data?.workerCount || 0, color: 'text-blue-400' },
          { label: 'Delayed Tasks', value: data?.delayedTasks || 0, color: 'text-red-400' },
          { label: 'Completed Today', value: data?.completedToday || 0, color: 'text-emerald-400' },
          { label: 'Avg Efficiency', value: `${workerChartData.length ? Math.round(workerChartData.reduce((a, b) => a + b.efficiency, 0) / workerChartData.length) : 0}%`, color: 'text-purple-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card text-center">
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Worker Performance */}
        <div className="card">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Users size={16} className="text-blue-400" /> Worker Efficiency</h3>
          {workerChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={workerChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }} />
                <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} name="Completed" />
                <Bar dataKey="delayed" fill="#ef4444" radius={[4, 4, 0, 0]} name="Delayed" />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-500 text-center py-8">No data yet</p>}
        </div>

        {/* Machine Utilization */}
        <div className="card">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Cpu size={16} className="text-blue-400" /> Machine Utilization</h3>
          {machineChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={machineChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }} />
                <Bar dataKey="tasks" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Total Tasks" />
                <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} name="Completed" />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-500 text-center py-8">No data yet</p>}
        </div>
      </div>

      {/* Pause Reasons Breakdown */}
      {pauseData.length > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><TrendingDown size={16} className="text-amber-400" /> Downtime Cause Analysis</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={pauseData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} width={160} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }} />
              <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Occurrences" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Downtime by Machine */}
      {(downtime?.downtimeByMachine?.length > 0) && (
        <div className="card">
          <h3 className="font-semibold mb-4">Downtime Log by Machine</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 uppercase tracking-wider border-b border-slate-700">
                  <th className="pb-2 pr-4">Machine</th>
                  <th className="pb-2 pr-4">Reason</th>
                  <th className="pb-2">Occurrences</th>
                </tr>
              </thead>
              <tbody>
                {downtime.downtimeByMachine.map((r, i) => (
                  <tr key={i} className="table-row">
                    <td className="py-2.5 pr-4 text-slate-200 font-medium">{r.machine_name}</td>
                    <td className="py-2.5 pr-4 text-slate-400">{r.pause_reason}</td>
                    <td className="py-2.5 text-amber-400 font-semibold">{r.pause_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
