import { Clock, AlertTriangle, AlertCircle, ChevronRight, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AlertCard({ alert, onClick }) {
    const { getImageUrl } = useAuth();
    const hasDelayed = alert.delayed_tasks > 0;

    return (
        <div
            onClick={() => onClick(alert)}
            className={`group relative p-4 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden
        ${hasDelayed
                    ? 'bg-red-50/50 dark:bg-red-500/5 border-red-100 dark:border-red-500/20 hover:border-red-300 dark:hover:border-red-500/40 shadow-sm hover:shadow-md'
                    : 'bg-amber-50/50 dark:bg-amber-500/5 border-amber-100 dark:border-amber-500/20 hover:border-amber-300 dark:hover:border-amber-500/40 shadow-sm hover:shadow-md'
                }
      `}
        >
            {/* Status Accent Bar */}
            <div className={`absolute top-0 left-0 w-1.5 h-full ${hasDelayed ? 'bg-red-500' : 'bg-amber-500'}`} />

            <div className="flex gap-4">
                {/* Worker Avatar */}
                <div className="w-10 h-10 rounded-full border-2 border-white dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    {alert.workerPicture ? (
                        <img src={getImageUrl(alert.workerPicture)} alt={alert.workerName} className="w-full h-full object-cover" />
                    ) : (
                        <User size={18} className="text-zinc-400" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-zinc-900 dark:text-zinc-50 truncate group-hover:text-zinc-700 dark:group-hover:text-white transition-colors">
                            {alert.workerName}
                        </h4>
                        <span className="text-[10px] font-medium text-zinc-400 flex items-center gap-1 shrink-0">
                            <Clock size={10} />
                            {new Date(alert.logout_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>

                    <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1 mb-3">
                        Logged off with incomplete work
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full transition-colors ${hasDelayed ? 'bg-red-500 text-white shadow-sm shadow-red-500/20' : 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
                            }`}>
                            {hasDelayed ? <AlertCircle size={10} strokeWidth={3} /> : <AlertTriangle size={10} strokeWidth={3} />}
                            {alert.delayed_tasks > 0 ? `${alert.delayed_tasks} Delayed` : `${alert.pending_tasks} Pending`}
                        </span>

                        <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/50 px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-700 flex items-center gap-1">
                            {alert.reason}
                        </span>
                    </div>
                </div>

                <div className="flex items-center opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                    <ChevronRight size={16} className="text-zinc-300 dark:text-zinc-600" />
                </div>
            </div>
        </div>
    );
}
