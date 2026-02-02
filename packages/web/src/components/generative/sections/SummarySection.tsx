type SummarySectionProps = {
  title?: string;
  content: string;
};

export function SummarySection({ title, content }: SummarySectionProps) {
  return (
    <div className="rounded-xl border border-void-border bg-void-50/40 p-4">
      {title && <div className="text-sm font-semibold text-white mb-1">{title}</div>}
      <div className="text-sm text-slate-300">{content}</div>
    </div>
  );
}
