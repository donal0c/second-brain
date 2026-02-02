import { NeuralCard } from "../ui/neural/NeuralCard";
import { SynapseButton } from "../ui/neural/SynapseButton";

export type ClarificationEntityCandidate = {
  id: string;
  name: string;
  type: "task" | "project" | "idea" | "person";
};

type ClarificationEntityPickerProps = {
  candidates: ClarificationEntityCandidate[];
  newItemPreview: { name: string; type: ClarificationEntityCandidate["type"] };
  selectedValue?: string;
  onSelect: (value: string) => void;
  onCreateNew: () => void;
};

export function ClarificationEntityPicker({
  candidates,
  newItemPreview,
  selectedValue,
  onSelect,
  onCreateNew,
}: ClarificationEntityPickerProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-base font-semibold text-white">Pick an existing item</h4>
      <div className="grid gap-3 md:grid-cols-2">
        {candidates.map((candidate) => (
          <NeuralCard
            key={candidate.id}
            entityType={candidate.type}
            selected={selectedValue === candidate.name}
            className="cursor-pointer"
            onClick={() => onSelect(candidate.name)}
          >
            <div className="space-y-1">
              <div className="text-sm font-semibold text-white">{candidate.name}</div>
              <div className="text-xs uppercase tracking-wide text-slate-400">{candidate.type}</div>
            </div>
          </NeuralCard>
        ))}
      </div>
      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>
          Or create new: <span className="text-white">{newItemPreview.name}</span>
        </span>
        <SynapseButton variant="ghost" size="sm" onClick={onCreateNew}>
          Create New
        </SynapseButton>
      </div>
    </div>
  );
}
