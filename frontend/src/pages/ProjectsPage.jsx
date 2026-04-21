import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Users, Cpu, ClipboardList, Settings, Briefcase, X, User, ExternalLink } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

function ProjectDetailModal({ project, onClose }) {
    const { t } = useLanguage();
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/projects/${project.id}`)
            .then(res => setDetails(res.data))
            .finally(() => setLoading(false));
    }, [project.id]);

    if (loading) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/20">
                    <div>
                        <h3 className="text-xl font-bold">{details.name}</h3>
                        <p className="text-sm text-zinc-500">{details.description || 'No description'}</p>
                    </div>
                    <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"><X size={20} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Members Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Users size={18} className="text-blue-500" />
                            <h4 className="font-bold">Team Members</h4>
                        </div>
                        <div className="space-y-2">
                            {details.workers && details.workers.length > 0 ? (
                                details.workers.map(u => (
                                    <div key={u.id} className="flex items-center gap-3 p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${u.role === 'supervisor' ? 'bg-blue-600 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600'}`}>
                                            {u.name[0]}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold truncate">{u.name}</p>
                                            <p className="text-[10px] text-zinc-400 uppercase font-medium">{u.role}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-zinc-500 italic">No members assigned</p>
                            )}
                        </div>
                    </div>

                    {/* Machines Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Cpu size={18} className="text-emerald-500" />
                            <h4 className="font-bold">Machines</h4>
                        </div>
                        <div className="space-y-2">
                            {details.machines && details.machines.length > 0 ? (
                                details.machines.map(m => (
                                    <div key={m.id} className="flex items-center gap-3 p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                        <div className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-500">
                                            <Cpu size={14} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold truncate">{m.name}</p>
                                            <p className={`text-[10px] font-bold uppercase ${m.status === 'breakdown' ? 'text-red-500' : 'text-emerald-500'}`}>{m.status}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-zinc-500 italic">No machines assigned</p>
                            )}
                        </div>
                    </div>

                    {/* Tasks Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <ClipboardList size={18} className="text-purple-500" />
                            <h4 className="font-bold">Recent Tasks</h4>
                        </div>
                        <div className="space-y-2">
                            {details.tasks && details.tasks.length > 0 ? (
                                details.tasks.slice(0, 8).map(t => (
                                    <div key={t.id} className="p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                        <div className="flex justify-between items-center mb-1">
                                            <p className="text-sm font-bold truncate pr-2">{t.title}</p>
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${t.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{t.status}</span>
                                        </div>
                                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-tighter">Priority: {t.priority}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-zinc-500 italic">No tasks created</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ProjectsPage() {
    const { t } = useLanguage();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showDetail, setShowDetail] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [workers, setWorkers] = useState([]);
    const [supervisors, setSupervisors] = useState([]);
    const [machines, setMachines] = useState([]);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        workerIds: [],
        supervisorIds: [],
        machineIds: []
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [pRes, uRes, mRes] = await Promise.all([
                api.get('/projects'),
                api.get('/users'),
                api.get('/machines')
            ]);
            setProjects(pRes.data);
            setWorkers(uRes.data.filter(u => u.role === 'worker'));
            setSupervisors(uRes.data.filter(u => u.role === 'supervisor'));
            setMachines(mRes.data);
        } catch (err) {
            toast.error('Failed to fetch projects');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await api.put(`/projects/${selectedProject.id}`, formData);
                toast.success('Project updated');
            } else {
                await api.post('/projects', formData);
                toast.success('Project created');
            }
            setShowModal(false);
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Operation failed');
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this project? Workers and machines will be unassigned.')) return;
        try {
            await api.delete(`/projects/${id}`);
            toast.success('Project deleted');
            fetchData();
        } catch (err) {
            toast.error('Failed to delete project');
        }
    };

    const openEditModal = (e, proj) => {
        e.stopPropagation();
        setSelectedProject(proj);
        setIsEditing(true);
        api.get(`/projects/${proj.id}`).then(res => {
            const data = res.data;
            setFormData({
                name: data.name,
                description: data.description || '',
                workerIds: data.workers.filter(u => u.role === 'worker').map(w => w.id),
                supervisorIds: data.workers.filter(u => u.role === 'supervisor').map(s => s.id),
                machineIds: data.machines.map(m => m.id)
            });
            setShowModal(true);
        });
    };

    const handleWorkerToggle = (id) => {
        setFormData(prev => {
            const workerIds = prev.workerIds.includes(id)
                ? prev.workerIds.filter(wid => wid !== id)
                : [...prev.workerIds, id];
            return { ...prev, workerIds };
        });
    };

    const handleSupervisorToggle = (id) => {
        setFormData(prev => {
            const supervisorIds = prev.supervisorIds.includes(id)
                ? prev.supervisorIds.filter(sid => sid !== id)
                : [...prev.supervisorIds, id];
            return { ...prev, supervisorIds };
        });
    };

    const handleMachineToggle = (id) => {
        setFormData(prev => {
            const machineIds = prev.machineIds.includes(id)
                ? prev.machineIds.filter(mid => mid !== id)
                : [...prev.machineIds, id];
            return { ...prev, machineIds };
        });
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 pointer-events-none">
            <Settings className="animate-spin text-zinc-300 dark:text-zinc-700 mb-4" size={40} />
            <p className="text-zinc-400 font-medium animate-pulse tracking-widest uppercase text-xs">Synchronizing Engine...</p>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                        <Briefcase size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Projects</h2>
                        <p className="text-zinc-500 dark:text-zinc-400">Manage work units, workers and machines</p>
                    </div>
                </div>
                <button
                    onClick={() => { setIsEditing(false); setFormData({ name: '', description: '', workerIds: [], supervisorIds: [], machineIds: [] }); setShowModal(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg hover:opacity-90 transition-opacity font-medium"
                >
                    <Plus size={18} />
                    Create Project
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map(project => (
                    <div key={project.id} onClick={() => setShowDetail(project)} className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 hover:shadow-lg transition-all group cursor-pointer relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ExternalLink size={14} className="text-zinc-400" />
                        </div>

                        <div className="flex justify-between items-start mb-4">
                            <div className="min-w-0 pr-10">
                                <h3 className="text-lg font-bold text-zinc-900 dark:text-white group-hover:text-purple-500 transition-colors truncate">{project.name}</h3>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1">{project.description || 'No description'}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 border-t border-zinc-100 dark:border-zinc-800 pt-4">
                            <div className="p-2 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                    <Users size={14} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase">Supervisors</p>
                                    <p className="font-bold text-zinc-900 dark:text-zinc-50 leading-none">{project.supervisorCount || 0}</p>
                                </div>
                            </div>
                            <div className="p-2 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                                    <Users size={14} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase">Workers</p>
                                    <p className="font-bold text-zinc-900 dark:text-zinc-50 leading-none">{project.workerCount || 0}</p>
                                </div>
                            </div>
                            <div className="p-2 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                    <Cpu size={14} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase">Machines</p>
                                    <p className="font-bold text-zinc-900 dark:text-zinc-50 leading-none">{project.machineCount || 0}</p>
                                </div>
                            </div>
                            <div className="p-2 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                                    <ClipboardList size={14} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase">Tasks</p>
                                    <p className="font-bold text-zinc-900 dark:text-zinc-50 leading-none">{project.taskCount || 0}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 justify-end mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                            <button onClick={(e) => openEditModal(e, project)} className="btn bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 px-3 py-1.5 text-xs font-bold">
                                <Settings size={14} className="mr-1" /> Settings
                            </button>
                            <button onClick={(e) => handleDelete(e, project.id)} className="btn bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 px-3 py-1.5 text-xs font-bold">
                                <Trash2 size={14} className="mr-1" /> Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {showDetail && <ProjectDetailModal project={showDetail} onClose={() => setShowDetail(null)} />}

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                            <h3 className="text-lg font-bold">{isEditing ? 'Edit Project' : 'Create New Project'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"><Plus className="rotate-45" size={20} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold mb-1.5">Project Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="input"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Vision AI Integration"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-1.5">Description</label>
                                    <textarea
                                        className="input h-24 resize-none"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Describe the project scope..."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold mb-3 flex items-center gap-2">
                                        <Users size={16} /> Supervisors
                                    </label>
                                    <div className="space-y-2 max-h-40 overflow-y-auto border border-zinc-100 dark:border-zinc-800 rounded-xl p-2 bg-zinc-50 dark:bg-zinc-900/20">
                                        {supervisors.map(sup => (
                                            <div
                                                key={sup.id}
                                                onClick={() => handleSupervisorToggle(sup.id)}
                                                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all border ${formData.supervisorIds.includes(sup.id) ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent shadow-md px-3' : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500'}`}
                                            >
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${formData.supervisorIds.includes(sup.id) ? 'bg-blue-600 text-white' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-500'}`}>
                                                    {sup.name[0]}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold truncate">{sup.name}</p>
                                                    <p className="text-[10px] opacity-60 truncate">{sup.email}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold mb-3 flex items-center gap-2">
                                        <Users size={16} /> Workers
                                    </label>
                                    <div className="space-y-2 max-h-40 overflow-y-auto border border-zinc-100 dark:border-zinc-800 rounded-xl p-2 bg-zinc-50 dark:bg-zinc-900/20">
                                        {workers.map(worker => (
                                            <div
                                                key={worker.id}
                                                onClick={() => handleWorkerToggle(worker.id)}
                                                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all border ${formData.workerIds.includes(worker.id) ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent shadow-md px-3' : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500'}`}
                                            >
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${formData.workerIds.includes(worker.id) ? 'bg-zinc-700 dark:bg-zinc-200 text-zinc-900 dark:text-white' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-500'}`}>
                                                    {worker.name[0]}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold truncate">{worker.name}</p>
                                                    <p className="text-[10px] opacity-60 truncate">{worker.email}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold mb-3 flex items-center gap-2">
                                    <Cpu size={16} /> Machines
                                </label>
                                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-zinc-100 dark:border-zinc-800 rounded-xl p-2 bg-zinc-50 dark:bg-zinc-900/20">
                                    {machines.map(machine => (
                                        <div
                                            key={machine.id}
                                            onClick={() => handleMachineToggle(machine.id)}
                                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all border ${formData.machineIds.includes(machine.id) ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent shadow-md px-3' : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500'}`}
                                        >
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${formData.machineIds.includes(machine.id) ? 'bg-zinc-700 dark:bg-zinc-200 text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-500'}`}>
                                                <Cpu size={12} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold truncate">{machine.name}</p>
                                                <p className="text-[10px] opacity-60 truncate">{machine.type}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800 sticky bottom-0 bg-white dark:bg-zinc-900">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" className="flex-1 btn-primary justify-center font-bold">
                                    {isEditing ? 'Save Changes' : 'Create Project'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

