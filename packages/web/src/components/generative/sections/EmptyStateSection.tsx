type EmptyStateSectionProps = {
  title?: string;
  message: string;
};

export function EmptyStateSection({ title, message }: EmptyStateSectionProps) {
  return (
    <div className="rounded-xl border border-void-border bg-void-50/40 p-6 text-center">
      {title && <div className="text-sm font-semibold text-white mb-2">{title}</div>}
      <div className="text-sm text-slate-400">{message}</div>
    </div>
  );
}
