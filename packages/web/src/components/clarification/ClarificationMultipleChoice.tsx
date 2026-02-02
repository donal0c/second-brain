import { SynapseButton } from "../ui/neural/SynapseButton";

export type ClarificationChoiceOption = {
  label: string;
  value: string;
};

type ClarificationMultipleChoiceProps = {
  question: string;
  options: ClarificationChoiceOption[];
  selectedValue?: string;
  onSelect: (value: string) => void;
};

export function ClarificationMultipleChoice({
  question,
  options,
  selectedValue,
  onSelect,
}: ClarificationMultipleChoiceProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-base font-semibold text-white">{question}</h4>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <SynapseButton
            key={option.value}
            variant={selectedValue === option.value ? "primary" : "secondary"}
            size="sm"
            onClick={() => onSelect(option.value)}
          >
            {option.label}
          </SynapseButton>
        ))}
      </div>
    </div>
  );
}
