type CalendarItem = {
  id: string;
  title: string;
  date: string | null;
};

type BrowseCalendarProps = {
  items: CalendarItem[];
};

export function BrowseCalendar({ items }: BrowseCalendarProps) {
  const grouped = items.reduce<Record<string, CalendarItem[]>>((acc, item) => {
    const key = item.date ? new Date(item.date).toLocaleDateString() : "No date";
    acc[key] = acc[key] ?? [];
    acc[key].push(item);
    return acc;
  }, {});

  const entries = Object.entries(grouped);
  if (entries.length === 0) {
    return <div className="text-sm text-slate-400">No scheduled items.</div>;
  }

  return (
    <div className="space-y-4">
      {entries.map(([date, dateItems]) => (
        <div key={date} className="rounded-lg border border-void-border bg-void-50/40 p-4">
          <div className="text-sm font-semibold text-white mb-2">{date}</div>
          <div className="space-y-2">
            {dateItems.map((item) => (
              <div key={item.id} className="text-sm text-slate-300">
                {item.title}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
