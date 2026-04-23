import { X, Clock, AlertTriangle, User, ExternalLink, CheckCircle2, Loader2, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function AlertDetailModal({ alert, onClose, onResolve, onNavigate }) {
    const { getImageUrl, user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [resolving, setResolving] = useState(false);

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const res = await api.get(`/tasks?workerId=${alert.user_id}`);
                // Filter tasks that are incomplete
                const affectedTasks = res.data.filter(t => t.status !== 'completed');
                setTasks(affectedTasks);
            } catch { }
            setLoading(false);
        };
        fetchTasks();
    }, [alert]);

    const handleResolve = async () => {
        setResolving(true);
        try {
            await api.put(`/supervisor/alerts/${alert.id}/resolve`);
            toast.success('Alert marked as resolved');
            onResolve(alert.id);
            onClose();
        } catch {
            toast.error('Failed to resolve alert');
        } finally {
            setResolving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 dark:bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl animate-slide-in flex flex-col">
                {/* Header */}
                <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/20">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full border-2 border-white dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                            {alert.workerPicture ? (
                                <img src={getImageUrl(alert.workerPicture)} alt={alert.workerName} className="w-full h-full object-cover" />
                            ) : (
                                <User size={20} className="text-zinc-400" />
                            )}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50">{alert.workerName}</h3>
                            <p className="text-xs text-zinc-500 font-medium flex items-center gap-1">
                                <Clock size={12} /> Logged off at {new Date(alert.logout_time).toLocaleString()}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    {/* Reason & Notes */}
                    <div className="space-y-4">
                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/10">
                            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-500">
                                <AlertTriangle size={20} />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-xs font-black uppercase tracking-widest text-amber-700 dark:text-amber-500 mb-1">Logout Reason</h4>
                                <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">{alert.reason}</p>
                                {alert.note && (
                                    <div className="mt-3 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-amber-100 dark:border-amber-500/10 text-sm text-zinc-600 dark:text-zinc-400 flex gap-2">
                                        <MessageSquare size={16} className="shrink-0 mt-0.5 opacity-50" />
                                        <p className="italic">"{alert.note}"</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Affected Tasks */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                Affected Tasks
                                <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full text-[10px] font-black">
                                    {loading ? '...' : tasks.length}
                                </span>
                            </h4>
                            <button
                                onClick={() => onNavigate(`/${user?.role}/tasks?workerId=${alert.user_id}`)}
                                className="text-[11px] font-bold text-blue-600 hover:text-blue-500 flex items-center gap-1 transition-colors"
                                disabled={loading}
                            >
                                Manage Tasks <ExternalLink size={12} />
                            </button>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-10">
                                <Loader2 size={24} className="text-zinc-300 animate-spin" />
                            </div>
                        ) : tasks.length > 0 ? (
                            <div className="space-y-2">
                                {tasks.map(task => (
                                    <div key={task.id} className="p-4 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{task.title}</p>
                                            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter mt-1">Status: {task.status.replace('_', ' ')}</p>
                                        </div>
                                        <div className={`w-2 h-2 rounded-full ${task.status === 'delayed' ? 'bg-red-500 shadow-sm shadow-red-500/40' : 'bg-amber-500 shadow-sm shadow-amber-500/40'}`} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-10 text-center bg-zinc-50/50 dark:bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                                <p className="text-xs text-zinc-400 font-medium">No active tasks affected by this logout session.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/10 flex gap-3">
                    <button
                        onClick={handleResolve}
                        disabled={resolving}
                        className="flex-1 btn bg-emerald-500 hover:bg-emerald-600 text-white justify-center py-3 font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                    >
                        {resolving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                        Mark as Resolved
                    </button>
                    <button
                        onClick={() => onNavigate(`/workers/${alert.user_id}`)}
                        className="flex-1 btn-secondary justify-center py-3 font-bold rounded-2xl"
                    >
                        <User size={18} /> View Worker Analytics
                    </button>
                </div>
            </div>
        </div>
    );
}
