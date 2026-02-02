type TimelineItem = {
  id: string;
  title: string;
  date: string | null;
  type: string;
};

type BrowseTimelineProps = {
  items: TimelineItem[];
};

export function BrowseTimeline({ items }: BrowseTimelineProps) {
  if (items.length === 0) {
    return <div className="text-sm text-slate-400">No timeline items.</div>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-4">
          <div className="w-24 text-xs text-slate-500">
            {item.date ? new Date(item.date).toLocaleDateString() : "No date"}
          </div>
          <div className="flex-1 rounded-lg border border-void-border bg-void-50/40 px-4 py-3">
            <div className="text-sm font-semibold text-white">{item.title}</div>
            <div className="text-xs uppercase text-slate-500">{item.type}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
