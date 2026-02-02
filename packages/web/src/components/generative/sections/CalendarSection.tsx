import { NeuralCard } from "../../ui/neural/NeuralCard";

type CalendarItem = {
  date?: string;
  label?: string;
};

type CalendarSectionProps = {
  title?: string;
  items?: CalendarItem[];
  data?: Record<string, unknown>;
};

function normalizeItems(items?: CalendarItem[], data?: Record<string, unknown>): CalendarItem[] {
  if (items && items.length > 0) return items;
  const fromData = (data?.items || data?.events) as CalendarItem[] | undefined;
  return Array.isArray(fromData) ? fromData : [];
}

export function CalendarSection({ title, items, data }: CalendarSectionProps) {
  const rows = normalizeItems(items, data);
  return (
    <NeuralCard entityType="project" padding="md">
      {title && <h3 className="text-lg font-semibold text-white mb-3">{title}</h3>}
      {rows.length === 0 ? (
        <div className="text-sm text-slate-400">No calendar items available.</div>
      ) : (
        <div className="space-y-2">
          {rows.map((row, index) => (
            <div
              key={`${row.label ?? "calendar"}-${index}`}
              className="flex items-center justify-between rounded-lg border border-void-border bg-void-50/40 px-3 py-2"
            >
              <span className="text-sm text-white">{row.label ?? "Item"}</span>
              <span className="text-xs text-slate-400">{row.date ?? ""}</span>
            </div>
          ))}
        </div>
      )}
    </NeuralCard>
  );
}
