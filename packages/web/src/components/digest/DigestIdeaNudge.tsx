import { NeuralCard } from "../ui/neural/NeuralCard";

type DigestIdea = {
  id: string;
  title: string;
  summary?: string | null;
};

type DigestIdeaNudgeProps = {
  idea: DigestIdea;
  reason: string;
};

export function DigestIdeaNudge({ idea, reason }: DigestIdeaNudgeProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-xl font-semibold text-white">Idea Nudge</h3>
      <NeuralCard entityType="idea" padding="md">
        <div className="space-y-2">
          <div className="text-sm text-slate-400">{reason}</div>
          <div className="text-base font-semibold text-white">{idea.title}</div>
          {idea.summary && <div className="text-sm text-slate-400">{idea.summary}</div>}
        </div>
      </NeuralCard>
    </div>
  );
}
