import { NeuralCard } from "../../ui/neural/NeuralCard";
import { EntityBadge } from "../../ui/neural/EntityBadge";

type EntityCardSectionProps = {
  title?: string;
  entity: { title: string; type: "task" | "project" | "idea" | "person"; subtitle?: string };
};

export function EntityCardSection({ title, entity }: EntityCardSectionProps) {
  return (
    <div className="space-y-3">
      {title && <h3 className="text-xl font-semibold text-white">{title}</h3>}
      <NeuralCard entityType={entity.type} padding="md">
        <div className="flex items-center gap-2">
          <EntityBadge type={entity.type} size="sm" />
          <div className="text-sm font-semibold text-white">{entity.title}</div>
        </div>
        {entity.subtitle && <div className="text-xs text-slate-400 mt-2">{entity.subtitle}</div>}
      </NeuralCard>
    </div>
  );
}
