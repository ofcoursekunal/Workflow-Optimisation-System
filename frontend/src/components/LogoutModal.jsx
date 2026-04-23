import React, { useState } from 'react';
import { AlertTriangle, Clock, X } from 'lucide-react';

export default function LogoutModal({ isOpen, onClose, onConfirm, pendingData }) {
    const [reason, setReason] = useState('');
    const [note, setNote] = useState('');

    if (!isOpen) return null;

    const reasons = [
        'Shift ended',
        'Machine breakdown',
        'Material not available',
        'Supervisor instruction',
        'Personal reason'
    ];

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!reason) return;
        onConfirm({ reason, note });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden transform animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3 text-amber-600 dark:text-amber-500">
                            <div className="p-2 bg-amber-100 dark:bg-amber-500/10 rounded-lg">
                                <AlertTriangle size={24} />
                            </div>
                            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Smart Logout Check</h2>
                        </div>
                        <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-4 mb-8">
                        <div className="p-4 bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/20 rounded-xl">
                            <p className="text-sm font-medium text-amber-800 dark:text-amber-400 mb-3">
                                You have active tasks that need attention:
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/50 dark:bg-zinc-900/50 p-3 rounded-lg border border-amber-200/50 dark:border-amber-500/10">
                                    <p className="text-2xl font-bold text-zinc-900 dark:text-white">{pendingData.pendingTasks}</p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-bold">Pending Tasks</p>
                                </div>
                                <div className="bg-white/50 dark:bg-zinc-900/50 p-3 rounded-lg border border-amber-200/50 dark:border-amber-500/10">
                                    <p className="text-2xl font-bold text-red-600 dark:text-red-500">{pendingData.delayedTasks}</p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-bold">Delayed Tasks</p>
                                </div>
                            </div>
                            {pendingData.estimatedTime > 0 && (
                                <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-500 font-medium">
                                    <Clock size={14} />
                                    <span>Est. remaining work: {pendingData.estimatedTime} minutes</span>
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                                    Reason for logging out <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none transition-all text-sm"
                                    required
                                >
                                    <option value="">Select a reason</option>
                                    {reasons.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                                    Additional Notes (optional)
                                </label>
                                <textarea
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="Provide more context if needed..."
                                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none transition-all text-sm min-h-[100px] resize-none"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-4 py-3 rounded-xl font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!reason}
                                    className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-zinc-900 dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm shadow-lg shadow-zinc-200 dark:shadow-none"
                                >
                                    Logout Anyway
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
