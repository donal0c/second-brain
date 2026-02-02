type DigestTimelineItem = {
  id: string;
  title: string;
  dueDate?: string | null;
  type: "task" | "project" | "idea" | "person";
};

type DigestTimelineProps = {
  items: DigestTimelineItem[];
};

export function DigestTimeline({ items }: DigestTimelineProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xl font-semibold text-white">Upcoming Deadlines</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-lg border border-void-border bg-void-50/40 px-4 py-3"
          >
            <div>
              <div className="text-sm font-semibold text-white">{item.title}</div>
              <div className="text-xs uppercase text-slate-500">{item.type}</div>
            </div>
            <div className="text-sm text-slate-300">
              {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : "No date"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
