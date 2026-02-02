import { NeuralCard } from "../../ui/neural/NeuralCard";
import { EntityBadge } from "../../ui/neural/EntityBadge";

type EntityListSectionProps = {
  title?: string;
  entities: Array<{ id?: string; title: string; type: "task" | "project" | "idea" | "person" }>;
};

export function EntityListSection({ title, entities }: EntityListSectionProps) {
  return (
    <div className="space-y-3">
      {title && <h3 className="text-xl font-semibold text-white">{title}</h3>}
      <div className="space-y-2">
        {entities.map((entity, index) => (
          <NeuralCard key={entity.id ?? `${entity.title}-${index}`} entityType={entity.type} padding="sm">
            <div className="flex items-center gap-2">
              <EntityBadge type={entity.type} size="sm" />
              <div className="text-sm font-semibold text-white">{entity.title}</div>
            </div>
          </NeuralCard>
        ))}
      </div>
    </div>
  );
}
