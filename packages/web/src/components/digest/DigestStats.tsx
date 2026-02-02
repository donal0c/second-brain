type DigestStatsProps = {
  stats: {
    activeTasks: number;
    activeProjects: number;
    ideas: number;
  };
};

export function DigestStats({ stats }: DigestStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="rounded-xl border border-neural-fire-500/20 bg-neural-fire-500/10 p-4 text-center">
        <div className="text-2xl font-bold text-neural-fire-400">{stats.activeTasks}</div>
        <div className="text-xs text-slate-400">Active Tasks</div>
      </div>
      <div className="rounded-xl border border-neural-pulse-500/20 bg-neural-pulse-500/10 p-4 text-center">
        <div className="text-2xl font-bold text-neural-pulse-400">{stats.activeProjects}</div>
        <div className="text-xs text-slate-400">Active Projects</div>
      </div>
      <div className="rounded-xl border border-neural-memory-500/20 bg-neural-memory-500/10 p-4 text-center">
        <div className="text-2xl font-bold text-neural-memory-400">{stats.ideas}</div>
        <div className="text-xs text-slate-400">Ideas</div>
      </div>
    </div>
  );
}
