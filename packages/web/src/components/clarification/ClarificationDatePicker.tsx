import { NeuralInput } from "../ui/neural/NeuralInput";

type ClarificationDatePickerProps = {
  prompt: string;
  value: string;
  suggestedDates?: string[];
  onChange: (value: string) => void;
};

export function ClarificationDatePicker({
  prompt,
  value,
  suggestedDates,
  onChange,
}: ClarificationDatePickerProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-base font-semibold text-white">{prompt}</h4>
      <NeuralInput
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        size="md"
        containerClassName="w-full"
      />
      {suggestedDates && suggestedDates.length > 0 && (
        <div className="text-xs text-slate-400">
          Suggested: {suggestedDates.join(", ")}
        </div>
      )}
    </div>
  );
}
