import { useState, useEffect } from 'react';
import { Save, RefreshCw, Star, Clock, Zap, Pause, AlertTriangle, ShieldCheck } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function CreditSettings() {
    const [settings, setSettings] = useState({
        credits_base: '10',
        credits_bonus_early: '5',
        credits_bonus_no_pauses: '3',
        credits_bonus_high_priority: '2',
        credits_max_per_task: '20',
        credits_enabled: 'true'
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const res = await api.get('/credit-settings');
            setSettings(res.data);
        } catch (e) {
            toast.error('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            await api.post('/credit-settings', settings);
            toast.success('Settings saved successfully');
        } catch (e) {
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <RefreshCw size={24} className="text-zinc-400 animate-spin" />
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-slide-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">Credit System Settings</h1>
                    <p className="text-zinc-500 font-medium">Configure how workers earn performance points</p>
                </div>
                <div className={`px-4 py-2 rounded-full font-bold text-xs uppercase tracking-widest ${settings.credits_enabled === 'true' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-zinc-100 text-zinc-400 border border-zinc-200'}`}>
                    {settings.credits_enabled === 'true' ? 'System Active' : 'System Disabled'}
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {/* Global Toggle */}
                <div className="card flex items-center justify-between bg-zinc-900 border-none text-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-zinc-800 rounded-2xl">
                            <ShieldCheck className={settings.credits_enabled === 'true' ? 'text-emerald-400' : 'text-zinc-500'} size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold">Enable Incentive System</h3>
                            <p className="text-sm text-zinc-400">Turn the entire credit system on or off globally.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => handleChange('credits_enabled', settings.credits_enabled === 'true' ? 'false' : 'true')}
                        className={`w-14 h-8 rounded-full relative transition-colors ${settings.credits_enabled === 'true' ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                    >
                        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${settings.credits_enabled === 'true' ? 'left-7' : 'left-1'}`} />
                    </button>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Base Credits */}
                    <div className="card space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                                <Star size={20} />
                            </div>
                            <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Base Reward</h3>
                        </div>
                        <p className="text-xs text-zinc-500">Points awarded for any successful worker-initiated completion.</p>
                        <input
                            type="number"
                            value={settings.credits_base}
                            onChange={(e) => handleChange('credits_base', e.target.value)}
                            className="input w-full"
                        />
                    </div>

                    {/* Max Credits */}
                    <div className="card space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                                <AlertTriangle size={20} />
                            </div>
                            <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Max Per Task</h3>
                        </div>
                        <p className="text-xs text-zinc-500">The absolute ceiling for credits earned from a single task.</p>
                        <input
                            type="number"
                            value={settings.credits_max_per_task}
                            onChange={(e) => handleChange('credits_max_per_task', e.target.value)}
                            className="input w-full"
                        />
                    </div>

                    {/* Early Bonus */}
                    <div className="card space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                                <Clock size={20} />
                            </div>
                            <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Early Completion</h3>
                        </div>
                        <p className="text-xs text-zinc-500">Bonus points for finishing before the estimated deadline.</p>
                        <input
                            type="number"
                            value={settings.credits_bonus_early}
                            onChange={(e) => handleChange('credits_bonus_early', e.target.value)}
                            className="input w-full"
                        />
                    </div>

                    {/* No Pause Bonus */}
                    <div className="card space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
                                <Pause size={20} />
                            </div>
                            <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Zero-Pause Streak</h3>
                        </div>
                        <p className="text-xs text-zinc-500">Reward for continuous focus (Completing without any pauses).</p>
                        <input
                            type="number"
                            value={settings.credits_bonus_no_pauses}
                            onChange={(e) => handleChange('credits_bonus_no_pauses', e.target.value)}
                            className="input w-full"
                        />
                    </div>

                    {/* High Priority Bonus */}
                    <div className="card space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 text-red-600 rounded-xl">
                                <Zap size={20} />
                            </div>
                            <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Critical Priority</h3>
                        </div>
                        <p className="text-xs text-zinc-500">Additional points for completing HIGH priority tasks.</p>
                        <input
                            type="number"
                            value={settings.credits_bonus_high_priority}
                            onChange={(e) => handleChange('credits_bonus_high_priority', e.target.value)}
                            className="input w-full"
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="btn-primary px-8 py-3 rounded-2xl shadow-lg shadow-blue-500/20"
                    >
                        {saving ? <RefreshCw size={18} className="animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
                        Save System Configuration
                    </button>
                </div>
            </form>
        </div>
    );
}
