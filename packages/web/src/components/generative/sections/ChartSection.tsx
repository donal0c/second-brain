import { NeuralCard } from "../../ui/neural/NeuralCard";

type ChartSectionProps = {
  title?: string;
  data?: Record<string, unknown>;
};

function renderRows(data?: Record<string, unknown>) {
  if (!data) return null;
  const entries = Object.entries(data).filter(([key]) => key !== "type");
  if (entries.length === 0) return null;
  return (
    <div className="space-y-2">
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-center justify-between text-sm text-slate-200">
          <span className="text-slate-400">{key}</span>
          <span className="font-medium text-white">
            {typeof value === "number" ? value.toLocaleString() : String(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ChartSection({ title, data }: ChartSectionProps) {
  return (
    <NeuralCard entityType="idea" padding="md">
      {title && <h3 className="text-lg font-semibold text-white mb-3">{title}</h3>}
      {renderRows(data) ?? (
        <div className="text-sm text-slate-400">No chart data available.</div>
      )}
    </NeuralCard>
  );
}
