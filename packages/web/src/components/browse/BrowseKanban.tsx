import type { Project } from "../../lib/api";
import { NeuralCard } from "../ui/neural/NeuralCard";

const columns: Array<{ status: Project["status"]; label: string }> = [
  { status: "active", label: "Active" },
  { status: "on_hold", label: "On Hold" },
  { status: "someday", label: "Someday" },
  { status: "completed", label: "Completed" },
];

type BrowseKanbanProps = {
  projects: Project[];
};

export function BrowseKanban({ projects }: BrowseKanbanProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {columns.map((column) => {
        const items = projects.filter((project) => project.status === column.status);
        return (
          <div key={column.status} className="space-y-3">
            <div className="text-sm font-semibold text-slate-300">{column.label}</div>
            {items.length === 0 ? (
              <div className="text-xs text-slate-500">No projects</div>
            ) : (
              items.map((project) => (
                <NeuralCard key={project.id} entityType="project" padding="sm">
                  <div className="text-sm font-semibold text-white">{project.name}</div>
                  {project.nextAction && (
                    <div className="text-xs text-slate-400 mt-1">{project.nextAction}</div>
                  )}
                </NeuralCard>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}
