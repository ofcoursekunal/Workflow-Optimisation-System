import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useSocket } from '../context/SocketContext';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle, Clock, User } from 'lucide-react';

export default function SupervisorAlerts() {
    const { t } = useLanguage();
    const { socket } = useSocket();
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('active'); // active, resolved, all

    const fetchAlerts = useCallback(async () => {
        try {
            const res = await api.get(`/supervisor/alerts?status=${filter}`);
            setAlerts(res.data);
        } catch (err) {
            toast.error('Failed to load alerts');
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        fetchAlerts();
    }, [fetchAlerts]);

    useEffect(() => {
        if (!socket) return;
        const handleNewAlert = (data) => {
            if (filter !== 'resolved') {
                setAlerts(prev => [data, ...prev]);
                toast.error(`Worker Alert: ${data.workerName} went offline with pending tasks.`, { icon: '⚠️' });
            }
        };
        socket.on('worker_offline_alert', handleNewAlert);
        return () => socket.off('worker_offline_alert', handleNewAlert);
    }, [socket, filter]);

    const handleResolve = async (id) => {
        try {
            await api.put(`/supervisor/alerts/${id}/resolve`);
            toast.success('Alert marked as reviewed');
            fetchAlerts();
        } catch (err) {
            toast.error('Failed to review alert');
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-slide-in">
            <div className="flex flex-col sm:flex-row justify-between shrink-0 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-3">
                        <AlertTriangle className="text-red-500" size={32} />
                        Shift Alerts
                    </h1>
                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-1">
                        Review alerts generated when workers go offline with incomplete work.
                    </p>
                </div>
                <div className="flex bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl self-start shrink-0 border border-zinc-200 dark:border-zinc-700/50">
                    <button
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === 'active' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'}`}
                        onClick={() => setFilter('active')}
                    >
                        Unread
                    </button>
                    <button
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === 'resolved' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'}`}
                        onClick={() => setFilter('resolved')}
                    >
                        Reviewed
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : alerts.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                    <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200 dark:border-emerald-500/20">
                        <CheckCircle size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">All Clear!</h3>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-2">No shift alerts to review at the moment.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {alerts.map(a => (
                        <div key={a.id} className={`p-5 rounded-2xl border transition-colors ${a.status === 'unread' ? 'border-l-4 border-l-red-500 bg-white dark:bg-zinc-900 shadow-sm border-zinc-200 dark:border-zinc-800' : 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 opacity-70'}`}>
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-2 border-white dark:border-zinc-800 flex items-center justify-center overflow-hidden shrink-0 mt-1">
                                        <User size={24} className="text-zinc-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50 leading-tight">
                                            {a.worker_name || 'Unknown Worker'}
                                        </h3>
                                        <p className="text-xs font-semibold text-zinc-500 flex items-center gap-1.5 mt-1">
                                            <Clock size={12} className="text-zinc-400" />
                                            Went offline at {new Date(a.timestamp).toLocaleString()}
                                        </p>
                                        <div className="flex gap-3 mt-3">
                                            <span className="badge bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 font-bold">
                                                {a.pending_tasks} Pending
                                            </span>
                                            {a.delayed_tasks > 0 && (
                                                <span className="badge bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 font-bold animate-pulse">
                                                    {a.delayed_tasks} Delayed
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-4 space-y-1">
                                            <p className="text-sm">
                                                <span className="font-bold text-zinc-700 dark:text-zinc-300">Reason:</span>{' '}
                                                <span className="text-zinc-600 dark:text-zinc-400">{a.reason || 'Not specified'}</span>
                                            </p>
                                            {a.note && (
                                                <p className="text-sm">
                                                    <span className="font-bold text-zinc-700 dark:text-zinc-300">Note:</span>{' '}
                                                    <span className="text-zinc-600 dark:text-zinc-400 italic">"{a.note}"</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {a.status === 'unread' && (
                                    <button
                                        onClick={() => handleResolve(a.id)}
                                        className="shrink-0 btn-success py-2 px-4 whitespace-nowrap"
                                    >
                                        <CheckCircle size={16} className="mr-1.5" />
                                        Mark Reviewed
                                    </button>
                                )}
                                {a.status === 'reviewed' && (
                                    <span className="shrink-0 flex items-center gap-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                        <CheckCircle size={16} /> Reviewed
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
