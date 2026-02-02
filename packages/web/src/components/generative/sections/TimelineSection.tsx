import { NeuralCard } from "../../ui/neural/NeuralCard";

type TimelineItem = {
  date?: string;
  label?: string;
  detail?: string;
};

type TimelineSectionProps = {
  title?: string;
  items?: TimelineItem[];
  data?: Record<string, unknown>;
};

function normalizeItems(items?: TimelineItem[], data?: Record<string, unknown>): TimelineItem[] {
  if (items && items.length > 0) return items;
  const fromData = (data?.items || data?.events) as TimelineItem[] | undefined;
  return Array.isArray(fromData) ? fromData : [];
}

export function TimelineSection({ title, items, data }: TimelineSectionProps) {
  const rows = normalizeItems(items, data);
  return (
    <NeuralCard entityType="task" padding="md">
      {title && <h3 className="text-lg font-semibold text-white mb-3">{title}</h3>}
      {rows.length === 0 ? (
        <div className="text-sm text-slate-400">No timeline events available.</div>
      ) : (
        <div className="space-y-3">
          {rows.map((row, index) => (
            <div key={`${row.label ?? "event"}-${index}`} className="flex items-start gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-neural-fire-400" />
              <div>
                <div className="text-sm text-white">{row.label ?? "Event"}</div>
                {row.date && <div className="text-xs text-slate-400">{row.date}</div>}
                {row.detail && <div className="text-xs text-slate-500">{row.detail}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </NeuralCard>
  );
}
