import { Award, Zap, Shield, Star } from 'lucide-react';

export const GET_LEVEL_INFO = (credits) => {
    if (credits < 50) return { name: 'Beginner', icon: Award, color: 'text-zinc-400', bg: 'bg-zinc-100', progress: (credits / 50) * 100, next: 50 };
    if (credits < 150) return { name: 'Skilled Worker', icon: Zap, color: 'text-blue-500', bg: 'bg-blue-100', progress: ((credits - 50) / 100) * 100, next: 150 };
    if (credits < 300) return { name: 'Expert', icon: Shield, color: 'text-purple-500', bg: 'bg-purple-100', progress: ((credits - 150) / 150) * 100, next: 300 };
    return { name: 'Pro Operator', icon: Star, color: 'text-amber-500', bg: 'bg-amber-100', progress: 100, next: null };
};

export default function CreditProgressBar({ credits }) {
    const level = GET_LEVEL_INFO(credits);
    const Icon = level.icon;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${level.bg} ${level.color}`}>
                        <Icon size={16} />
                    </div>
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block leading-none">Rank Status</span>
                        <span className={`text-xs font-bold ${level.color}`}>{level.name}</span>
                    </div>
                </div>
                {level.next && (
                    <span className="text-[10px] font-bold text-zinc-400">
                        {level.next - credits} XP to next level
                    </span>
                )}
            </div>

            <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-700/50 relative">
                <div
                    className={`h-full transition-all duration-1000 ease-out shadow-lg ${level.color.replace('text', 'bg')}`}
                    style={{ width: `${level.progress}%` }}
                />
            </div>
        </div>
    );
}
