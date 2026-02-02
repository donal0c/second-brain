import { NeuralCard } from "../ui/neural/NeuralCard";
import { EntityBadge } from "../ui/neural/EntityBadge";

type DigestProject = {
  id: string;
  name: string;
  updatedAt?: string;
};

type DigestStaleProjectsProps = {
  projects: DigestProject[];
  staleDays: number;
};

export function DigestStaleProjects({ projects, staleDays }: DigestStaleProjectsProps) {
  if (projects.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xl font-semibold text-white">Stale Projects</h3>
      <p className="text-sm text-slate-400">
        No activity for {staleDays}+ days. Consider nudging next steps.
      </p>
      <div className="space-y-3">
        {projects.map((project) => (
          <NeuralCard key={project.id} entityType="project" padding="md">
            <div className="flex items-center gap-2">
              <EntityBadge type="project" size="sm" />
              <h4 className="font-semibold text-white">{project.name}</h4>
            </div>
            {project.updatedAt && (
              <p className="text-xs text-slate-500 mt-2">
                Last updated {new Date(project.updatedAt).toLocaleDateString()}
              </p>
            )}
          </NeuralCard>
        ))}
      </div>
    </div>
  );
}
