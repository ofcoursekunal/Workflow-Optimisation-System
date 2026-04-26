import { useState, useEffect, useCallback } from 'react';
import { X, Search, Filter, AlertTriangle, AlertCircle, CheckCircle2, History, Loader2, ArrowRight, Clock } from 'lucide-react';
import api from '../utils/api';
import AlertCard from './AlertCard';
import AlertDetailModal from './AlertDetailModal';
import { useSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';

export default function AlertsPanel({ isOpen, onClose }) {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('active'); // 'active', 'resolved'
    const [filterType, setFilterType] = useState('all'); // 'all', 'pending', 'delayed'
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAlert, setSelectedAlert] = useState(null);
    const { socket } = useSocket();
    const navigate = useNavigate();

    const fetchAlerts = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/supervisor/alerts', {
                params: { status: activeTab }
            });
            setAlerts(res.data);
        } catch { }
        setLoading(false);
    }, [activeTab]);

    useEffect(() => {
        if (isOpen) fetchAlerts();
    }, [isOpen, fetchAlerts]);

    useEffect(() => {
        if (!socket) return;
        const handleNewAlert = (newAlert) => {
            // If we are on active tab, prepend the new alert
            if (activeTab === 'active') {
                setAlerts(prev => [newAlert, ...prev]);
            }
        };
        socket.on('worker_logout_alert', handleNewAlert);
        return () => socket.off('worker_logout_alert', handleNewAlert);
    }, [socket, activeTab]);

    const filteredAlerts = alerts.filter(alert => {
        const matchesSearch = (alert.workerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (alert.reason || '').toLowerCase().includes(searchQuery.toLowerCase());

        if (filterType === 'pending') return matchesSearch && alert.pending_tasks > 0 && alert.delayed_tasks === 0;
        if (filterType === 'delayed') return matchesSearch && alert.delayed_tasks > 0;
        return matchesSearch;
    });

    const handleResolveAlert = (alertId) => {
        setAlerts(prev => prev.filter(a => a.id !== alertId));
    };

    if (!isOpen) return null;

    return (
        <>
            <div
                className={`fixed inset-0 z-[60] flex justify-end transition-all duration-300 ${selectedAlert ? 'bg-transparent pointer-events-none' : 'bg-zinc-900/20 dark:bg-black/40 backdrop-blur-[2px] animate-fade-in cursor-pointer'}`}
                onClick={onClose}
            >
                <div
                    className={`w-full max-w-md h-full bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl animate-slide-left flex flex-col pointer-events-auto transition-opacity duration-300 ${selectedAlert ? 'opacity-20 blur-sm scale-95 origin-right' : 'opacity-100'}`}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/10">
                        <div>
                            <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                                <AlertTriangle className="text-amber-500" size={24} />
                                Alerts & Notifications
                            </h2>
                            <p className="text-xs text-zinc-500 font-medium mt-1 uppercase tracking-widest">Supervisor Monitoring</p>
                        </div>
                        <button onClick={onClose} className="p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Search & Tabs */}
                    <div className="p-4 space-y-4 border-b border-zinc-100 dark:border-zinc-800">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search by worker or reason..."
                                className="w-full pl-10 pr-4 py-2.5 bg-zinc-100 dark:bg-zinc-900 border-transparent focus:bg-white dark:focus:bg-zinc-800 focus:border-zinc-200 dark:focus:border-zinc-700 rounded-xl text-sm font-medium transition-all"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="flex p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl">
                            <button
                                onClick={() => setActiveTab('active')}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'active' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                            >
                                <AlertCircle size={14} /> Active
                            </button>
                            <button
                                onClick={() => setActiveTab('resolved')}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'resolved' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                            >
                                <History size={14} /> Resolved
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="px-4 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-zinc-100 dark:border-zinc-800">
                        {[
                            { id: 'all', label: 'All Alerts', icon: Filter },
                            { id: 'pending', label: 'Pending Only', icon: Clock },
                            { id: 'delayed', label: 'Delayed Only', icon: AlertTriangle }
                        ].map(f => (
                            <button
                                key={f.id}
                                onClick={() => setFilterType(f.id)}
                                className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all flex items-center gap-1
                  ${filterType === f.id
                                        ? 'bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-50'
                                        : 'bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                                    }`}
                            >
                                <f.icon size={11} /> {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Alert List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <Loader2 size={32} className="text-zinc-200 animate-spin" />
                                <p className="text-sm font-medium text-zinc-400">Loading alerts...</p>
                            </div>
                        ) : filteredAlerts.length > 0 ? (
                            filteredAlerts.map(alert => (
                                <AlertCard
                                    key={alert.id}
                                    alert={alert}
                                    onClick={setSelectedAlert}
                                />
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                                <div className="w-16 h-16 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center mb-4 border border-zinc-100 dark:border-zinc-800">
                                    <CheckCircle2 size={32} className="text-emerald-500 opacity-20" />
                                </div>
                                <h3 className="font-bold text-zinc-900 dark:text-zinc-50">All Clear</h3>
                                <p className="text-xs text-zinc-500 mt-1">No {activeTab} alerts found matching your criteria.</p>
                            </div>
                        )}
                    </div>

                    {/* Footer Card */}
                    <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800">
                        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-50">View Work History</p>
                                <p className="text-[10px] text-zinc-500">Analyze worker performance trends</p>
                            </div>
                            <button
                                onClick={() => navigate('/reports/workers')}
                                className="p-2 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-xl hover:scale-105 transition-transform"
                            >
                                <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {selectedAlert && (
                <AlertDetailModal
                    alert={selectedAlert}
                    onClose={() => setSelectedAlert(null)}
                    onResolve={handleResolveAlert}
                    onNavigate={(path) => {
                        navigate(path);
                        setSelectedAlert(null);
                        onClose();
                    }}
                />
            )}
        </>
    );
}
