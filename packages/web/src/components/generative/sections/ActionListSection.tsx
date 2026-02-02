import { SynapseButton } from "../../ui/neural/SynapseButton";

type ActionListSectionProps = {
  title?: string;
  items: Array<{ label: string }>;
};

export function ActionListSection({ title, items }: ActionListSectionProps) {
  return (
    <div className="space-y-3">
      {title && <h3 className="text-xl font-semibold text-white">{title}</h3>}
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={`${item.label}-${index}`}
            className="flex items-center justify-between rounded-lg border border-void-border bg-void-50/40 px-4 py-3"
          >
            <div className="text-sm text-slate-200">{item.label}</div>
            <SynapseButton variant="ghost" size="sm">
              Done
            </SynapseButton>
          </div>
        ))}
      </div>
    </div>
  );
}
