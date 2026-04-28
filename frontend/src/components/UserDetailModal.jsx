import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { X, Loader2, Mail, Shield, UserCog, HardHat, Circle, Calendar, Briefcase, Edit, Eye } from 'lucide-react';

const ROLE_ICONS = { admin: Shield, supervisor: UserCog, worker: HardHat, monitor: Eye };
const ROLE_COLORS = {
  admin: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20',
  supervisor: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  worker: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-500/10 dark:text-zinc-400 dark:border-zinc-500/20',
  monitor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
};

const STATUS_COLORS = {
  idle: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  busy: 'bg-blue-50 text-blue-700 border-blue-200',
  paused: 'bg-amber-50 text-amber-700 border-amber-200',
  delayed: 'bg-red-50 text-red-700 border-red-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const TASK_STATUS_COLORS = {
  not_started: 'bg-zinc-100 text-zinc-600',
  in_progress: 'bg-blue-100 text-blue-700',
  paused: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  delayed: 'bg-red-100 text-red-700',
};

export default function UserDetailModal({ userId, onClose, onEdit }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(`/users/${userId}`);
        setData(res.data);
      } catch (err) {
        toast.error('Failed to load user details');
        onClose();
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
        <div className="bg-white dark:bg-zinc-950 p-12 rounded-2xl shadow-xl flex flex-col items-center">
          <Loader2 className="animate-spin text-zinc-400" size={32} />
          <p className="mt-4 text-zinc-500 font-medium">Loading details...</p>
        </div>
      </div>
    );
  }

  const RoleIcon = ROLE_ICONS[data.role] || HardHat;
  const avatarUrl = data.avatar_url ? `http://localhost:5000${data.avatar_url}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random&size=128`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 w-full max-w-2xl rounded-3xl shadow-2xl animate-scale-in flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="relative h-32 bg-gradient-to-r from-zinc-800 to-zinc-950 dark:from-zinc-900 dark:to-black">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="px-8 pb-8 -mt-12 overflow-y-auto">
          <div className="flex flex-col md:flex-row md:items-end gap-6 mb-8">
            <div className="relative">
              <img 
                src={avatarUrl} 
                alt={data.name} 
                className="w-32 h-32 rounded-3xl border-4 border-white dark:border-zinc-950 shadow-lg object-cover bg-white"
              />
              <div className={`absolute -bottom-2 -right-2 p-2 rounded-xl border shadow-sm ${ROLE_COLORS[data.role]}`}>
                <RoleIcon size={20} />
              </div>
            </div>
            
            <div className="flex-1 min-w-0 pb-2">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">{data.name}</h2>
                <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${ROLE_COLORS[data.role]}`}>
                  {data.role}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <Mail size={14} /> {data.email}
                </span>
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <Calendar size={14} /> Joined {new Date(data.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => onEdit(data)}
                className="btn-primary px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-zinc-200 dark:shadow-none"
              >
                <Edit size={18} /> Edit Profile
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-6">
              <div className="bg-zinc-50 dark:bg-zinc-900/40 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Availability</h4>
                <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800">
                  <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">Status</span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase ${ROLE_COLORS[data.role]}`}>
                    <Circle size={8} fill="currentColor" /> {data.status}
                  </span>
                </div>
                {data.is_on_break === 1 && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center gap-2 animate-pulse">
                    <Circle size={8} fill="currentColor" />
                    <span className="text-sm font-bold uppercase tracking-wide">Currently on Break</span>
                  </div>
                )}
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-900/40 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Task Stats</h4>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50">{data.tasks?.length || 0}</div>
                    <div className="text-[10px] font-bold text-zinc-400 uppercase">Assigned</div>
                  </div>
                  <div className="p-3 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <div className="text-2xl font-black text-emerald-600">{data.tasks?.filter(t => t.status === 'completed').length || 0}</div>
                    <div className="text-[10px] font-bold text-zinc-400 uppercase">Done</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                  <Briefcase size={16} className="text-zinc-400" /> Recent Tasks
                </h4>
              </div>
              
              <div className="space-y-3">
                {data.tasks && data.tasks.length > 0 ? (
                  data.tasks.map(task => (
                    <div key={task.id} className="p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-zinc-200 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${TASK_STATUS_COLORS[task.status]}`}>
                          {task.status.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">ID: #{task.id}</span>
                      </div>
                      <h5 className="font-bold text-zinc-900 dark:text-zinc-50 truncate">{task.title}</h5>
                      <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500">
                        <span className="bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded-md">{task.machine_name || 'No Machine'}</span>
                        <span className={`px-2 py-0.5 rounded-md ${
                          task.priority === 'high' ? 'bg-red-50 text-red-600' : 
                          task.priority === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>{task.priority}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-900/20 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                    <Briefcase size={32} className="mx-auto text-zinc-300 mb-2" />
                    <p className="text-sm text-zinc-500">No tasks assigned yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
