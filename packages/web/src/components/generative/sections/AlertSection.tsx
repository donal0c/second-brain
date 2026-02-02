type AlertSectionProps = {
  title?: string;
  content: string;
  style?: "urgent" | "info" | "success" | "warning" | "neutral";
};

const styleMap: Record<string, string> = {
  urgent: "border-error/40 bg-error/10 text-error",
  warning: "border-warning/40 bg-warning/10 text-warning",
  success: "border-success/40 bg-success/10 text-success",
  info: "border-neural-memory-500/30 bg-neural-memory-500/10 text-neural-memory-300",
  neutral: "border-void-border bg-void-50/40 text-slate-300",
};

export function AlertSection({ title, content, style = "neutral" }: AlertSectionProps) {
  return (
    <div className={`rounded-xl border p-4 ${styleMap[style]}`}>
      {title && <div className="text-sm font-semibold mb-1">{title}</div>}
      <div className="text-sm">{content}</div>
    </div>
  );
}
