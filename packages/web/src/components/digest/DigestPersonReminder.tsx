import { NeuralCard } from "../ui/neural/NeuralCard";
import { EntityBadge } from "../ui/neural/EntityBadge";

type DigestPerson = {
  id: string;
  name: string;
  lastContact?: string | null;
};

type DigestPersonReminderProps = {
  person: DigestPerson;
  suggestion: string;
};

export function DigestPersonReminder({ person, suggestion }: DigestPersonReminderProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-xl font-semibold text-white">Person Reminder</h3>
      <NeuralCard entityType="person" padding="md">
        <div className="flex items-center gap-2 text-white font-semibold">
          <EntityBadge type="person" size="sm" />
          {person.name}
        </div>
        <div className="mt-2 text-sm text-slate-400">{suggestion}</div>
        {person.lastContact && (
          <div className="mt-2 text-xs text-slate-500">
            Last contact {new Date(person.lastContact).toLocaleDateString()}
          </div>
        )}
      </NeuralCard>
    </div>
  );
}
