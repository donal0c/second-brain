import { NeuralInput } from "../ui/neural/NeuralInput";

type ClarificationFreeTextProps = {
  prompt: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
};

export function ClarificationFreeText({
  prompt,
  placeholder,
  value,
  onChange,
}: ClarificationFreeTextProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-base font-semibold text-white">{prompt}</h4>
      <NeuralInput
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder || "Type your answer..."}
        size="md"
        containerClassName="w-full"
      />
    </div>
  );
}
